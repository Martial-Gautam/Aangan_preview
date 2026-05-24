import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function GET(req: NextRequest) {
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile to get phone
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();

    // Query pending requests for this user
    let orConditions = [`to_user_id.eq.${user.id}`, `receiver_id.eq.${user.id}`];
    const normalizedUserEmail = normalizeEmail(user.email);
    const normalizedProfilePhone = normalizePhone(profile?.phone);
    if (normalizedUserEmail) {
      // include both exact and case-insensitive checks for legacy rows
      orConditions.push(`receiver_email.eq.${normalizedUserEmail}`);
      orConditions.push(`receiver_email.ilike.${normalizedUserEmail}`);
    }
    if (normalizedProfilePhone) {
      orConditions.push(`receiver_phone.eq.${normalizedProfilePhone}`);
      // legacy fallback where phone may be stored unnormalized
      orConditions.push(`receiver_phone.ilike.%${normalizedProfilePhone}`);
    }

    const { data: requests, error: reqError } = await supabaseAdmin
      .from('connection_requests')
      .select(`
        id,
        status,
        created_at,
        person_id,
        linked_person_id,
        relationship_type,
        type,
        initiated_by,
        from_user_id,
        sender_id
      `)
      .eq('status', 'pending')
      .or(orConditions.join(','))
      .order('created_at', { ascending: false });

    if (reqError) {
      console.error('Fetch requests error:', reqError);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    const senderIds = Array.from(
      new Set((requests || []).map((r) => r.from_user_id || r.sender_id).filter(Boolean) as string[])
    );
    const linkedPersonIds = Array.from(
      new Set((requests || []).map((r) => r.person_id || r.linked_person_id).filter(Boolean) as string[])
    );

    const [{ data: senderProfiles }, { data: linkedPeople }] = await Promise.all([
      senderIds.length > 0
        ? supabaseAdmin.from('profiles').select('id, full_name, photo_url').in('id', senderIds)
        : Promise.resolve({ data: [] as any[] }),
      linkedPersonIds.length > 0
        ? supabaseAdmin.from('people').select('id, full_name').in('id', linkedPersonIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const senderMap = new Map((senderProfiles || []).map((s: any) => [s.id, s]));
    const linkedPeopleMap = new Map((linkedPeople || []).map((p: any) => [p.id, p]));

    const enrichedRequests = (requests || []).map((req) => {
      const senderId = req.from_user_id || req.sender_id;
      const sender = senderId ? senderMap.get(senderId) : null;
      const linkedPersonId = req.person_id || req.linked_person_id;
      const linkedPerson = linkedPersonId ? linkedPeopleMap.get(linkedPersonId) : null;

      return {
        id: req.id,
        sender: {
          full_name: sender?.full_name || 'Someone',
          photo_url: sender?.photo_url || null,
        },
        added_as: linkedPerson?.full_name || '',
        relationship: req.relationship_type || 'Relative',
        created_at: req.created_at,
        type: req.type,
        initiated_by: req.initiated_by,
      };
    });

    return NextResponse.json({ requests: enrichedRequests });

  } catch (error) {
    console.error('Pending connections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
