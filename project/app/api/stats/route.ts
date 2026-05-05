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

    // Direct tree members (owned by this user)
    const { data: directPeople, count: directCount } = await supabaseAdmin
      .from('people')
      .select('*', { count: 'exact' })
      .eq('owner_id', user.id);

    // Connected user IDs via user_connections (BFS)
    const visited = new Set<string>();
    const queue: string[] = [user.id];
    let index = 0;

    while (index < queue.length) {
      const chunk = queue.slice(index, index + 25);
      index += 25;
      chunk.forEach(id => visited.add(id));

      const orFilter = `user_id_1.in.(${chunk.join(',')}),user_id_2.in.(${chunk.join(',')})`;
      const { data: connections } = await supabaseAdmin
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(orFilter);

      (connections || []).forEach(conn => {
        if (conn.user_id_1 && !visited.has(conn.user_id_1)) queue.push(conn.user_id_1);
        if (conn.user_id_2 && !visited.has(conn.user_id_2)) queue.push(conn.user_id_2);
      });
    }

    const connectedUserIds = Array.from(visited);

    // Extended tree members
    const { count: extendedCount } = await supabaseAdmin
      .from('people')
      .select('*', { count: 'exact', head: true })
      .in('owner_id', connectedUserIds);

    // Oldest and youngest members (direct tree)
    const membersWithDOB = (directPeople || []).filter(p => p.date_of_birth);
    let oldest = null;
    let youngest = null;

    if (membersWithDOB.length > 0) {
      membersWithDOB.sort((a, b) =>
        new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime()
      );
      oldest = { name: membersWithDOB[0].full_name, dob: membersWithDOB[0].date_of_birth };
      const last = membersWithDOB[membersWithDOB.length - 1];
      youngest = { name: last.full_name, dob: last.date_of_birth };
    }

    // Generations: count unique "layers" via relationship hops from self
    const selfPerson = (directPeople || []).find(p => p.is_self);
    let generations = 1;
    if (selfPerson) {
      const { data: rels } = await supabaseAdmin
        .from('relationships')
        .select('*')
        .eq('owner_id', user.id);

      const adj = new Map<string, Array<{ id: string; type: string }>>();
      (rels || []).forEach(r => {
        if (!adj.has(r.person_id)) adj.set(r.person_id, []);
        adj.get(r.person_id)!.push({ id: r.related_person_id, type: r.relationship_type });
        if (!adj.has(r.related_person_id)) adj.set(r.related_person_id, []);
        adj.get(r.related_person_id)!.push({ id: r.person_id, type: r.relationship_type });
      });

      // BFS to find max depth
      const depthVisited = new Set<string>();
      const depthQueue: Array<{ id: string; depth: number }> = [{ id: selfPerson.id, depth: 0 }];
      depthVisited.add(selfPerson.id);
      let maxDepth = 0;

      while (depthQueue.length > 0) {
        const curr = depthQueue.shift()!;
        maxDepth = Math.max(maxDepth, curr.depth);
        const neighbors = adj.get(curr.id) || [];
        for (const n of neighbors) {
          if (!depthVisited.has(n.id)) {
            depthVisited.add(n.id);
            depthQueue.push({ id: n.id, depth: curr.depth + 1 });
          }
        }
      }
      generations = maxDepth + 1;
    }

    // Birthplaces (countries/states)
    const birthplaces = (directPeople || [])
      .map(p => p.birthplace)
      .filter(Boolean);
    const uniquePlaces = Array.from(new Set(birthplaces));

    // Growth this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const newThisMonth = (directPeople || []).filter(
      p => new Date(p.created_at) > monthAgo
    ).length;
    const totalBefore = (directCount || 0) - newThisMonth;
    const growthPercent = totalBefore > 0
      ? Math.round((newThisMonth / totalBefore) * 100)
      : newThisMonth > 0 ? 100 : 0;

    return NextResponse.json({
      direct_count: directCount || 0,
      extended_count: extendedCount || 0,
      oldest,
      youngest,
      generations,
      birthplaces: uniquePlaces,
      birthplace_count: uniquePlaces.length,
      growth_percent: growthPercent,
      new_this_month: newThisMonth,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
