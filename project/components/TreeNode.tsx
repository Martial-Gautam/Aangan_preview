'use client';

import { RelationshipType } from '@/lib/supabase';
import { TreeNodeData } from '@/lib/tree-utils';

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  self: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700' },
  father: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
  mother: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', badge: 'bg-pink-100 text-pink-700' },
  sibling: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-100 text-green-700' },
  spouse: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' },
  child: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-100 text-teal-700' },
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
            ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-200'
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
          isSelf ? 'bg-orange-100 text-orange-700' : colors.badge
        }`}
      >
        {label}
      </span>
    </div>
  );
}
