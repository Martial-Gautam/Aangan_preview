import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function findAuthUserIdByEmail(supabaseAdmin: any, email: string, excludeUserId: string) {
  const target = normalizeEmail(email);
  if (!target) return null;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;

    const matched = (data?.users || []).find((u: any) => {
      if (!u.id || u.id === excludeUserId) return false;
      return normalizeEmail(u.email) === target;
    });

    if (matched?.id) return matched.id;

    if (!data?.users || data.users.length < 1000) break;
  }

  return null;
}

async function findProfileUserIdByPhone(supabaseAdmin: any, rawPhone: string, excludeUserId: string) {
  const target = normalizePhone(rawPhone);
  if (!target) return null;

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, phone')
    .neq('id', excludeUserId)
    .not('phone', 'is', null)
    .limit(5000);

  const typedProfiles = (profiles || []) as Array<{ id: string; phone: string | null }>;
  const match = typedProfiles.find((profile) => normalizePhone(profile.phone) === target);
  return match?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personId = req.nextUrl.searchParams.get('person_id');
    if (!personId) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('id, owner_id, user_id, email, phone_number')
      .eq('id', personId)
      .maybeSingle();

    if (personError || !person) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    let targetUserId: string | null = person.user_id || null;
    let source:
      | 'people_user_id'
      | 'connection_request'
      | 'email_match'
      | 'phone_match'
      | 'user_connection'
      | null = targetUserId ? 'people_user_id' : null;

    type RequestRow = {
      to_user_id: string | null;
      receiver_id: string | null;
      from_user_id: string | null;
      sender_id: string | null;
      receiver_email: string | null;
      receiver_phone: string | null;
      created_at: string;
    };

    // Step 1: Check connection_requests in both modern + legacy fields.
    let latestOutbound: RequestRow | null = null;

    if (!targetUserId) {
      const [outboundModern, outboundLegacy] = await Promise.all([
        supabaseAdmin
          .from('connection_requests')
          .select('to_user_id,receiver_id,receiver_email,receiver_phone,created_at')
          .eq('from_user_id', user.id)
          .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('connection_requests')
          .select('to_user_id,receiver_id,receiver_email,receiver_phone,created_at')
          .eq('sender_id', user.id)
          .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const outboundCandidates = [outboundModern.data, outboundLegacy.data].filter(Boolean) as RequestRow[];
      latestOutbound = outboundCandidates.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

      const outboundTarget = latestOutbound?.to_user_id || latestOutbound?.receiver_id || null;
      if (outboundTarget && outboundTarget !== user.id) {
        targetUserId = outboundTarget;
        source = 'connection_request';
      }
    }

    if (!targetUserId && latestOutbound?.receiver_email) {
      const matchedByEmail = await findAuthUserIdByEmail(supabaseAdmin, latestOutbound.receiver_email, user.id);
      if (matchedByEmail) {
        targetUserId = matchedByEmail;
        source = 'email_match';
      }
    }

    if (!targetUserId && latestOutbound?.receiver_phone) {
      const matchedByPhone = await findProfileUserIdByPhone(supabaseAdmin, latestOutbound.receiver_phone, user.id);
      if (matchedByPhone) {
        targetUserId = matchedByPhone;
        source = 'phone_match';
      }
    }

    if (!targetUserId) {
      const [inboundModern, inboundLegacy] = await Promise.all([
        supabaseAdmin
          .from('connection_requests')
          .select('from_user_id,sender_id,created_at')
          .eq('to_user_id', user.id)
          .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('connection_requests')
          .select('from_user_id,sender_id,created_at')
          .eq('receiver_id', user.id)
          .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const inboundCandidates = [inboundModern.data, inboundLegacy.data].filter(Boolean) as RequestRow[];
      const latestInbound = inboundCandidates.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

      const inboundTarget = latestInbound?.from_user_id || latestInbound?.sender_id || null;
      if (inboundTarget && inboundTarget !== user.id) {
        targetUserId = inboundTarget;
        source = 'connection_request';
      }
    }

    // Step 2: Check user_connections ownership
    if (!targetUserId) {
      const { data: connections } = await supabaseAdmin
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (connections && connections.length > 0) {
        const connectedUserIds = connections
          .map((c) => (c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1))
          .filter(Boolean);

        if (connectedUserIds.length > 0 && person.owner_id !== user.id) {
          if (connectedUserIds.includes(person.owner_id)) {
            targetUserId = person.owner_id;
            source = 'user_connection';
          }
        }

        if (!targetUserId) {
          const { data: claimedCheck } = await supabaseAdmin
            .from('people')
            .select('user_id')
            .eq('id', personId)
            .not('user_id', 'is', null)
            .maybeSingle();

          if (claimedCheck?.user_id && claimedCheck.user_id !== user.id) {
            targetUserId = claimedCheck.user_id;
            source = 'people_user_id';
          }
        }
      }
    }

    // Step 3: Fallback email match.
    if (!targetUserId && person.email) {
      const matchedByEmail = await findAuthUserIdByEmail(supabaseAdmin, person.email, user.id);
      if (matchedByEmail) {
        targetUserId = matchedByEmail;
        source = 'email_match';
      }
    }

    // Step 4: Fallback phone match (normalized).
    if (!targetUserId && person.phone_number) {
      const matchedByPhone = await findProfileUserIdByPhone(supabaseAdmin, person.phone_number, user.id);
      if (matchedByPhone) {
        targetUserId = matchedByPhone;
        source = 'phone_match';
      }
    }

    return NextResponse.json({
      target_user_id: targetUserId,
      source,
      linked: !!person.user_id,
    });
  } catch (err) {
    console.error('Resolve message target error:', err);
    const message = err instanceof Error ? err.message : 'Failed to resolve message target';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
