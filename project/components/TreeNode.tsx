'use client';

import { RelationshipType } from '@/lib/supabase';
import { TreeNodeData } from '@/lib/tree-utils';

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  self: { bg: 'bg-[#355E3B]', text: 'text-white', border: 'border-[#355E3B]', badge: 'bg-[#355E3B]/10 text-[#355E3B]' },
  father: { bg: 'bg-[#8B5E3C]/15', text: 'text-[#8B5E3C]', border: 'border-[#8B5E3C]/30', badge: 'bg-[#8B5E3C]/10 text-[#8B5E3C]' },
  mother: { bg: 'bg-[#B76E5D]/15', text: 'text-[#B76E5D]', border: 'border-[#B76E5D]/30', badge: 'bg-[#B76E5D]/10 text-[#B76E5D]' },
  sibling: { bg: 'bg-[#6E8B74]/15', text: 'text-[#6E8B74]', border: 'border-[#6E8B74]/30', badge: 'bg-[#6E8B74]/10 text-[#6E8B74]' },
  spouse: { bg: 'bg-[#C9A66B]/15', text: 'text-[#8B5E3C]', border: 'border-[#C9A66B]/30', badge: 'bg-[#C9A66B]/10 text-[#8B5E3C]' },
  child: { bg: 'bg-[#355E3B]/10', text: 'text-[#355E3B]', border: 'border-[#355E3B]/25', badge: 'bg-[#355E3B]/8 text-[#355E3B]' },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'You',
  father: 'Father',
  mother: 'Mother',
  sibling: 'Sibling',
  spouse: 'Spouse',
  child: 'Child',
};

interface TreeNodeProps {
  nodeData: TreeNodeData;
}

export default function TreeNode({ nodeData }: TreeNodeProps) {
  const { name, attributes } = nodeData;
  const relType = attributes.relationshipType;
  const colors = RELATIONSHIP_COLORS[relType] || RELATIONSHIP_COLORS.self;
  const label = RELATIONSHIP_LABELS[relType] || relType;
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const isSelf = attributes.isSelf;

  return (
    <div className="flex flex-col items-center" style={{ width: 120 }}>
      {/* Avatar */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-sm ${
          isSelf
            ? 'bg-[#355E3B] text-white border-[#355E3B] shadow-md shadow-[#355E3B]/20'
            : `${colors.bg} ${colors.text} ${colors.border}`
        }`}
      >
        {attributes.photoUrl ? (
          <img
            src={attributes.photoUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className={isSelf ? 'text-white' : colors.text}>{initials}</span>
        )}
      </div>

      {/* Name */}
      <p className="mt-1.5 text-xs font-semibold text-gray-800 text-center leading-tight max-w-[110px] truncate">
        {name}
      </p>

      {/* Relationship badge */}
      <span
        className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isSelf ? 'bg-[#355E3B]/10 text-[#355E3B]' : colors.badge
        }`}
      >
        {label}
      </span>
    </div>
  );
}
