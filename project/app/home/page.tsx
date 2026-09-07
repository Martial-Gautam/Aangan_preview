'use client';

import { useEffect, useState, useCallback, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { useFamilyStore } from '@/lib/family-store';
import { useConnectionNotifications } from '@/hooks/useConnectionNotifications';
import BrandLogo from '@/components/BrandLogo';
import { TopRightMenu } from '@/components/TopRightMenu';
import MemberDetailSheet from '@/components/MemberDetailSheet';
import type { ViewMode } from '@/components/FamilyCosmos';
import QuickAddSheet from '@/components/QuickAddSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BottomNav from '@/components/BottomNav';
import { Plus, Search, Sparkles, CheckCircle2, XCircle, Loader2, Bell, UserPlus, Download, ZoomIn, ZoomOut, Home, X, MapPin, Navigation, Share2 } from 'lucide-react';
import { ShareInviteSheet } from '@/components/ShareInviteSheet';
import InstallAppSheet from '@/components/InstallAppSheet';
import { useAppInstall } from '@/hooks/useAppInstall';
import Link from 'next/link';

function TreeAreaSkeleton({ showSearch = true }: { showSearch?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const pathRoot = `${uid}-path-root`;
  const pathLeftMajor = `${uid}-path-left-major`;
  const pathRightMajor = `${uid}-path-right-major`;
  const pathLeftOuter = `${uid}-path-left-outer`;
  const pathLeftInner = `${uid}-path-left-inner`;
  const pathRightInner = `${uid}-path-right-inner`;
  const pathRightOuter = `${uid}-path-right-outer`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #060b16 0%, #0a1628 50%, #0d0f18 100%)' }}
    >
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
        <div className="relative w-full max-w-[330px] h-[380px]">
          <svg viewBox="0 0 340 380" className="w-full h-full" aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}-branch-stroke`} x1="0%" y1="10%" x2="100%" y2="90%">
                <stop offset="0%" stopColor="#8fd2ff" stopOpacity="0.8" />
                <stop offset="55%" stopColor="#8ef0c8" stopOpacity="0.78" />
                <stop offset="100%" stopColor="#ffe3a1" stopOpacity="0.72" />
              </linearGradient>
              <radialGradient id={`${uid}-node-core`} cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.94" />
                <stop offset="65%" stopColor="#cff8e9" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8fd2ff" stopOpacity="0.3" />
              </radialGradient>
              <filter id={`${uid}-soft-glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={`${uid}-energy-glow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g stroke="#bde8ff" strokeOpacity="0.14" fill="none">
              <ellipse cx="170" cy="194" rx="116" ry="52" transform="rotate(-10 170 194)" />
              <ellipse cx="170" cy="194" rx="146" ry="66" transform="rotate(7 170 194)" />
              <ellipse cx="170" cy="194" rx="176" ry="80" transform="rotate(-2 170 194)" />
            </g>

            <g transform="translate(170 194)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="0.9;1;1.03;1"
                  dur="5.4s"
                  repeatCount="indefinite"
                />
                <g transform="translate(-170 -194)" stroke={`url(#${uid}-branch-stroke)`} fill="none" strokeLinecap="round" filter={`url(#${uid}-soft-glow)`}>
                  <path
                    id={pathRoot}
                    d="M170 98 C170 112 170 126 170 142"
                    strokeWidth="3.4"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0s" dur="0.45s" fill="freeze" />
                  </path>
                  <path
                    id={pathLeftMajor}
                    d="M170 142 C152 154 134 170 112 190"
                    strokeWidth="3.1"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.36s" dur="0.62s" fill="freeze" />
                  </path>
                  <path
                    id={pathRightMajor}
                    d="M170 142 C188 154 206 170 228 190"
                    strokeWidth="3.1"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.36s" dur="0.62s" fill="freeze" />
                  </path>
                  <path
                    id={pathLeftOuter}
                    d="M112 190 C96 214 85 236 76 264"
                    strokeWidth="2.8"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.9s" dur="0.7s" fill="freeze" />
                  </path>
                  <path
                    id={pathLeftInner}
                    d="M112 190 C128 220 144 246 156 276"
                    strokeWidth="2.8"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="1.02s" dur="0.7s" fill="freeze" />
                  </path>
                  <path
                    id={pathRightInner}
                    d="M228 190 C212 220 196 246 184 276"
                    strokeWidth="2.8"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="1.02s" dur="0.7s" fill="freeze" />
                  </path>
                  <path
                    id={pathRightOuter}
                    d="M228 190 C244 214 255 236 264 264"
                    strokeWidth="2.8"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset="1"
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.9s" dur="0.7s" fill="freeze" />
                  </path>
                </g>
              </g>
            </g>

            <g fill={`url(#${uid}-node-core)`} filter={`url(#${uid}-soft-glow)`}>
              <circle cx="170" cy="98" r="6">
                <animate attributeName="opacity" values="0.35;1;0.82;1" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="170" cy="142" r="7.5">
                <animate attributeName="opacity" values="0.55;1;0.84;1" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx="112" cy="190" r="6.3" />
              <circle cx="228" cy="190" r="6.3" />
              <circle cx="76" cy="264" r="5.6" />
              <circle cx="156" cy="276" r="5.6" />
              <circle cx="184" cy="276" r="5.6" />
              <circle cx="264" cy="264" r="5.6" />
            </g>

            <g filter={`url(#${uid}-energy-glow)`} fill="#fff4c2">
              <circle r="3.1">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathRoot}`} />
                </animateMotion>
              </circle>
              <circle r="2.9">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.18s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.18s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathLeftMajor}`} />
                </animateMotion>
              </circle>
              <circle r="2.9">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.18s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.18s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathRightMajor}`} />
                </animateMotion>
              </circle>
              <circle r="2.6">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.44s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.44s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathLeftOuter}`} />
                </animateMotion>
              </circle>
              <circle r="2.6">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.52s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.52s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathLeftInner}`} />
                </animateMotion>
              </circle>
              <circle r="2.6">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.52s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.52s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathRightInner}`} />
                </animateMotion>
              </circle>
              <circle r="2.6">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="0.44s" repeatCount="indefinite" />
                <animateMotion dur="2.2s" begin="0.44s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${pathRightOuter}`} />
                </animateMotion>
              </circle>
            </g>
          </svg>

          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 text-[11px] font-medium tracking-wide text-white/55">
            Building family cosmos...
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
    </motion.div>
  );
}

function FamilyPageSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="h-screen flex justify-center animate-pageEnter"
      style={{ background: 'transparent' }}
    >
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
        <BottomNav />
      </div>
    </motion.div>
  );
}

// Dynamic import — Three.js must not run on server
const FamilyCosmos = dynamic(() => import('@/components/FamilyCosmos'), {
  ssr: false,
  loading: () => <TreeAreaSkeleton showSearch={false} />,
});

// ─── Types ───────────────────────────────────────────────────

interface NearbyRelative {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  relationship_label: string;
  degree: number;
}

// ─── Component ───────────────────────────────────────────────

export default function HomePage() {
  const { user, profile, session, loading, isOffline } = useAuth();
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

  // Install / download prompt — Android gets the APK, iOS and desktop get the PWA
  const appInstall = useAppInstall();
  const { wasDismissedRecently } = appInstall;
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [cosmosReady, setCosmosReady] = useState(false);
  const [showCosmos, setShowCosmos] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('fpp');
  const [showNearbySheet, setShowNearbySheet] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [nearbyCityQuery, setNearbyCityQuery] = useState('');
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyRelatives, setNearbyRelatives] = useState<NearbyRelative[]>([]);
  const [nearbyError, setNearbyError] = useState('');

  const seedInFlightRef = useRef(false);
  const bootstrapUserRef = useRef<string | null>(null);
  const postLoginRef = useRef(false);
  const installOfferedRef = useRef(false);

  // ─── Supabase Realtime: Instant notification badge updates ───
  useConnectionNotifications({
    userId: user?.id,
    userEmail: user?.email,
    userPhone: profile?.phone,
    onNewRequest: useCallback(() => {
      fetchPendingAlerts();
    }, []),
    onRequestUpdate: useCallback(() => {
      fetchPendingAlerts();
      // Also refresh tree in case an accepted connection means a new tree merge
      if (user?.id && session?.access_token) {
        fetchFamily(user.id, session.access_token);
      }
    }, [user?.id, session?.access_token]),
    enabled: Boolean(user?.id && session?.access_token),
  });

  // ─── Effects ─────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (!profile?.onboarding_completed) { router.replace('/onboarding'); return; }
    if (!session?.access_token) return;

    fetchFamily(user.id, session.access_token);
    // Skip network-only operations when offline
    if (!isOffline) {
      fetchSuggestions();
      fetchPendingAlerts();
    }
  }, [user, profile, loading, session?.access_token, isOffline]);

  useEffect(() => {
    setNearbyCityQuery(profile?.location_city || '');
  }, [profile?.location_city]);

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

    postLoginRef.current = postLoginBootstrap;
    seedDemoSocial(postLoginBootstrap);
  }, [loading, user, profile, session?.access_token, seedDemoSocial]);

  // Install popup. Kept separate from the bootstrap effect above so it re-evaluates
  // once useAppInstall has determined install state, and offered at most once per
  // visit so dismissing it does not simply re-arm the timer.
  useEffect(() => {
    if (loading || !user || !profile?.onboarding_completed) return;
    if (installOfferedRef.current || wasDismissedRecently()) return;

    const offer = () => {
      installOfferedRef.current = true;
      setShowInstallSheet(true);
    };

    if (postLoginRef.current) {
      postLoginRef.current = false;
      offer();
      return;
    }

    // On an ordinary visit, let the tree paint before interrupting with the popup.
    const timer = setTimeout(offer, 2500);
    return () => clearTimeout(timer);
  }, [loading, user, profile, wasDismissedRecently]);

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
      } else {
        setPendingAlertCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setPendingAlertCount(0);
    }
  };

  useEffect(() => {
    if (!session?.access_token) return;

    const refreshAlerts = () => {
      fetchPendingAlerts();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAlerts();
      }
    };

    const onFocus = () => refreshAlerts();

    // Reduced from 15s to 60s: Supabase Realtime is now primary
    const interval = window.setInterval(refreshAlerts, 60000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [session?.access_token]);

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

  const fetchNearbyRelatives = async (cityOverride?: string) => {
    if (!session?.access_token) return;
    const city = (cityOverride ?? nearbyCityQuery).trim();
    const query = city ? `?city=${encodeURIComponent(city)}` : '';
    setNearbyLoading(true);
    setNearbyError('');
    try {
      const res = await fetch(`/api/relatives/around${query}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not fetch relatives by location');
      }
      const data = await res.json();
      if (data.warning === 'location_fields_missing') {
        setNearbyError('Location fields are not enabled yet. Run the latest migration first.');
      }
      setNearbyRelatives(data.relatives || []);
    } catch (err) {
      console.error('Failed to fetch nearby relatives:', err);
      setNearbyError(err instanceof Error ? err.message : 'Failed to fetch relatives by location');
    } finally {
      setNearbyLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────

  if (loading || dataLoading) return <FamilyPageSkeleton />;

  return (
    <div className="h-screen flex justify-center animate-pageEnter" style={{ background: 'transparent' }}>
    <div className="h-full w-full max-w-sm flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="glass-header px-5 pt-12 pb-3.5 z-10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="brand-wordmark text-[10px] text-gray-500/85 uppercase">Familiar</p>
            <h1 className="screen-title text-[17px] text-gray-900 mt-0.5">
              {profile?.full_name?.split(' ')[0]}&apos;s Family
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400/60 bg-gray-100/60 rounded-full px-2.5 py-1 mr-0.5 tabular-nums">
              {familyCount}
            </span>
            <button
              onClick={() => setShowShareSheet(true)}
              className="w-8 h-8 rounded-full bg-[#2A4365]/8 flex items-center justify-center hover:bg-[#2A4365]/12 transition-all active:scale-95 text-[#2A4365]"
              aria-label="Share Familiar"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={() => setShowInstallSheet(true)}
              className="w-8 h-8 rounded-full bg-gray-100/60 flex items-center justify-center hover:bg-gray-200/60 transition-all active:scale-95 text-gray-400"
            >
              <Download size={14} />
            </button>
            <Link
              href="/notifications"
              className="w-8 h-8 rounded-full bg-gray-100/60 flex items-center justify-center hover:bg-gray-200/60 transition-all active:scale-95 relative"
            >
              <Bell size={14} className="text-gray-400" />
              {pendingAlertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-red-500 rounded-full border-[1.5px] border-white flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white leading-none">{pendingAlertCount > 9 ? '9+' : pendingAlertCount}</span>
                </span>
              )}
            </Link>
            <TopRightMenu />
          </div>
        </div>
      </div>

      {/* Suggestions Banner */}
      {suggestions.length > 0 && !dataLoading && (
        <div className="bg-gradient-to-r from-[#2A4365]/8 via-white/50 to-[#2A4365]/8 backdrop-blur-lg border-b border-[#2A4365]/10 px-5 py-2.5 flex-shrink-0 cursor-pointer hover:from-[#2A4365]/12 hover:to-[#2A4365]/12 transition-all" onClick={() => setShowSuggestionsSheet(true)}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2A4365]/10 flex items-center justify-center">
                <Sparkles size={13} className="text-[#2A4365]" />
              </div>
              <p className="text-[13px] font-semibold text-gray-800">
                {suggestions.length} possible {suggestions.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>
            <button className="text-[11px] font-bold text-[#2A4365] bg-[#2A4365]/8 px-3.5 py-1.5 rounded-full hover:bg-[#2A4365]/15 transition-colors">
              Review
            </button>
          </div>
        </div>
      )}

      {/* Tree area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Floating Search Bar — premium frosted glass */}
        {familyCount > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[calc(100%-2rem)] sm:max-w-sm px-0">
          <div className="bg-black/55 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center px-4 py-2.5 gap-2.5">
              <Search size={15} className="text-white/40" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search family members..."
                className="flex-1 text-[13px] font-medium outline-none bg-transparent placeholder:text-white/25 text-white tracking-[-0.01em]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                  <X size={13} />
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
                viewMode={viewMode}
                onReady={() => setCosmosReady(true)}
              />
            </div>

            {/* Controls — premium frosted glass panel */}
            <div className="absolute z-20 flex flex-col gap-2" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', left: '1rem' }}>
              <div className="bg-black/50 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
                {/* Home / Center button */}
                <button
                  onClick={() => setCenterPerson(selfPerson.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-bold w-full transition-all active:scale-95 ${
                    centerPersonId && centerPersonId !== selfPerson.id
                      ? 'text-emerald-400'
                      : 'text-white/50'
                  }`}
                >
                  <Home size={13} />
                  <span>{centerPersonId && centerPersonId !== selfPerson.id ? 'Go Home' : 'My View'}</span>
                </button>

                {/* Divider */}
                <div className="h-px bg-white/[0.06] mx-2" />

                {/* View Mode Toggle */}
                <button
                  onClick={() => setViewMode(viewMode === 'fpp' ? 'tpp' : 'fpp')}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-bold w-full transition-all active:scale-95 text-white/70 hover:text-white"
                >
                  <Navigation size={13} className={viewMode === 'fpp' ? 'text-blue-400' : ''} />
                  <span>{viewMode === 'fpp' ? 'FPP Mode' : 'TPP Mode'}</span>
                </button>

                {/* Divider */}
                <div className="h-px bg-white/[0.06] mx-2" />

                {/* Focus rings control */}
                <div className="flex items-center gap-1.5 px-2.5 py-2">
                  <button
                    onClick={() => setFocusHops(focusHops - 1)}
                    disabled={focusHops <= 1}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span className="text-[9px] font-bold text-white/40 min-w-[36px] text-center tabular-nums tracking-wide">
                    {focusHops} {focusHops === 1 ? 'ring' : 'rings'}
                  </span>
                  <button
                    onClick={() => setFocusHops(focusHops + 1)}
                    disabled={focusHops >= 5}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-6">
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center max-w-xs w-full">
              <div className="w-16 h-16 rounded-full bg-gray-100/60 flex items-center justify-center mb-5">
                <BrandLogo size={30} />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Your tree is empty</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Start by adding your parents or siblings to build your family tree
              </p>
              <Link
                href="/add-member"
                className="bg-[#2A4365] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#2A4365]/90 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} /> Add First Member
              </Link>
            </div>
          </div>
        )}

        {familyCount > 0 && (
          <div className="absolute right-4 z-20 flex flex-col items-center gap-2.5" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <button
              onClick={() => {
                setShowNearbySheet(true);
                fetchNearbyRelatives();
              }}
              className="w-11 h-11 rounded-full bg-white/90 border border-white/60 backdrop-blur-xl text-[#2A4365] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:bg-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-90 transition-all"
              aria-label="Relatives around me"
            >
              <Navigation size={16} />
            </button>
            <Link
              href="/add-member"
              className="w-13 h-13 bg-gradient-to-br from-[#2A4365] to-[#2d6b48] rounded-full flex items-center justify-center shadow-[0_6px_24px_rgba(27,67,50,0.4)] hover:shadow-[0_8px_28px_rgba(27,67,50,0.5)] active:scale-90 transition-all"
              style={{ width: 52, height: 52 }}
            >
              <Plus size={22} className="text-white" />
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

      {/* Install / Download Popup */}
      <InstallAppSheet
        open={showInstallSheet}
        onOpenChange={setShowInstallSheet}
        appInstall={appInstall}
      />

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
              <Sparkles size={20} className="text-[#2A4365]" />
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
                  Is <span className="font-bold">{suggestion.to_person.full_name}</span> the <span className="font-semibold text-[#2A4365] capitalize">{suggestion.suggested_type}</span> of <span className="font-bold">{suggestion.from_person.full_name}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSuggestionResponse(suggestion.id, 'accept')}
                    disabled={processingSuggestionId === suggestion.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#2A4365] hover:bg-[#2A4365]/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
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

      {/* Relatives Around Me Sheet */}
      <Sheet open={showNearbySheet} onOpenChange={setShowNearbySheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Relatives Around Me</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-[#2A4365]" />
              Relatives Around Me
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Search your connected relatives by city.
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={nearbyCityQuery}
                onChange={(e) => setNearbyCityQuery(e.target.value)}
                placeholder="Enter city (e.g., Mumbai)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#2A4365]/30"
              />
            </div>
            <button
              onClick={() => fetchNearbyRelatives(nearbyCityQuery)}
              disabled={nearbyLoading}
              className="px-4 py-2.5 rounded-xl bg-[#2A4365] text-white text-sm font-semibold hover:bg-[#2A4365]/90 disabled:opacity-60"
            >
              Search
            </button>
          </div>

          <button
            onClick={() => {
              const homeCity = profile?.location_city || '';
              setNearbyCityQuery(homeCity);
              fetchNearbyRelatives(homeCity);
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#2A4365]/8 text-[#2A4365] hover:bg-[#2A4365]/12"
          >
            <Navigation size={13} />
            Use My Profile City
          </button>

          {nearbyError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
              {nearbyError}
            </p>
          )}

          {nearbyLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 size={22} className="text-[#2A4365]/40 animate-spin" />
            </div>
          ) : nearbyRelatives.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">
                No relatives found for this city yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ask relatives to update City in their Profile.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {nearbyRelatives.map((relative) => (
                <div key={relative.user_id} className="glass-card rounded-2xl px-3.5 py-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#2A4365]/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {relative.photo_url ? (
                      <img src={relative.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#2A4365] font-semibold text-sm">
                        {relative.full_name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{relative.full_name}</p>
                    <p className="text-xs text-[#2A4365]">{relative.relationship_label}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[relative.city, relative.state, relative.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Share Invite Sheet */}
      <ShareInviteSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
      />

      <BottomNav />
    </div>
    </div>
  );
}
