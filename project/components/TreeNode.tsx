'use client';

import { RelationshipType } from '@/lib/supabase';
import { TreeNodeData } from '@/lib/tree-utils';

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  self: { bg: 'bg-[#2A4365]', text: 'text-white', border: 'border-[#2A4365]', badge: 'bg-[#2A4365]/10 text-[#2A4365]' },
  father: { bg: 'bg-[#2A4365]/10', text: 'text-[#2A4365]', border: 'border-[#2A4365]/25', badge: 'bg-[#2A4365]/10 text-[#2A4365]' },
  mother: { bg: 'bg-[#2A4365]/10', text: 'text-[#2A4365]', border: 'border-[#2A4365]/25', badge: 'bg-[#2A4365]/10 text-[#2A4365]' },
  sibling: { bg: 'bg-[#2A4365]/8', text: 'text-[#2A4365]', border: 'border-[#2A4365]/20', badge: 'bg-[#2A4365]/10 text-[#2A4365]' },
  spouse: { bg: 'bg-[#2A4365]/8', text: 'text-[#2A4365]', border: 'border-[#2A4365]/20', badge: 'bg-[#2A4365]/10 text-[#2A4365]' },
  child: { bg: 'bg-[#2A4365]/8', text: 'text-[#2A4365]', border: 'border-[#2A4365]/20', badge: 'bg-[#2A4365]/8 text-[#2A4365]' },
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
            ? 'bg-[#2A4365] text-white border-[#2A4365] shadow-md shadow-[#2A4365]/20'
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
      <p className="family-tree-label mt-1.5 text-xs text-gray-800 text-center leading-tight max-w-[110px] truncate">
        {name}
      </p>

      {/* Relationship badge */}
      <span
        className={`meta-text mt-1 px-2 py-0.5 rounded-full ${
          isSelf ? 'bg-[#2A4365]/10 text-[#2A4365]' : colors.badge
        }`}
      >
        {label}
      </span>
    </div>
  );
}
