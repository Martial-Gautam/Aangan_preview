'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
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
  searchQuery?: string;
}

export default function FamilyFlow({
  selfPersonId,
  people,
  relationships,
  onNodeClick,
  searchQuery = '',
}: FamilyFlowProps) {

  const { flowNodes, flowEdges } = useMemo(() =>
    transformToFlow(selfPersonId, people, relationships),
    [selfPersonId, people, relationships]
  );

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

  const positionedNodes = useMemo(() =>
    applyFamilyLayout(searchedNodes, relationships, selfPersonId),
    [searchedNodes, relationships, selfPersonId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(positionedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // CRITICAL FIX: Sync nodes/edges when data changes.
  // useNodesState/useEdgesState only use the initial value — they don't update
  // when the argument changes. We need useEffect to push new data.
  useEffect(() => {
    setNodes(positionedNodes);
  }, [positionedNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    onNodeClick(node.data.personId);
  }, [onNodeClick]);

  return (
    <div style={{ width: '100%', height: '100%' }} className="absolute inset-0">
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
        <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} color="#e0ddd8" />
        <Controls showInteractive={false} className="!bottom-20 !right-4" />
      </ReactFlow>
    </div>
  );
}
