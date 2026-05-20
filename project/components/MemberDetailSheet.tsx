'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Person, Relationship } from '@/lib/tree-to-flow';
import { Pencil, Trash2, LinkIcon, Route, MessageCircle, UserPlus, Calendar, Cake } from 'lucide-react';
import { calculateDegree } from '@/lib/degree-calculator';
import { useFamilyStore } from '@/lib/family-store';

const LABEL_MAP: Record<string, string> = {
  self: 'You', father: 'Father', mother: 'Mother',
  sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
  connection: 'Connected', relative: 'Relative',
};

const COLOR_MAP: Record<string, string> = {
  self: 'bg-[#1B4332] text-white',
  father: 'bg-[#1B4332]/10 text-[#1B4332]',
  mother: 'bg-[#1B4332]/10 text-[#1B4332]',
  sibling: 'bg-[#1B4332]/10 text-[#1B4332]',
  spouse: 'bg-[#1B4332]/10 text-[#1B4332]',
  child: 'bg-[#1B4332]/10 text-[#1B4332]',
  connection: 'bg-[#1B4332]/10 text-[#1B4332]',
  relative: 'bg-gray-100 text-gray-500',
};

// ─── Helpers ─────────────────────────────────────────────────

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function getBirthdayCountdown(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday < today) {
    nextBday = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
  const diff = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Birthday today!';
  if (diff === 1) return 'Birthday tomorrow!';
  if (diff <= 30) return `Birthday in ${diff} days`;
  return null;
}

