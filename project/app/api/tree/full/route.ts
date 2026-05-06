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

    // --- Step 1: Discover all connected owner_ids ---
    // We use two discovery mechanisms:
    //   A) user_connections table (explicit tree links)
    //   B) people.user_id (claimed person nodes — if I claimed a node in your tree, I'm connected)

    const connectedOwnerIds = new Set<string>();
    connectedOwnerIds.add(user.id);

    // A) BFS through user_connections
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

    visited.forEach((id) => connectedOwnerIds.add(id));

    // B) Discover through claimed nodes: find any person node where user_id = me
    //    and include that node's owner_id as a connected tree.
    const { data: claimedNodes } = await supabaseAdmin
      .from('people')
      .select('owner_id')
      .eq('user_id', user.id)
      .neq('owner_id', user.id);

    (claimedNodes || []).forEach((node) => {
      if (node.owner_id) {
        connectedOwnerIds.add(node.owner_id);

        // Auto-heal: create the missing user_connections row
        const ordered = [node.owner_id, user.id].sort();
        supabaseAdmin
          .from('user_connections')
          .upsert({
            user_id_1: ordered[0],
            user_id_2: ordered[1],
            connection_type: 'relative'
          }, { onConflict: 'user_id_1,user_id_2' })
          .then(() => {})
          .catch((err) => console.error('Auto-heal user_connections error:', err));
      }
    });

    // Also check reverse: anyone who claimed a node I own
    const { data: claimedInMyTree } = await supabaseAdmin
      .from('people')
      .select('user_id')
      .eq('owner_id', user.id)
      .not('user_id', 'is', null)
      .neq('user_id', user.id);

    (claimedInMyTree || []).forEach((node) => {
      if (node.user_id) {
        connectedOwnerIds.add(node.user_id);
      }
    });

    const allOwnerIds = Array.from(connectedOwnerIds);

    // --- Step 2: Fetch all people and relationships for connected owners ---
    const { data: rawPeople } = await supabaseAdmin
      .from('people')
      .select('*')
      .in('owner_id', allOwnerIds);

    const { data: rawRelationships } = await supabaseAdmin
      .from('relationships')
      .select('*')
      .in('owner_id', allOwnerIds);

    let people = rawPeople || [];
    let relationships = rawRelationships || [];

    // --- Step 3: Deduplicate claimed nodes ---
    // When user X claims a node in user Y's tree, there are TWO person records
    // for X: the claimed node (owner_id=Y, user_id=X) and X's self-person
    // (owner_id=X, is_self=true). We merge them: keep the self-person, repoint
    // all edges from the claimed node to the self-person, remove the duplicate.

    // Build a map: user_id -> self-person id
    const selfPersonMap = new Map<string, string>();
    people.forEach((p) => {
      if (p.is_self && p.owner_id) {
        selfPersonMap.set(p.owner_id, p.id);
      }
    });

    // Find claimed nodes that have a corresponding self-person
    const nodesToRemove = new Set<string>();
    const idRemap = new Map<string, string>(); // claimed_node_id -> self_person_id

    people.forEach((p) => {
      if (p.user_id && p.user_id !== p.owner_id && !p.is_self) {
        const selfId = selfPersonMap.get(p.user_id);
        if (selfId && selfId !== p.id) {
          // This claimed node has a matching self-person — merge
          idRemap.set(p.id, selfId);
          nodesToRemove.add(p.id);
        }
      }
    });

    if (nodesToRemove.size > 0) {
      // Remove duplicate nodes
      people = people.filter((p) => !nodesToRemove.has(p.id));

      // Repoint all relationship edges
      relationships = relationships.map((r) => ({
        ...r,
        person_id: idRemap.get(r.person_id) || r.person_id,
        related_person_id: idRemap.get(r.related_person_id) || r.related_person_id,
      }));

      // Deduplicate edges (same person_id + related_person_id + relationship_type)
      const edgeKey = (r: any) => `${r.person_id}|${r.related_person_id}|${r.relationship_type}`;
      const seen = new Set<string>();
      relationships = relationships.filter((r) => {
        // Also remove self-referencing edges
        if (r.person_id === r.related_person_id) return false;
        const key = edgeKey(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const connectedRoots = people
      .filter((p) => p.is_self)
      .map((p) => p.id);

    const selfPerson = people.find((p) => p.owner_id === user.id && p.is_self);

    return NextResponse.json({
      self_person_id: selfPerson?.id || null,
      nodes: people,
      edges: relationships,
      connected_roots: connectedRoots
    });
  } catch (error) {
    console.error('Full tree error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
