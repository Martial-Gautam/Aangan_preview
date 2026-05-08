'use client';

import { useState } from 'react';
import { X, GitMerge, Users, Calendar, Loader2 } from 'lucide-react';

interface PersonInfo {
  id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  owner_id: string;
  owner_name: string;
  user_id: string | null;
  is_self: boolean;
}

interface MergeSuggestion {
  id: string;
  person_id_1: string;
  person_id_2: string;
  confidence: number;
  status: string;
  person1: PersonInfo | null;
  person2: PersonInfo | null;
}

interface MergeSuggestionModalProps {
  suggestions: MergeSuggestion[];
  accessToken: string;
  onMergeComplete: () => void;
  onClose: () => void;
}

export default function MergeSuggestionModal({
  suggestions,
  accessToken,
  onMergeComplete,
  onClose,
}: MergeSuggestionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const activeSuggestions = suggestions.filter(s => !dismissed.includes(s.id));
  const suggestion = activeSuggestions[currentIndex] || null;

  if (!suggestion) {
    return null;
  }

  const { person1, person2, confidence } = suggestion;
  const confidencePercent = Math.round(confidence * 100);

  const handleAction = async (action: 'accept' | 'reject') => {
    setProcessing(true);
    try {
      const res = await fetch('/api/merge/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ suggestion_id: suggestion.id, action }),
      });

      if (res.ok) {
        setDismissed(prev => [...prev, suggestion.id]);
        if (currentIndex >= activeSuggestions.length - 1) {
          onMergeComplete();
        } else {
          setCurrentIndex(prev => Math.min(prev, activeSuggestions.length - 2));
        }
      }
    } catch (err) {
      console.error('Merge action failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDOB = (dob: string | null) => {
    if (!dob) return '—';
    return new Date(dob).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#C9A66B]/15 flex items-center justify-center">
              <GitMerge size={16} className="text-[#C9A66B]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Merge Suggestion</h2>
              <p className="text-[11px] text-gray-400">
                {activeSuggestions.length - dismissed.length} remaining
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Confidence badge */}
        <div className="flex justify-center pb-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            confidencePercent >= 80
              ? 'bg-green-100 text-green-700'
              : confidencePercent >= 60
                ? 'bg-[#C9A66B]/15 text-[#8B5E3C]'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {confidencePercent}% match
          </span>
        </div>

        {/* Split comparison */}
        <div className="grid grid-cols-2 gap-0 border-t border-gray-100">
          {[person1, person2].map((person, idx) => (
            <div key={idx}
              className={`p-4 ${idx === 0 ? 'border-r border-gray-100' : ''}`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                In {person?.owner_name?.split(' ')[0]}&apos;s tree
              </p>
              {/* Avatar */}
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                  {person?.photo_url ? (
                    <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">
                      {person ? getInitials(person.full_name) : '?'}
                    </span>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="text-center space-y-1.5">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {person?.full_name || 'Unknown'}
                </p>
                <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400">
                  <Calendar size={10} />
                  <span>{formatDOB(person?.date_of_birth || null)}</span>
                </div>
                <p className="text-[11px] text-gray-400 capitalize">
                  {person?.gender || '—'}
                </p>
                {person?.user_id && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#355E3B] bg-[#355E3B]/8 px-2 py-0.5 rounded-full">
                    <Users size={9} /> Aangan user
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 space-y-2 border-t border-gray-100">
          <button
            onClick={() => handleAction('accept')}
            disabled={processing}
            className="w-full py-3.5 bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white rounded-2xl text-sm font-bold hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all shadow-lg shadow-[#355E3B]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <GitMerge size={16} />}
            Yes, same person — Merge
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={processing}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            No, different people
          </button>
        </div>
      </div>
    </div>
  );
}
