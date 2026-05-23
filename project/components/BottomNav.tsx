'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TreePine, Newspaper, Images, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { readSessionCache, writeSessionCache } from '@/lib/ui-cache';
import { warmStreamConnection } from '@/lib/stream-client';

const navItems = [
  { href: '/home', label: 'Family', icon: TreePine },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/memories', label: 'Memories', icon: Images },
  { href: '/messages', label: 'Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const cachedUnread = readSessionCache<number>('nav:unread-count', 45_000);
    if (cachedUnread !== null) {
      setUnreadCount(cachedUnread);
    }
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
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
    if (!session?.access_token || typeof window === 'undefined') return;
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-sm mx-auto px-3 pt-2" style={{ paddingBottom: 'max(0.7rem, env(safe-area-inset-bottom))' }}>
        <div className="rounded-[1.35rem] border border-black/10 bg-white/92 shadow-[0_12px_34px_rgba(0,0,0,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#161616]/95 dark:shadow-[0_12px_34px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-around px-1.5 py-1.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(href)}
              onTouchStart={() => router.prefetch(href)}
              className={`relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-all duration-200 active:scale-95 ${
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
  );
}
