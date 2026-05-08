'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FamilyNodeData } from '@/lib/tree-to-flow';

const COLOR_MAP = {
  self:       { bg: 'bg-gradient-to-br from-[#355E3B] to-[#6E8B74]', text: 'text-white', border: 'border-[#355E3B]', badge: 'bg-[#355E3B]/10 text-[#355E3B]', shadow: 'shadow-[#355E3B]/20' },
  father:     { bg: 'bg-gradient-to-br from-[#8B5E3C]/10 to-[#8B5E3C]/20', text: 'text-[#8B5E3C]', border: 'border-[#8B5E3C]/30', badge: 'bg-[#8B5E3C]/10 text-[#8B5E3C]', shadow: 'shadow-[#8B5E3C]/15' },
  mother:     { bg: 'bg-gradient-to-br from-[#B76E5D]/10 to-[#B76E5D]/20', text: 'text-[#B76E5D]', border: 'border-[#B76E5D]/30', badge: 'bg-[#B76E5D]/10 text-[#B76E5D]', shadow: 'shadow-[#B76E5D]/15' },
  sibling:    { bg: 'bg-gradient-to-br from-[#6E8B74]/10 to-[#6E8B74]/20', text: 'text-[#6E8B74]', border: 'border-[#6E8B74]/30', badge: 'bg-[#6E8B74]/10 text-[#6E8B74]', shadow: 'shadow-[#6E8B74]/15' },
  spouse:     { bg: 'bg-gradient-to-br from-[#C9A66B]/10 to-[#C9A66B]/25', text: 'text-[#8B5E3C]', border: 'border-[#C9A66B]/40', badge: 'bg-[#C9A66B]/10 text-[#8B5E3C]', shadow: 'shadow-[#C9A66B]/15' },
  child:      { bg: 'bg-gradient-to-br from-[#355E3B]/8 to-[#6E8B74]/15', text: 'text-[#355E3B]', border: 'border-[#355E3B]/25', badge: 'bg-[#355E3B]/8 text-[#355E3B]', shadow: 'shadow-[#355E3B]/10' },
  connection: { bg: 'bg-gradient-to-br from-[#C9A66B]/10 to-[#C9A66B]/20', text: 'text-[#8B5E3C]', border: 'border-[#C9A66B]/30', badge: 'bg-[#C9A66B]/10 text-[#8B5E3C]', shadow: 'shadow-[#C9A66B]/15' },
  relative:   { bg: 'bg-gradient-to-br from-[#EFE6D5] to-[#FAF7F2]', text: 'text-[#5E5E5E]', border: 'border-[#C9A66B]/20', badge: 'bg-[#EFE6D5] text-[#5E5E5E]', shadow: 'shadow-[#8B5E3C]/10' },
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

      <div className={`flex flex-col items-center w-28 cursor-pointer group ${nodeData.isHighlighted ? 'ring-2 ring-[#C9A66B] ring-offset-2 rounded-xl' : ''}`}>
        {/* Avatar */}
        <div className="relative">
          <div className={`w-13 h-13 rounded-full border-2 flex items-center justify-center text-sm font-bold overflow-hidden shadow-md ${colors.shadow} ${nodeData.isSelf ? 'bg-gradient-to-br from-[#355E3B] to-[#6E8B74] border-[#355E3B]' : `${colors.bg} ${colors.border}`}`}>
            {nodeData.photoUrl ? (
              <img src={nodeData.photoUrl} alt={nodeData.name} className="w-full h-full object-cover" />
            ) : (
              <span className={nodeData.isSelf ? 'text-white' : colors.text}>{initials}</span>
            )}
          </div>
          {/* Linked user indicator */}
          {nodeData.isLinked && !nodeData.isSelf && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-[#C9A66B] to-[#8B5E3C] rounded-full border-2 border-white shadow-sm" />
          )}
        </div>

        {/* Name */}
        <p className="mt-1.5 text-xs font-semibold text-[#2B2B2B] text-center leading-tight line-clamp-2 max-w-full px-1">
          {nodeData.name}
        </p>

        {/* Relationship badge */}
        <span className={`mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${nodeData.isSelf ? 'bg-[#355E3B]/10 text-[#355E3B]' : colors.badge}`}>
          {label}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export default memo(FamilyNode);
