'use client';

import { RelationshipType } from '@/lib/supabase';
import { TreeNodeData } from '@/lib/tree-utils';

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  self: { bg: 'bg-[#1B4332]', text: 'text-white', border: 'border-[#1B4332]', badge: 'bg-[#1B4332]/10 text-[#1B4332]' },
  father: { bg: 'bg-[#1B4332]/10', text: 'text-[#1B4332]', border: 'border-[#1B4332]/25', badge: 'bg-[#1B4332]/10 text-[#1B4332]' },
  mother: { bg: 'bg-[#1B4332]/10', text: 'text-[#1B4332]', border: 'border-[#1B4332]/25', badge: 'bg-[#1B4332]/10 text-[#1B4332]' },
  sibling: { bg: 'bg-[#1B4332]/8', text: 'text-[#1B4332]', border: 'border-[#1B4332]/20', badge: 'bg-[#1B4332]/10 text-[#1B4332]' },
  spouse: { bg: 'bg-[#1B4332]/8', text: 'text-[#1B4332]', border: 'border-[#1B4332]/20', badge: 'bg-[#1B4332]/10 text-[#1B4332]' },
  child: { bg: 'bg-[#1B4332]/8', text: 'text-[#1B4332]', border: 'border-[#1B4332]/20', badge: 'bg-[#1B4332]/8 text-[#1B4332]' },
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
            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md shadow-[#1B4332]/20'
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
          isSelf ? 'bg-[#1B4332]/10 text-[#1B4332]' : colors.badge
        }`}
      >
        {label}
      </span>
    </div>
  );
}
