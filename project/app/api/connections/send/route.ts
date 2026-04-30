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

    const { to_user_id } = await req.json();

    if (!to_user_id) {
      return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (to_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('connection_requests')
      .select('id')
      .eq('from_user_id', user.id)
      .eq('to_user_id', to_user_id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, already_exists: true });
    }

    const { error: insertError } = await supabaseAdmin
      .from('connection_requests')
      .insert({
        from_user_id: user.id,
        to_user_id: to_user_id,
        status: 'pending',
        type: 'suggestion',
        initiated_by: 'suggester'
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
