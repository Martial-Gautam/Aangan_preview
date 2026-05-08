'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

  // --- Auth form screen ---
  if (mode !== 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-white flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-6 py-12">
          <div className="w-full max-w-sm mx-auto">
            <button
              onClick={() => { setMode('landing'); setError(''); }}
              className="flex items-center gap-2 text-gray-400 mb-8 text-sm hover:text-gray-600 transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
              Back
            </button>

            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 border border-orange-100/60 flex items-center justify-center mb-4 shadow-sm">
                <TreePine size={24} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'signup' ? 'Join your Aangan' : 'Welcome back'}
              </h2>
              <p className="text-gray-400 mt-1 text-sm">
                {mode === 'signup' ? 'Start building your family tree today' : 'Sign in to your digital courtyard'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-11 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-2xl font-semibold text-base hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200/50 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
                className="text-orange-500 font-semibold hover:text-orange-600"
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
    <div className="min-h-screen bg-white">
      {/* Sticky header — appears on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100/60'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine size={20} className={`transition-colors ${scrolled ? 'text-orange-500' : 'text-white'}`} />
            <span className={`font-bold text-lg tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Aangan
            </span>
          </div>
          <div className={`flex items-center gap-2 transition-all duration-300 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button
              onClick={() => setMode('signin')}
              className="text-sm font-semibold text-gray-600 hover:text-orange-500 px-3 py-2 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className="text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-amber-500 to-orange-400" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]" />

        {/* Floating decorative nodes */}
        <div className="absolute top-20 left-8 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-pulse">
          <span className="text-white/70 text-xs font-bold">P</span>
        </div>
        <div className="absolute top-32 right-12 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center" style={{ animationDelay: '1s' }}>
          <span className="text-white/60 text-xs font-bold">M</span>
        </div>
        <div className="absolute bottom-40 left-16 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center" style={{ animationDelay: '2s' }}>
          <span className="text-white/60 text-xs font-bold">S</span>
        </div>
        <div className="absolute bottom-32 right-8 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-white/60 text-xs font-bold">C</span>
        </div>

        <div className="relative z-10 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <TreePine size={40} className="text-white" />
          </div>

          <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The Digital Courtyard</p>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4 tracking-tight">
            Where Family Stories<br />
            <span className="text-amber-200">Meet & Grow</span>
          </h1>

          <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-8 max-w-md mx-auto">
            A social platform centered on the Universal Family Tree — mapping connections, discovering relatives, and cherishing memories together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setMode('signup')}
              className="w-full sm:w-auto bg-white text-orange-600 px-8 py-4 rounded-2xl font-bold text-base hover:bg-orange-50 active:scale-[0.97] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setMode('signin')}
              className="w-full sm:w-auto bg-white/15 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-2xl font-semibold text-base hover:bg-white/25 active:scale-[0.97] transition-all"
            >
              I have an account
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <button onClick={scrollToFeatures} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce">
          <ChevronDown size={28} />
        </button>
      </section>

      {/* The Challenge */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center mb-14">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Problem</p>
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
            <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
                <item.icon size={18} className="text-orange-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center mb-14">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-[0.15em] mb-2">All Challenges, One Answer</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Core Features</h2>
          <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
            Everything your family needs in one private, beautiful space.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: TreePine, title: 'Universal Family Tree', desc: 'Add yourself once — Aangan auto-maps your relatives and degrees of relations.', gradient: 'from-orange-500 to-amber-500' },
            { icon: Shield, title: 'Privacy Controls', desc: 'Share posts, events, and announcements only up to the degree you choose.', gradient: 'from-blue-500 to-indigo-500' },
            { icon: MapPin, title: 'Find Relatives Nearby', desc: 'Discover family in new cities or events — never feel alone.', gradient: 'from-emerald-500 to-teal-500' },
            { icon: Send, title: 'One-Tap Invitations', desc: 'Invite entire family groups to weddings, functions, or gatherings instantly.', gradient: 'from-pink-500 to-rose-500' },
            { icon: Image, title: 'Family-First Media Sharing', desc: 'Shared gallery where everyone uploads photos and videos from events.', gradient: 'from-violet-500 to-purple-500' },
            { icon: Sparkles, title: 'Ancestor Mapping', desc: 'Over time, trace your ancestry — see generations of your lineage mapped out.', gradient: 'from-amber-500 to-yellow-500' },
          ].map((item) => (
            <div key={item.title} className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-100/80 transition-all group">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-lg shadow-gray-200/50 group-hover:scale-105 transition-transform`}>
                <item.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-600 via-amber-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Globe size={40} className="text-white/30 mx-auto mb-6" />
          <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.15em] mb-3">Our Vision</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6">
            To build the world&apos;s first universal family network — a living digital courtyard where every person can trace their roots, celebrate family bonds, and connect with relatives anywhere.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xl mx-auto">
            Reviving the warmth of the traditional Indian courtyard, but on a global scale — creating a trusted, private space for generations to come.
          </p>
        </div>
      </section>

      {/* Opportunity / Stats */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-[0.15em] mb-2">The Opportunity</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">A massive, untapped market</h2>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stat: '1.4B+', label: 'People in India', sub: 'with family at the core' },
            { stat: '80%', label: 'Social Interactions', sub: 'are among family & friends' },
            { stat: '$8B+', label: 'Ancestry Market', sub: 'expected by 2030' },
            { stat: '∞', label: 'Family Events', sub: 'multi-billion dollar ecosystem' },
          ].map((item) => (
            <div key={item.label} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 text-center border border-orange-100/60">
              <p className="text-3xl font-bold text-orange-600 mb-1">{item.stat}</p>
              <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <TreePine size={32} className="text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Your Aangan awaits
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            A place where every relation matters. Start building your family&apos;s living tree today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setMode('signup')}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-2xl font-bold text-base hover:from-orange-600 hover:to-amber-600 active:scale-[0.97] transition-all shadow-xl shadow-orange-200/50 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setMode('signin')}
              className="w-full sm:w-auto border-2 border-gray-200 text-gray-600 px-8 py-4 rounded-2xl font-semibold text-base hover:border-orange-300 hover:text-orange-600 active:scale-[0.97] transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TreePine size={16} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-700">Aangan</span>
            <span className="text-xs text-gray-400">— The Digital Courtyard</span>
          </div>
          <p className="text-xs text-gray-400">
            Built by Ranveer Gautam · ranveergautam2004@gmail.com
          </p>
        </div>
      </footer>
    </div>
  );
}
