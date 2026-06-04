import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runInferenceEngine } from '@/lib/inference-engine';
import { Neo4jService } from '@/lib/neo4j-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type PersonRow = {
  id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  photo_url?: string | null;
  created_at?: string | null;
  email: string | null;
  phone_number: string | null;
  is_self?: boolean;
};

type RelationshipRow = {
  person_id: string;
  related_person_id: string;
  relationship_type: string;
};

type SemanticRelation = {
  label: string;
  path: Array<'father' | 'mother' | 'sibling' | 'spouse' | 'child'>;
  targetGender?: 'male' | 'female';
  anchorGenderByHop?: Record<number, 'male' | 'female'>;
};

const SEMANTIC_RELATIONS: Record<string, SemanticRelation> = {
  father: { label: 'Father', path: ['father'], targetGender: 'male' },
  mother: { label: 'Mother', path: ['mother'], targetGender: 'female' },
  sibling: { label: 'Sibling', path: ['sibling'] },
  spouse: { label: 'Spouse', path: ['spouse'] },
  child: { label: 'Child', path: ['child'] },
  father_in_law: { label: 'Father-in-law', path: ['spouse', 'father'], targetGender: 'male' },
  mother_in_law: { label: 'Mother-in-law', path: ['spouse', 'mother'], targetGender: 'female' },
  bua: { label: 'Bua', path: ['father', 'sibling'], targetGender: 'female' },
  chacha: { label: 'Chacha/Tau', path: ['father', 'sibling'], targetGender: 'male' },
  mama: { label: 'Mama', path: ['mother', 'sibling'], targetGender: 'male' },
  maasi: { label: 'Maasi', path: ['mother', 'sibling'], targetGender: 'female' },
  fufa: { label: 'Fufa', path: ['father', 'sibling', 'spouse'], targetGender: 'male', anchorGenderByHop: { 1: 'female' } },
  mami: { label: 'Mami', path: ['mother', 'sibling', 'spouse'], targetGender: 'female', anchorGenderByHop: { 1: 'male' } },
  maasa: { label: 'Maasa', path: ['mother', 'sibling', 'spouse'], targetGender: 'male', anchorGenderByHop: { 1: 'female' } },
};

const CORE_REL_TYPES = new Set(['father', 'mother', 'sibling', 'spouse', 'child']);

function normalizePhone(phone?: string | null) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

function normalizeName(name?: string | null) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function duplicateConfidence(candidate: {
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
}, existing: PersonRow): number {
  const emailA = candidate.email?.trim().toLowerCase();
  const emailB = existing.email?.trim().toLowerCase();
  if (emailA && emailB && emailA === emailB) return 98;

  const phoneA = normalizePhone(candidate.phone_number);
  const phoneB = normalizePhone(existing.phone_number);
  if (phoneA && phoneB && phoneA === phoneB) return 96;

  const nameA = normalizeName(candidate.full_name);
  const nameB = normalizeName(existing.full_name);
  const dobMatch = Boolean(candidate.date_of_birth && existing.date_of_birth && candidate.date_of_birth === existing.date_of_birth);
  if (nameA && nameB && nameA === nameB && dobMatch) return 92;
  if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA)) && dobMatch) return 78;

  return 0;
}

function relationMatchesPerson(relType: string, person: PersonRow | undefined | null) {
  if (!person) return false;
  if (relType === 'father') return person.gender === 'male' || !person.gender;
  if (relType === 'mother') return person.gender === 'female' || !person.gender;
  return true;
}

function getTargets(fromId: string, relType: string, rels: RelationshipRow[], peopleById: Map<string, PersonRow>) {
  return rels
    .filter((rel) => rel.person_id === fromId && rel.relationship_type === relType)
    .map((rel) => peopleById.get(rel.related_person_id))
    .filter((person): person is PersonRow => Boolean(person))
    .filter((person) => relationMatchesPerson(relType, person));
}

