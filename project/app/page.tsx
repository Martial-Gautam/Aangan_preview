'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BrandLogo from '@/components/BrandLogo';

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#2A4365]/10 border border-[#2A4365]/15 flex items-center justify-center animate-pulse">
          <BrandLogo size={34} priority />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">Familiar</p>
      </div>
    </div>
  );
}
