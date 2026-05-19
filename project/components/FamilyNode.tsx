'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FamilyNodeData } from '@/lib/tree-to-flow';
import { Plus } from 'lucide-react';
import { useFamilyStore } from '@/lib/family-store';

// ─── Color System ────────────────────────────────────────────

const COLOR_MAP: Record<string, {
  ring: string; bg: string; text: string; badge: string; badgeText: string; cardBg: string;
}> = {
  self:       { ring: 'ring-[#355E3B]', bg: 'bg-gradient-to-br from-[#355E3B] to-[#4a7a52]', text: 'text-white', badge: 'bg-[#355E3B]', badgeText: 'text-white', cardBg: 'bg-[#355E3B]/5' },
  father:     { ring: 'ring-[#8B5E3C]/60', bg: 'bg-gradient-to-br from-[#F5EDE3] to-[#EDE0D0]', text: 'text-[#8B5E3C]', badge: 'bg-[#8B5E3C]/12', badgeText: 'text-[#8B5E3C]', cardBg: 'bg-[#8B5E3C]/4' },
  mother:     { ring: 'ring-[#B76E5D]/60', bg: 'bg-gradient-to-br from-[#FAF0ED] to-[#F2E2DD]', text: 'text-[#B76E5D]', badge: 'bg-[#B76E5D]/12', badgeText: 'text-[#B76E5D]', cardBg: 'bg-[#B76E5D]/4' },
  sibling:    { ring: 'ring-[#6E8B74]/60', bg: 'bg-gradient-to-br from-[#EFF5F0] to-[#E0EDE3]', text: 'text-[#4a7a52]', badge: 'bg-[#6E8B74]/12', badgeText: 'text-[#4a7a52]', cardBg: 'bg-[#6E8B74]/4' },
  spouse:     { ring: 'ring-[#C9A66B]/60', bg: 'bg-gradient-to-br from-[#FBF6ED] to-[#F2EADB]', text: 'text-[#8B5E3C]', badge: 'bg-[#C9A66B]/12', badgeText: 'text-[#8B5E3C]', cardBg: 'bg-[#C9A66B]/4' },
  child:      { ring: 'ring-[#355E3B]/40', bg: 'bg-gradient-to-br from-[#F0F5F1] to-[#E5EDE7]', text: 'text-[#355E3B]', badge: 'bg-[#355E3B]/10', badgeText: 'text-[#355E3B]', cardBg: 'bg-[#355E3B]/4' },
  connection: { ring: 'ring-[#C9A66B]/40', bg: 'bg-gradient-to-br from-[#FBF6ED] to-[#F2EADB]', text: 'text-[#8B5E3C]', badge: 'bg-[#C9A66B]/10', badgeText: 'text-[#8B5E3C]', cardBg: 'bg-[#C9A66B]/4' },
  relative:   { ring: 'ring-[#C9A66B]/25', bg: 'bg-gradient-to-br from-[#FAF7F2] to-[#EFE6D5]', text: 'text-[#5E5E5E]', badge: 'bg-[#EFE6D5]', badgeText: 'text-[#5E5E5E]', cardBg: 'bg-[#5E5E5E]/3' },
};

const LABEL_MAP: Record<string, string> = {
  self: 'You', father: 'Father', mother: 'Mother',
  sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
  connection: 'Connected', relative: 'Relative',
};

// ─── Helpers ─────────────────────────────────────────────────

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function isBirthdaySoon(dob: string | null): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  const diff = thisYearBday.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days >= -1 && days <= 7;
}

// ─── Handle Styles ───────────────────────────────────────────

const HANDLE_STYLE = { opacity: 0, width: 8, height: 8 };

// ─── Node Component ──────────────────────────────────────────

