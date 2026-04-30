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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const visited = new Set<string>();
    const queue: string[] = [user.id];
    let index = 0;

    while (index < queue.length) {
      const chunk = queue.slice(index, index + 25);
      index += 25;

      chunk.forEach((id) => visited.add(id));

      const orFilter = `user_id_1.in.(${chunk.join(',')}),user_id_2.in.(${chunk.join(',')})`;
      const { data: connections } = await supabaseAdmin
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(orFilter);

      (connections || []).forEach((conn) => {
        const other1 = conn.user_id_1;
        const other2 = conn.user_id_2;
        if (other1 && !visited.has(other1)) queue.push(other1);
        if (other2 && !visited.has(other2)) queue.push(other2);
      });
    }

    const connectedUserIds = Array.from(visited);

    const { data: people } = await supabaseAdmin
      .from('people')
      .select('*')
      .in('owner_id', connectedUserIds);

    const { data: relationships } = await supabaseAdmin
      .from('relationships')
      .select('*')
      .in('owner_id', connectedUserIds);

    const connectedRoots = (people || [])
      .filter((p) => p.is_self)
      .map((p) => p.id);

    const selfPerson = (people || []).find((p) => p.owner_id === user.id && p.is_self);

    return NextResponse.json({
      self_person_id: selfPerson?.id || null,
      nodes: people || [],
      edges: relationships || [],
      connected_roots: connectedRoots
    });
  } catch (error) {
    console.error('Full tree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