function resolveAnchorForSemanticRelation(
  selfPersonId: string,
  semantic: SemanticRelation,
  rels: RelationshipRow[],
  peopleById: Map<string, PersonRow>
): { ok: true; anchorId: string; finalEdgeType: string; chainIds: string[]; confidence: number } | { ok: false; reason: string; confidence: number } {
  if (semantic.path.length === 1) {
    return {
      ok: true,
      anchorId: selfPersonId,
      finalEdgeType: semantic.path[0],
      chainIds: [selfPersonId],
      confidence: 100,
    };
  }

  let currentIds = [selfPersonId];
  const chainIds = [selfPersonId];

  for (let i = 0; i < semantic.path.length - 1; i++) {
    const hop = semantic.path[i];
    const requiredGender = semantic.anchorGenderByHop?.[i];
    const nextPeople = currentIds
      .flatMap((id) => getTargets(id, hop, rels, peopleById))
      .filter((person) => !requiredGender || person.gender === requiredGender || !person.gender);

    if (nextPeople.length === 0) {
      return {
        ok: false,
        reason: `Missing ${hop} node needed to resolve ${semantic.label}.`,
        confidence: 42,
      };
    }

    if (nextPeople.length > 1) {
      return {
        ok: false,
        reason: `Multiple possible ${hop} nodes found for ${semantic.label}. Please add this relative from the exact person's profile.`,
        confidence: 68,
      };
    }

    const next = nextPeople[0];
    chainIds.push(next.id);
    currentIds = [next.id];
  }

  return {
    ok: true,
    anchorId: currentIds[0],
    finalEdgeType: semantic.path[semantic.path.length - 1],
    chainIds,
    confidence: 96,
  };
}

