/**
 * Transform family data into ReactFlow nodes and edges.
 *
 * KEY DESIGN:
 * - Focus Mode: only include nodes within N hops of the centered person
 * - Edges are semantically styled:
 *   • Parent→Child: solid green smoothstep, arrow at child, Top→Bottom handles
 *   • Spouse: short gold straight line, Left→Right handles, no arrow
 *   • Sibling: dotted sage horizontal, Left→Right handles
 *   • Cross-tree: animated dashed gold
 * - No positions stored — layout computed dynamically by Dagre
 */

import { Node, Edge, MarkerType } from '@xyflow/react';
import { getVisiblePersonIds } from './flow-layout';

// ─── Types ───────────────────────────────────────────────────

export type Person = {
  id: string;
  full_name: string;
  gender: string | null;
  date_of_birth?: string | null;
  photo_url: string | null;
  email: string | null;
  phone_number: string | null;
  is_self: boolean;
  user_id: string | null;
  owner_id: string;
};

export type Relationship = {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: 'father' | 'mother' | 'sibling' | 'spouse' | 'child';
  owner_id: string;
};

export type FamilyNodeData = {
  personId: string;
  name: string;
  photoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  email: string | null;
  phone: string | null;
  relationshipType: string;
  isSelf: boolean;
  isLinked: boolean;
  isCenterPerson: boolean;
  isHighlighted?: boolean;
  hopDistance: number;
  generation?: number;
};

// ─── Edge Style Definitions ──────────────────────────────────

/**
 * Parent → Child edge: solid green, smoothstep, arrow at child end.
 * Routes from parent's BOTTOM handle to child's TOP handle.
 */
function createParentChildEdge(id: string, parentId: string, childId: string): Edge {
  return {
    id,
    source: parentId,
    target: childId,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
    type: 'smoothstep',
    style: {
      stroke: '#1B4332',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#1B4332',
      width: 8,
      height: 8,
    },
    animated: false,
  };
}

/**
 * Spouse edge: gold straight line, no arrow, short horizontal connector.
 * Routes from one spouse's RIGHT handle to other's LEFT handle.
 */
function createSpouseEdge(id: string, personA: string, personB: string): Edge {
  return {
    id,
    source: personA,
    target: personB,
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    type: 'straight',
    style: {
      stroke: '#1B4332',
      strokeWidth: 2.5,
    },
    label: '♥',
    labelStyle: {
      fontSize: 11,
      fill: '#1B4332',
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: '#ffffff',
      fillOpacity: 0.9,
    },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 8,
    animated: false,
  };
}

/**
 * Sibling edge: dotted sage line, no arrow.
 * Routes through LEFT/RIGHT handles.
 */
function createSiblingEdge(id: string, personA: string, personB: string): Edge {
  return {
    id,
    source: personA,
    target: personB,
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    type: 'straight',
    style: {
      stroke: '#1B4332',
      strokeWidth: 1.5,
      strokeDasharray: '4 4',
    },
    animated: false,
  };
}

/**
 * Cross-tree connection edge: animated dashed gold.
 */
function createConnectionEdge(id: string, personA: string, personB: string): Edge {
  return {
    id,
    source: personA,
    target: personB,
    type: 'smoothstep',
    style: {
      stroke: '#9ca3af',
      strokeWidth: 1.5,
      strokeDasharray: '8 4',
      opacity: 0.6,
    },
    animated: true,
  };
}

// ─── Hop Distance Calculation ────────────────────────────────

function computeHopDistances(
  centerId: string,
  relationships: Relationship[],
  visibleIds: Set<string>
): Map<string, number> {
  const adj = new Map<string, Set<string>>();
  for (const rel of relationships) {
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_person_id)) continue;
    if (!adj.has(rel.person_id)) adj.set(rel.person_id, new Set());
    if (!adj.has(rel.related_person_id)) adj.set(rel.related_person_id, new Set());
    adj.get(rel.person_id)!.add(rel.related_person_id);
    adj.get(rel.related_person_id)!.add(rel.person_id);
  }

  const distances = new Map<string, number>();
  distances.set(centerId, 0);
  const queue: Array<{ id: string; d: number }> = [{ id: centerId, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    const neighbors = adj.get(id);
    if (!neighbors) continue;
    for (const n of Array.from(neighbors)) {
      if (!distances.has(n)) {
        distances.set(n, d + 1);
        queue.push({ id: n, d: d + 1 });
      }
    }
  }

  return distances;
}

