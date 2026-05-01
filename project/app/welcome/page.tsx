'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Mail, Lock, ArrowRight, TreePine } from 'lucide-react';

type Mode = 'landing' | 'signin' | 'signup';

export default function WelcomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

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

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-12">
              <div className="w-20 h-20 rounded-3xl bg-orange-50 border-2 border-orange-100 flex items-center justify-center mb-4 shadow-sm">
                <TreePine size={40} className="text-orange-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Aangan</h1>
              <p className="text-gray-500 mt-1 text-sm">Your family&apos;s gathering place</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 mb-10 border border-orange-100">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-end gap-4 mb-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-sm font-semibold text-orange-700">F</div>
                    <span className="text-xs text-orange-600">Father</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 mb-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-sm font-semibold text-white shadow-md">You</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-sm font-semibold text-orange-700">M</div>
                    <span className="text-xs text-orange-600">Mother</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-xs font-semibold text-amber-700">S1</div>
                    <span className="text-xs text-amber-600">Sibling</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-xs font-semibold text-amber-700">S2</div>
                    <span className="text-xs text-amber-600">Sibling</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-orange-700 mt-4 font-medium">
                Build your family tree, one connection at a time
              </p>
            </div>

            <div className="space-y-3 mb-10">
              {[
                { text: 'Add family members easily' },
                { text: 'Visualize your family connections' },
                { text: 'Interactive tree with zoom and pan' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  <span className="text-sm text-gray-600">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setMode('signup')}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setMode('signin')}
                className="w-full border-2 border-gray-200 text-gray-700 py-4 rounded-2xl font-semibold text-base hover:border-orange-300 hover:text-orange-600 active:scale-[0.98] transition-all"
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          <button
            onClick={() => { setMode('landing'); setError(''); }}
            className="flex items-center gap-2 text-gray-500 mb-8 text-sm hover:text-gray-700 transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
              <TreePine size={24} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              {mode === 'signup' ? 'Start building your family tree today' : 'Sign in to your Aangan account'}
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
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {mode === 'signup' && (
            <>
              <button
                type="button"
                onClick={handleInstall}
                className="w-full mt-3 border-2 border-orange-200 text-orange-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-orange-50 active:scale-[0.98] transition-all"
              >
                Install App
              </button>
              {installHint && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {installHint}
                </p>
              )}
            </>
          )}

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