function FamilyNode({ data }: NodeProps) {
  const nodeData = data as unknown as FamilyNodeData;
  const setQuickAddTarget = useFamilyStore(s => s.setQuickAddTarget);

  const colors = COLOR_MAP[nodeData.relationshipType as keyof typeof COLOR_MAP] || COLOR_MAP.relative;
  const label = LABEL_MAP[nodeData.relationshipType] || nodeData.relationshipType;
  const initials = nodeData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const age = useMemo(() => calculateAge(nodeData.dateOfBirth), [nodeData.dateOfBirth]);
  const birthdaySoon = useMemo(() => isBirthdaySoon(nodeData.dateOfBirth), [nodeData.dateOfBirth]);

  // Opacity based on hop distance
  const hopOpacity = nodeData.hopDistance <= 1 ? 1 : nodeData.hopDistance === 2 ? 0.9 : 0.7;

  // Search highlight
  const isSearchActive = nodeData.isHighlighted !== undefined;
  const isDimmed = isSearchActive && nodeData.isHighlighted === false;

  const highlightRing = isSearchActive && nodeData.isHighlighted
    ? 'ring-2 ring-[#C9A66B] ring-offset-2 ring-offset-[#FAF7F2]'
    : '';

  const isCentered = nodeData.isCenterPerson;

  return (
    <div
      className={`transition-all duration-300 ease-out ${highlightRing} rounded-2xl`}
      style={{ opacity: isDimmed ? 0.15 : hopOpacity }}
    >
      {/* ─── Connection Handles ─── */}
      {/* Top: target for parent→child edges (child receives from parent above) */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ ...HANDLE_STYLE, top: -2 }} />
      {/* Bottom: source for parent→child edges (parent sends to child below) */}
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ ...HANDLE_STYLE, bottom: -2 }} />
      {/* Left: target for spouse/sibling edges */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ ...HANDLE_STYLE, left: -2 }} />
      {/* Right: source for spouse/sibling edges */}
      <Handle type="source" position={Position.Right} id="right-source" style={{ ...HANDLE_STYLE, right: -2 }} />

      {/* Card container */}
      <div className={`flex flex-col items-center w-[120px] cursor-pointer group relative p-2.5 rounded-2xl ${colors.cardBg} backdrop-blur-sm border border-white/40 shadow-sm hover:shadow-md transition-shadow duration-200`}>

        {/* Center person FOCUS badge */}
        {isCentered && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#355E3B] text-white text-[7px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md z-10 tracking-wider">
            ● FOCUS
          </div>
        )}

        {/* Avatar */}
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-full ring-2 ${colors.ring} flex items-center justify-center text-sm font-bold overflow-hidden shadow-md ${
              nodeData.isSelf
                ? `${colors.bg} shadow-[#355E3B]/25`
                : `${colors.bg} shadow-black/8`
            }`}
          >
            {nodeData.photoUrl ? (
              <img src={nodeData.photoUrl} alt={nodeData.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className={`text-sm font-bold ${colors.text}`}>{initials}</span>
            )}
          </div>

          {/* Self glow pulse */}
          {nodeData.isSelf && (
            <div className="absolute inset-0 rounded-full ring-2 ring-[#355E3B]/30 animate-ping" style={{ animationDuration: '3s' }} />
          )}

          {/* Linked user indicator */}
          {nodeData.isLinked && !nodeData.isSelf && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
          )}

          {/* Birthday badge */}
          {birthdaySoon && (
            <div className="absolute -top-1 -right-1 text-xs animate-bounce" style={{ animationDuration: '2s' }}>🎂</div>
          )}

          {/* Quick-add button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickAddTarget(nodeData.personId);
            }}
            className="absolute -bottom-1 -left-1 w-4.5 h-4.5 bg-[#355E3B] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:scale-110 z-10"
          >
            <Plus size={9} className="text-white" strokeWidth={3} />
          </button>
        </div>

        {/* Name */}
        <p className="mt-1.5 text-[10px] font-semibold text-[#2B2B2B] text-center leading-tight line-clamp-2 max-w-full px-0.5">
          {nodeData.name}
        </p>

        {/* Age */}
        {age !== null && (
          <p className="text-[8px] text-[#5E5E5E]/60 font-medium mt-0.5">{age} yrs</p>
        )}

        {/* Relationship badge */}
        <span className={`mt-1 text-[8px] font-bold px-2 py-[2px] rounded-full tracking-wide uppercase ${colors.badge} ${colors.badgeText}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default memo(FamilyNode);
