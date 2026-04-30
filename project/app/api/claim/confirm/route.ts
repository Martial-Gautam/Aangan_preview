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

      const { error: updateError } = await supabaseAdmin
        .from('people')
        .update({ user_id: user.id })
        .eq('id', id)
        .in('user_id', [null, user.id]);

      if (updateError) {
        console.error('Claim update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to claim profile. It may have already been claimed.' },
          { status: 409 }
        );
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

      for (const toUserId of recipientIds) {
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
            to_user_id: toUserId,
            person_id: id,
            relationship_type: rel?.relationship_type || null,
            status: 'pending',
            type: 'onboarding',
            initiated_by: 'matcher'
          })
          .select('id')
          .single();

        if (!reqError && request?.id) createdRequests.push(request.id);
      }
    }

    return NextResponse.json({ success: true, requests_created: createdRequests.length });
  } catch (err) {
    console.error('Claim confirm error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
