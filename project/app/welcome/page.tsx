'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BrandLogo from '@/components/BrandLogo';
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, TreePine, Users, Shield,
  MapPin, Send, Image, Heart, ChevronDown, Sparkles, Globe
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
  const heroRef = useRef<HTMLDivElement>(null);
  const revealMaskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
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

  const updateRevealPosition = (clientX: number, clientY: number) => {
    const heroEl = heroRef.current;
    const revealEl = revealMaskRef.current;
    if (!heroEl || !revealEl) return;

    const rect = heroEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    revealEl.style.setProperty('--mx', `${x}px`);
    revealEl.style.setProperty('--my', `${y}px`);
  };

  const handleHeroPointerEnter = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    revealEl.style.setProperty('--reveal-strength', '0.95');
  };

  const handleHeroPointerLeave = () => {
    const revealEl = revealMaskRef.current;
    if (!revealEl) return;
    revealEl.style.setProperty('--reveal-strength', '0.62');
  };

  const handleHeroMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    updateRevealPosition(event.clientX, event.clientY);
  };

  const handleHeroTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    updateRevealPosition(touch.clientX, touch.clientY);
    const revealEl = revealMaskRef.current;
    if (revealEl) revealEl.style.setProperty('--reveal-strength', '0.9');
  };

  useEffect(() => {
    const heroEl = heroRef.current;
    const revealEl = revealMaskRef.current;
    if (!heroEl || !revealEl) return;
    const rect = heroEl.getBoundingClientRect();
    revealEl.style.setProperty('--mx', `${rect.width * 0.5}px`);
    revealEl.style.setProperty('--my', `${rect.height * 0.52}px`);
  }, []);

  // --- Auth form screen ---
  if (mode !== 'landing') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>
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
      </div>
    );
  }

  // --- Landing page ---
  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
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
              <span className={`block font-bold text-lg tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
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
        className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
        onMouseMove={handleHeroMouseMove}
        onMouseEnter={handleHeroPointerEnter}
        onMouseLeave={handleHeroPointerLeave}
        onTouchMove={handleHeroTouchMove}
      >
        {/* Background gradient — deep forest */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2A4365] via-[#1a3320] to-[#0d1f13]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,166,107,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 z-[1] pointer-events-none hidden md:block" aria-hidden="true">
          <div
            ref={revealMaskRef}
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: 'var(--reveal-strength,0.62)',
              WebkitMaskImage:
                'radial-gradient(260px 260px at var(--mx,50%) var(--my,52%), rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 34%, rgba(0,0,0,0.45) 54%, transparent 74%)',
              maskImage:
                'radial-gradient(260px 260px at var(--mx,50%) var(--my,52%), rgba(0,0,0,1) 0%, rgba(0,0,0,0.88) 34%, rgba(0,0,0,0.45) 54%, transparent 74%)',
            }}
          >
            <svg viewBox="0 0 1800 980" className="w-full h-full">
              <defs>
                <linearGradient id="cosmosStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffb08f" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#ff7f63" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ffd6a8" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="cosmosStrokeDim" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9ad0ff" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#ffe8b7" stopOpacity="0.45" />
                </linearGradient>
                <filter id="softGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <symbol id="nodePerson" viewBox="0 0 24 24">
                  <circle cx="12" cy="6.6" r="3.9" fill="#f8fcff" fillOpacity="0.95" />
                  <path d="M3.8 20.6C3.8 16.1 7.2 13.4 12 13.4C16.8 13.4 20.2 16.1 20.2 20.6V22H3.8V20.6Z" fill="#f3fbff" fillOpacity="0.92" />
                </symbol>
              </defs>

              <g filter="url(#softGlow)">
                <path d="M900 560 L700 410 L520 290 L350 215 L200 170" stroke="url(#cosmosStroke)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M900 560 L1100 410 L1280 300 L1450 220 L1600 176" stroke="url(#cosmosStroke)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M700 410 L860 312 L1100 410" stroke="url(#cosmosStrokeDim)" strokeWidth="3.8" strokeLinecap="round" fill="none" />
                <path d="M900 560 L850 680 L750 790 L640 860" stroke="url(#cosmosStrokeDim)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <path d="M900 560 L1010 700 L1140 790 L1260 860" stroke="url(#cosmosStrokeDim)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <path d="M520 290 L650 350 L860 312" stroke="url(#cosmosStrokeDim)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
                <path d="M1280 300 L1160 348 L860 312" stroke="url(#cosmosStrokeDim)" strokeWidth="2.6" strokeLinecap="round" fill="none" />

                <ellipse cx="900" cy="560" rx="470" ry="220" transform="rotate(-14 900 560)" stroke="#ffd0b2" strokeOpacity="0.23" strokeWidth="1.9" fill="none" />
                <ellipse cx="900" cy="560" rx="560" ry="250" transform="rotate(9 900 560)" stroke="#c6e5ff" strokeOpacity="0.18" strokeWidth="1.6" fill="none" />
                <ellipse cx="900" cy="560" rx="690" ry="290" transform="rotate(-3 900 560)" stroke="#ffddb8" strokeOpacity="0.12" strokeWidth="1.4" fill="none" />
                <ellipse cx="900" cy="560" rx="770" ry="210" transform="rotate(21 900 560)" stroke="#a7d7ff" strokeOpacity="0.1" strokeWidth="1.2" fill="none" />

                <circle cx="770" cy="468" r="5.5" fill="#ffffff" fillOpacity="0.78" />
                <circle cx="1038" cy="488" r="5.5" fill="#ffffff" fillOpacity="0.74" />
                <circle cx="835" cy="702" r="4.5" fill="#d9efff" fillOpacity="0.72" />
                <circle cx="972" cy="690" r="4.5" fill="#ffe8c7" fillOpacity="0.72" />

                <g opacity="0.92">
                  <use href="#nodePerson" x="892" y="552" width="28" height="28" />
                </g>
                <g opacity="0.9">
                  <use href="#nodePerson" x="692" y="402" width="28" height="28" />
                </g>
                <g opacity="0.9">
                  <use href="#nodePerson" x="1092" y="402" width="28" height="28" />
                </g>
                <g opacity="0.88">
                  <use href="#nodePerson" x="852" y="304" width="28" height="28" />
                </g>
                <g opacity="0.84">
                  <use href="#nodePerson" x="512" y="282" width="28" height="28" />
                </g>
                <g opacity="0.84">
                  <use href="#nodePerson" x="1272" y="292" width="28" height="28" />
                </g>
                <g opacity="0.8">
                  <use href="#nodePerson" x="342" y="207" width="28" height="28" />
                </g>
                <g opacity="0.8">
                  <use href="#nodePerson" x="1442" y="212" width="28" height="28" />
                </g>
                <g opacity="0.78">
                  <use href="#nodePerson" x="192" y="162" width="28" height="28" />
                </g>
                <g opacity="0.78">
                  <use href="#nodePerson" x="1592" y="168" width="28" height="28" />
                </g>
                <g opacity="0.82">
                  <use href="#nodePerson" x="742" y="782" width="28" height="28" />
                </g>
                <g opacity="0.82">
                  <use href="#nodePerson" x="1132" y="782" width="28" height="28" />
                </g>
                <g opacity="0.75">
                  <use href="#nodePerson" x="632" y="852" width="28" height="28" />
                </g>
                <g opacity="0.75">
                  <use href="#nodePerson" x="1252" y="852" width="28" height="28" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Floating decorative nodes */}
        <div className="absolute top-20 left-8 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-pulse">
          <span className="text-white/50 text-xs font-bold">P</span>
        </div>
        <div className="absolute top-32 right-12 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center" style={{ animationDelay: '1s' }}>
          <span className="text-white/50 text-xs font-bold">M</span>
        </div>
        <div className="absolute bottom-40 left-16 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center" style={{ animationDelay: '2s' }}>
          <span className="text-white/50 text-xs font-bold">S</span>
        </div>
        <div className="absolute bottom-32 right-8 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white/50 text-xs font-bold">C</span>
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <BrandLogo size={50} />
          </div>

          <p className="text-white/60 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The Digital Courtyard</p>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
            Where Family Stories<br />
            <span className="text-white/80">Meet & Grow</span>
          </h1>

          <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto">
            A social platform centered on the Universal Family Tree — mapping connections, discovering relatives, and cherishing memories together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setMode('signup')}
              className="w-full sm:w-auto bg-white text-[#2A4365] px-8 py-4 rounded-2xl font-bold text-base hover:bg-gray-100 active:scale-[0.97] transition-all shadow-xl shadow-black/15 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setMode('signin')}
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/20 active:scale-[0.97] transition-all"
            >
              I have an account
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <button onClick={scrollToFeatures} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/70 transition-colors animate-bounce">
          <ChevronDown size={28} />
        </button>
      </section>

      {/* The Challenge */}
      <section className="py-20 px-6" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto text-center mb-14">
          <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Problem</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Records are scattered, offline<br />and hard to access</h2>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            Social media prioritizes friends over family. There&apos;s no platform to automatically map family trees, ancestry, and relationships in one secure, living space.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Users, title: 'Dispersed Family Ties', desc: 'Social media prioritizes friends over family connections.' },
            { icon: Shield, title: 'Limited Privacy Control', desc: 'Managing who sees updates among relatives is difficult.' },
            { icon: TreePine, title: 'No Universal Family Tree', desc: 'Lack of automatic family tree mapping on platforms.' },
            { icon: Send, title: 'Event Disorganization', desc: 'Invitations and event photos scattered across apps.' },
            { icon: MapPin, title: 'Hard to Find Relatives', desc: 'Difficulty discovering relatives in new places.' },
            { icon: Heart, title: 'Fear of Judgement', desc: 'Hesitation to share sensitive family news publicly.' },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-2xl p-5 hover:bg-white/70 hover:shadow-lg transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#2A4365]/8 flex items-center justify-center mb-3 group-hover:bg-[#2A4365]/15 transition-colors">
                <item.icon size={18} className="text-[#2A4365]" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 px-6" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto text-center mb-14">
          <p className="text-[#2A4365] text-xs font-semibold uppercase tracking-[0.15em] mb-2">All Challenges, One Answer</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Core Features</h2>
          <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
            Everything your family needs in one private, beautiful space.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: TreePine, title: 'Universal Family Tree', desc: 'Add yourself once — Familiar auto-maps your relatives and degrees of relations.', gradient: 'from-[#2A4365] to-[#2d5033]' },
            { icon: Shield, title: 'Privacy Controls', desc: 'Share posts, events, and announcements only up to the degree you choose.', gradient: 'from-[#2A4365] to-[#2d5033]' },
            { icon: MapPin, title: 'Find Relatives Nearby', desc: 'Discover family in new cities or events — never feel alone.', gradient: 'from-[#2A4365] to-[#2d5033]' },
            { icon: Send, title: 'One-Tap Invitations', desc: 'Invite entire family groups to weddings, functions, or gatherings instantly.', gradient: 'from-[#2A4365] to-[#2d5033]' },
            { icon: Image, title: 'Family-First Media Sharing', desc: 'Shared gallery where everyone uploads photos and videos from events.', gradient: 'from-[#2A4365] to-[#2d5033]' },
            { icon: Sparkles, title: 'Ancestor Mapping', desc: 'Over time, trace your ancestry — see generations of your lineage mapped out.', gradient: 'from-[#2A4365] to-[#2d5033]' },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-3xl p-6 hover:shadow-xl transition-all group">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg shadow-[#2A4365]/15 group-hover:scale-105 transition-transform`}>
                <item.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
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
          ].map((item) => (
            <div key={item.label} className="glass-card rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-[#2A4365] mb-1">{item.stat}</p>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </div>
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
            <span className="text-sm font-semibold text-gray-900">Familiar</span>
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
