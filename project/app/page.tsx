'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/welcome');
    } else if (!profile?.onboarding_completed) {
      router.replace('/onboarding');
    } else {
      router.replace('/home');
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#355E3B]/10 border border-[#355E3B]/15 flex items-center justify-center animate-pulse">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C16 4 8 10 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 10 16 4 16 4Z" fill="#355E3B" opacity="0.2"/>
            <path d="M16 8C16 8 10 13 10 19C10 22.3 12.7 25 16 25C19.3 25 22 22.3 22 19C22 13 16 8 16 8Z" fill="#355E3B"/>
            <rect x="15" y="25" width="2" height="4" rx="1" fill="#8B5E3C"/>
          </svg>
        </div>
        <p className="text-sm text-[#5E5E5E] tracking-wide">Aangan</p>
      </div>
    </div>
  );
}
