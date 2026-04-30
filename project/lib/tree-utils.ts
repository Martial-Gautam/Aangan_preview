import { Person, Relationship, RelationshipType } from './supabase';

export type TreeRelationshipType = RelationshipType | 'self' | 'connection';

export interface TreeNodeData {
  name: string;
  attributes: {
    personId: string;
    photoUrl: string | null;
    gender: string | null;
    relationshipType: TreeRelationshipType;
    isSelf: boolean;
  };
  children: TreeNodeData[];
}

const RELATIONSHIP_ORDER: RelationshipType[] = ['father', 'mother', 'spouse', 'sibling', 'child'];

export function buildTreeData(
  selfPerson: Person,
  relationships: Relationship[],
  people: Person[]
): TreeNodeData {
  const rootNode: TreeNodeData = {
    name: selfPerson.full_name || 'You',
    attributes: {
      personId: selfPerson.id,
      photoUrl: selfPerson.photo_url,
      gender: selfPerson.gender,
      relationshipType: 'self',
      isSelf: true,
    },
    children: [],
  };

  if (!relationships || relationships.length === 0) return rootNode;

  const sortedRels = [...relationships].sort((a, b) => {
    const ai = RELATIONSHIP_ORDER.indexOf(a.relationship_type);
    const bi = RELATIONSHIP_ORDER.indexOf(b.relationship_type);
    return ai - bi;
  });

  for (const rel of sortedRels) {
    const person = people.find((p) => p.id === rel.related_person_id);
    if (!person) continue;

    rootNode.children.push({
      name: person.full_name || 'Unknown',
      attributes: {
        personId: person.id,
        photoUrl: person.photo_url,
        gender: person.gender,
        relationshipType: rel.relationship_type,
        isSelf: false,
      },
      children: [],
    });
  }

  return rootNode;
}

export function buildNetworkTreeData(
  selfPersonId: string,
  people: Person[],
  relationships: Relationship[],
  connectedRoots: string[]
): TreeNodeData | null {
  const peopleById = new Map<string, Person>();
  people.forEach((p) => peopleById.set(p.id, p));

  const adjacency = new Map<string, Array<{ id: string; relationship: RelationshipType }>>();
  relationships.forEach((rel) => {
    const list = adjacency.get(rel.person_id) || [];
    list.push({ id: rel.related_person_id, relationship: rel.relationship_type });
    adjacency.set(rel.person_id, list);
  });

  const visited = new Set<string>();

  const buildNode = (
    personId: string,
    relationshipType: TreeRelationshipType,
    isSelf: boolean
  ): TreeNodeData | null => {
    if (visited.has(personId)) return null;
    const person = peopleById.get(personId);
    if (!person) return null;
    visited.add(personId);

    const node: TreeNodeData = {
      name: person.full_name || 'Unknown',
      attributes: {
        personId: person.id,
        photoUrl: person.photo_url,
        gender: person.gender,
        relationshipType,
        isSelf,
      },
      children: [],
    };

    const children = adjacency.get(personId) || [];
    for (const child of children) {
      const childNode = buildNode(child.id, child.relationship, false);
      if (childNode) node.children.push(childNode);
    }

    return node;
  };

  const root = buildNode(selfPersonId, 'self', true);
  if (!root) return null;

  for (const rootId of connectedRoots) {
    if (rootId === selfPersonId) continue;
    const connectedNode = buildNode(rootId, 'connection', false);
    if (connectedNode) root.children.push(connectedNode);
  }

  return root;
}
