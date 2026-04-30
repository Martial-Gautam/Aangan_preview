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
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, action } = await req.json();

    if (!request_id || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('connection_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    // Verify the current user is the intended receiver
    let isAuthorized = false;
    if (request.to_user_id === user.id || request.receiver_id === user.id) {
      isAuthorized = true;
    } else {
      const { data: profile } = await supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single();
      if (user.email && request.receiver_email === user.email) isAuthorized = true;
      if (profile?.phone && request.receiver_phone === profile.phone) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized to respond to this request' }, { status: 403 });
    }

    if (action === 'accept') {
      // 1. Update request status
      await supabaseAdmin
        .from('connection_requests')
        .update({ status: 'accepted', receiver_id: user.id, to_user_id: user.id })
        .eq('id', request_id);

      const fromUserId = request.from_user_id || request.sender_id;
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

      const personId = request.person_id || request.linked_person_id;
      if (personId) {
        await supabaseAdmin
          .from('people')
          .update({ user_id: user.id })
          .eq('id', personId)
          .is('user_id', null);
      }

      return NextResponse.json({ success: true, message: 'Connection accepted' });
    } else {
      // Reject
      await supabaseAdmin
        .from('connection_requests')
        .update({ status: 'rejected', receiver_id: user.id })
        .eq('id', request_id);

      return NextResponse.json({ success: true, message: 'Connection rejected' });
    }

  } catch (error) {
    console.error('Respond connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