async function insertRelationshipIfMissing(
  supabaseAdmin: SupabaseClient<any>,
  ownerId: string,
  personId: string,
  relatedPersonId: string,
  relationshipType: string
) {
  const { data: existing } = await supabaseAdmin
    .from('relationships')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('person_id', personId)
    .eq('related_person_id', relatedPersonId)
    .eq('relationship_type', relationshipType)
    .maybeSingle();

  if (existing) return false;

  await supabaseAdmin.from('relationships').insert({
    owner_id: ownerId,
    person_id: personId,
    related_person_id: relatedPersonId,
    relationship_type: relationshipType,
  });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Validate auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, gender, date_of_birth, photo_url, email, phone_number, is_self, relationship_type } = body;
    const semanticRelation = SEMANTIC_RELATIONS[relationship_type];

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
    }

    if (!is_self && !semanticRelation) {
      return NextResponse.json({ error: 'relationship_type is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: selfPerson } = await supabaseAdmin
      .from('people')
      .select('id, full_name, gender, date_of_birth, email, phone_number, is_self')
      .eq('owner_id', user.id)
      .eq('is_self', true)
      .maybeSingle();

    if (!selfPerson) {
      return NextResponse.json({ error: 'Could not find your profile' }, { status: 400 });
    }

    const { data: existingPeople } = await supabaseAdmin
      .from('people')
      .select('id, full_name, gender, date_of_birth, email, phone_number, is_self')
      .eq('owner_id', user.id);

    const people = (existingPeople || []) as PersonRow[];
    const bestDuplicate = people
      .map((personRow) => ({
        person: personRow,
        confidence: duplicateConfidence({
          full_name: full_name.trim(),
          email,
          phone_number,
          date_of_birth,
        }, personRow),
      }))
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (bestDuplicate && bestDuplicate.confidence >= 60 && bestDuplicate.confidence < 90) {
      return NextResponse.json({
        error: `This looks similar to ${bestDuplicate.person.full_name}. Please confirm before creating a duplicate.`,
        duplicate_candidate: {
          person_id: bestDuplicate.person.id,
          full_name: bestDuplicate.person.full_name,
          confidence: bestDuplicate.confidence,
        },
      }, { status: 409 });
    }

    const { data: relRows } = await supabaseAdmin
      .from('relationships')
      .select('person_id, related_person_id, relationship_type')
      .eq('owner_id', user.id);

    const rels = (relRows || []) as RelationshipRow[];
    const peopleById = new Map(people.map((personRow) => [personRow.id, personRow]));
    peopleById.set(selfPerson.id, selfPerson as PersonRow);

    const semanticResolution = !is_self && semanticRelation
      ? resolveAnchorForSemanticRelation(selfPerson.id, semanticRelation, rels, peopleById)
      : null;

    if (semanticResolution && !semanticResolution.ok) {
      return NextResponse.json({
        error: semanticResolution.reason,
        inference: {
          requested_relation: semanticRelation?.label,
          reason: `${semanticRelation?.label} = ${semanticRelation?.path.join(' -> ')}`,
          confidence: semanticResolution.confidence,
          requires_confirmation: true,
        },
      }, { status: 409 });
    }

    let person = bestDuplicate && bestDuplicate.confidence >= 90 ? bestDuplicate.person : null;

    if (!person) {
      const { data: insertedPerson, error: personError } = await supabaseAdmin
        .from('people')
        .insert({
          owner_id: user.id,
          full_name: full_name.trim(),
          gender: semanticRelation?.targetGender || gender || null,
          date_of_birth: date_of_birth || null,
          photo_url: photo_url || null,
          email: email || null,
          phone_number: phone_number || null,
          is_self: is_self ?? false,
        })
        .select()
        .single();

      if (personError || !insertedPerson) {
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
      }
      person = insertedPerson;

      // Neo4j Dual-Write (Non-blocking)
      if (person) {
        Neo4jService.syncPerson({
          id: person.id,
          userId: (person as any).user_id || null,
          ownerId: user.id,
          isSelf: person.is_self || false,
          name: person.full_name || 'Unknown',
          gender: person.gender ?? undefined,
          birthDate: person.date_of_birth ?? undefined,
          profileImage: person.photo_url ?? undefined,
          createdAt: person.created_at || new Date().toISOString(),
        }).catch(err => console.error('Dual-write to Neo4j failed for Person:', err));
      }
    }

    if (!person) {
      return NextResponse.json({ error: 'Failed to resolve member' }, { status: 500 });
    }

    let relationshipCreated = false;
    if (!is_self && semanticRelation && semanticResolution?.ok) {
      relationshipCreated = await insertRelationshipIfMissing(
        supabaseAdmin,
        user.id,
        semanticResolution.anchorId,
        person.id,
        semanticResolution.finalEdgeType
      );
      
      // Neo4j Dual-Write (Non-blocking)
      if (relationshipCreated) {
        Neo4jService.syncRelationship(
          semanticResolution.anchorId,
          person.id,
          semanticResolution.finalEdgeType
        ).catch(err => console.error('Dual-write to Neo4j failed for Relationship:', err));
      }
    }

    let requestCreated = false;
    if (!is_self && (email || phone_number)) {
      const normalizedEmail = normalizeEmail(email) || null;
      const normalizedPhone = normalizePhone(phone_number) || null;
      let matchedUserId: string | null = null;

      // Look up existing user by email (email lives in auth.users, not profiles)
      if (normalizedEmail && !matchedUserId) {
        try {
          // Use targeted lookup instead of listing all users (scales beyond 1000)
          const { data: matchedUserData } = await supabaseAdmin.auth.admin
            .listUsers({ page: 1, perPage: 1 });
          // Search profiles table which has the email from the auth trigger
          const { data: emailProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .ilike('email', normalizedEmail)
            .neq('id', user.id)
            .maybeSingle();
          if (emailProfile?.id) {
            matchedUserId = emailProfile.id;
          } else {
            // Fallback: check auth.users directly via admin API
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin
              .listUsers({ page: 1, perPage: 50 });
            const matchedUser = (allUsers || []).find(
              (u) => u.email?.toLowerCase() === normalizedEmail && u.id !== user.id
            );
            matchedUserId = matchedUser?.id || null;
          }
        } catch (emailLookupErr) {
          console.error('Email lookup error:', emailLookupErr);
        }
      }

      // Look up existing user by phone
      if (normalizedPhone && !matchedUserId) {
        const { data: phoneProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', normalizedPhone)
          .neq('id', user.id)
          .maybeSingle();
        matchedUserId = phoneProfile?.id || null;
      }

      const { data: existingRequest } = await supabaseAdmin
        .from('connection_requests')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('person_id', person.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (!existingRequest) {
        const { error: reqError } = await supabaseAdmin
          .from('connection_requests')
          .insert({
            from_user_id: user.id,
            sender_id: user.id,
            to_user_id: matchedUserId,
            receiver_id: matchedUserId,
            receiver_email: normalizedEmail,
            receiver_phone: normalizedPhone,
            person_id: person.id,
            linked_person_id: person.id,
            relationship_type: semanticRelation?.label || relationship_type,
            status: 'pending',
            type: 'direct',
            initiated_by: 'adder'
          });
        if (!reqError) requestCreated = true;
      }
    }

    // Run Inference Engine asynchronously (don't await it to block the response)
    runInferenceEngine(supabaseAdmin, user.id, selfPerson.id).catch(console.error);

    const relationPath = semanticRelation?.path || [];
    return NextResponse.json({
      person,
      request_created: requestCreated,
      relationship_created: relationshipCreated,
      semantic_result: semanticRelation && semanticResolution?.ok ? {
        added: person.full_name,
        inferred: `${person.full_name} is ${semanticResolution.finalEdgeType} of the resolved anchor person`,
        reason: `${semanticRelation.label} = ${relationPath.join(' -> ')}`,
        degree_from_me: relationPath.length,
        degree_path: ['Me', ...relationPath],
        placement: CORE_REL_TYPES.has(semanticResolution.finalEdgeType)
          ? `${person.full_name} positioned through graph edge ${semanticResolution.finalEdgeType} from the resolved anchor.`
          : 'Placement will be regenerated from graph structure.',
        confidence: semanticResolution.confidence,
        duplicate_handling: bestDuplicate && bestDuplicate.confidence >= 90 ? 'Linked existing person instead of duplicating.' : 'Created new person.',
      } : null,
    });
  } catch (err) {
    console.error('Add member API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
