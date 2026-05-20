import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
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
    let source: 'people_user_id' | 'connection_request' | 'email_match' | 'phone_match' | 'user_connection' | null =
      targetUserId ? 'people_user_id' : null;

    // Step 1: Check connection_requests in BOTH directions
    if (!targetUserId) {
      // Check requests FROM current user about this person
      const { data: outbound } = await supabaseAdmin
        .from('connection_requests')
        .select('to_user_id')
        .eq('from_user_id', user.id)
        .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
        .not('to_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (outbound?.to_user_id) {
        targetUserId = outbound.to_user_id;
        source = 'connection_request';
      }
    }

    if (!targetUserId) {
      // Check requests TO current user about this person
      const { data: inbound } = await supabaseAdmin
        .from('connection_requests')
        .select('from_user_id')
        .eq('to_user_id', user.id)
        .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
        .not('from_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inbound?.from_user_id) {
        targetUserId = inbound.from_user_id;
        source = 'connection_request';
      }
    }

    // Step 2: Check user_connections — find any user connected to current user
    // who owns a person record matching this personId
    if (!targetUserId) {
      const { data: connections } = await supabaseAdmin
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (connections && connections.length > 0) {
        const connectedUserIds = connections.map(c =>
          c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1
        ).filter(Boolean);

        // Check if any connected user owns a self-person whose name matches
        // or if the person record's owner is a connected user
        if (connectedUserIds.length > 0 && person.owner_id !== user.id) {
          // Person is in someone else's tree — check if owner is connected
          if (connectedUserIds.includes(person.owner_id)) {
            targetUserId = person.owner_id;
            source = 'user_connection';
          }
        }

        // Also check if any connected user has claimed this person
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

    // Step 3: Fallback email match against auth users.
    if (!targetUserId && person.email) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const matchedUser = (usersPage?.users || []).find(
        (u) =>
          u.id !== user.id &&
          u.email &&
          u.email.toLowerCase() === person.email!.trim().toLowerCase()
      );
      if (matchedUser?.id) {
        targetUserId = matchedUser.id;
        source = 'email_match';
      }
    }

    // Step 4: Fallback phone match against profile records.
    if (!targetUserId && person.phone_number) {
      const { data: profileMatch } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', person.phone_number)
        .neq('id', user.id)
        .maybeSingle();

      if (profileMatch?.id) {
        targetUserId = profileMatch.id;
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