// ─── Main Transform ──────────────────────────────────────────

export function transformToFlow(
  centerPersonId: string,
  selfPersonId: string,
  people: Person[],
  relationships: Relationship[],
  maxHops: number = 3
): { flowNodes: Node[]; flowEdges: Edge[] } {

  // Step 1: Focus Mode — determine which nodes are visible
  const visibleIds = getVisiblePersonIds(centerPersonId, relationships, maxHops);

  // Always include the self person
  visibleIds.add(selfPersonId);

  // Step 2: Compute hop distances from center
  const hopDistances = computeHopDistances(centerPersonId, relationships, visibleIds);

  // Step 3: Build relationship map for labels
  const selfRelMap = new Map<string, string>();
  selfRelMap.set(selfPersonId, 'self');
  for (const rel of relationships) {
    if (rel.person_id === selfPersonId) {
      selfRelMap.set(rel.related_person_id, rel.relationship_type);
    }
  }

  const selfPerson = people.find(p => p.id === selfPersonId);
  const selfOwnerId = selfPerson?.owner_id;

  // Step 4: Build visible nodes
  const visiblePeople = people.filter(p => visibleIds.has(p.id));
  const flowNodes: Node[] = visiblePeople.map(person => {
    const relType = selfRelMap.get(person.id)
      || (person.owner_id !== selfOwnerId ? 'connection' : 'relative');

    return {
      id: person.id,
      type: 'familyNode',
      position: { x: 0, y: 0 }, // Will be set by Dagre
      data: {
        personId: person.id,
        name: person.full_name,
        photoUrl: person.photo_url,
        gender: person.gender,
        dateOfBirth: (person as any).date_of_birth || null,
        email: person.email,
        phone: person.phone_number,
        relationshipType: relType,
        isSelf: person.is_self && person.owner_id === selfOwnerId,
        isLinked: person.user_id !== null,
        isCenterPerson: person.id === centerPersonId,
        hopDistance: hopDistances.get(person.id) ?? 99,
      } as FamilyNodeData,
      draggable: true,
    };
  });

  // Step 5: Build edges — only for visible nodes, properly deduplicated
  const edgeSet = new Set<string>();
  const flowEdges: Edge[] = [];

  for (const rel of relationships) {
    if (!visibleIds.has(rel.person_id) || !visibleIds.has(rel.related_person_id)) continue;
    if (rel.person_id === rel.related_person_id) continue;

    // Deduplicate: create a canonical key per pair + type category
    const type = rel.relationship_type;
    const pairKey = [rel.person_id, rel.related_person_id].sort().join('--');
    const typeCategory =
      type === 'father' || type === 'mother' || type === 'child' ? 'hierarchy'
      : type === 'spouse' ? 'spouse'
      : type === 'sibling' ? 'sibling'
      : 'other';
    const dedupeKey = `${pairKey}::${typeCategory}`;

    if (edgeSet.has(dedupeKey)) continue;
    edgeSet.add(dedupeKey);

    // Determine if cross-tree
    const isCrossTree = (() => {
      const s = people.find(p => p.id === rel.person_id);
      const t = people.find(p => p.id === rel.related_person_id);
      return s && t && s.owner_id !== t.owner_id;
    })();

    if (isCrossTree) {
      flowEdges.push(createConnectionEdge(`edge-${rel.id}`, rel.person_id, rel.related_person_id));
    } else if (type === 'father' || type === 'mother') {
      // `to` is parent of `from` → parent is source, from is target
      flowEdges.push(createParentChildEdge(`edge-${rel.id}`, rel.related_person_id, rel.person_id));
    } else if (type === 'child') {
      // `from` is parent of `to`
      flowEdges.push(createParentChildEdge(`edge-${rel.id}`, rel.person_id, rel.related_person_id));
    } else if (type === 'spouse') {
      flowEdges.push(createSpouseEdge(`edge-${rel.id}`, rel.person_id, rel.related_person_id));
    } else if (type === 'sibling') {
      flowEdges.push(createSiblingEdge(`edge-${rel.id}`, rel.person_id, rel.related_person_id));
    }
  }

  return { flowNodes, flowEdges };
}
