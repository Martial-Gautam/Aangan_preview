import { Node } from '@xyflow/react';
import { FamilyNodeData, Relationship } from './tree-to-flow';

const H_GAP = 220;  // horizontal spacing between nodes
const V_GAP = 160;  // vertical spacing between generations

export function applyFamilyLayout(
  nodes: Node[],
  relationships: Relationship[],
  selfPersonId: string
): Node[] {
  const positioned = new Map<string, { x: number; y: number }>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Step 1: Place self at center
  positioned.set(selfPersonId, { x: 0, y: 0 });

  // Build adjacency from relationships
  const relsByPerson = new Map<string, Relationship[]>();
  relationships.forEach(rel => {
    if (!relsByPerson.has(rel.person_id)) relsByPerson.set(rel.person_id, []);
    relsByPerson.get(rel.person_id)!.push(rel);
  });

  const selfRels = relsByPerson.get(selfPersonId) || [];

  // Step 2: Place parents
  const parents = selfRels.filter(r =>
    r.relationship_type === 'father' || r.relationship_type === 'mother'
  );
  parents.forEach((rel, i) => {
    const offset = (i - (parents.length - 1) / 2) * H_GAP;
    positioned.set(rel.related_person_id, { x: offset, y: -V_GAP });
  });

  // Step 3: Place spouse
  const spouses = selfRels.filter(r => r.relationship_type === 'spouse');
  spouses.forEach((rel, i) => {
    positioned.set(rel.related_person_id, { x: H_GAP * (i + 1), y: 0 });
  });

  // Step 4: Place siblings
  const siblings = selfRels.filter(r => r.relationship_type === 'sibling');
  siblings.forEach((rel, i) => {
    const offset = -(siblings.length - i) * H_GAP;
    positioned.set(rel.related_person_id, { x: offset, y: 0 });
  });

  // Step 5: Place children
  const children = selfRels.filter(r => r.relationship_type === 'child');
  children.forEach((rel, i) => {
    const offset = (i - (children.length - 1) / 2) * H_GAP;
    positioned.set(rel.related_person_id, { x: offset, y: V_GAP });
  });

  // Step 6: Place grandparents (parents of parents)
  parents.forEach(parentRel => {
    const parentId = parentRel.related_person_id;
    const parentPos = positioned.get(parentId)!;
    const grandparentRels = relsByPerson.get(parentId) || [];
    const grandparents = grandparentRels.filter(r =>
      r.relationship_type === 'father' || r.relationship_type === 'mother'
    );
    grandparents.forEach((rel, i) => {
      if (!positioned.has(rel.related_person_id)) {
        const offset = (i - (grandparents.length - 1) / 2) * H_GAP;
        positioned.set(rel.related_person_id, {
          x: parentPos.x + offset,
          y: -V_GAP * 2
        });
      }
    });
  });

  // Step 7: Any remaining unpositioned nodes (connected tree members)
  // Place them in a cluster to the far right
  let extraX = H_GAP * 4;
  let extraY = 0;
  nodes.forEach(node => {
    if (!positioned.has(node.id)) {
      positioned.set(node.id, { x: extraX, y: extraY });
      extraY += V_GAP;
      if (extraY > V_GAP * 3) {
        extraY = 0;
        extraX += H_GAP;
      }
    }
  });

  // Apply positions to nodes
  return nodes.map(node => ({
    ...node,
    position: positioned.get(node.id) || { x: 0, y: 0 }
  }));
}
