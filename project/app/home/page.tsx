'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { useFamilyStore } from '@/lib/family-store';
import MemberDetailSheet from '@/components/MemberDetailSheet';
import QuickAddSheet from '@/components/QuickAddSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BottomNav from '@/components/BottomNav';
import { Plus, TreePine, Search, Sparkles, CheckCircle2, XCircle, Loader2, Bell, UserPlus, Download, ZoomIn, ZoomOut, Home, X } from 'lucide-react';
import Link from 'next/link';

function TreeAreaSkeleton({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0e17]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(74,122,82,0.16),transparent_42%),radial-gradient(circle_at_82%_28%,rgba(27,67,50,0.22),transparent_48%),radial-gradient(circle_at_50%_85%,rgba(122,138,125,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17]/70 via-[#0a0e17]/80 to-[#0a0e17]/95" />

      {showSearch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[calc(100%-2rem)] sm:max-w-sm">
          <div className="h-12 rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl px-3.5 flex items-center gap-2.5">
            <div className="skeleton w-4 h-4 rounded-full" />
            <div className="skeleton h-3 flex-1 rounded-full" />
            <div className="skeleton h-4 w-4 rounded-full" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="relative w-full max-w-[320px] h-[360px]">
          <div className="absolute left-[16%] top-[24%] w-[24%] h-px skeleton opacity-50 -rotate-[26deg]" />
          <div className="absolute left-[47%] top-[24%] w-[24%] h-px skeleton opacity-50 rotate-[24deg]" />
          <div className="absolute left-[30%] top-[42%] w-[38%] h-px skeleton opacity-40" />
          <div className="absolute left-[26%] top-[59%] w-[20%] h-px skeleton opacity-40 -rotate-[22deg]" />
          <div className="absolute left-[55%] top-[58%] w-[20%] h-px skeleton opacity-40 rotate-[22deg]" />

          <div className="absolute left-1/2 top-[19%] -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="skeleton w-16 h-16 rounded-full ring-2 ring-white/15" />
            <div className="skeleton w-20 h-3 rounded-full" />
          </div>

          <div className="absolute left-[12%] top-[33%] flex flex-col items-center gap-1.5">
            <div className="skeleton w-11 h-11 rounded-full" />
            <div className="skeleton w-14 h-2.5 rounded-full" />
          </div>
          <div className="absolute right-[12%] top-[33%] flex flex-col items-center gap-1.5">
            <div className="skeleton w-11 h-11 rounded-full" />
            <div className="skeleton w-14 h-2.5 rounded-full" />
          </div>

          <div className="absolute left-[28%] top-[56%] flex flex-col items-center gap-1.5">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="skeleton w-12 h-2.5 rounded-full" />
          </div>
          <div className="absolute right-[28%] top-[56%] flex flex-col items-center gap-1.5">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="skeleton w-12 h-2.5 rounded-full" />
          </div>

          <div className="absolute left-1/2 top-[71%] -translate-x-1/2 flex flex-col items-center gap-1.5">
            <div className="skeleton w-9 h-9 rounded-full" />
            <div className="skeleton w-11 h-2 rounded-full" />
          </div>
        </div>
      </div>

      <div className="absolute left-4 z-20 flex flex-col gap-2" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="h-9 w-24 rounded-xl bg-black/55 border border-white/10 backdrop-blur-xl px-3 flex items-center gap-2">
          <div className="skeleton h-3.5 w-3.5 rounded-md" />
          <div className="skeleton h-2.5 w-11 rounded-full" />
        </div>
        <div className="h-10 w-[94px] rounded-xl bg-black/55 border border-white/10 backdrop-blur-xl px-2.5 flex items-center gap-1.5">
          <div className="skeleton h-5 w-5 rounded-md" />
          <div className="skeleton h-2.5 flex-1 rounded-full" />
          <div className="skeleton h-5 w-5 rounded-md" />
        </div>
      </div>

      <div className="absolute right-4 z-20" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="skeleton w-14 h-14 rounded-full" />
      </div>
    </div>
  );
}

function FamilyPageSkeleton() {
  return (
    <div className="h-screen flex justify-center animate-pageEnter" style={{ background: 'transparent' }}>
      <div className="h-full w-full max-w-sm flex flex-col relative overflow-hidden">
        <div className="glass-header px-5 pt-12 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="space-y-2">
              <div className="skeleton w-12 h-2" />
              <div className="skeleton w-32 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton w-20 h-7 rounded-full" />
              <div className="skeleton w-9 h-9 rounded-full" />
              <div className="skeleton w-9 h-9 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden min-h-0">
          <TreeAreaSkeleton />
        </div>
        <div className="glass-nav px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-sm flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex flex-col items-center gap-1 w-14">
                <div className="skeleton w-6 h-6 rounded-full" />
                <div className="skeleton w-10 h-2 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dynamic import — Three.js must not run on server
const FamilyCosmos = dynamic(() => import('@/components/FamilyCosmos'), {
  ssr: false,
  loading: () => <TreeAreaSkeleton showSearch={false} />,
});

// ─── Types ───────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

// ─── Component ───────────────────────────────────────────────

export default function HomePage() {
  const { user, profile, session, loading } = useAuth();
  const router = useRouter();

  // Zustand store
  const {
    people, relationships, selfPerson, familyCount, dataLoading,
    selectedPersonId, searchQuery, centerPersonId, centerKey, focusHops,
    setSelectedPerson, setSearchQuery, setCenterPerson, setFocusHops,
    fetchFamily, removeMember,
  } = useFamilyStore();

  // Local UI state (not shared)
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestionsSheet, setShowSuggestionsSheet] = useState(false);
  const [processingSuggestionId, setProcessingSuggestionId] = useState<string | null>(null);
  const [pendingAlertCount, setPendingAlertCount] = useState(0);

  // Install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [cosmosReady, setCosmosReady] = useState(false);
  const [showCosmos, setShowCosmos] = useState(false);

  const seedInFlightRef = useRef(false);
  const bootstrapUserRef = useRef<string | null>(null);

  // ─── Effects ─────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (!profile?.onboarding_completed) { router.replace('/onboarding'); return; }
    if (!session?.access_token) return;

    fetchFamily(user.id, session.access_token);
    fetchSuggestions();
    fetchPendingAlerts();
  }, [user, profile, loading, session?.access_token]);

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

    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const seedDemoSocial = useCallback(async (force: boolean) => {
    if (!user?.id || !session?.access_token) return;
    if (seedInFlightRef.current) return;

    const storageKey = `aangan_demo_social_seeded_${user.id}`;
    const alreadySeeded = typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
    if (!force && alreadySeeded) return;

    seedInFlightRef.current = true;
    try {
      await fetch('/api/demo/seed-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      localStorage.setItem(storageKey, '1');
    } catch (err) {
      console.error('Failed to seed demo social data:', err);
    } finally {
      seedInFlightRef.current = false;
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    if (loading || !user || !profile?.onboarding_completed || !session?.access_token) return;
    if (bootstrapUserRef.current === user.id) return;
    bootstrapUserRef.current = user.id;

    const postLoginBootstrap =
      typeof window !== 'undefined' &&
      sessionStorage.getItem('aangan_post_login_bootstrap') === '1';

    if (postLoginBootstrap && typeof window !== 'undefined') {
      sessionStorage.removeItem('aangan_post_login_bootstrap');
    }

    seedDemoSocial(postLoginBootstrap);

    if (postLoginBootstrap && !isInstalled) {
      setShowInstallSheet(true);
    }
  }, [loading, user, profile, session?.access_token, isInstalled, seedDemoSocial]);

  const hasTreeData = Boolean(selfPerson && people.length > 1);

  useEffect(() => {
    if (hasTreeData) return;
    setCosmosReady(false);
    setShowCosmos(false);
  }, [hasTreeData]);

  useEffect(() => {
    if (!cosmosReady) return;
    const timer = window.setTimeout(() => setShowCosmos(true), 40);
    return () => window.clearTimeout(timer);
  }, [cosmosReady]);

  // ─── Fetchers ────────────────────────────────────────────

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

  const fetchPendingAlerts = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/connections/pending', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingAlertCount(data.requests?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const handleSuggestionResponse = async (suggestionId: string, action: 'accept' | 'reject') => {
    if (!session?.access_token || !user) return;
    setProcessingSuggestionId(suggestionId);
    try {
      const res = await fetch('/api/inference/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ suggestion_id: suggestionId, action }),
      });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        if (action === 'accept') {
          fetchFamily(user.id, session.access_token);
        }
        if (suggestions.length === 1) setShowSuggestionsSheet(false);
      }
    } catch (err) {
      console.error('Failed to process suggestion', err);
    } finally {
      setProcessingSuggestionId(null);
    }
  };

  const handleInstall = async () => {
    if (isInstalled) {
      setInstallHint('App is already installed on this device.');
      setShowInstallSheet(false);
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setCanInstall(false);
      setInstallHint('');
      setShowInstallSheet(false);
      return;
    }
    setInstallHint('Use your browser menu and tap "Add to Home Screen" for the best app experience.');
  };

  // ─── Render ──────────────────────────────────────────────

  if (loading || dataLoading) return <FamilyPageSkeleton />;

  return (
    <div className="h-screen flex justify-center animate-pageEnter" style={{ background: 'transparent' }}>
    <div className="h-full w-full max-w-sm flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="glass-header px-5 pt-12 pb-4 z-10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.15em]">Aangan</p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {profile?.full_name?.split(' ')[0]}&apos;s Family
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 mr-1">
              {familyCount}
            </span>
            <button
              onClick={() => setShowInstallSheet(true)}
              className="w-9 h-9 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-colors text-gray-500"
            >
              <Download size={16} />
            </button>
            <Link
              href="/add-member"
              className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center justify-center hover:bg-[#1B4332]/90 transition-colors"
            >
              <UserPlus size={16} className="text-white" />
            </Link>
            <Link
              href="/notifications"
              className="w-9 h-9 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-colors relative"
            >
              <Bell size={16} className="text-gray-500" />
              {pendingAlertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white leading-none">{pendingAlertCount > 9 ? '9+' : pendingAlertCount}</span>
                </span>
              )}
            </Link>
          </div>
        </div>
        {installHint && (
          <p className="text-[11px] text-gray-500 mt-1.5 max-w-lg mx-auto px-1">
            {installHint}
          </p>
        )}
      </div>

      {/* Suggestions Banner */}
      {suggestions.length > 0 && !dataLoading && (
        <div className="bg-white/40 backdrop-blur-lg border-b border-gray-200/30 px-5 py-3 flex-shrink-0 cursor-pointer hover:bg-white/50 transition-all" onClick={() => setShowSuggestionsSheet(true)}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1B4332]/10 flex items-center justify-center">
                <Sparkles size={14} className="text-[#1B4332]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {suggestions.length} possible {suggestions.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>
            <button className="text-xs font-semibold text-[#1B4332] glass-card px-3 py-1.5 rounded-full hover:bg-white/80 transition-colors">
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
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center px-3.5 py-2.5 gap-2">
              <Search size={16} className="text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search family members..."
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-white/30 text-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white transition-colors p-0.5">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {hasTreeData && selfPerson ? (
          <>
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out ${
                showCosmos ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <TreeAreaSkeleton showSearch={false} />
            </div>

            <div className={`absolute inset-0 transition-opacity duration-300 ease-out ${showCosmos ? 'opacity-100' : 'opacity-0'}`}>
              <FamilyCosmos
                selfPersonId={selfPerson.id}
                people={people}
                relationships={relationships}
                onNodeClick={(id) => setSelectedPerson(id)}
                onCenterChange={setCenterPerson}
                centerPersonId={centerPersonId || selfPerson.id}
                centerKey={centerKey}
                maxHops={focusHops}
                searchQuery={searchQuery}
                onReady={() => setCosmosReady(true)}
              />
            </div>

            {/* Controls */}
            <div className="absolute bottom-24 left-4 z-20 flex flex-col gap-2" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
              <button
                onClick={() => setCenterPerson(selfPerson.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all ${
                  centerPersonId && centerPersonId !== selfPerson.id
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-black/60 backdrop-blur-xl text-white/70 border border-white/10'
                }`}
              >
                <Home size={13} /> {centerPersonId && centerPersonId !== selfPerson.id ? 'Go Home' : 'My View'}
              </button>
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 px-2.5 py-2">
                <button
                  onClick={() => setFocusHops(focusHops - 1)}
                  disabled={focusHops <= 1}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="text-[9px] font-semibold text-white/50 min-w-[36px] text-center tabular-nums">
                  {focusHops} {focusHops === 1 ? 'ring' : 'rings'}
                </span>
                <button
                  onClick={() => setFocusHops(focusHops + 1)}
                  disabled={focusHops >= 5}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  <ZoomIn size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-6">
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center max-w-xs w-full">
              <div className="w-16 h-16 rounded-full bg-gray-100/60 flex items-center justify-center mb-5">
                <TreePine size={28} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Your tree is empty</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Start by adding your parents or siblings to build your family tree
              </p>
              <Link
                href="/add-member"
                className="bg-[#1B4332] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#1B4332]/90 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} /> Add First Member
              </Link>
            </div>
          </div>
        )}

        {familyCount > 0 && (
          <div className="absolute right-4 z-20" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <Link
              href="/add-member"
              className="w-14 h-14 bg-[#1B4332] rounded-full flex items-center justify-center shadow-xl shadow-[#1B4332]/30 hover:bg-[#1B4332]/90 active:scale-90 transition-all"
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
          onClose={() => setSelectedPerson(null)}
          onDelete={removeMember}
          accessToken={session?.access_token || ''}
        />
      )}

      {/* Quick Add Sheet */}
      <QuickAddSheet />

      {/* Install Sheet */}
      <Sheet open={showInstallSheet} onOpenChange={setShowInstallSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Install Aangan</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Install Aangan for the best experience</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Aangan works better when downloaded. Install the app for a smoother, faster family and messaging experience.
            </p>
            {!canInstall && !isInstalled && (
              <p className="text-xs text-gray-400 mt-2">
                If the install prompt does not open, use your browser menu and tap &quot;Add to Home Screen&quot;.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={handleInstall}
              className="w-full py-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#1B4332]/90 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={16} />
              {isInstalled ? 'Installed' : canInstall ? 'Install Now' : 'Show Install Steps'}
            </button>
            <button
              onClick={() => setShowInstallSheet(false)}
              className="w-full py-3 text-sm text-gray-500 font-medium"
            >
              Maybe later
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Suggestions Sheet */}
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
              <Sparkles size={20} className="text-[#1B4332]" />
              Suggested Connections
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Based on your family tree, we inferred these relationships.
            </p>
          </div>
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="glass-card rounded-xl p-4">
                <p className="text-sm text-gray-800 leading-relaxed mb-3">
                  Is <span className="font-bold">{suggestion.to_person.full_name}</span> the <span className="font-semibold text-[#1B4332] capitalize">{suggestion.suggested_type}</span> of <span className="font-bold">{suggestion.from_person.full_name}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSuggestionResponse(suggestion.id, 'accept')}
                    disabled={processingSuggestionId === suggestion.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processingSuggestionId === suggestion.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Accept
                  </button>
                  <button
                    onClick={() => handleSuggestionResponse(suggestion.id, 'reject')}
                    disabled={processingSuggestionId === suggestion.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/60 backdrop-blur-md border border-gray-200/60 hover:bg-white/80 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
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
