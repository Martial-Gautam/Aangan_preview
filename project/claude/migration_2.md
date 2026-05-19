PHASE 2 — REPLACE THE TREE VISUALIZATION
Goal: Replace the broken react-d3-tree org-chart with a proper canvas-based family graph using React Flow. Nodes are draggable cards. Edges are smooth curved lines. Pan and zoom built-in. Looks like a real family tree, not a corporate org chart.

2.1 — Create lib/tree-to-flow.ts
Purpose: Transform the raw API response from /api/tree/full into the format React Flow needs.
Input (from API):
typescript{
  self_person_id: string,
  nodes: Person[],        // all people records
  edges: Relationship[],  // all relationship records
  connected_roots: string[]
}
Output (for React Flow):
typescript{
  flowNodes: Node[],   // @xyflow/react Node type
  flowEdges: Edge[]    // @xyflow/react Edge type
}
The transformer logic:
typescriptimport { Node, Edge } from '@xyflow/react';

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
): { flowNodes: Node[], flowEdges: Edge[] } {

  // Build a map of person_id → relationship_type from self's perspective
  // "relationship_type" for display = how this person relates to self
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

2.2 — Create lib/flow-layout.ts
Purpose: Assign x, y positions to every node so the tree looks like a proper family tree — not a random scatter.
Layout rules:

Self node → canvas center (0, 0)
Spouse → directly right of self (220, 0)
Parents → row above self, centered (0, -160)
Siblings → same row as self, spread left and right
Children → row below self (0, 160)
Grandparents → two rows above
Connected tree roots (merged trees) → positioned further out with a gap

The algorithm:
typescriptimport { Node } from '@xyflow/react';
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

2.3 — Create components/FamilyNode.tsx
Purpose: The custom card component that React Flow renders at each node position.
Visual design:

White card, rounded-2xl, shadow-sm, border
52px circular avatar (photo or colored initials)
Name (max 2 lines, truncated)
Relationship badge pill at bottom
Color coded by relationship type (use the brand color map above)
If isLinked = true (real Aangan user), show a small orange dot on avatar corner
Tap the card → call onNodeClick(personId)
Width: 120px fixed

typescript'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FamilyNodeData } from '@/lib/tree-to-flow';

const COLOR_MAP = {
  self:       { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700' },
  father:     { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-50 text-blue-600' },
  mother:     { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', badge: 'bg-pink-50 text-pink-600' },
  sibling:    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-50 text-green-600' },
  spouse:     { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-50 text-amber-600' },
  child:      { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-50 text-teal-600' },
  connection: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', badge: 'bg-indigo-50 text-indigo-600' },
  relative:   { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', badge: 'bg-gray-50 text-gray-600' },
};

const LABEL_MAP: Record<string, string> = {
  self: 'You', father: 'Father', mother: 'Mother',
  sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
  connection: 'Connected', relative: 'Relative',
};

function FamilyNode({ data }: NodeProps) {
  const nodeData = data as FamilyNodeData;
  const colors = COLOR_MAP[nodeData.relationshipType as keyof typeof COLOR_MAP] || COLOR_MAP.relative;
  const initials = nodeData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const label = LABEL_MAP[nodeData.relationshipType] || nodeData.relationshipType;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      <div className="flex flex-col items-center w-28 cursor-pointer group">
        {/* Avatar */}
        <div className="relative">
          <div className={`w-13 h-13 rounded-full border-2 flex items-center justify-center text-sm font-bold overflow-hidden shadow-sm ${nodeData.isSelf ? 'bg-orange-500 border-orange-400 shadow-orange-200 shadow-md' : `${colors.bg} ${colors.border}`}`}>
            {nodeData.photoUrl ? (
              <img src={nodeData.photoUrl} alt={nodeData.name} className="w-full h-full object-cover" />
            ) : (
              <span className={nodeData.isSelf ? 'text-white' : colors.text}>{initials}</span>
            )}
          </div>
          {/* Linked user indicator */}
          {nodeData.isLinked && !nodeData.isSelf && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Name */}
        <p className="mt-1.5 text-xs font-semibold text-gray-800 text-center leading-tight line-clamp-2 max-w-full px-1">
          {nodeData.name}
        </p>

        {/* Relationship badge */}
        <span className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${nodeData.isSelf ? 'bg-orange-100 text-orange-700' : colors.badge}`}>
          {label}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export default memo(FamilyNode);

2.4 — Create components/FamilyFlow.tsx
Purpose: The main canvas component. Wraps React Flow, handles node clicks, shows the empty state.
typescript'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import FamilyNode from './FamilyNode';
import { transformToFlow, Person, Relationship } from '@/lib/tree-to-flow';
import { applyFamilyLayout } from '@/lib/flow-layout';

const nodeTypes = { familyNode: FamilyNode };

interface FamilyFlowProps {
  selfPersonId: string;
  people: Person[];
  relationships: Relationship[];
  onNodeClick: (personId: string) => void;
}

export default function FamilyFlow({
  selfPersonId,
  people,
  relationships,
  onNodeClick,
}: FamilyFlowProps) {

  const { flowNodes, flowEdges } = useMemo(() =>
    transformToFlow(selfPersonId, people, relationships),
    [selfPersonId, people, relationships]
  );

  const positionedNodes = useMemo(() =>
    applyFamilyLayout(flowNodes, relationships, selfPersonId),
    [flowNodes, relationships, selfPersonId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(positionedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const handleNodeClick = useCallback((_: any, node: any) => {
    onNodeClick(node.data.personId);
  }, [onNodeClick]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} className="!bottom-20 !right-4" />
      </ReactFlow>
    </div>
  );
}

2.5 — Modify app/home/page.tsx
Remove entirely:

All imports related to react-d3-tree
The Tree dynamic import
translate state
zoom state
treeContainerRef
handleZoomIn, handleZoomOut, handleFit functions
buildNetworkTreeData import
treeData state
renderCustomNode function
The entire <Tree> JSX block and zoom control buttons

Add:
typescriptimport FamilyFlow from '@/components/FamilyFlow';
import { Person, Relationship } from '@/lib/tree-to-flow';

// New state variables
const [people, setPeople] = useState<Person[]>([]);
const [relationships, setRelationships] = useState<Relationship[]>([]);
const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
Modify fetchFamily to set people and relationships directly from API response instead of building a tree data structure.
Replace the tree JSX with:
tsx{selfPerson && people.length > 1 ? (
  <FamilyFlow
    selfPersonId={selfPerson.id}
    people={people}
    relationships={relationships}
    onNodeClick={(id) => setSelectedPersonId(id)}
  />
) : (
  /* existing empty state JSX — keep as-is */
)}

{/* Member detail sheet — see Phase 2.6 */}
{selectedPersonId && (
  <MemberDetailSheet
    personId={selectedPersonId}
    onClose={() => setSelectedPersonId(null)}
  />
)}

2.6 — Create Member Detail Sheet
Purpose: When user taps a node, a bottom sheet slides up showing that person's details.
File: components/MemberDetailSheet.tsx
Content of the sheet:

Large avatar
Full name
Relationship to self
DOB (formatted)
Gender
If isLinked: show "Aangan member" badge
Buttons:

"Edit" → navigates to /edit-member/[id]
"Remove" → calls DELETE API (only if user_id is null — cannot delete linked profiles)
"View Connections" → shows their family members (future feature, show "Coming soon" for now)



Implementation: Use shadcn Sheet component (components/ui/sheet.tsx) which is already installed. Slide up from bottom. Fetch person details from people array already in state — no extra API call needed.

2.7 — Create app/edit-member/[id]/page.tsx
Purpose: Edit an existing family member's details. Currently completely missing.
Behavior:

Same form layout as app/add-member/page.tsx
On load: fetch person by ID from Supabase, pre-fill all fields
Relationship type field: READ ONLY (cannot change someone from father to sibling)
Save calls a new API route: app/api/members/update/route.ts
On success: navigate back to /home

New API route app/api/members/update/route.ts:

Method: POST
Body: { person_id, full_name, gender, date_of_birth, photo_url, email, phone_number }
Auth: same Bearer token pattern as all other routes
Validates user owns this person (owner_id = user.id)
Cannot update is_self = true nodes through this route (use profile page for that)
Updates both people table and Supabase Storage if new photo uploaded