import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type PersonRow = {
  id: string;
  owner_id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  email: string | null;
  phone_number: string | null;
  is_self: boolean;
};

function normalizeName(name?: string | null) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

function duplicateConfidence(candidate: {
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
}, existing: PersonRow) {
  const emailA = candidate.email?.trim().toLowerCase();
  const emailB = existing.email?.trim().toLowerCase();
  if (emailA && emailB && emailA === emailB) return 98;

  const phoneA = normalizePhone(candidate.phone_number);
  const phoneB = normalizePhone(existing.phone_number);
  if (phoneA && phoneB && phoneA === phoneB) return 96;

  const nameA = normalizeName(candidate.full_name);
  const nameB = normalizeName(existing.full_name);
  const dobMatch = Boolean(candidate.date_of_birth && existing.date_of_birth && candidate.date_of_birth === existing.date_of_birth);
  if (nameA && nameB && nameA === nameB && (dobMatch || existing.is_self)) return 92;
  if (nameA && nameB && (nameA.includes(nameB) || nameB.includes(nameA)) && dobMatch) return 78;

  return 0;
}

async function insertRelationshipIfMissing(
  supabase: SupabaseClient<any>,
  ownerId: string,
  personId: string,
  relatedPersonId: string,
  relationshipType: string
) {
  const { data: existing } = await supabase
    .from('relationships')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('person_id', personId)
    .eq('related_person_id', relatedPersonId)
    .eq('relationship_type', relationshipType)
    .maybeSingle();

  if (existing) return false;

  await supabase.from('relationships').insert({
    owner_id: ownerId,
    person_id: personId,
    related_person_id: relatedPersonId,
    relationship_type: relationshipType,
  });

  return true;
}

/**
 * Add a relative of ANY person in the tree (not just self).
 * Creates a new person node and a relationship from target_person → new person.
 */
export async function POST(req: NextRequest) {
  try {
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
    const {
      target_person_id,
      full_name,
      gender,
      photo_url,
      relationship_type,
      date_of_birth,
      email,
      phone_number,
    } = body;

    if (!target_person_id || !full_name?.trim() || !relationship_type) {
      return NextResponse.json(
        { error: 'target_person_id, full_name, and relationship_type are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify target person exists and belongs to this user's tree
    const { data: targetPerson, error: targetError } = await supabase
      .from('people')
      .select('id, owner_id, full_name, gender, date_of_birth, email, phone_number, is_self')
      .eq('id', target_person_id)
      .single();

    if (targetError || !targetPerson) {
      return NextResponse.json({ error: 'Target person not found' }, { status: 404 });
    }

    // Ensure the caller owns this tree
    if (targetPerson.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this tree' }, { status: 403 });
    }

    const { data: peopleRows } = await supabase
      .from('people')
      .select('id, owner_id, full_name, gender, date_of_birth, email, phone_number, is_self')
      .eq('owner_id', user.id);

    const people = (peopleRows || []) as PersonRow[];
    const selfPerson = people.find((person) => person.is_self);
    const bestDuplicate = people
      .map((person) => ({
        person,
        confidence: duplicateConfidence({
          full_name: full_name.trim(),
          email,
          phone_number,
          date_of_birth,
        }, person),
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

    let newPerson: any = bestDuplicate && bestDuplicate.confidence >= 90 ? bestDuplicate.person : null;

    if (!newPerson) {
      const { data: insertedPerson, error: personError } = await supabase
        .from('people')
        .insert({
          owner_id: user.id,
          full_name: full_name.trim(),
          gender: gender || null,
          photo_url: photo_url || null,
          date_of_birth: date_of_birth || null,
          email: email?.trim() || null,
          phone_number: phone_number?.trim() || null,
          is_self: false,
        })
        .select()
        .single();

      if (personError) {
        console.error('Create person error:', personError);
        return NextResponse.json({ error: personError.message }, { status: 500 });
      }
      newPerson = insertedPerson;
    }

    const relationshipCreated = await insertRelationshipIfMissing(
      supabase,
      user.id,
      target_person_id,
      newPerson.id,
      relationship_type
    );

    let siblingEdgeCreated = false;
    let mergedWithSelf = false;

    if (
      selfPerson &&
      relationship_type === 'child' &&
      (targetPerson.gender === 'male' || targetPerson.gender === 'female')
    ) {
      const parentType = targetPerson.gender === 'male' ? 'father' : 'mother';
      const { data: targetIsMyParent } = await supabase
        .from('relationships')
        .select('id')
        .eq('owner_id', user.id)
        .eq('person_id', selfPerson.id)
        .eq('related_person_id', target_person_id)
        .eq('relationship_type', parentType)
        .maybeSingle();

      if (targetIsMyParent) {
        if (newPerson.id === selfPerson.id) {
          mergedWithSelf = true;
        } else {
          siblingEdgeCreated = await insertRelationshipIfMissing(
            supabase,
            user.id,
            selfPerson.id,
            newPerson.id,
            'sibling'
          );
        }
      }
    }

    return NextResponse.json({
      person: newPerson,
      success: true,
      relationship_created: relationshipCreated,
      semantic_result: {
        added: newPerson.full_name,
        inferred: mergedWithSelf
          ? `${newPerson.full_name} matched your self node; no duplicate person was created.`
          : siblingEdgeCreated
          ? `${newPerson.full_name} inferred as your sibling because you share ${targetPerson.full_name} as parent.`
          : null,
        reason: relationship_type === 'child'
          ? `Adding ${targetPerson.full_name}'s child means the child is either you or your sibling when ${targetPerson.full_name} is your parent.`
          : null,
        confidence: bestDuplicate?.confidence || (siblingEdgeCreated ? 96 : 100),
      },
    });
  } catch (err) {
    console.error('Add relative error:', err);
    const message = err instanceof Error ? err.message : 'Failed to add relative';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
