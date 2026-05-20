'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chrome as Home, User, MessageCircle, Newspaper, Images } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/home', label: 'Family', icon: Home },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/memories', label: 'Memory', icon: Images },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
            (sum: number, c: any) => sum + (c.unread_count || 0),
            0
          );
          setUnreadCount(total);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnread();
  }, [session]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2]/95 backdrop-blur-2xl border-t border-[#C9A66B]/10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-sm mx-auto flex items-center justify-around px-1" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-200 relative active:scale-90 ${
                active ? 'text-[#355E3B]' : 'text-[#5E5E5E]/50 hover:text-[#5E5E5E]/80'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                active
                  ? 'bg-[#355E3B]/10 shadow-sm shadow-[#355E3B]/5'
                  : ''
              }`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 min-w-[16px] h-[16px] bg-[#B76E5D] rounded-full border-2 border-[#FAF7F2] flex items-center justify-center shadow-sm">
                    <span className="text-[8px] font-bold text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide transition-all duration-200 ${
                active ? 'text-[#355E3B] opacity-100' : 'text-[#5E5E5E]/50 opacity-80'
              }`}>
                {label}
              </span>
              {/* Active indicator pill */}
              {active && (
                <div className="absolute -bottom-0.5 w-5 h-[3px] rounded-full bg-[#355E3B] shadow-sm shadow-[#355E3B]/30" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