function getImmediateFamily(
  personId: string,
  relationships: Relationship[],
  people: Person[]
): Array<{ person: Person; relType: string }> {
  const rels = relationships.filter(r => r.person_id === personId);
  const result: Array<{ person: Person; relType: string }> = [];
  for (const rel of rels) {
    const person = people.find(p => p.id === rel.related_person_id);
    if (person) result.push({ person, relType: rel.relationship_type });
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────

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
  const setQuickAddTarget = useFamilyStore(s => s.setQuickAddTarget);
  const [messageTargetId, setMessageTargetId] = useState<string | null>(null);
  const [resolvingTarget, setResolvingTarget] = useState(false);

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

  const immediateFamily = useMemo(() => {
    if (!personId) return [];
    return getImmediateFamily(personId, relationships, people);
  }, [personId, relationships, people]);

  const isSelf = person ? person.is_self && person.id === selfPersonId : false;
  const personDob = (person as any)?.date_of_birth || null;
  const age = useMemo(() => calculateAge(personDob), [personDob]);
  const birthdayNote = useMemo(() => getBirthdayCountdown(personDob), [personDob]);

  useEffect(() => {
    const resolveTarget = async () => {
      if (!person || isSelf) {
        setMessageTargetId(null);
        setResolvingTarget(false);
        return;
      }

      if (person.user_id) {
        setMessageTargetId(person.user_id);
        return;
      }

      if (!accessToken) {
        setMessageTargetId(null);
        return;
      }

      setResolvingTarget(true);
      try {
        const res = await fetch(`/api/messages/resolve-target?person_id=${person.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          setMessageTargetId(null);
          return;
        }
        const data = await res.json();
        setMessageTargetId(data.target_user_id || null);
      } catch (err) {
        console.error('Failed to resolve message target:', err);
        setMessageTargetId(null);
      } finally {
        setResolvingTarget(false);
      }
    };

    resolveTarget();
  }, [person, isSelf, accessToken]);

  if (!person) return null;

  const initials = person.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const label = LABEL_MAP[relationshipType] || relationshipType;
  const badgeColor = COLOR_MAP[relationshipType] || COLOR_MAP.relative;
  const isLinked = person.user_id !== null || !!messageTargetId;
  const canEdit = !isSelf;
  const canDelete = !isSelf && !isLinked;
  const canMessage = !!messageTargetId;

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
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh] overflow-y-auto">
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
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-xl font-bold overflow-hidden shadow-lg ${
              isSelf
                ? 'bg-gradient-to-br from-[#1B4332] to-[#2d5033] border-[#1B4332] shadow-[#1B4332]/25'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200/50 shadow-black/8'
            }`}>
              {person.photo_url ? (
                <img src={person.photo_url} alt={person.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className={isSelf ? 'text-white' : 'text-gray-500'}>{initials}</span>
              )}
            </div>
            {isLinked && !isSelf && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <LinkIcon size={10} className="text-white" />
              </div>
            )}
          </div>

          {/* Name & age */}
          <h2 className="text-lg font-bold text-gray-900">{person.full_name}</h2>
          {age !== null && (
            <p className="text-xs text-gray-500 mt-0.5">{age} years old</p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeColor}`}>
              {label}
            </span>
            {isLinked && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                <LinkIcon size={10} /> Aangan member
              </span>
            )}
          </div>

          {/* Birthday countdown */}
          {birthdayNote && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#1B4332] font-medium bg-[#1B4332]/8 px-3 py-1.5 rounded-full">
              <Cake size={12} />
              {birthdayNote}
            </div>
          )}

          {/* Degree of relationship path */}
          {degreeResult && degreeResult.degree > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500 bg-gray-100/60 px-3 py-2 rounded-xl">
              <Route size={12} className="text-[#1B4332] flex-shrink-0" />
              <span>
                <span className="font-semibold text-[#1B4332]">{degreeResult.label}</span>
                <span className="text-gray-400 ml-1">({degreeResult.degree} {degreeResult.degree === 1 ? 'hop' : 'hops'})</span>
              </span>
            </div>
          )}

          {/* Immediate Family */}
          {immediateFamily.length > 0 && (
            <div className="w-full mt-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">
                {isSelf ? 'Your Family' : `${person.full_name.split(' ')[0]}'s Family`}
              </h3>
              <div className="space-y-1.5">
                {immediateFamily.slice(0, 6).map(({ person: familyMember, relType }) => (
                  <button
                    key={familyMember.id}
                    onClick={() => {
                      onClose();
                      setTimeout(() => useFamilyStore.getState().setSelectedPerson(familyMember.id), 300);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100/40 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden flex-shrink-0">
                      {familyMember.photo_url ? (
                        <img src={familyMember.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        familyMember.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{familyMember.full_name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100/60 px-2 py-0.5 rounded-full capitalize">
                      {relType}
                    </span>
                  </button>
                ))}
                {immediateFamily.length > 6 && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    +{immediateFamily.length - 6} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="w-full mt-4 space-y-1.5 text-left">
            {person.gender && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Gender</span>
                <span className="text-sm font-medium text-gray-800 capitalize">{person.gender}</span>
              </div>
            )}
            {personDob && (
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500 flex items-center gap-1"><Calendar size={12} /> Birthday</span>
                <span className="text-sm font-medium text-gray-800">
                  {new Date(personDob).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-full mt-5 space-y-2">
            {canEdit && (
              <button
                onClick={() => { onClose(); router.push(`/edit-member/${personId}`); }}
                className="w-full py-3 px-4 rounded-2xl bg-[#1B4332] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#1B4332]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#1B4332]/20"
              >
                <Pencil size={16} /> Edit Member
              </button>
            )}

            {/* Quick Add */}
            <button
              onClick={() => {
                onClose();
                setTimeout(() => setQuickAddTarget(personId!), 300);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#1B4332]/8 text-[#1B4332] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#1B4332]/15 active:scale-[0.98] transition-all border border-[#1B4332]/10"
            >
              <UserPlus size={16} /> Add Their Relative
            </button>

            {!isSelf && (
              <>
                <button
                  onClick={() => {
                    if (!messageTargetId) return;
                    onClose();
                    router.push(`/messages?to=${messageTargetId}`);
                  }}
                  disabled={!canMessage || resolvingTarget}
                  className={`w-full py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border ${
                    canMessage
                      ? 'bg-[#1B4332]/8 text-[#1B4332] hover:bg-[#1B4332]/15 active:scale-[0.98] border-[#1B4332]/15'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle size={16} /> Send Message
                </button>
                {!canMessage && !resolvingTarget && (
                  <p className="text-[11px] text-gray-400 text-center px-2">
                    No linked Aangan account found yet
                  </p>
                )}
              </>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                className="w-full py-3 px-4 rounded-2xl bg-red-500/6 text-red-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-500/12 active:scale-[0.98] transition-all"
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
