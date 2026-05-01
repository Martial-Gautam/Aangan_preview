import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find all user_ids in my tree
    const { data: myNodes } = await supabaseAdmin
      .from('people')
      .select('user_id')
      .eq('owner_id', user.id)
      .not('user_id', 'is', null);

    const myNetworkUserIds = myNodes?.map(n => n.user_id).filter(id => id !== user.id) || [];
    const myNetworkSet = new Set(myNetworkUserIds);

    if (myNetworkUserIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // 2. Find other owners who have these user_ids in their tree
    const { data: sharedNodes } = await supabaseAdmin
      .from('people')
      .select('owner_id, user_id, full_name')
      .in('user_id', myNetworkUserIds)
      .neq('owner_id', user.id);

    if (!sharedNodes || sharedNodes.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // owner_id is the user we might want to connect with
    const suggestedOwnerIds = Array.from(new Set(sharedNodes.map(n => n.owner_id)));

    // 3. Filter out owners we are already connected to
    const { data: connections } = await supabaseAdmin
      .from('user_connections')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const connectedIds = new Set<string>();
    (connections || []).forEach((c) => {
      if (c.user_id_1 !== user.id) connectedIds.add(c.user_id_1);
      if (c.user_id_2 !== user.id) connectedIds.add(c.user_id_2);
    });

    const { data: existingRequests } = await supabaseAdmin
      .from('connection_requests')
      .select('from_user_id, to_user_id')
      .in('status', ['pending', 'accepted'])
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    const pendingIds = new Set<string>();
    (existingRequests || []).forEach((r) => {
      if (r.from_user_id && r.from_user_id !== user.id) pendingIds.add(r.from_user_id);
      if (r.to_user_id && r.to_user_id !== user.id) pendingIds.add(r.to_user_id);
    });

    const suggestedOwnerIdsFiltered = suggestedOwnerIds.filter(id => 
      !myNetworkSet.has(id) && !connectedIds.has(id) && !pendingIds.has(id)
    );

    if (suggestedOwnerIdsFiltered.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // 4. Fetch profiles for suggestions
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, photo_url')
      .in('id', suggestedOwnerIdsFiltered);

    const suggestions = (profiles || []).map(p => {
      // Find the mutual connection name
      const mutualNode = sharedNodes.find(n => n.owner_id === p.id);
      return {
        user_id: p.id,
        full_name: p.full_name,
        photo_url: p.photo_url,
        mutual_connection: mutualNode?.full_name || 'a mutual relative'
      };
    });

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
