'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import FamilyFlow from '@/components/FamilyFlow';
import MemberDetailSheet from '@/components/MemberDetailSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Person, Relationship } from '@/lib/tree-to-flow';
import BottomNav from '@/components/BottomNav';
import { Plus, TreePine, Search, Sparkles, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';


export default function HomePage() {
  const { user, profile, session, loading } = useAuth();
  const router = useRouter();

  const [selfPerson, setSelfPerson] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestionsSheet, setShowSuggestionsSheet] = useState(false);
  const [processingSuggestionId, setProcessingSuggestionId] = useState<string | null>(null);

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (!profile?.onboarding_completed) { router.replace('/onboarding'); return; }
    fetchFamily();
    fetchSuggestions();
  }, [user, profile, loading]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    setIsInstalled(Boolean(standalone));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const fetchFamily = async () => {
    if (!user || !session?.access_token) return;
    setDataLoading(true);
    try {
      const res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setDataLoading(false);
        return;
      }

      const data = await res.json();
      const nodes: Person[] = data.nodes || [];
      const edges: Relationship[] = data.edges || [];
      const selfId: string | null = data.self_person_id;

      const self = nodes.find((p) => p.id === selfId) || null;
      setSelfPerson(self);
      setPeople(nodes);
      setRelationships(edges);
      setFamilyCount(Math.max(0, nodes.length - 1));
    } finally {
      setDataLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/inference/pending', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    }
  };

  const handleSuggestionResponse = async (suggestionId: string, action: 'accept' | 'reject') => {
    if (!session?.access_token) return;
    setProcessingSuggestionId(suggestionId);
    try {
      const res = await fetch('/api/inference/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ suggestion_id: suggestionId, action })
      });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        if (action === 'accept') {
          fetchFamily(); // Refresh tree
        }
        if (suggestions.length === 1) {
          setShowSuggestionsSheet(false);
        }
      }
    } catch (err) {
      console.error('Failed to process suggestion', err);
    } finally {
      setProcessingSuggestionId(null);
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setCanInstall(false);
      setInstallHint('');
      return;
    }

    setInstallHint('Use your browser menu to add this app to your home screen.');
  };

  const handleDeleteMember = useCallback((personId: string) => {
    setPeople(prev => prev.filter(p => p.id !== personId));
    setRelationships(prev => prev.filter(
      r => r.person_id !== personId && r.related_person_id !== personId
    ));
    setFamilyCount(prev => Math.max(0, prev - 1));
  }, []);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EFE6D5]/60 via-[#FAF7F2] to-[#EFE6D5]/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#355E3B]/15 to-[#6E8B74]/10 flex items-center justify-center animate-pulse shadow-sm">
            <TreePine size={22} className="text-[#355E3B]" />
          </div>
          <p className="text-sm text-[#5E5E5E] font-medium">Loading your family...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-[#EFE6D5]/40 via-[#FAF7F2] to-[#EFE6D5]/30 flex justify-center">
    <div className="h-full w-full max-w-sm bg-gradient-to-b from-[#FAF7F2] via-[#FAF7F2]/90 to-[#EFE6D5]/40 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAF7F2]/90 backdrop-blur-xl px-5 pt-12 pb-4 z-10 flex-shrink-0 border-b border-[#C9A66B]/15">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] text-[#355E3B]/60 font-semibold uppercase tracking-[0.15em]">Aangan</p>
            <h1 className="text-lg font-bold text-[#2B2B2B] mt-0.5">
              {profile?.full_name?.split(' ')[0]}&apos;s Family
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#355E3B]/8 text-[#355E3B] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#355E3B]/15">
              {familyCount} {familyCount === 1 ? 'member' : 'members'}
            </span>
            <button
              onClick={handleInstall}
              className="bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:from-[#2d5033] hover:to-[#5f7a64] transition-all shadow-sm shadow-[#355E3B]/20 active:scale-95"
            >
              Install
            </button>
          </div>
        </div>
        {installHint && (
          <p className="text-[11px] text-[#5E5E5E] mt-1.5 max-w-lg mx-auto px-1">
            {installHint}
          </p>
        )}
      </div>

      {/* Suggestions Banner */}
      {suggestions.length > 0 && !dataLoading && (
        <div className="bg-gradient-to-r from-[#C9A66B]/10 to-[#EFE6D5]/50 border-b border-[#C9A66B]/15 px-5 py-3 flex-shrink-0 cursor-pointer hover:from-[#C9A66B]/15 hover:to-[#EFE6D5] transition-all" onClick={() => setShowSuggestionsSheet(true)}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#C9A66B]/15 flex items-center justify-center">
                <Sparkles size={14} className="text-[#C9A66B]" />
              </div>
              <p className="text-sm font-medium text-[#2B2B2B]">
                {suggestions.length} possible {suggestions.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>
            <button className="text-xs font-semibold text-[#355E3B] bg-[#FAF7F2]/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#C9A66B]/25 shadow-sm hover:bg-[#FAF7F2] transition-colors">
              Review
            </button>
          </div>
        </div>
      )}

      {/* Tree area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Floating Search Bar */}
        {familyCount > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[calc(100%-2rem)] sm:max-w-sm px-0">
          <div className="bg-[#FAF7F2]/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-[#8B5E3C]/8 border border-[#C9A66B]/15 flex items-center px-3.5 py-2.5 gap-2">
              <Search size={16} className="text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-[#5E5E5E]/40 text-[#2B2B2B]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                  <span className="text-xs font-bold">✕</span>
                </button>
              )}
            </div>
          </div>
        )}

        {selfPerson && people.length > 1 ? (
          <FamilyFlow
            selfPersonId={selfPerson.id}
            people={people}
            relationships={relationships}
            onNodeClick={(id) => setSelectedPersonId(id)}
            searchQuery={searchQuery}
          />
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-[#FAF7F2]/80 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-lg shadow-[#8B5E3C]/8 border border-[#C9A66B]/15 max-w-xs w-full">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#355E3B]/10 to-[#6E8B74]/10 flex items-center justify-center mb-5 shadow-sm">
                <TreePine size={36} className="text-[#6E8B74]" />
              </div>
              <h3 className="font-bold text-[#2B2B2B] text-lg mb-2">Your tree is empty</h3>
              <p className="text-[#5E5E5E] text-sm mb-6 leading-relaxed">
                Start by adding your parents or siblings to build your family tree
              </p>
              <Link
                href="/add-member"
                className="bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:from-[#2d5033] hover:to-[#5f7a64] transition-all flex items-center gap-2 shadow-lg shadow-[#355E3B]/20 active:scale-95"
              >
                <Plus size={16} /> Add First Member
              </Link>
            </div>
          </div>
        )}

        {/* Floating add button */}
        {familyCount > 0 && (
          <div className="absolute bottom-4 right-4 z-20">
            <Link
              href="/add-member"
              className="w-14 h-14 bg-gradient-to-br from-[#355E3B] to-[#6E8B74] rounded-full flex items-center justify-center shadow-xl shadow-[#355E3B]/30 hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-90 transition-all"
            >
              <Plus size={24} className="text-white" />
            </Link>
          </div>
        )}
      </div>

      {/* Member detail sheet */}
      {selfPerson && (
        <MemberDetailSheet
          personId={selectedPersonId}
          people={people}
          relationships={relationships}
          selfPersonId={selfPerson.id}
          onClose={() => setSelectedPersonId(null)}
          onDelete={handleDeleteMember}
          accessToken={session?.access_token || ''}
        />
      )}

      {/* Suggestions Bottom Sheet */}
      <Sheet open={showSuggestionsSheet} onOpenChange={setShowSuggestionsSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Suggested Connections</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={20} className="text-[#C9A66B]" />
              Suggested Connections
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Based on your family tree, we inferred these relationships.
            </p>
          </div>
          
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-[#EFE6D5]/40 rounded-2xl p-4 border border-[#C9A66B]/15">
                <p className="text-sm text-gray-800 leading-relaxed mb-3">
                  Is <span className="font-bold">{suggestion.to_person.full_name}</span> the <span className="font-semibold text-[#355E3B] capitalize">{suggestion.suggested_type}</span> of <span className="font-bold">{suggestion.from_person.full_name}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSuggestionResponse(suggestion.id, 'accept')}
                    disabled={processingSuggestionId === suggestion.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#355E3B] hover:bg-[#2d5033] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-[#355E3B]/20"
                  >
                    {processingSuggestionId === suggestion.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Accept
                  </button>
                  <button
                    onClick={() => handleSuggestionResponse(suggestion.id, 'reject')}
                    disabled={processingSuggestionId === suggestion.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <XCircle size={16} className="text-gray-400" />
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
    </div>
  );
}
