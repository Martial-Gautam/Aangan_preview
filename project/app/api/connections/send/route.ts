import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to_user_id } = await req.json();

    if (!to_user_id) {
      return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (to_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 });
    }

    const ordered = [user.id, to_user_id].sort();

    const { data: existingConnection } = await supabaseAdmin
      .from('user_connections')
      .select('id')
      .eq('user_id_1', ordered[0])
      .eq('user_id_2', ordered[1])
      .maybeSingle();

    if (existingConnection) {
      return NextResponse.json({ success: true, already_connected: true });
    }

    const { data: outgoingRequest } = await supabaseAdmin
      .from('connection_requests')
      .select('id, status')
      .eq('from_user_id', user.id)
      .eq('to_user_id', to_user_id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (outgoingRequest) {
      return NextResponse.json({ success: true, already_exists: true });
    }

    const { data: reversePending } = await supabaseAdmin
      .from('connection_requests')
      .select('id, status')
      .eq('from_user_id', to_user_id)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    // If both users have already expressed intent, connect immediately.
    if (reversePending) {
      const { error: reverseUpdateError } = await supabaseAdmin
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', reversePending.id);
      if (reverseUpdateError) {
        console.error('Failed to accept reverse request:', reverseUpdateError);
        return NextResponse.json({ error: 'Failed to confirm connection' }, { status: 500 });
      }

      const { error: acceptedInsertError } = await supabaseAdmin
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id,
          status: 'accepted',
          type: 'suggestion',
          initiated_by: 'suggester',
          sender_id: user.id,
          receiver_id: to_user_id,
        });
      if (acceptedInsertError) {
        console.error('Failed to insert accepted request:', acceptedInsertError);
        return NextResponse.json({ error: 'Failed to confirm connection' }, { status: 500 });
      }

      const { error: connectionUpsertError } = await supabaseAdmin
        .from('user_connections')
        .upsert(
          {
            user_id_1: ordered[0],
            user_id_2: ordered[1],
            connection_type: 'relative',
          },
          { onConflict: 'user_id_1,user_id_2' }
        );
      if (connectionUpsertError) {
        console.error('Failed to create user connection:', connectionUpsertError);
        return NextResponse.json({ error: 'Failed to connect trees' }, { status: 500 });
      }

      return NextResponse.json({ success: true, merged: true });
    }

    const { error: insertError } = await supabaseAdmin.from('connection_requests').insert({
      from_user_id: user.id,
      to_user_id,
      status: 'pending',
      type: 'suggestion',
      initiated_by: 'suggester',
      sender_id: user.id,
      receiver_id: to_user_id,
    });

    if (insertError) {
      console.error('Insert connection request error:', insertError);
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
