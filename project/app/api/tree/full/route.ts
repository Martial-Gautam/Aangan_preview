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

    for (const node of (claimedNodes || [])) {
      if (node.owner_id) {
        connectedOwnerIds.add(node.owner_id);

        // Auto-heal: create the missing user_connections row
        const ordered = [node.owner_id, user.id].sort();
        const { error: healError } = await supabaseAdmin
          .from('user_connections')
          .upsert({
            user_id_1: ordered[0],
            user_id_2: ordered[1],
            connection_type: 'relative'
          }, { onConflict: 'user_id_1,user_id_2' });

        if (healError) {
          console.error('Auto-heal user_connections error:', healError);
        }
      }
    }

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

    // --- Step 3.5: Semantic graph healing ---
    // The graph should represent meaning, not insertion path. If A is sibling of B
    // and B has a father/mother, infer the same parent edge for A. This fixes
    // existing data like: Wife -> Brother -> Father, which semantically means
    // Wife -> Father as well.
    const peopleById = new Map(people.map((p) => [p.id, p]));
    const normalizeName = (name?: string | null) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const edgeKey = (r: any) => `${r.person_id}|${r.related_person_id}|${r.relationship_type}`;
    const edgeKeys = new Set(relationships.map(edgeKey));
    const inferredEdges: any[] = [];
    const idsToRemoveAfterSemanticMerge = new Set<string>();
    const semanticIdRemap = new Map<string, string>();
    const selfPersonForHealing = people.find((p) => p.owner_id === user.id && p.is_self);

    for (const siblingEdge of relationships.filter((r) => r.relationship_type === 'sibling')) {
      const siblingPairs = [
        { childId: siblingEdge.person_id, siblingId: siblingEdge.related_person_id },
        { childId: siblingEdge.related_person_id, siblingId: siblingEdge.person_id },
      ];

      for (const pair of siblingPairs) {
        const siblingParents = relationships.filter(
          (r) =>
            r.person_id === pair.siblingId &&
            (r.relationship_type === 'father' || r.relationship_type === 'mother')
        );

        for (const parentEdge of siblingParents) {
          const inferred = {
            id: `inferred-${pair.childId}-${parentEdge.related_person_id}-${parentEdge.relationship_type}`,
            owner_id: peopleById.get(pair.childId)?.owner_id || siblingEdge.owner_id,
            person_id: pair.childId,
            related_person_id: parentEdge.related_person_id,
            relationship_type: parentEdge.relationship_type,
            created_at: new Date().toISOString(),
            inferred: true,
          };
          const key = edgeKey(inferred);
          if (!edgeKeys.has(key) && inferred.person_id !== inferred.related_person_id) {
            edgeKeys.add(key);
            inferredEdges.push(inferred);
          }
        }
      }
    }

    // If two people are children of the same parent, they are siblings. If the
    // new child has the same name as self, treat it as the same self node.
    const parentEdgesFromSelf = selfPersonForHealing
      ? relationships.filter(
          (r) =>
            r.person_id === selfPersonForHealing.id &&
            (r.relationship_type === 'father' || r.relationship_type === 'mother')
        )
      : [];

    for (const parentEdge of parentEdgesFromSelf) {
      const siblingsFromParent = relationships.filter(
        (r) => r.person_id === parentEdge.related_person_id && r.relationship_type === 'child'
      );

      for (const childEdge of siblingsFromParent) {
        const child = peopleById.get(childEdge.related_person_id);
        if (!child || !selfPersonForHealing || child.id === selfPersonForHealing.id) continue;

        if (normalizeName(child.full_name) === normalizeName(selfPersonForHealing.full_name)) {
          semanticIdRemap.set(child.id, selfPersonForHealing.id);
          idsToRemoveAfterSemanticMerge.add(child.id);
          continue;
        }

        const inferred = {
          id: `inferred-${selfPersonForHealing.id}-${child.id}-sibling`,
          owner_id: user.id,
          person_id: selfPersonForHealing.id,
          related_person_id: child.id,
          relationship_type: 'sibling',
          created_at: new Date().toISOString(),
          inferred: true,
        };
        const key = edgeKey(inferred);
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          inferredEdges.push(inferred);
        }
      }
    }

    if (semanticIdRemap.size > 0) {
      people = people.filter((p) => !idsToRemoveAfterSemanticMerge.has(p.id));
      relationships = relationships
        .map((r) => ({
          ...r,
          person_id: semanticIdRemap.get(r.person_id) || r.person_id,
          related_person_id: semanticIdRemap.get(r.related_person_id) || r.related_person_id,
        }))
        .filter((r) => r.person_id !== r.related_person_id);

      for (let i = 0; i < inferredEdges.length; i++) {
        inferredEdges[i] = {
          ...inferredEdges[i],
          person_id: semanticIdRemap.get(inferredEdges[i].person_id) || inferredEdges[i].person_id,
          related_person_id: semanticIdRemap.get(inferredEdges[i].related_person_id) || inferredEdges[i].related_person_id,
        };
      }

      const seen = new Set<string>();
      relationships = relationships.filter((r) => {
        const key = edgeKey(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Persist the self-merge only for duplicate nodes owned by the current user.
      for (const [duplicateId, canonicalId] of Array.from(semanticIdRemap.entries())) {
        const duplicate = peopleById.get(duplicateId);
        if (duplicate?.owner_id !== user.id) continue;
        await supabaseAdmin
          .from('relationships')
          .update({ person_id: canonicalId })
          .eq('owner_id', user.id)
          .eq('person_id', duplicateId);
        await supabaseAdmin
          .from('relationships')
          .update({ related_person_id: canonicalId })
          .eq('owner_id', user.id)
          .eq('related_person_id', duplicateId);
        await supabaseAdmin.from('people').delete().eq('owner_id', user.id).eq('id', duplicateId);
      }
    }

    if (inferredEdges.length > 0) {
      relationships = [...relationships, ...inferredEdges];

      // Persist only edges in the current user's owned tree. Connected trees are
      // still augmented in-memory for display, but we do not mutate someone else's tree.
      const ownedInferredEdges = inferredEdges
        .filter((edge) => edge.owner_id === user.id)
        .map(({ id, inferred, created_at, ...edge }) => edge);

      if (ownedInferredEdges.length > 0) {
        await supabaseAdmin.from('relationships').insert(ownedInferredEdges);
      }
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
