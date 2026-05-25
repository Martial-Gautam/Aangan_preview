'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import BrandLogo from '@/components/BrandLogo';
import { motion } from 'motion/react';
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, TreePine, Shield,
  Image, ChevronDown, Sparkles, MessageCircle, CalendarDays, Network
} from 'lucide-react';

type Mode = 'landing' | 'signin' | 'signup';

const DeferredLandingSections = dynamic(
  () => import('@/components/welcome/DeferredLandingSections'),
  { ssr: false, loading: () => null }
);

export default function WelcomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('landing');
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
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.16em] mb-1">
                Formerly &quot;Aangan&quot;
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {mode === 'signup' ? 'Join Familiar' : 'Welcome back'}
              </h2>
              <p className="text-gray-500 dark:text-gray-300 mt-1 text-sm">
                {mode === 'signup' ? 'Start building your family tree today' : 'Sign in to your digital courtyard'}
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
      </motion.div>
    );
  }

  // --- Landing page ---
  return (
    <div className="welcome-page min-h-screen" style={{ background: 'transparent' }}>
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
                Familiar
              </span>
              <span className={`block text-[9px] font-semibold uppercase tracking-[0.15em] transition-colors ${scrolled ? 'text-gray-500' : 'text-white/65'}`}>
                Formerly &quot;Aangan&quot;
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 transition-all duration-300 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button
              onClick={() => setMode('signin')}
              className="text-sm font-semibold text-gray-500 hover:text-[#2A4365] px-3 py-2 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className="text-sm font-semibold bg-[#2A4365] text-white px-4 py-2 rounded-xl hover:bg-[#2A4365]/90 transition-all shadow-sm"
            >
              Get Started
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
        <motion.div
          className="absolute z-[3] top-24 left-7 w-10 h-10 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          animate={enableMotion ? { y: [0, -10, 0], opacity: [0.55, 0.9, 0.65] } : false}
          transition={enableMotion ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          <TreePine size={16} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] top-32 right-12 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          style={{ animationDelay: '1s' }}
          animate={enableMotion ? { y: [0, -8, 0], opacity: [0.45, 0.85, 0.55] } : false}
          transition={enableMotion ? { duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 } : undefined}
        >
          <MessageCircle size={15} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] bottom-40 left-14 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          style={{ animationDelay: '2s' }}
          animate={enableMotion ? { y: [0, -9, 0], opacity: [0.5, 0.9, 0.6] } : false}
          transition={enableMotion ? { duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 } : undefined}
        >
          <CalendarDays size={15} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] bottom-32 right-8 w-11 h-11 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          animate={enableMotion ? { y: [0, -11, 0], opacity: [0.45, 0.9, 0.6] } : false}
          transition={enableMotion ? { duration: 6.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } : undefined}
        >
          <Network size={17} className="text-white/75" />
        </motion.div>

        <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-[1fr_410px] gap-8 lg:gap-12 items-center pt-24 pb-28">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#07121e]/60 px-3.5 py-2 text-white/90 backdrop-blur-md shadow-lg shadow-black/10 mb-5">
              <Sparkles size={15} className="text-[#ffd98f]" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">The Digital Courtyard</span>
            </div>

            <h1 className="brand-wordmark text-6xl sm:text-7xl lg:text-8xl text-white leading-[0.9] mb-5 tracking-normal">
              Familiar
            </h1>

            <p className="text-white text-2xl sm:text-3xl font-bold leading-tight mb-4 max-w-xl mx-auto lg:mx-0">
              Your family tree, chats, memories, and invitations moving together.
            </p>

            <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-7 max-w-xl mx-auto lg:mx-0">
              Build a living cosmos of relatives, discover the right rishta, share family moments privately, and bring every generation into one warm space.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-7">
              <button
                onClick={() => setMode('signup')}
                className="welcome-primary-cta w-full sm:w-auto bg-white text-[#16314d] px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#fff6df] active:scale-[0.97] transition-all shadow-xl shadow-black/18 flex items-center justify-center gap-2"
              >
                Start Your Family Cosmos <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setMode('signin')}
                className="w-full sm:w-auto bg-[#10243a]/50 backdrop-blur-md text-white border border-white/24 px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/[0.18] active:scale-[0.97] transition-all"
              >
                Sign In
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              {[
                { icon: TreePine, label: 'Universal Tree' },
                { icon: Shield, label: 'Private by degree' },
                { icon: MessageCircle, label: 'Family chats' },
                { icon: Image, label: 'Shared memories' },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[#07121e]/45 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md">
                  <item.icon size={13} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={enableMotion ? { opacity: 0, y: 24, rotate: 1.5 } : false}
            animate={enableMotion ? { opacity: 1, y: [0, -10, 0], rotate: [1.5, -0.8, 1.5] } : { opacity: 1, y: 0, rotate: 1.5 }}
            transition={enableMotion ? {
              opacity: { duration: 0.65, ease: 'easeOut', delay: 0.35 },
              y: { duration: 7.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
              rotate: { duration: 9.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
            } : { duration: 0 }}
            className="hidden sm:block justify-self-center w-full max-w-[390px]"
          >
            <div className="rounded-[2rem] border border-white/24 bg-white/[0.14] p-3 shadow-2xl shadow-black/28 backdrop-blur-2xl">
              <div className="rounded-[1.45rem] bg-[#081522]/92 border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffd98f] font-bold">Live Family Cosmos</p>
                    <p className="text-white font-bold text-lg">Ranveer&apos;s Family</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/[0.12] border border-white/12 flex items-center justify-center">
                    <BrandLogo size={23} />
                  </div>
                </div>

                <div className="relative h-56 mx-4 rounded-2xl bg-[linear-gradient(145deg,rgba(28,63,97,0.9),rgba(17,35,55,0.78))] border border-white/10 overflow-hidden">
                  <svg viewBox="0 0 340 220" className="absolute inset-0 w-full h-full">
                    <path d="M170 108 L92 58 L42 38" stroke="#ffba78" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M170 108 L248 58 L298 38" stroke="#ffba78" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M170 108 L118 174" stroke="#70e4c1" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M170 108 L222 174" stroke="#70e4c1" strokeWidth="2.2" strokeLinecap="round" />
                    {[
                      [170, 108, 'ME', '#ffffff'], [92, 58, 'Maa', '#ffe2b0'], [248, 58, 'Papa', '#b7e5ff'],
                      [42, 38, 'Nani', '#ffd0d9'], [298, 38, 'Dada', '#d8ffc9'], [118, 174, 'Bhai', '#c3f5ff'], [222, 174, 'Bua', '#ffd5a6'],
                    ].map(([cx, cy, label, fill]) => (
                      <g key={`${cx}-${cy}`}>
                        <circle cx={cx as number} cy={cy as number} r="19" fill={fill as string} fillOpacity="0.95" />
                        <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#10243a">{label}</text>
                      </g>
                    ))}
                  </svg>
                  <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between rounded-2xl bg-[#07121e]/70 border border-white/10 px-3 py-2 backdrop-blur-md">
                    <span className="text-xs text-white/85 font-semibold">Imagine is your Maasi</span>
                    <span className="text-[10px] text-[#ffd98f] font-bold">2 hops</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {[
                    { icon: MessageCircle, title: 'Family Chat', text: 'Badhaiya Hoon', tone: 'text-[#8edbff]' },
                    { icon: CalendarDays, title: 'Wedding Invite', text: 'Sent to 42 relatives', tone: 'text-[#ffd98f]' },
                    { icon: Image, title: 'Memories', text: '18 new photos added', tone: 'text-[#8ff0c7]' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-white/9 bg-white/[0.055] px-3 py-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <item.icon size={16} className={item.tone} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.title}</p>
                        <p className="text-xs text-white/65 truncate">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <button onClick={scrollToFeatures} className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[#17324f]/60 hover:text-[#17324f] transition-colors animate-bounce">
          <ChevronDown size={28} />
        </button>
      </section>

      {showDeferred ? (
        <DeferredLandingSections onSignIn={() => setMode('signin')} onSignUp={() => setMode('signup')} />
      ) : null}
    </div>
  );
}
