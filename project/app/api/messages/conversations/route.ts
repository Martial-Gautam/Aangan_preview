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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all messages involving this user, grouped by conversation partner
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by conversation partner
    const convMap = new Map<string, {
      partner_id: string;
      last_message: string;
      last_message_time: string;
      unread_count: number;
    }>();

    for (const msg of messages || []) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partner_id: partnerId,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0,
        });
      }
      // Count unread messages sent TO the current user
      if (msg.receiver_id === user.id && !msg.read) {
        const conv = convMap.get(partnerId)!;
        conv.unread_count++;
      }
    }

    // Get partner profiles
    const partnerIds = Array.from(convMap.keys());
    if (partnerIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url')
      .in('id', partnerIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const conversations = Array.from(convMap.values()).map(conv => ({
      ...conv,
      partner_name: profileMap.get(conv.partner_id)?.full_name || 'Unknown',
      partner_photo: profileMap.get(conv.partner_id)?.photo_url || null,
    }));

    // Sort by latest message
    conversations.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
