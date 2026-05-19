/**
 * Degree of Relationship Calculator
 *
 * Uses BFS (Breadth-First Search) through the relationships graph
 * to find the shortest path between two person nodes and returns
 * a human-readable relationship label.
 */

interface RelationshipEdge {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: string;
}

interface DegreeResult {
  /** Number of hops between the two people (-1 if not connected) */
  degree: number;
  /** The path of person IDs traversed */
  path: string[];
  /** The relationship types along the path */
  relationshipPath: string[];
  /** Human-readable label */
  label: string;
}

/**
 * Calculate the degree of relationship between two people
 * using BFS through the relationship graph.
 */
export function calculateDegree(
  personAId: string,
  personBId: string,
  allRelationships: RelationshipEdge[]
): DegreeResult {
  if (personAId === personBId) {
    return { degree: 0, path: [personAId], relationshipPath: [], label: 'Self' };
  }

  // Build adjacency list
  const adjacency = new Map<string, Array<{ personId: string; relType: string }>>();

  for (const rel of allRelationships) {
    if (!adjacency.has(rel.person_id)) {
      adjacency.set(rel.person_id, []);
    }
    adjacency.get(rel.person_id)!.push({
      personId: rel.related_person_id,
      relType: rel.relationship_type,
    });

    if (!adjacency.has(rel.related_person_id)) {
      adjacency.set(rel.related_person_id, []);
    }
    adjacency.get(rel.related_person_id)!.push({
      personId: rel.person_id,
      relType: reverseRelType(rel.relationship_type),
    });
  }

  // BFS
  const visited = new Set<string>();
  const queue: Array<{
    personId: string;
    path: string[];
    relPath: string[];
  }> = [{ personId: personAId, path: [personAId], relPath: [] }];

  visited.add(personAId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    const neighbors = adjacency.get(current.personId) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.personId)) continue;

      const newPath = [...current.path, neighbor.personId];
      const newRelPath = [...current.relPath, neighbor.relType];

      if (neighbor.personId === personBId) {
        const degree = newPath.length - 1;
        return {
          degree,
          path: newPath,
          relationshipPath: newRelPath,
          label: degreeToLabel(degree, newRelPath),
        };
      }

      visited.add(neighbor.personId);
      queue.push({
        personId: neighbor.personId,
        path: newPath,
        relPath: newRelPath,
      });
    }
  }

  // Not connected
  return {
    degree: -1,
    path: [],
    relationshipPath: [],
    label: 'Not connected',
  };
}

/**
 * Get the reverse relationship type
 */
function reverseRelType(relType: string): string {
  switch (relType) {
    case 'father':
    case 'mother':
      return 'child';
    case 'child':
      return 'parent';
    case 'spouse':
      return 'spouse';
    case 'sibling':
      return 'sibling';
    default:
      return relType;
  }
}

/**
 * Convert a degree (hop count) and relationship path to a human-readable label.
 */
function degreeToLabel(degree: number, relPath: string[]): string {
  if (degree === 0) return 'Self';

  // Direct relationship (1 hop)
  if (degree === 1) {
    const rel = relPath[0];
    const labels: Record<string, string> = {
      father: 'Father',
      mother: 'Mother',
      child: 'Child',
      spouse: 'Spouse',
      sibling: 'Sibling',
      parent: 'Parent',
    };
    return labels[rel] || 'Immediate Family';
  }

  // 2 hops
  if (degree === 2) {
    const [first, second] = relPath;
    const isParent = (r: string) => ['father', 'mother', 'parent'].includes(r);

    // Parent's parent = grandparent
    if (isParent(first) && isParent(second)) return 'Grandparent';

    // Child's child = grandchild
    if (first === 'child' && second === 'child') return 'Grandchild';

    // Parent's sibling = aunt/uncle
    if (isParent(first) && second === 'sibling') return 'Aunt/Uncle';

    // Sibling's child = nephew/niece
    if (first === 'sibling' && second === 'child') return 'Nephew/Niece';

    // Sibling's spouse = sibling-in-law
    if (first === 'sibling' && second === 'spouse') return 'Sibling-in-law';

    // Parent's spouse = step-parent
    if (isParent(first) && second === 'spouse') return 'Step-parent';

    // Spouse's child = step-child
    if (first === 'spouse' && second === 'child') return 'Step-child';

    // Spouse's sibling = sibling-in-law
    if (first === 'spouse' && second === 'sibling') return 'Sibling-in-law';

    // Spouse's parent = parent-in-law
    if (first === 'spouse' && isParent(second)) return 'Parent-in-law';

    // Child's spouse = child-in-law
    if (first === 'child' && second === 'spouse') return 'Child-in-law';

    return '2nd degree relative';
  }

  // 3 hops
  if (degree === 3) {
    const allParent = relPath.every(r =>
      ['father', 'mother', 'parent'].includes(r)
    );
    if (allParent) return 'Great-grandparent';

    const allChild = relPath.every(r => r === 'child');
    if (allChild) return 'Great-grandchild';

    // Parent → parent → sibling = great aunt/uncle
    if (
      ['father', 'mother', 'parent'].includes(relPath[0]) &&
      ['father', 'mother', 'parent'].includes(relPath[1]) &&
      relPath[2] === 'sibling'
    ) {
      return 'Great-aunt/uncle';
    }

    // Parent → sibling → child = first cousin
    if (
      ['father', 'mother', 'parent'].includes(relPath[0]) &&
      relPath[1] === 'sibling' &&
      relPath[2] === 'child'
    ) {
      return 'First Cousin';
    }

    return '3rd degree relative';
  }

  // 4 hops
  if (degree === 4) {
    const isParent = (r: string) => ['father', 'mother', 'parent'].includes(r);

    // Parent → parent → sibling → child = first cousin once removed
    if (isParent(relPath[0]) && isParent(relPath[1]) && relPath[2] === 'sibling' && relPath[3] === 'child') {
      return 'First Cousin Once Removed';
    }

    // Parent → sibling → child → child = first cousin's child
    if (isParent(relPath[0]) && relPath[1] === 'sibling' && relPath[2] === 'child' && relPath[3] === 'child') {
      return 'First Cousin Once Removed';
    }

    // Spouse → sibling → spouse = co-sibling-in-law
    if (relPath[0] === 'spouse' && relPath[1] === 'sibling' && relPath[2] === 'spouse') {
      return 'Co-sibling-in-law';
    }

    return '4th degree relative';
  }

  // 5+ hops
  return `${getOrdinal(degree)} degree relative`;
}

/**
 * Get ordinal suffix for a number
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0] || 'th';
  return n + suffix;
}
