'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Check, UserCheck, Users, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

export interface ClaimMatch {
  id: string;
  full_name: string;
  gender: string | null;
  email: string | null;
  phone_number: string | null;
  connections: {
    relationship_type: string;
    added_by: string;
  }[];
}

interface ClaimProfileModalProps {
  matches: ClaimMatch[];
  onClaimed: () => void;
  onDismiss: () => void;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Father',
  mother: 'Mother',
  sibling: 'Sibling',
  spouse: 'Spouse',
  child: 'Child',
};

const RELATIONSHIP_EMOJI: Record<string, string> = {
  father: '👨',
  mother: '👩',
  sibling: '🧑',
  spouse: '💑',
  child: '👶',
};

export default function ClaimProfileModal({ matches, onClaimed, onDismiss }: ClaimProfileModalProps) {
  const { session } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (matches.length === 1) {
      setSelectedIds([matches[0].id]);
    }
  }, [matches]);

  const handleClaim = async () => {
    if (!session?.access_token) return;
    if (selectedIds.length === 0) {
      setError('Select at least one profile to continue');
      return;
    }

    setClaiming(true);
    setError('');

    try {
      const res = await fetch('/api/claim/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ person_ids: selectedIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim profile');
      }

      setSuccess(true);
      setTimeout(() => onClaimed(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setClaiming(false);
    }
  };

  const isSingle = matches.length === 1;
  const toggleSelect = (personId: string) => {
    setSelectedIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[#FAF7F2] rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#355E3B] to-[#6E8B74] px-6 pt-6 pb-8">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <UserCheck size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {success ? 'Profile Claimed!' : 'We found you!'}
              </h2>
              <p className="text-sm text-white/70">
                {success
                  ? 'Your identity has been linked'
                  : isSingle
                  ? 'Someone already added you to their tree'
                  : `${matches.length} possible profiles found`}
              </p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {success && (
          <div className="px-6 py-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#355E3B]/10 flex items-center justify-center mb-4 animate-bounceIn">
              <Check size={32} className="text-[#355E3B]" />
            </div>
            <p className="text-gray-600 text-sm text-center">
              Your identity is linked. Connection requests have been sent to confirm relationships.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-[#6B2E2E]/8 border border-[#6B2E2E]/15 rounded-2xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-[#6B2E2E] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#6B2E2E]">{error}</p>
          </div>
        )}

        {/* Match cards */}
        {!success && (
          <div className="px-6 py-5 space-y-3 max-h-[50vh] overflow-y-auto">
            {matches.map((match) => {
              const initials = match.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={match.id}
                  className={`bg-[#EFE6D5]/30 rounded-2xl border overflow-hidden transition-colors ${
                    selectedIds.includes(match.id)
                      ? 'border-[#355E3B]/40 bg-[#355E3B]/5'
                      : 'border-[#C9A66B]/15 hover:border-[#355E3B]/25'
                  }`}
                  onClick={() => toggleSelect(match.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#355E3B]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#355E3B]">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{match.full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {match.gender ? match.gender.charAt(0).toUpperCase() + match.gender.slice(1) : ''}
                          {match.email && ` · ${match.email}`}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedIds.includes(match.id)
                          ? 'bg-[#355E3B] border-[#355E3B]'
                          : 'border-[#C9A66B]/40'
                      }`}>
                        {selectedIds.includes(match.id) && <Check size={14} className="text-white" />}
                      </div>
                    </div>

                    {/* Family connections preview */}
                    {match.connections.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                          <Users size={12} /> Family connections
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.connections.map((conn, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg text-xs border border-gray-100"
                            >
                              <span>{RELATIONSHIP_EMOJI[conn.relationship_type] || '👤'}</span>
                              <span className="text-gray-600">
                                {RELATIONSHIP_LABELS[conn.relationship_type] || conn.relationship_type} of{' '}
                                <span className="font-medium">{conn.added_by}</span>
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!success && (
          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={handleClaim}
              disabled={claiming || selectedIds.length === 0}
              className="w-full bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white py-3 rounded-xl text-sm font-semibold hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Linking...
                </>
              ) : (
                <>
                  Confirm selection <ChevronRight size={14} />
                </>
              )}
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Not me — skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
