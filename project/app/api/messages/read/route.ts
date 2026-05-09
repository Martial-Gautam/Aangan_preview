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

    const { partner_id } = await req.json();
    if (!partner_id) {
      return NextResponse.json({ error: 'partner_id required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', partner_id)
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Mark read error:', err);
    const message = err instanceof Error ? err.message : 'Failed to mark as read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
