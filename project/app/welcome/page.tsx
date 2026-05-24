'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BrandLogo from '@/components/BrandLogo';
import { motion } from 'motion/react';
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, TreePine, Users, Shield,
  MapPin, Send, Image, Heart, ChevronDown, Sparkles, Globe, MessageCircle, CalendarDays, Network
} from 'lucide-react';

type Mode = 'landing' | 'signin' | 'signup';

export default function WelcomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [hoveredProblem, setHoveredProblem] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const revealMaskRef = useRef<HTMLDivElement>(null);
  const heroRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > 60;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

  const measureHeroRect = useCallback(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    heroRectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

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

  const handleHeroPointerEnter = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    measureHeroRect();
    revealEl.style.setProperty('--reveal-strength', '0.46');
  };

  const handleHeroPointerLeave = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
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
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    measureHeroRect();
    const rect = heroRectRef.current;
    if (!rect) return;
    revealEl.style.setProperty('--mx', `${rect.width * 0.5}px`);
    revealEl.style.setProperty('--my', `${rect.height * 0.52}px`);
  }, [measureHeroRect]);

  useEffect(() => {
    const handleResize = () => measureHeroRect();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [measureHeroRect]);

  useEffect(() => {
    return () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  const problemItems = [
    {
      icon: Users,
      title: 'Dispersed Family Ties',
      desc: 'Family updates are scattered across social apps, calls, and groups.',
      solution: 'A unified family graph brings every person into one visible network.',
      previewTitle: 'Scattered groups become one tree',
      from: ['WhatsApp', 'Albums', 'Calls'],
      to: 'Family Cosmos',
    },
    {
      icon: Shield,
      title: 'Limited Privacy Control',
      desc: 'It is hard to decide who should see sensitive family updates.',
      solution: 'Share by relationship degree, side of family, and trusted circles.',
      previewTitle: 'Privacy follows the relation',
      from: ['Everyone', 'Friends', 'Unknown'],
      to: '2nd degree only',
    },
    {
      icon: TreePine,
      title: 'No Universal Family Tree',
      desc: 'Most families do not have a living, shared family map.',
      solution: 'Add relatives once and let the app resolve direct and extended relations.',
      previewTitle: 'Every new node teaches the tree',
      from: ['Maa', 'Bua', 'Mama'],
      to: 'Resolved Rishta',
    },
    {
      icon: Send,
      title: 'Event Disorganization',
      desc: 'Invites, guest lists, and event memories live in separate places.',
      solution: 'Send invitations to family groups and collect shared memories together.',
      previewTitle: 'One invite reaches the right branch',
      from: ['Guest list', 'Photos', 'Updates'],
      to: 'Family Event',
    },
    {
      icon: MapPin,
      title: 'Hard to Find Relatives',
      desc: 'In new cities, people often do not know which relatives are nearby.',
      solution: 'Discover trusted relatives around a place or gathering.',
      previewTitle: 'New city, known people',
      from: ['Delhi', 'Pune', 'Jaipur'],
      to: 'Nearby Relatives',
    },
    {
      icon: Heart,
      title: 'Fear of Judgement',
      desc: 'People hesitate to post personal family moments publicly.',
      solution: 'A private courtyard makes emotional family sharing feel safer.',
      previewTitle: 'Private moments stay in the family',
      from: ['Public feed', 'Mixed audience', 'Noise'],
      to: 'Family-only',
    },
  ];

  const featureItems = [
    {
      icon: TreePine,
      title: 'Universal Family Tree',
      desc: 'Add yourself once and Familiar maps relatives and degrees of relation.',
      gradient: 'from-[#ff7f63] to-[#2d81ff]',
      snapshot: 'tree',
    },
    {
      icon: Shield,
      title: 'Privacy Controls',
      desc: 'Share posts, events, and announcements only up to the degree you choose.',
      gradient: 'from-[#2d81ff] to-[#1eb18a]',
      snapshot: 'privacy',
    },
    {
      icon: MapPin,
      title: 'Find Relatives Nearby',
      desc: 'Discover family in new cities, functions, or travel plans.',
      gradient: 'from-[#1eb18a] to-[#ffc457]',
      snapshot: 'nearby',
    },
    {
      icon: Send,
      title: 'One-Tap Invitations',
      desc: 'Invite entire family groups to weddings, rituals, and gatherings.',
      gradient: 'from-[#ffc457] to-[#ff7f63]',
      snapshot: 'invite',
    },
    {
      icon: Image,
      title: 'Family-First Media Sharing',
      desc: 'Shared galleries where everyone contributes photos and videos.',
      gradient: 'from-[#ff7f63] to-[#1eb18a]',
      snapshot: 'media',
    },
    {
      icon: Sparkles,
      title: 'Ancestor Mapping',
      desc: 'Trace generations of lineage and preserve stories over time.',
      gradient: 'from-[#2d81ff] to-[#ff7f63]',
      snapshot: 'ancestor',
    },
  ];

  const activeProblem = problemItems[hoveredProblem] || problemItems[0];
  const activeFeature = featureItems[hoveredFeature] || featureItems[0];

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
          animate={{ scale: [1, 1.018, 1], opacity: [0.46, 0.58, 0.5] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
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
                  animate={{ y: [0, index % 2 === 0 ? -8 : 7, 0], opacity: [0.75, 1, 0.78] }}
                  transition={{ duration: 5.8 + index * 0.18, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
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
          animate={{ y: [0, -10, 0], opacity: [0.55, 0.9, 0.65] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TreePine size={16} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] top-32 right-12 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          style={{ animationDelay: '1s' }}
          animate={{ y: [0, -8, 0], opacity: [0.45, 0.85, 0.55] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <MessageCircle size={15} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] bottom-40 left-14 w-9 h-9 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          style={{ animationDelay: '2s' }}
          animate={{ y: [0, -9, 0], opacity: [0.5, 0.9, 0.6] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
        >
          <CalendarDays size={15} className="text-white/75" />
        </motion.div>
        <motion.div
          className="absolute z-[3] bottom-32 right-8 w-11 h-11 rounded-full bg-white/[0.16] backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10"
          animate={{ y: [0, -11, 0], opacity: [0.45, 0.9, 0.6] }}
          transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
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
            initial={{ opacity: 0, y: 24, rotate: 1.5 }}
            animate={{ opacity: 1, y: [0, -10, 0], rotate: [1.5, -0.8, 1.5] }}
            transition={{
              opacity: { duration: 0.65, ease: 'easeOut', delay: 0.35 },
              y: { duration: 7.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
              rotate: { duration: 9.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 },
            }}
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

      {/* The Challenge */}
      <section className="py-24 px-6 bg-[#f7f9fb]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Problem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 mb-4 leading-tight">
              Family life is rich. The tools around it are fragmented.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Hover a challenge to see how Familiar turns scattered family moments into a connected, private relation graph.
            </p>

            <motion.div
              key={activeProblem.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/6 overflow-hidden"
            >
              <div className="bg-[#07121e] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffd98f] font-bold">Problem to product</p>
                    <h3 className="text-white font-bold text-lg mt-1">{activeProblem.previewTitle}</h3>
                  </div>
                  <activeProblem.icon size={22} className="text-white/70" />
                </div>

                <div className="relative h-56 rounded-2xl bg-[linear-gradient(145deg,rgba(31,64,96,0.88),rgba(8,21,34,0.96))] border border-white/10 overflow-hidden">
                  <svg viewBox="0 0 360 230" className="absolute inset-0 h-full w-full">
                    <path d="M70 68 C128 94 156 116 180 138" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M180 138 C218 105 254 84 304 62" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M180 138 L110 184" stroke="#8edbff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    <path d="M180 138 L250 184" stroke="#ffd98f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
                    {activeProblem.from.map((label, index) => {
                      const points = [[70, 68], [180, 40], [304, 62]][index] || [70 + index * 100, 70];
                      return (
                        <g key={label}>
                          <circle cx={points[0]} cy={points[1]} r="24" fill="#ffffff" fillOpacity="0.92" />
                          <text x={points[0]} y={points[1] + 4} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#17324f">{label}</text>
                        </g>
                      );
                    })}
                    <circle cx="180" cy="138" r="31" fill="#ffd98f" fillOpacity="0.96" />
                    <text x="180" y="135" textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">Familiar</text>
                    <text x="180" y="147" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">Core</text>
                    <circle cx="110" cy="184" r="20" fill="#b7e5ff" />
                    <circle cx="250" cy="184" r="20" fill="#bff3d5" />
                    <text x="110" y="188" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">Tree</text>
                    <text x="250" y="188" textAnchor="middle" fontSize="8" fontWeight="800" fill="#17324f">{activeProblem.to}</text>
                  </svg>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-semibold text-gray-950 mb-1">{activeProblem.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{activeProblem.solution}</p>
              </div>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {problemItems.map((item, index) => (
              <button
                key={item.title}
                onMouseEnter={() => setHoveredProblem(index)}
                onFocus={() => setHoveredProblem(index)}
                className={`text-left rounded-2xl border p-5 transition-all duration-200 ${
                  hoveredProblem === index
                    ? 'bg-white border-[#2A4365]/25 shadow-xl shadow-gray-900/8 -translate-y-1'
                    : 'bg-white/74 border-gray-200 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  hoveredProblem === index ? 'bg-[#2A4365] text-white' : 'bg-[#2A4365]/8 text-[#2A4365]'
                }`}>
                  <item.icon size={18} />
                </div>
                <h3 className="font-bold text-gray-950 text-sm mb-1">{item.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start">
            <div>
              <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">All Challenges, One Answer</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-950 mb-4 leading-tight">Core Features</h2>
              <p className="text-gray-600 max-w-lg leading-relaxed mb-8">
                Hover a feature to preview the product moment behind it.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {featureItems.map((item, index) => (
                  <button
                    key={item.title}
                    onMouseEnter={() => setHoveredFeature(index)}
                    onFocus={() => setHoveredFeature(index)}
                    className={`group text-left rounded-2xl border p-5 transition-all duration-200 ${
                      hoveredFeature === index
                        ? 'bg-[#07121e] border-[#07121e] shadow-2xl shadow-[#07121e]/18 -translate-y-1'
                        : 'bg-[#f7f9fb] border-gray-200 hover:bg-white hover:shadow-lg'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg shadow-gray-900/10`}>
                      <item.icon size={20} className="text-white" />
                    </div>
                    <h3 className={`font-bold text-base mb-2 ${hoveredFeature === index ? 'text-white' : 'text-gray-950'}`}>{item.title}</h3>
                    <p className={`text-sm leading-relaxed ${hoveredFeature === index ? 'text-white/75' : 'text-gray-600'}`}>{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <motion.div
                key={activeFeature.title}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="rounded-[2rem] border border-gray-200 bg-[#07121e] p-4 shadow-2xl shadow-gray-900/16"
              >
                <div className="rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(22,49,77,0.98),rgba(8,21,34,0.98))] border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-white/8">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#ffd98f] font-bold">Feature Snapshot</p>
                      <h3 className="text-white text-xl font-bold mt-1">{activeFeature.title}</h3>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeFeature.gradient} flex items-center justify-center`}>
                      <activeFeature.icon size={22} className="text-white" />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="relative h-72 rounded-3xl bg-white/[0.055] border border-white/10 overflow-hidden">
                      <svg viewBox="0 0 390 290" className="absolute inset-0 h-full w-full">
                        {activeFeature.snapshot === 'tree' && (
                          <g>
                            <path d="M195 138 L112 78 L62 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L278 78 L328 48" stroke="#ffba78" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L144 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                            <path d="M195 138 L246 220" stroke="#70e4c1" strokeWidth="3" strokeLinecap="round" />
                            {[[195, 138, 'ME'], [112, 78, 'Maa'], [278, 78, 'Papa'], [62, 48, 'Nani'], [328, 48, 'Dada'], [144, 220, 'Bhai'], [246, 220, 'Bua']].map(([cx, cy, label]) => (
                              <g key={label as string}>
                                <circle cx={cx as number} cy={cy as number} r="24" fill="#fff7df" />
                                <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                              </g>
                            ))}
                          </g>
                        )}
                        {activeFeature.snapshot === 'privacy' && (
                          <g>
                            <rect x="58" y="54" width="274" height="44" rx="16" fill="#ffffff" fillOpacity="0.92" />
                            <text x="82" y="81" fontSize="12" fontWeight="900" fill="#17324f">Share with: Family up to 2nd degree</text>
                            {[76, 138, 200, 262, 324].map((cx, index) => (
                              <g key={cx}>
                                <circle cx={cx} cy="172" r={index < 3 ? 28 : 20} fill={index < 3 ? '#bff3d5' : '#ffffff'} fillOpacity={index < 3 ? 1 : 0.28} />
                                <text x={cx} y="177" textAnchor="middle" fontSize="10" fontWeight="900" fill={index < 3 ? '#17324f' : '#ffffff'}>{index + 1}</text>
                              </g>
                            ))}
                            <path d="M76 172 L324 172" stroke="#ffd98f" strokeWidth="2" strokeDasharray="5 6" />
                          </g>
                        )}
                        {activeFeature.snapshot === 'nearby' && (
                          <g>
                            <path d="M60 225 C120 130 180 240 238 132 C280 58 330 104 342 62" stroke="#70e4c1" strokeWidth="3" fill="none" />
                            {[[108, 155, 'Maasi'], [206, 204, 'Mama'], [282, 94, 'Bua']].map(([cx, cy, label]) => (
                              <g key={label as string}>
                                <circle cx={cx as number} cy={cy as number} r="25" fill="#b7e5ff" />
                                <text x={cx as number} y={(cy as number) + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill="#17324f">{label}</text>
                              </g>
                            ))}
                            <circle cx="195" cy="145" r="44" fill="#ffba78" fillOpacity="0.18" stroke="#ffba78" strokeWidth="2" />
                            <text x="195" y="148" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">You</text>
                          </g>
                        )}
                        {activeFeature.snapshot === 'invite' && (
                          <g>
                            <rect x="52" y="48" width="286" height="168" rx="24" fill="#fff7df" />
                            <text x="88" y="88" fontSize="18" fontWeight="900" fill="#17324f">Wedding Invite</text>
                            <text x="88" y="114" fontSize="11" fontWeight="700" fill="#49627d">Send to paternal + maternal family</text>
                            <rect x="88" y="145" width="88" height="26" rx="13" fill="#17324f" />
                            <text x="132" y="162" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">42 sent</text>
                            <path d="M236 112 L300 78 L288 152 Z" fill="#ff7f63" />
                          </g>
                        )}
                        {activeFeature.snapshot === 'media' && (
                          <g>
                            {[52, 134, 216].map((x, index) => (
                              <g key={x}>
                                <rect x={x} y={64 + index * 22} width="116" height="88" rx="18" fill={['#ffd98f', '#b7e5ff', '#bff3d5'][index]} />
                                <circle cx={x + 30} cy={94 + index * 22} r="13" fill="#17324f" fillOpacity="0.28" />
                                <path d={`M${x + 16} ${130 + index * 22}L${x + 55} ${104 + index * 22}L${x + 100} ${135 + index * 22}`} stroke="#17324f" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.38" />
                              </g>
                            ))}
                          </g>
                        )}
                        {activeFeature.snapshot === 'ancestor' && (
                          <g>
                            {[44, 94, 144, 194, 244].map((y, index) => (
                              <g key={y}>
                                <line x1="195" y1={y + 30} x2="195" y2={y + 50} stroke="#ffd98f" strokeWidth="2.4" />
                                <rect x={100 + index * 12} y={y} width={190 - index * 24} height="34" rx="17" fill="#ffffff" fillOpacity={0.95 - index * 0.1} />
                                <text x="195" y={y + 22} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17324f">{index === 0 ? 'You' : `${index + 1} generations back`}</text>
                              </g>
                            ))}
                          </g>
                        )}
                      </svg>
                    </div>
                    <p className="mt-4 text-sm text-white/75 leading-relaxed">{activeFeature.desc}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#2A4365] via-[#1a3320] to-[#0d1f13] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(201,166,107,0.1),transparent_50%)]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Globe size={40} className="text-white/30 mx-auto mb-6" />
          <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.15em] mb-3">Our Vision</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6">
            To build the world&apos;s first universal family network — a living digital courtyard where every person can trace their roots, celebrate family bonds, and connect with relatives anywhere.
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xl mx-auto">
            Reviving the warmth of the traditional Indian courtyard, but on a global scale — creating a trusted, private space for generations to come.
          </p>
        </div>
      </section>

      {/* Opportunity / Stats */}
      <section className="py-20 px-6" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Opportunity</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">A massive, untapped market</h2>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stat: '1.4B+', label: 'People in India', sub: 'with family at the core' },
            { stat: '80%', label: 'Social Interactions', sub: 'are among family & friends' },
            { stat: '$8B+', label: 'Ancestry Market', sub: 'expected by 2030' },
            { stat: '∞', label: 'Family Events', sub: 'multi-billion dollar ecosystem' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: [0, -5, 0] }}
              transition={{
                opacity: { duration: 0.4, ease: 'easeOut', delay: 0.04 + index * 0.05 },
                y: { duration: 6.6 + index * 0.3, repeat: Infinity, ease: 'easeInOut', delay: 0.55 + index * 0.1 },
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="glass-card rounded-2xl p-5 text-center"
            >
              <p className="text-3xl font-bold text-[#2A4365] mb-1">{item.stat}</p>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6" style={{ background: 'transparent' }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#2A4365]/10 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BrandLogo size={38} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Your Familiar awaits
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            A place where every relation matters. Start building your family&apos;s living tree today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setMode('signup')}
              className="w-full sm:w-auto bg-[#2A4365] text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-[#2A4365]/90 active:scale-[0.97] transition-all shadow-xl shadow-[#2A4365]/20 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setMode('signin')}
              className="w-full sm:w-auto border-2 border-gray-300 text-gray-500 px-8 py-4 rounded-2xl font-semibold text-base hover:border-[#2A4365]/40 hover:text-[#2A4365] active:scale-[0.97] transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-200/30" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} />
            <span className="brand-wordmark text-sm text-gray-900">Familiar</span>
            <span className="text-xs text-gray-500">— The Digital Courtyard</span>
          </div>
          <p className="text-xs text-gray-500">
            Built by Ranveer Gautam · ranveer.aangan@gmail.com
          </p>
        </div>
      </footer>
    </div>
  );
}
