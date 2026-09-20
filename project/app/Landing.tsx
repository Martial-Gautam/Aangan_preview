'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import NextImage from 'next/image';
import BrandLogo from '@/components/BrandLogo';
import Footer from '@/components/Footer';
import Lenis from 'lenis';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, TreePine,
  ChevronDown, ChevronLeft, ChevronRight, MessageCircle, CalendarDays, Network, Download, ShieldCheck, Check
} from 'lucide-react';
import InstallAppSheet from '@/components/InstallAppSheet';
import { useAppInstall } from '@/hooks/useAppInstall';
import type { ReleaseInfo } from '@/lib/release';

type Mode = 'landing' | 'signin' | 'signup';

/** Store frames from Aangan_management/for_store_screenshots, resized to 720px WebP. */
const SCREENSHOTS = [
  { file: 'main', alt: 'Family World — everyone you are related to, on one map' },
  { file: 'related', alt: 'Exactly how you are related, with the chain of people between you' },
  { file: 'digest', alt: 'Your people sorted into three generations' },
  { file: 'posts', alt: 'Posts — no algorithm, no strangers, just your family' },
  { file: 'discuss', alt: 'Discuss — one thread, not forty unread replies' },
  { file: 'chats', alt: 'Chats — the family group chat, finally organised' },
  { file: 'events', alt: 'Events — nobody misses the next one' },
  { file: 'event-detail', alt: 'Event detail — who is coming, and every photo after' },
  { file: 'kept', alt: 'Kept — every wedding and festival, kept together' },
];

// Structured data so search engines can show this as an app listing (name,
// platform, price, rating-free). Facts only — nothing here we cannot back.
const appJsonLd = (release: ReleaseInfo) => ({
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Apney',
  alternateName: 'Aangan',
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'Android 8.0+',
  description:
    'A private family app: everyone you are related to on one map, exact kinship names, and posts, events and photos only your family can see.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  downloadUrl: 'https://apney.vercel.app/download',
  fileSize: `${release.sizeMB}MB`,
  softwareVersion: release.version,
  author: { '@type': 'Person', name: 'Ranveer Gautam' },
  screenshot: ['main', 'related', 'posts', 'chats', 'events', 'kept'].map((f) => `https://apney.vercel.app/screenshots/${f}.webp`),
});

const DeferredLandingSections = dynamic(
  () => import('@/components/welcome/DeferredLandingSections'),
  { ssr: false, loading: () => null }
);

