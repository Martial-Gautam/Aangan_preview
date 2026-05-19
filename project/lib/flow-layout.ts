/**
 * Dagre-based hierarchical layout for lineage visualization.
 *
 * KEY DESIGN PRINCIPLES:
 * 1. Y-axis = Generation (parents above, children below)
 * 2. X-axis = Degree of connection (spouses side-by-side)
 * 3. ONLY parent→child edges are fed to Dagre
 *    - Spouse/sibling edges are rendered as overlays AFTER layout
 * 4. Spouses are post-positioned to sit horizontally adjacent
 * 5. Focus Mode: only render nodes within N hops of centered person
 * 6. No stored positions — layout computed dynamically every time
 */

import * as dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';
import type { Relationship } from './tree-to-flow';

// ─── Focus Mode: BFS to collect nearby nodes ────────────────

/**
 * Collect all person IDs within `maxHops` of `centerId`
 * using BFS through the relationship graph.
 */
export function getVisiblePersonIds(
  centerId: string,
  relationships: Relationship[],
  maxHops: number = 3
): Set<string> {
  const adj = new Map<string, Set<string>>();
  for (const rel of relationships) {
    if (!adj.has(rel.person_id)) adj.set(rel.person_id, new Set());
    if (!adj.has(rel.related_person_id)) adj.set(rel.related_person_id, new Set());
    adj.get(rel.person_id)!.add(rel.related_person_id);
    adj.get(rel.related_person_id)!.add(rel.person_id);
  }

  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];
  visited.add(centerId);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxHops) continue;

    const neighbors = adj.get(id);
    if (!neighbors) continue;

    for (const neighbor of Array.from(neighbors)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  return visited;
}

// ─── Generation Assignment ───────────────────────────────────

/**
 * Assign a generation number to each person relative to the center.
 * Center = generation 0. Parents = -1. Children = +1.
 * Spouses share the same generation. Siblings share the same generation.
 */
function assignGenerations(
  centerId: string,
  visibleIds: Set<string>,
  relationships: Relationship[]
): Map<string, number> {
  const generations = new Map<string, number>();
  generations.set(centerId, 0);

  // Build directional maps
  const parentOf = new Map<string, Set<string>>(); // person → their children
  const childOf = new Map<string, Set<string>>();  // person → their parents
  const spouseOf = new Map<string, Set<string>>();
  const siblingOf = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const { person_id: from, related_person_id: to, relationship_type: type } = rel;
    if (!visibleIds.has(from) || !visibleIds.has(to)) continue;

    if (type === 'father' || type === 'mother') {
      // from's parent is `to`
      if (!childOf.has(from)) childOf.set(from, new Set());
      childOf.get(from)!.add(to);
      if (!parentOf.has(to)) parentOf.set(to, new Set());
      parentOf.get(to)!.add(from);
    } else if (type === 'child') {
      // from's child is `to`
      if (!parentOf.has(from)) parentOf.set(from, new Set());
      parentOf.get(from)!.add(to);
      if (!childOf.has(to)) childOf.set(to, new Set());
      childOf.get(to)!.add(from);
    } else if (type === 'spouse') {
      if (!spouseOf.has(from)) spouseOf.set(from, new Set());
      spouseOf.get(from)!.add(to);
      if (!spouseOf.has(to)) spouseOf.set(to, new Set());
      spouseOf.get(to)!.add(from);
    } else if (type === 'sibling') {
      if (!siblingOf.has(from)) siblingOf.set(from, new Set());
      siblingOf.get(from)!.add(to);
      if (!siblingOf.has(to)) siblingOf.set(to, new Set());
      siblingOf.get(to)!.add(from);
    }
  }

  // BFS from center
  const queue: string[] = [centerId];
  const visited = new Set<string>([centerId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const gen = generations.get(current)!;

    // Parents are one generation above
    const parents = childOf.get(current);
    if (parents) {
      for (const p of Array.from(parents)) {
        if (!visited.has(p) && visibleIds.has(p)) {
          generations.set(p, gen - 1);
          visited.add(p);
          queue.push(p);
        }
      }
    }

    // Children are one generation below
    const children = parentOf.get(current);
    if (children) {
      for (const c of Array.from(children)) {
        if (!visited.has(c) && visibleIds.has(c)) {
          generations.set(c, gen + 1);
          visited.add(c);
          queue.push(c);
        }
      }
    }

    // Spouses share generation
    const spouses = spouseOf.get(current);
    if (spouses) {
      for (const s of Array.from(spouses)) {
        if (!visited.has(s) && visibleIds.has(s)) {
          generations.set(s, gen);
          visited.add(s);
          queue.push(s);
        }
      }
    }

    // Siblings share generation
    const siblings = siblingOf.get(current);
    if (siblings) {
      for (const s of Array.from(siblings)) {
        if (!visited.has(s) && visibleIds.has(s)) {
          generations.set(s, gen);
          visited.add(s);
          queue.push(s);
        }
      }
    }
  }

  // Fallback for any unvisited nodes
  for (const id of Array.from(visibleIds)) {
    if (!generations.has(id)) {
      generations.set(id, 0);
    }
  }

  return generations;
}

// ─── Spouse Pairing ──────────────────────────────────────────

/**
 * Find all spouse pairs among visible nodes.
 * Returns a map: personId → spouseId (bidirectional).
 */
function findSpousePairs(
  visibleIds: Set<string>,
  relationships: Relationship[]
): Map<string, string> {
  const spouseMap = new Map<string, string>();
  const seen = new Set<string>();

  for (const rel of relationships) {
    if (rel.relationship_type !== 'spouse') continue;
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_person_id)) continue;

    const key = [rel.person_id, rel.related_person_id].sort().join('--');
    if (seen.has(key)) continue;
    seen.add(key);

    // Only pair if neither is already paired (handles polygamy gracefully)
    if (!spouseMap.has(rel.person_id) && !spouseMap.has(rel.related_person_id)) {
      spouseMap.set(rel.person_id, rel.related_person_id);
      spouseMap.set(rel.related_person_id, rel.person_id);
    }
  }

  return spouseMap;
}

