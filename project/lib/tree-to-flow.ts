import { Node, Edge } from '@xyflow/react';

export type Person = {
  id: string;
  full_name: string;
  gender: string | null;
  photo_url: string | null;
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
  relationshipType: string;
  isSelf: boolean;
  isLinked: boolean;  // true if user_id is not null (a real Aangan user)
};

export function transformToFlow(
  selfPersonId: string,
  people: Person[],
  relationships: Relationship[]
): { flowNodes: Node[]; flowEdges: Edge[] } {

  // Build a map of person_id → relationship_type from self's perspective
  const selfRelMap = new Map<string, string>();
  selfRelMap.set(selfPersonId, 'self');

  // Find relationships where person_id = selfPersonId
  // These tell us: self → related_person has relationship_type
  relationships.forEach(rel => {
    if (rel.person_id === selfPersonId) {
      selfRelMap.set(rel.related_person_id, rel.relationship_type);
    }
  });

  // For people from connected trees (different owner_id),
  // label them as 'connection'
  const selfPerson = people.find(p => p.id === selfPersonId);
  const selfOwnerId = selfPerson?.owner_id;

  // Build flow nodes
  const flowNodes: Node[] = people.map(person => {
    const relType = selfRelMap.get(person.id)
      || (person.owner_id !== selfOwnerId ? 'connection' : 'relative');

    return {
      id: person.id,
      type: 'familyNode',  // matches our custom node type name
      position: { x: 0, y: 0 },  // positions set by layout algorithm
      data: {
        personId: person.id,
        name: person.full_name,
        photoUrl: person.photo_url,
        gender: person.gender,
        relationshipType: relType,
        isSelf: person.is_self && person.owner_id === selfOwnerId,
        isLinked: person.user_id !== null,
      } as FamilyNodeData,
      draggable: true,
    };
  });

  // Build flow edges
  // Deduplicate: if A→B and B→A both exist (reciprocal rels), show only one edge
  const edgeSet = new Set<string>();
  const flowEdges: Edge[] = [];

  relationships.forEach(rel => {
    const key = [rel.person_id, rel.related_person_id].sort().join('--');
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    flowEdges.push({
      id: rel.id,
      source: rel.person_id,
      target: rel.related_person_id,
      type: 'smoothstep',
      label: rel.relationship_type,
      style: { stroke: '#d1d5db', strokeWidth: 2 },
      labelStyle: { fontSize: 10, fill: '#9ca3af' },
      labelBgStyle: { fill: 'transparent' },
    });
  });

  return { flowNodes, flowEdges };
}
