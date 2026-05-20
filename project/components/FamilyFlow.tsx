'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import FamilyNode from './FamilyNode';
import { transformToFlow, Person, Relationship } from '@/lib/tree-to-flow';
import { applyDagreLayout } from '@/lib/flow-layout';

const nodeTypes = { familyNode: FamilyNode };

// MiniMap color mapping
function miniMapNodeColor(node: any): string {
  if (node.data?.isCenterPerson) return '#1B4332';
  const rel = node.data?.relationshipType;
  if (rel === 'self') return '#1B4332';
  if (rel === 'father' || rel === 'mother') return '#1B4332';
  if (rel === 'spouse') return '#1B4332';
  if (rel === 'child') return '#1B4332';
  if (rel === 'sibling') return '#1B4332';
  if (rel === 'connection') return '#9ca3af';
  return '#9ca3af';
}

// ─── Inner Component (needs ReactFlowProvider) ──────────────

interface FamilyFlowInnerProps {
  selfPersonId: string;
  people: Person[];
  relationships: Relationship[];
  onNodeClick: (personId: string) => void;
  searchQuery?: string;
  centerPersonId: string;
  onCenterChange: (personId: string) => void;
  maxHops?: number;
}

function FamilyFlowInner({
  selfPersonId,
  people,
  relationships,
  onNodeClick,
  searchQuery = '',
  centerPersonId,
  onCenterChange,
  maxHops = 3,
}: FamilyFlowInnerProps) {
  const reactFlowInstance = useReactFlow();

  // Transform data with Focus Mode
  const { flowNodes, flowEdges } = useMemo(() =>
    transformToFlow(centerPersonId, selfPersonId, people, relationships, maxHops),
    [centerPersonId, selfPersonId, people, relationships, maxHops]
  );

  // Apply search highlighting
  const searchedNodes = useMemo(() => {
    if (!searchQuery.trim()) return flowNodes;
    const lowerQuery = searchQuery.toLowerCase();
    return flowNodes.map(node => {
      const d = node.data;
      const matches =
        (d.name as string).toLowerCase().includes(lowerQuery) ||
        ((d.email as string) || '').toLowerCase().includes(lowerQuery) ||
        ((d.phone as string) || '').includes(lowerQuery) ||
        ((d.relationshipType as string) || '').toLowerCase().includes(lowerQuery);
      return {
        ...node,
        data: { ...d, isHighlighted: matches }
      };
    });
  }, [flowNodes, searchQuery]);

  // Apply Dagre layout
  const { layoutNodes, layoutEdges } = useMemo(() =>
    applyDagreLayout(searchedNodes, flowEdges, centerPersonId, relationships),
    [searchedNodes, flowEdges, centerPersonId, relationships]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync when data changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);

    // Auto-fit view after layout with smooth animation
    setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.4,
        maxZoom: 1.0,
        duration: 500,
      });
    }, 80);
  }, [layoutNodes, layoutEdges, setNodes, setEdges, reactFlowInstance]);

  // Handle node click — single click selects
  const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    onNodeClick(node.data.personId);
  }, [onNodeClick]);

  // Double-click = re-center the view on this person (Focus Mode navigation)
  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: any) => {
    onCenterChange(node.data.personId);
  }, [onCenterChange]);

  const showMiniMap = nodes.length > 6;

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.4, maxZoom: 1.0 }}
      minZoom={0.2}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
      // Cleaner default edge appearance
      defaultEdgeOptions={{
        style: { strokeWidth: 1.5 },
      }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={0.6}
        color="#ddd8d0"
      />
      {showMiniMap && (
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(250, 247, 242, 0.85)"
          className="!bottom-20 !left-4 !bg-white/60 !backdrop-blur-xl !border !border-white/20 !rounded-xl !shadow-lg"
          pannable
          zoomable
          style={{ width: 110, height: 75 }}
        />
      )}
    </ReactFlow>
  );
}

// ─── Outer Component with Provider ───────────────────────────

interface FamilyFlowProps {
  selfPersonId: string;
  people: Person[];
  relationships: Relationship[];
  onNodeClick: (personId: string) => void;
  searchQuery?: string;
  centerPersonId: string;
  onCenterChange: (personId: string) => void;
  maxHops?: number;
}

export default function FamilyFlow(props: FamilyFlowProps) {
  return (
    <div style={{ width: '100%', height: '100%' }} className="absolute inset-0">
      <ReactFlowProvider>
        <FamilyFlowInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