export default function Landing({ release }: { release: ReleaseInfo }) {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>('landing');

  // The landing page is the site root so crawlers get real content at the
  // domain. Anyone with a live session still lands in the app, as before.
  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(profile?.onboarding_completed ? '/home' : '/onboarding');
  }, [authLoading, user, profile, router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [enableMotion, setEnableMotion] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const revealMaskRef = useRef<HTMLDivElement>(null);
  const heroRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const heroMeasureFrameRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // App download — Android gets the APK, iOS and desktop get the PWA install steps
  const appInstall = useAppInstall();
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const installOfferedRef = useRef(false);

  // Every CTA starts the APK download, then opens the dialog on the
  // "what happens next" steps, since the download itself runs in the background.
  const handleDownload = useCallback(() => {
    appInstall.download();
    setShowInstallSteps(true);
    setShowInstallSheet(true);
  }, [appInstall]);

  const { scrollY } = useScroll();
  const heroBackgroundY = useTransform(scrollY, [0, 1000], [0, 350]);
  const floatingCuesY = useTransform(scrollY, [0, 800], [0, -200]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > 60;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEnableMotion(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Install popup — opens immediately on arrival. Only on the landing view, so it
  // cannot cover the auth form, and offered at most once per visit so dismissing
  // it does not immediately reopen it.
  useEffect(() => {
    if (mode !== 'landing') return;
    if (installOfferedRef.current || appInstall.wasDismissedRecently()) return;

    installOfferedRef.current = true;
    setShowInstallSheet(true);
  }, [mode, appInstall]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        router.replace('/onboarding');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile?.onboarding_completed) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('aangan_post_login_bootstrap', '1');
          }
          router.replace('/home');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateRevealPosition = useCallback((clientX: number, clientY: number) => {
    const revealEl = revealMaskRef.current;
    const rect = heroRectRef.current;
    if (!revealEl || !rect) return;

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    revealEl.style.setProperty('--mx', `${x}px`);
    revealEl.style.setProperty('--my', `${y}px`);
  }, []);

  const flushPendingPointer = useCallback(() => {
    pointerFrameRef.current = null;
    const pending = pendingPointerRef.current;
    if (!pending) return;
    updateRevealPosition(pending.clientX, pending.clientY);
  }, [updateRevealPosition]);

  const scheduleRevealUpdate = useCallback((clientX: number, clientY: number) => {
    pendingPointerRef.current = { clientX, clientY };
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = window.requestAnimationFrame(flushPendingPointer);
  }, [flushPendingPointer]);

  const scheduleHeroMeasure = useCallback(() => {
    if (heroMeasureFrameRef.current !== null) return;
    heroMeasureFrameRef.current = window.requestAnimationFrame(() => {
      heroMeasureFrameRef.current = null;
      const heroEl = heroRef.current;
      if (!heroEl) return;
      const rect = heroEl.getBoundingClientRect();
      heroRectRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      const pending = pendingPointerRef.current;
      if (pending) updateRevealPosition(pending.clientX, pending.clientY);
    });
  }, [updateRevealPosition]);

  useEffect(() => {
    scheduleHeroMeasure();
    const handleResize = () => scheduleHeroMeasure();
    const handleScroll = () => scheduleHeroMeasure();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && heroRef.current) {
      observer = new ResizeObserver(() => scheduleHeroMeasure());
      observer.observe(heroRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (observer) observer.disconnect();
      if (heroMeasureFrameRef.current !== null) {
        window.cancelAnimationFrame(heroMeasureFrameRef.current);
        heroMeasureFrameRef.current = null;
      }
    };
  }, [scheduleHeroMeasure]);

  const handleHeroPointerEnter = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    scheduleHeroMeasure();
    revealEl.style.setProperty('--reveal-strength', '0.46');
  };

  const handleHeroPointerLeave = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    pendingPointerRef.current = null;
    revealEl.style.setProperty('--reveal-strength', '0.24');
  };

  const handleHeroMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    scheduleRevealUpdate(event.clientX, event.clientY);
  };

  const handleHeroTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    scheduleRevealUpdate(touch.clientX, touch.clientY);
    const revealEl = revealMaskRef.current;
    if (revealEl) revealEl.style.setProperty('--reveal-strength', '0.42');
  };

  useEffect(() => {
    let idleId: number | ReturnType<typeof setTimeout> | null = null;
    const globalWithIdle = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (globalWithIdle.requestIdleCallback) {
      idleId = globalWithIdle.requestIdleCallback(() => setShowDeferred(true));
    } else {
      idleId = setTimeout(() => setShowDeferred(true), 800);
    }

    return () => {
      if (idleId === null) return;
      if (globalWithIdle.cancelIdleCallback && typeof idleId === 'number') {
        globalWithIdle.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  // --- Auth form screen ---
  if (mode !== 'landing') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="welcome-page min-h-screen flex flex-col"
        style={{ background: 'transparent' }}
      >
        <div className="flex-1 flex flex-col justify-center px-6 py-12">
          <div className="w-full max-w-sm mx-auto">
            <button
              onClick={() => { setMode('landing'); setError(''); }}
              className="inline-flex items-center gap-2 mb-8 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/70 dark:bg-white/8 border border-gray-200/70 dark:border-white/15 rounded-xl px-3.5 py-2 hover:bg-white dark:hover:bg-white/12 transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
              Back
            </button>

            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#2A4365]/10 border border-[#2A4365]/15 flex items-center justify-center mb-4 shadow-sm">
                <BrandLogo size={26} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {mode === 'signup' ? 'Join Apney' : 'Welcome back'}
              </h2>
              <p className="text-gray-500 dark:text-gray-300 mt-1 text-sm">
                {mode === 'signup' ? 'Start building your Family Graph' : 'Sign in to your Family Graph'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl glass-input text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-11 py-3.5 rounded-xl glass-input text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2A4365] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#2A4365]/90 active:scale-[0.98] transition-all shadow-lg shadow-[#2A4365]/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-300 mt-6">
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
                className="text-[#2A4365] dark:text-[#7ea7e0] font-semibold hover:text-[#2A4365]/80 dark:hover:text-[#9fc0ef]"
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer for Auth Screen */}
        <Footer variant="app" />
      </motion.div>
    );
  }

  // --- Landing page ---
  return (
    <div className="welcome-page min-h-screen relative" style={{ background: 'transparent' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd(release)) }} />
      {/* Sticky header — appears on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? 'glass-header'
            : 'bg-transparent'
          }`}
      >
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size={20} />
            <div className="leading-tight">
              <span className={`brand-wordmark block text-lg transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                Apney
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 transition-all duration-300 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button
              onClick={handleDownload}
              className="text-sm font-semibold bg-[#FF4D6D] text-white px-4 py-2 rounded-xl hover:bg-[#ff3d60] transition-all shadow-sm flex items-center gap-1.5"
            >
              <Download size={15} />
              Download the App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[calc(100svh+48px)] flex flex-col justify-center px-5 sm:px-6 overflow-hidden"
        onMouseMove={handleHeroMouseMove}
        onMouseEnter={handleHeroPointerEnter}
        onMouseLeave={handleHeroPointerLeave}
        onTouchMove={handleHeroTouchMove}
      >
        <div className="absolute inset-0 bg-[#07121e]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,127,99,0.20)_0%,rgba(255,196,87,0.10)_24%,rgba(45,129,255,0.16)_53%,rgba(30,177,138,0.14)_78%,rgba(7,18,30,0.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_52%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(7,18,30,0.34)_0%,rgba(7,18,30,0.88)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#f7f9fb]" />

        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none opacity-65"
          aria-hidden="true"
          style={{ y: heroBackgroundY }}
          animate={enableMotion ? { scale: [1, 1.018, 1], opacity: [0.46, 0.58, 0.5] } : false}
          transition={enableMotion ? { duration: 16, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          <svg viewBox="0 0 1800 980" className="w-full h-full object-cover">
            <defs>
              <linearGradient id="welcomeCosmosHot" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffad66" stopOpacity="0.68" />
                <stop offset="46%" stopColor="#ff5f7e" stopOpacity="0.58" />
                <stop offset="100%" stopColor="#72e7ff" stopOpacity="0.52" />
              </linearGradient>
              <linearGradient id="welcomeCosmosCool" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5ff0b8" stopOpacity="0.44" />
                <stop offset="48%" stopColor="#91c7ff" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#ffe69a" stopOpacity="0.38" />
              </linearGradient>
              <filter id="welcomeGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g filter="url(#welcomeGlow)" opacity="0.72">
              <path d="M900 515 L690 380 L510 275 L310 190 L130 145" stroke="url(#welcomeCosmosHot)" strokeWidth="4.8" strokeLinecap="round" fill="none" />
              <path d="M900 515 L1110 380 L1300 280 L1500 200 L1680 155" stroke="url(#welcomeCosmosHot)" strokeWidth="4.8" strokeLinecap="round" fill="none" />
              <path d="M900 515 L785 660 L655 790 L520 885" stroke="url(#welcomeCosmosCool)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
              <path d="M900 515 L1035 662 L1175 790 L1320 885" stroke="url(#welcomeCosmosCool)" strokeWidth="3.6" strokeLinecap="round" fill="none" />
              <path d="M690 380 C790 250 1020 245 1110 380" stroke="url(#welcomeCosmosCool)" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M510 275 C695 365 890 328 1110 380 C1215 405 1370 325 1500 200" stroke="url(#welcomeCosmosCool)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.72" />

              <ellipse cx="900" cy="515" rx="610" ry="225" transform="rotate(-12 900 515)" stroke="#ffd791" strokeOpacity="0.22" strokeWidth="1.7" fill="none" />
              <ellipse cx="900" cy="515" rx="720" ry="275" transform="rotate(9 900 515)" stroke="#8adfff" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
              <ellipse cx="900" cy="515" rx="840" ry="305" transform="rotate(20 900 515)" stroke="#ff9aaa" strokeOpacity="0.13" strokeWidth="1.2" fill="none" />

              {[
                [900, 515, 25], [690, 380, 18], [1110, 380, 18], [510, 275, 15], [1300, 280, 15],
                [310, 190, 12], [1500, 200, 12], [130, 145, 10], [1680, 155, 10], [655, 790, 13],
                [1175, 790, 13], [520, 885, 11], [1320, 885, 11], [785, 660, 10], [1035, 662, 10],
              ].map(([cx, cy, r], index) => (
                <motion.g
                  key={`${cx}-${cy}`}
                  animate={enableMotion ? { y: [0, index % 2 === 0 ? -8 : 7, 0], opacity: [0.75, 1, 0.78] } : false}
                  transition={enableMotion ? { duration: 5.8 + index * 0.18, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 } : undefined}
                >
                  <circle cx={cx} cy={cy} r={r + 8} fill="#ffffff" fillOpacity="0.08" />
                  <circle cx={cx} cy={cy} r={r} fill="#f8fcff" fillOpacity="0.9" />
                  <circle cx={cx} cy={cy - r * 0.2} r={r * 0.28} fill="#17324f" fillOpacity="0.72" />
                  <path d={`M${cx - r * 0.55} ${cy + r * 0.56}C${cx - r * 0.38} ${cy + r * 0.18} ${cx + r * 0.38} ${cy + r * 0.18} ${cx + r * 0.55} ${cy + r * 0.56}`} fill="#17324f" fillOpacity="0.68" />
                </motion.g>
              ))}
            </g>
          </svg>
        </motion.div>

        <div className="absolute inset-0 z-[2] pointer-events-none bg-[linear-gradient(90deg,rgba(7,18,30,0.88)_0%,rgba(7,18,30,0.66)_34%,rgba(7,18,30,0.30)_67%,rgba(7,18,30,0.50)_100%)]" />

        <div className="absolute inset-0 z-[3] pointer-events-none hidden md:block" aria-hidden="true">
          <div
            ref={revealMaskRef}
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: 'var(--reveal-strength,0.24)',
              WebkitMaskImage:
                'radial-gradient(320px 320px at var(--mx,50%) var(--my,52%), rgba(0,0,0,1) 0%, rgba(0,0,0,0.82) 38%, rgba(0,0,0,0.32) 62%, transparent 78%)',
              maskImage:
                'radial-gradient(320px 320px at var(--mx,50%) var(--my,52%), rgba(0,0,0,1) 0%, rgba(0,0,0,0.82) 38%, rgba(0,0,0,0.32) 62%, transparent 78%)',
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18),transparent_38%,rgba(255,217,139,0.12)_62%,transparent_84%)]" />
          </div>
        </div>

        {/* Floating family cues */}
        <motion.div style={{ y: floatingCuesY }} className="absolute inset-0 pointer-events-none z-[3]">
          <motion.div
            className="absolute top-24 left-7 w-10 h-10 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
            animate={enableMotion ? { y: [0, -10, 0], opacity: [0.55, 0.9, 0.65] } : false}
            transition={enableMotion ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            <TreePine size={16} className="text-white/75" />
          </motion.div>
          <motion.div
            className="absolute top-32 right-12 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
            style={{ animationDelay: '1s' }}
            animate={enableMotion ? { y: [0, -8, 0], opacity: [0.45, 0.85, 0.55] } : false}
            transition={enableMotion ? { duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } : undefined}
          >
            <MessageCircle size={15} className="text-white/75" />
          </motion.div>
          <motion.div
            className="absolute bottom-40 left-14 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
            style={{ animationDelay: '2s' }}
            animate={enableMotion ? { y: [0, -9, 0], opacity: [0.5, 0.9, 0.6] } : false}
            transition={enableMotion ? { duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 } : undefined}
          >
            <CalendarDays size={15} className="text-white/75" />
          </motion.div>
          <motion.div
            className="absolute bottom-32 right-8 w-11 h-11 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
            animate={enableMotion ? { y: [0, -11, 0], opacity: [0.45, 0.9, 0.6] } : false}
            transition={enableMotion ? { duration: 6.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } : undefined}
          >
            <Network size={17} className="text-white/75" />
          </motion.div>
        </motion.div>

        <div className="relative z-10 w-full max-w-5xl mx-auto pt-28 pb-16 sm:pb-20">
          {/* Listing header: icon · name · developer · stats · install */}
          <motion.div
            initial={enableMotion ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8"
          >
            <div className="relative flex-shrink-0 self-center sm:self-start">
              <div
                className="absolute -inset-4 rounded-[36px] blur-2xl opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(255,77,109,0.45), transparent 70%)' }}
              />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-white/[0.08] border border-white/15 backdrop-blur-md shadow-2xl shadow-black/40 flex items-center justify-center">
                <BrandLogo size={72} priority />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="brand-wordmark text-5xl sm:text-6xl text-white leading-none mb-2 tracking-normal">
                Apney
              </h1>
              <p className="text-[#FF4D6D] font-semibold text-[15px]">Ranveer Gautam</p>
              <p className="text-white/65 text-sm mt-1">Everyone you are related to, on one map. Private by design.</p>

              <div className="mt-6 grid grid-cols-4 divide-x divide-white/12 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-md">
                {[
                  { value: 'Free', label: 'No ads, ever' },
                  { value: `${release.sizeMB} MB`, label: 'Android APK' },
                  { value: `v${release.version}`, label: 'Early access' },
                  { value: 'E2E', label: 'Encrypted chats' },
                ].map((s) => (
                  <div key={s.label} className="py-3 px-1 text-center">
                    <p className="text-white font-bold text-[15px] sm:text-base leading-tight">{s.value}</p>
                    <p className="text-white/45 text-[10px] sm:text-[11px] mt-0.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <button
                  onClick={handleDownload}
                  className="welcome-primary-cta w-full sm:w-auto bg-white text-[#16314d] px-12 py-4 rounded-2xl font-bold text-base hover:bg-[#fff6df] active:scale-[0.97] transition-all shadow-xl shadow-black/18 flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Install
                </button>
                <p className="text-xs text-white/50 leading-relaxed">
                  Android 8.0 and up · Not on the Play Store yet — installs directly from the APK.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Screenshot rail */}
          <motion.div
            initial={enableMotion ? { opacity: 0, y: 24 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="relative mt-12 -mx-5 sm:-mx-6"
          >
            {/* Desktop scroll buttons — touch users swipe, so these stay hidden below sm */}
            {[
              { dir: -1, side: 'left-2', label: 'Previous screenshots', Icon: ChevronLeft },
              { dir: 1, side: 'right-2', label: 'Next screenshots', Icon: ChevronRight },
            ].map(({ dir, side, label, Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.8, behavior: 'smooth' })}
                className={`hidden sm:flex absolute ${side} top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#07121e]/80 border border-white/20 backdrop-blur-md text-white items-center justify-center shadow-xl shadow-black/40 hover:bg-white hover:text-[#07121e] transition-colors`}
              >
                <Icon size={20} />
              </button>
            ))}
            <div ref={railRef} className="flex gap-3 sm:gap-4 overflow-x-auto px-5 sm:px-6 pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SCREENSHOTS.map((shot, index) => (
                <NextImage
                  key={shot.file}
                  src={`/screenshots/${shot.file}.webp`}
                  alt={shot.alt}
                  width={720}
                  height={1564}
                  priority={index < 2}
                  className="snap-start flex-shrink-0 w-[212px] sm:w-[248px] h-auto rounded-[22px] border border-white/10 shadow-2xl shadow-black/40"
                />
              ))}
            </div>
          </motion.div>

          {/* About + Data safety */}
          <div className="mt-10 grid lg:grid-cols-[1.35fr_1fr] gap-5">
            <div className="rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-md p-6 sm:p-7">
              <h2 className="text-white font-bold text-lg mb-3">About this app</h2>
              <p className="text-white/70 leading-relaxed text-[15px] mb-3">
                Apney puts your whole family on one map — parents&apos; side, your side, the children —
                and tells you exactly how anyone is related to you. Not &ldquo;Relative&rdquo;: Bhatiji,
                Chachera bhai, Nani, with the chain of people in between.
              </p>
              <p className="text-white/70 leading-relaxed text-[15px]">
                Posts with no algorithm and no strangers. One thread to settle where Diwali is this year.
                Events the right branch of the family gets invited to. And every wedding, festival and
                birthday kept together, in albums the whole family adds to.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Family World', 'Exact kinship names', 'Posts', 'Discuss', 'Chats', 'Events', 'Kept'].map((chip) => (
                  <span key={chip} className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/80">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-md p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} className="text-[#8ff0c7]" />
                <h2 className="text-white font-bold text-lg">Data safety</h2>
              </div>
              <ul className="space-y-2.5">
                {[
                  'No ads, no analytics, no tracking',
                  'Never asks for location or contacts',
                  'Messages are end-to-end encrypted',
                  'Nothing is public — family only',
                  'Delete everything in one tap',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[14px] text-white/80">
                    <Check size={15} className="text-[#8ff0c7] mt-0.5 flex-shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
              <a href="/privacy" className="inline-flex items-center gap-1 mt-5 text-xs font-semibold text-[#FF4D6D] hover:text-white transition-colors">
                Read the privacy policy <ArrowRight size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button onClick={scrollToFeatures} className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[#17324f]/60 hover:text-[#17324f] transition-colors animate-bounce">
          <ChevronDown size={28} />
        </button>
      </section>

      {showDeferred ? (
        <DeferredLandingSections onDownload={handleDownload} />
      ) : null}

      {/* Install / Download Popup */}
      <InstallAppSheet
        open={showInstallSheet}
        onOpenChange={(next) => { setShowInstallSheet(next); if (!next) setShowInstallSteps(false); }}
        appInstall={appInstall}
        showSteps={showInstallSteps}
        sizeMB={release.sizeMB}
      />
    </div>
  );
}
