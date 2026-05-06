'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FamilyNodeData } from '@/lib/tree-to-flow';

const COLOR_MAP = {
  self:       { bg: 'bg-gradient-to-br from-orange-500 to-amber-500', text: 'text-white', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700', shadow: 'shadow-orange-200/60' },
  father:     { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', text: 'text-blue-600', border: 'border-blue-200/80', badge: 'bg-blue-50 text-blue-600', shadow: 'shadow-blue-100/40' },
  mother:     { bg: 'bg-gradient-to-br from-pink-50 to-pink-100', text: 'text-pink-600', border: 'border-pink-200/80', badge: 'bg-pink-50 text-pink-600', shadow: 'shadow-pink-100/40' },
  sibling:    { bg: 'bg-gradient-to-br from-green-50 to-green-100', text: 'text-green-600', border: 'border-green-200/80', badge: 'bg-green-50 text-green-600', shadow: 'shadow-green-100/40' },
  spouse:     { bg: 'bg-gradient-to-br from-amber-50 to-amber-100', text: 'text-amber-600', border: 'border-amber-200/80', badge: 'bg-amber-50 text-amber-600', shadow: 'shadow-amber-100/40' },
  child:      { bg: 'bg-gradient-to-br from-teal-50 to-teal-100', text: 'text-teal-600', border: 'border-teal-200/80', badge: 'bg-teal-50 text-teal-600', shadow: 'shadow-teal-100/40' },
  connection: { bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200/80', badge: 'bg-indigo-50 text-indigo-600', shadow: 'shadow-indigo-100/40' },
  relative:   { bg: 'bg-gradient-to-br from-gray-50 to-gray-100', text: 'text-gray-600', border: 'border-gray-200/80', badge: 'bg-gray-50 text-gray-600', shadow: 'shadow-gray-100/40' },
};

const LABEL_MAP: Record<string, string> = {
  self: 'You', father: 'Father', mother: 'Mother',
  sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
  connection: 'Connected', relative: 'Relative',
};

function FamilyNode({ data }: NodeProps) {
  const nodeData = data as unknown as FamilyNodeData;
  const colors = COLOR_MAP[nodeData.relationshipType as keyof typeof COLOR_MAP] || COLOR_MAP.relative;
  const initials = nodeData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const label = LABEL_MAP[nodeData.relationshipType] || nodeData.relationshipType;
  
  // If isHighlighted is explicitly false, dim the node. If it's true or undefined, keep it normal.
  const opacityClass = nodeData.isHighlighted === false ? 'opacity-20' : 'opacity-100';

  return (
    <div className={`transition-opacity duration-300 ${opacityClass}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div className={`flex flex-col items-center w-28 cursor-pointer group ${nodeData.isHighlighted ? 'ring-2 ring-orange-400 ring-offset-2 rounded-xl' : ''}`}>
        {/* Avatar */}
        <div className="relative">
          <div className={`w-13 h-13 rounded-full border-2 flex items-center justify-center text-sm font-bold overflow-hidden shadow-md ${colors.shadow} ${nodeData.isSelf ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-orange-400' : `${colors.bg} ${colors.border}`}`}>
            {nodeData.photoUrl ? (
              <img src={nodeData.photoUrl} alt={nodeData.name} className="w-full h-full object-cover" />
            ) : (
              <span className={nodeData.isSelf ? 'text-white' : colors.text}>{initials}</span>
            )}
          </div>
          {/* Linked user indicator */}
          {nodeData.isLinked && !nodeData.isSelf && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full border-2 border-white shadow-sm" />
          )}
        </div>

        {/* Name */}
        <p className="mt-1.5 text-xs font-semibold text-gray-700 text-center leading-tight line-clamp-2 max-w-full px-1">
          {nodeData.name}
        </p>

        {/* Relationship badge */}
        <span className={`mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${nodeData.isSelf ? 'bg-orange-100 text-orange-700' : colors.badge}`}>
          {label}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export default memo(FamilyNode);
