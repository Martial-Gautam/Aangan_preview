'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Person, Relationship } from '@/lib/tree-to-flow';
import { Pencil, Trash2, Users, LinkIcon, Route } from 'lucide-react';
import { calculateDegree } from '@/lib/degree-calculator';

const LABEL_MAP: Record<string, string> = {
  self: 'You', father: 'Father', mother: 'Mother',
  sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
  connection: 'Connected', relative: 'Relative',
};

const COLOR_MAP: Record<string, string> = {
  self: 'bg-[#355E3B]/10 text-[#355E3B]',
  father: 'bg-[#8B5E3C]/10 text-[#8B5E3C]',
  mother: 'bg-[#B76E5D]/10 text-[#B76E5D]',
  sibling: 'bg-[#6E8B74]/10 text-[#6E8B74]',
  spouse: 'bg-[#C9A66B]/10 text-[#8B5E3C]',
  child: 'bg-[#355E3B]/8 text-[#355E3B]',
  connection: 'bg-[#C9A66B]/10 text-[#8B5E3C]',
  relative: 'bg-[#EFE6D5] text-[#5E5E5E]',
};

interface MemberDetailSheetProps {
  personId: string | null;
  people: Person[];
  relationships: Relationship[];
  selfPersonId: string;
  onClose: () => void;
  onDelete?: (personId: string) => void;
  accessToken: string;
}

export default function MemberDetailSheet({
  personId,
  people,
  relationships,
  selfPersonId,
  onClose,
  onDelete,
  accessToken,
}: MemberDetailSheetProps) {
  const router = useRouter();

  const person = useMemo(
    () => people.find(p => p.id === personId) || null,
    [people, personId]
  );

  const relationshipType = useMemo(() => {
    if (!personId) return 'relative';
    if (personId === selfPersonId) return 'self';
    const rel = relationships.find(
      r => r.person_id === selfPersonId && r.related_person_id === personId
    );
    return rel?.relationship_type || 'relative';
  }, [personId, selfPersonId, relationships]);

  const degreeResult = useMemo(() => {
    if (!personId || personId === selfPersonId) return null;
    return calculateDegree(selfPersonId, personId, relationships);
  }, [personId, selfPersonId, relationships]);

  if (!person) return null;

  const initials = person.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const label = LABEL_MAP[relationshipType] || relationshipType;
  const badgeColor = COLOR_MAP[relationshipType] || COLOR_MAP.relative;
  const isSelf = person.is_self && person.id === selfPersonId;
  const isLinked = person.user_id !== null;
  const canEdit = !isSelf; // Self profile is edited via profile page
  const canDelete = !isSelf && !isLinked;

  const handleDelete = async () => {
    if (!personId || !confirm('Are you sure you want to remove this family member?')) return;

    try {
      const res = await fetch('/api/members/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ person_id: personId }),
      });

      if (res.ok) {
        onDelete?.(personId);
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch {
      alert('Failed to remove member');
    }
  };

  return (
    <Sheet open={!!personId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[70vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>{person.full_name}</SheetTitle>
        </SheetHeader>

        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-xl font-bold overflow-hidden shadow-sm ${isSelf ? 'bg-gradient-to-br from-[#355E3B] to-[#6E8B74] border-[#355E3B] shadow-[#355E3B]/20 shadow-md' : 'bg-[#EFE6D5] border-[#C9A66B]/30'}`}>
              {person.photo_url ? (
                <img src={person.photo_url} alt={person.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className={isSelf ? 'text-white' : 'text-[#5E5E5E]'}>{initials}</span>
              )}
            </div>
            {isLinked && !isSelf && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#C9A66B] rounded-full border-2 border-white flex items-center justify-center">
                <LinkIcon size={10} className="text-white" />
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-lg font-bold text-gray-900">{person.full_name}</h2>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}>
              {label}
            </span>
            {isLinked && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#C9A66B]/10 text-[#8B5E3C] flex items-center gap-1">
                <LinkIcon size={10} /> Aangan member
              </span>
            )}
          </div>

          {/* Degree of relationship */}
          {degreeResult && degreeResult.degree > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <Route size={12} className="text-[#C9A66B]" />
              <span>
                You and <span className="font-semibold text-gray-700">{person.full_name.split(' ')[0]}</span> are{' '}
                <span className="font-semibold text-[#355E3B]">{degreeResult.label}</span>
                <span className="text-gray-400 ml-1">({degreeResult.degree} {degreeResult.degree === 1 ? 'hop' : 'hops'} apart)</span>
              </span>
            </div>
          )}

          {/* Details */}
          <div className="w-full mt-5 space-y-2 text-left">
            {person.gender && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Gender</span>
                <span className="text-sm font-medium text-gray-800 capitalize">{person.gender}</span>
              </div>
            )}
            {(person as any).date_of_birth && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Date of Birth</span>
                <span className="text-sm font-medium text-gray-800">
                  {new Date((person as any).date_of_birth).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-full mt-6 space-y-2">
            {canEdit && (
              <button
                onClick={() => { onClose(); router.push(`/edit-member/${personId}`); }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all shadow-lg shadow-[#355E3B]/20"
              >
                <Pencil size={16} /> Edit Member
              </button>
            )}

            <button
              onClick={() => alert('Coming soon!')}
              className="w-full py-3 px-4 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              <Users size={16} /> View Connections
            </button>

            {canDelete && (
              <button
                onClick={handleDelete}
                className="w-full py-3 px-4 rounded-2xl bg-[#6B2E2E]/8 text-[#6B2E2E] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#6B2E2E]/15 active:scale-[0.98] transition-all"
              >
                <Trash2 size={16} /> Remove Member
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