// ─── Dagre Layout ────────────────────────────────────────────

const NODE_WIDTH = 130;
const NODE_HEIGHT = 120;
const SPOUSE_GAP = 30; // Gap between spouse nodes (they'll be adjacent)

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  centerId: string,
  relationships: Relationship[]
): { layoutNodes: Node[]; layoutEdges: Edge[] } {
  if (nodes.length === 0) return { layoutNodes: [], layoutEdges: edges };
  if (nodes.length === 1) {
    return {
      layoutNodes: [{ ...nodes[0], position: { x: 0, y: 0 } }],
      layoutEdges: edges,
    };
  }

  const visibleIds = new Set(nodes.map(n => n.id));
  const generations = assignGenerations(centerId, visibleIds, relationships);
  const spousePairs = findSpousePairs(visibleIds, relationships);

  // Determine which nodes are "primary" (will be placed by Dagre)
  // and which are "spouse-secondary" (will be placed beside their spouse)
  const secondarySpouses = new Set<string>();
  const processedPairs = new Set<string>();

  for (const [personA, personB] of Array.from(spousePairs)) {
    const pairKey = [personA, personB].sort().join('--');
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    // The "primary" is the one who has more parent/child connections,
    // or is the center person, or comes first alphabetically
    const aIsCenter = personA === centerId;
    const bIsCenter = personB === centerId;

    if (aIsCenter) {
      secondarySpouses.add(personB);
    } else if (bIsCenter) {
      secondarySpouses.add(personA);
    } else {
      // Count hierarchical connections
      const aConns = relationships.filter(r =>
        (r.person_id === personA || r.related_person_id === personA) &&
        r.relationship_type !== 'spouse' && r.relationship_type !== 'sibling'
      ).length;
      const bConns = relationships.filter(r =>
        (r.person_id === personB || r.related_person_id === personB) &&
        r.relationship_type !== 'spouse' && r.relationship_type !== 'sibling'
      ).length;

      if (aConns >= bConns) {
        secondarySpouses.add(personB);
      } else {
        secondarySpouses.add(personA);
      }
    }
  }

  // Create Dagre graph — ONLY with primary nodes and ONLY hierarchical edges
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 100,    // Horizontal spacing between nodes
    ranksep: 180,    // Vertical spacing between generations
    marginx: 50,
    marginy: 50,
    align: 'DL',     // Down-left alignment for natural lineage feel
  });

  // Add only primary nodes to Dagre
  for (const node of nodes) {
    if (secondarySpouses.has(node.id)) continue; // Skip secondary spouses
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // Add ONLY hierarchical edges (parent→child) to Dagre
  const addedEdges = new Set<string>();

  for (const rel of relationships) {
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_person_id)) continue;
    if (rel.person_id === rel.related_person_id) continue;

    const type = rel.relationship_type;
    let sourceId: string | null = null;
    let targetId: string | null = null;

    if (type === 'father' || type === 'mother') {
      // `to` is parent of `from` → parent→child
      sourceId = rel.related_person_id;
      targetId = rel.person_id;
    } else if (type === 'child') {
      // `from` is parent of `to` → from→to
      sourceId = rel.person_id;
      targetId = rel.related_person_id;
    } else {
      continue; // Skip spouse/sibling — they don't drive layout
    }

    // If either node is a secondary spouse, redirect edge to their primary
    if (secondarySpouses.has(sourceId)) {
      const primary = spousePairs.get(sourceId);
      if (primary && !secondarySpouses.has(primary)) sourceId = primary;
    }
    if (secondarySpouses.has(targetId)) {
      const primary = spousePairs.get(targetId);
      if (primary && !secondarySpouses.has(primary)) targetId = primary;
    }

    // Don't add self-loops
    if (sourceId === targetId) continue;

    const edgeKey = `${sourceId}->${targetId}`;
    if (addedEdges.has(edgeKey)) continue;
    addedEdges.add(edgeKey);

    // Only add if both nodes are in the Dagre graph
    if (g.hasNode(sourceId) && g.hasNode(targetId)) {
      g.setEdge(sourceId, targetId, { weight: 2 });
    }
  }

  // Run Dagre layout
  dagre.layout(g);

  // Build position map from Dagre results
  const positionMap = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (secondarySpouses.has(node.id)) continue;

    const dagNode = g.node(node.id);
    if (dagNode) {
      positionMap.set(node.id, {
        x: dagNode.x - NODE_WIDTH / 2,
        y: dagNode.y - NODE_HEIGHT / 2,
      });
    }
  }

  // Post-process: Place secondary spouses beside their primary partner
  for (const spouseId of Array.from(secondarySpouses)) {
    const primaryId = spousePairs.get(spouseId);
    if (!primaryId) continue;

    const primaryPos = positionMap.get(primaryId);
    if (!primaryPos) continue;

    // Place spouse to the right of primary
    positionMap.set(spouseId, {
      x: primaryPos.x + NODE_WIDTH + SPOUSE_GAP,
      y: primaryPos.y, // Same Y = same generation
    });
  }

  // Apply positions to nodes, adding generation metadata
  const layoutNodes = nodes.map(node => {
    const pos = positionMap.get(node.id);
    const gen = generations.get(node.id) ?? 0;

    return {
      ...node,
      position: pos || { x: 0, y: 0 },
      data: {
        ...node.data,
        generation: gen,
      },
    };
  });

  return { layoutNodes, layoutEdges: edges };
}
