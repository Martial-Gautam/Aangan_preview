'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import BottomNav from '@/components/BottomNav';

const tabRoutes = new Set(['/home', '/feed', '/memories', '/messages', '/profile']);

function SkeletonLine({ className }: { className: string }) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

function ShellHeader({ titleWidth = 'w-28', subtitleWidth = 'w-20' }: { titleWidth?: string; subtitleWidth?: string }) {
  return (
    <div className="glass-header px-5 pt-12 pb-3.5 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine className={`h-2 ${subtitleWidth}`} />
          <SkeletonLine className={`h-5 ${titleWidth}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="skeleton h-7 w-11 rounded-full" />
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="skeleton h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function FamilySkeleton() {
  return (
    <>
      <ShellHeader titleWidth="w-32" subtitleWidth="w-12" />
      <div className="relative flex-1 overflow-hidden bg-[#070b14]">
        <div className="absolute top-4 left-4 right-4 z-10 h-11 rounded-2xl border border-white/10 bg-black/45 px-4 flex items-center gap-2.5">
          <div className="skeleton h-4 w-4 rounded-full" />
          <SkeletonLine className="h-3 flex-1" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_24%,rgba(79,209,197,0.16),transparent_34%),radial-gradient(circle_at_78%_34%,rgba(251,191,36,0.12),transparent_38%),radial-gradient(circle_at_52%_78%,rgba(42,67,101,0.22),transparent_44%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 360 620" aria-hidden="true">
          <g stroke="rgba(191,219,254,0.22)" strokeWidth="2" fill="none">
            <path d="M180 292 L96 188 M180 292 L265 188 M180 292 L88 392 M180 292 L274 392" />
            <path d="M96 188 L54 126 M96 188 L144 124 M265 188 L224 126 M265 188 L310 126" />
          </g>
          {[
            [180, 292, 34],
            [96, 188, 24],
            [265, 188, 24],
            [88, 392, 22],
            [274, 392, 22],
            [54, 126, 18],
            [144, 124, 18],
            [224, 126, 18],
            [310, 126, 18],
          ].map(([cx, cy, r], index) => (
            <circle key={index} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.28)" />
          ))}
        </svg>
      </div>
    </>
  );
}

function FeedSkeleton() {
  return (
    <>
      <ShellHeader titleWidth="w-20" subtitleWidth="w-16" />
      <div className="px-4 pt-4 space-y-3">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-2.5 w-24" />
          </div>
          <div className="skeleton h-9 w-9 rounded-full" />
        </div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-2.5 w-16" />
              </div>
            </div>
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </>
  );
}

function MemoriesSkeleton() {
  return (
    <>
      <ShellHeader titleWidth="w-28" subtitleWidth="w-20" />
      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="glass-card rounded-2xl p-3 space-y-2">
              <div className="skeleton h-8 w-8 rounded-xl" />
              <SkeletonLine className="h-2.5 w-16" />
              <SkeletonLine className="h-2 w-12" />
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-2.5 w-20" />
            </div>
            <div className="skeleton h-9 w-9 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MessagesSkeleton() {
  return (
    <>
      <ShellHeader titleWidth="w-24" subtitleWidth="w-36" />
      <div className="px-4 pt-4 space-y-3">
        <div className="h-11 rounded-2xl border border-gray-200/60 bg-white/55 px-3.5 flex items-center gap-2.5 backdrop-blur-md dark:border-white/10 dark:bg-white/8">
          <div className="skeleton h-4 w-4 rounded-full" />
          <SkeletonLine className="h-3 flex-1" />
        </div>
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-2.5 w-36" />
            </div>
            <SkeletonLine className="h-2.5 w-9" />
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <ShellHeader titleWidth="w-20" subtitleWidth="w-14" />
      <div className="px-6 pt-8 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="skeleton h-24 w-24 rounded-full" />
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton h-12 rounded-2xl" />
          ))}
        </div>
      </div>
    </>
  );
}

function TabLoadingSkeleton({ pathname }: { pathname: string }) {
  if (pathname === '/feed') return <FeedSkeleton />;
  if (pathname === '/memories') return <MemoriesSkeleton />;
  if (pathname === '/messages') return <MessagesSkeleton />;
  if (pathname === '/profile') return <ProfileSkeleton />;
  return <FamilySkeleton />;
}

export default function Loading() {
  const pathname = usePathname();
  const showTabShell = tabRoutes.has(pathname);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {showTabShell && (
        <div className="absolute inset-0 flex justify-center">
          <div className="relative h-screen w-full max-w-sm overflow-hidden pb-24">
            <TabLoadingSkeleton pathname={pathname} />
          </div>
          <div className="absolute inset-0 bg-white/45 backdrop-blur-[1.5px] dark:bg-black/42" />
        </div>
      )}

      <div className="absolute inset-0 z-40 flex items-center justify-center">
        <div className={`${showTabShell ? 'w-full max-w-sm px-6' : 'px-6'} flex justify-center`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card rounded-3xl px-8 py-7 flex flex-col items-center text-center gap-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-2xl bg-[#2A4365]/10 border border-[#2A4365]/20 flex items-center justify-center"
            >
              <BrandLogo size={30} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Loading your family space</p>
              <p className="text-xs text-gray-500">We&apos;re syncing the latest updates.</p>
            </div>
            <motion.div
              animate={{ width: ['30%', '75%', '30%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-32 rounded-full bg-[#2A4365]/15 overflow-hidden"
            />
          </motion.div>
        </div>
      </div>

      {showTabShell && <BottomNav />}
    </div>
  );
}
