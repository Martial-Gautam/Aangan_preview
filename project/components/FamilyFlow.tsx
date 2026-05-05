'use client';

import { useCallback, useMemo } from 'react';
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
    return flowNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: (node.data.name as string).toLowerCase().includes(lowerQuery)
      }
    }));
  }, [flowNodes, searchQuery]);

  const positionedNodes = useMemo(() =>
    applyFamilyLayout(searchedNodes, relationships, selfPersonId),
    [searchedNodes, relationships, selfPersonId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(positionedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
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
