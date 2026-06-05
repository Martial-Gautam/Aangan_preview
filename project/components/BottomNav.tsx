'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TreePine, Newspaper, Images, MessageCircle, User, Sparkles, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { readSessionCache, writeSessionCache } from '@/lib/ui-cache';
import { warmStreamConnection } from '@/lib/stream-client';
import BhuchkiChat from './BhuchkiChat';

const navItems = [
  { href: '/home', label: 'Family', icon: TreePine },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/memories', label: 'Memories', icon: Images },
  { href: '/messages', label: 'Chat', icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, user, isOffline } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBhuchkiOpen, setIsBhuchkiOpen] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    const cachedUnread = readSessionCache<number>('nav:unread-count', 45_000);
    if (cachedUnread !== null) {
      setUnreadCount(cachedUnread);
    }
  }, []);

  useEffect(() => {
    if (!session?.access_token || isOffline) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/conversations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const total = (data.conversations || []).reduce(
            (sum: number, c: any) => sum + (c.unread_count || 0), 0
          );
          setUnreadCount(total);
          writeSessionCache('nav:unread-count', total);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    fetchUnread();
  }, [session]);

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    if (!session?.access_token || typeof window === 'undefined' || isOffline) return;
    if (sessionStorage.getItem('familiar-nav-warm-v1') === '1') return;
    sessionStorage.setItem('familiar-nav-warm-v1', '1');

    const warm = () => {
      const userId = user?.id;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      if (userId) {
        void queryClient.prefetchQuery({
          queryKey: ['feed', userId, 'post'],
          queryFn: async () => {
            const res = await fetch('/api/posts/list?type=post', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.posts || [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['feed', userId, 'discussion'],
          queryFn: async () => {
            const res = await fetch('/api/posts/list?type=discussion', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.posts || [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['messages', 'conversations', userId],
          queryFn: async () => {
            const res = await fetch('/api/messages/conversations', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.conversations || [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['memories', userId],
          queryFn: async () => {
            const res = await fetch('/api/posts/list?type=post&category=memories', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.posts || [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['notifications', 'pending', userId],
          queryFn: async () => {
            const res = await fetch('/api/connections/pending', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.requests || [];
          },
        });
        void queryClient.prefetchQuery({
          queryKey: ['notifications', 'suggestions', userId],
          queryFn: async () => {
            const res = await fetch('/api/connections/suggestions', { headers });
            if (!res.ok) return [];
            const data = await res.json();
            return data.suggestions || [];
          },
        });
      }
      void fetch('/api/tree/full', { headers, cache: 'no-store' }).catch(() => {});
      void import('@/components/FamilyCosmos').catch(() => {});
      warmStreamConnection(session.access_token);
    };

    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(warm);
      return;
    }
    const timer = setTimeout(warm, 600);
    return () => clearTimeout(timer);
  }, [queryClient, session?.access_token, user?.id]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-sm mx-auto px-3 pt-2" style={{ paddingBottom: 'max(0.7rem, env(safe-area-inset-bottom))' }}>
          <div className="rounded-[1.35rem] border border-black/10 bg-white/92 shadow-[0_12px_34px_rgba(0,0,0,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#161616]/95 dark:shadow-[0_12px_34px_rgba(0,0,0,0.42)]">
            <div className="relative flex items-center justify-between px-2 py-1.5">
              
              {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={true}
                    onMouseEnter={() => router.prefetch(href)}
                    onTouchStart={() => router.prefetch(href)}
                    className={`relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200 active:scale-95 ${
                      active
                        ? 'bg-[#2A4365]/12 text-[#2A4365] shadow-[inset_0_0_0_1px_rgba(27,67,50,0.22)]'
                        : 'text-gray-500 hover:bg-black/5 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-1/2 top-1 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#2A4365]" />
                    )}
                    <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                    <span className={`text-[10px] font-semibold tracking-[0.01em] ${active ? 'text-[#2A4365]' : 'text-current'}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}

              {/* Spacer for center button to distribute space evenly */}
              <div className="w-[56px] pointer-events-none" aria-hidden="true" />

              {/* Center Popped-Out Button */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-[1.2rem]">
                <button 
                  onClick={() => {
                    if (isOffline) {
                      setShowOfflineToast(true);
                      setTimeout(() => setShowOfflineToast(false), 2500);
                      return;
                    }
                    setIsBhuchkiOpen(true);
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#2A4365] to-[#3B5B88] text-white shadow-[0_8px_20px_rgba(42,67,101,0.3)] transition-transform active:scale-95 border-4 border-white dark:border-[#161616]"
                >
                  <Sparkles size={24} className="animate-pulse" />
                </button>
              </div>

              {navItems.slice(2, 4).map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={true}
                    onMouseEnter={() => router.prefetch(href)}
                    onTouchStart={() => router.prefetch(href)}
                    className={`relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200 active:scale-95 ${
                      active
                        ? 'bg-[#2A4365]/12 text-[#2A4365] shadow-[inset_0_0_0_1px_rgba(27,67,50,0.22)]'
                        : 'text-gray-500 hover:bg-black/5 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-1/2 top-1 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#2A4365]" />
                    )}
                    <div className="relative">
                      <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                      {href === '/messages' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border border-white dark:border-[#161616] flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-[0.01em] ${active ? 'text-[#2A4365]' : 'text-current'}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Offline Toast */}
      {showOfflineToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 bg-gray-900/95 backdrop-blur-md text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
            <WifiOff size={16} className="text-amber-400" />
            <span>You&apos;re offline</span>
          </div>
        </div>
      )}

      {/* Bhuchki Chat Overlay */}
      <BhuchkiChat open={isBhuchkiOpen} onOpenChange={setIsBhuchkiOpen} />
    </>
  );
}
