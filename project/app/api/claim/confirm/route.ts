import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // Validate auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create user-scoped client to verify token
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse input
    const body = await req.json();
    const { person_id, person_ids } = body as { person_id?: string; person_ids?: string[] };
    const selectedIds = Array.isArray(person_ids) ? person_ids : person_id ? [person_id] : [];

    if (selectedIds.length === 0) {
      return NextResponse.json({ error: 'person_ids is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const createdRequests: string[] = [];

    const { data: claimantProfile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();

    for (const id of selectedIds) {
      const { data: person, error: fetchError } = await supabaseAdmin
        .from('people')
        .select('id, full_name, user_id, owner_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !person) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      if (person.owner_id === user.id) {
        return NextResponse.json({ error: 'You cannot claim your own family member entries' }, { status: 400 });
      }

      if (person.user_id && person.user_id !== user.id) {
        return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 409 });
      }

      if (!person.user_id) {
        const { data: claimed, error: rpcError } = await supabaseAdmin
          .rpc('claim_person_node', {
            p_person_id: id,
            p_user_id: user.id
          });

        if (rpcError) {
          console.error('Claim RPC error:', rpcError);
          return NextResponse.json(
            { error: 'Failed to claim profile.' },
            { status: 500 }
          );
        }

        if (!claimed) {
          return NextResponse.json(
            { error: 'This profile has already been claimed.' },
            { status: 409 }
          );
        }
      }

      const orParts = [`to_user_id.eq.${user.id}`];
      if (user.email) orParts.push(`receiver_email.eq.${user.email}`);
      if (claimantProfile?.phone) orParts.push(`receiver_phone.eq.${claimantProfile.phone}`);

      const { data: adderRequest } = await supabaseAdmin
        .from('connection_requests')
        .select('id, from_user_id, sender_id')
        .eq('status', 'pending')
        .eq('person_id', id)
        .eq('from_user_id', person.owner_id)
        .or(orParts.join(','))
        .maybeSingle();

      if (adderRequest) {
        const fromUserId = adderRequest.from_user_id || adderRequest.sender_id;
        await supabaseAdmin
          .from('connection_requests')
          .update({ status: 'accepted', to_user_id: user.id, receiver_id: user.id })
          .eq('id', adderRequest.id);

        if (fromUserId) {
          const ordered = [fromUserId, user.id].sort();
          await supabaseAdmin
            .from('user_connections')
            .upsert({
              user_id_1: ordered[0],
              user_id_2: ordered[1],
              connection_type: 'relative'
            }, { onConflict: 'user_id_1,user_id_2' });
        }

        continue;
      }

      const { data: rel } = await supabaseAdmin
        .from('relationships')
        .select('relationship_type')
        .eq('related_person_id', id)
        .maybeSingle();

      const { data: linkedUsers } = await supabaseAdmin
        .from('people')
        .select('user_id')
        .eq('owner_id', person.owner_id)
        .not('user_id', 'is', null);

      const recipientIds = new Set<string>();
      if (person.owner_id && person.owner_id !== user.id) recipientIds.add(person.owner_id);
      (linkedUsers || []).forEach((p) => {
        if (p.user_id && p.user_id !== user.id) recipientIds.add(p.user_id);
      });

      for (const toUserId of Array.from(recipientIds)) {
        const { data: existing } = await supabaseAdmin
          .from('connection_requests')
          .select('id')
          .eq('from_user_id', user.id)
          .eq('to_user_id', toUserId)
          .eq('person_id', id)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();

        if (existing) continue;

        const { data: request, error: reqError } = await supabaseAdmin
          .from('connection_requests')
          .insert({
            from_user_id: user.id,
            sender_id: user.id,
            to_user_id: toUserId,
            receiver_id: toUserId,
            person_id: id,
            linked_person_id: id,
            relationship_type: rel?.relationship_type || null,
            status: 'accepted',
            type: 'onboarding',
            initiated_by: 'matcher'
          })
          .select('id')
          .single();

        if (!reqError && request?.id) createdRequests.push(request.id);
      }

      // Always ensure user_connections exists between claimant and person's owner.
      // The user confirmed "this is me" — that's sufficient consent to link trees.
      if (person.owner_id && person.owner_id !== user.id) {
        const ordered = [person.owner_id, user.id].sort();
        const { error: connError } = await supabaseAdmin
          .from('user_connections')
          .upsert({
            user_id_1: ordered[0],
            user_id_2: ordered[1],
            connection_type: 'relative'
          }, { onConflict: 'user_id_1,user_id_2' });

        if (connError) {
          console.error('Failed to create user_connections:', connError);
        } else {
          console.log('user_connections created:', ordered[0], '<->', ordered[1]);
        }
      }
    }

    return NextResponse.json({ success: true, requests_created: createdRequests.length });
  } catch (err) {
    console.error('Claim confirm error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
