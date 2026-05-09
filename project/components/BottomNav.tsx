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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2]/90 backdrop-blur-xl border-t border-[#C9A66B]/15">
      <div className="max-w-sm mx-auto flex items-center justify-around px-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-3 px-2.5 rounded-2xl transition-all relative ${
                active ? 'text-[#355E3B]' : 'text-[#5E5E5E]/60 hover:text-[#5E5E5E]'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[#355E3B]/8' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {href === '/messages' && unreadCount > 0 && (
                  <span className="absolute top-2.5 right-3 min-w-[18px] h-[18px] bg-[#B76E5D] rounded-full border-2 border-[#FAF7F2] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-[#355E3B]' : 'text-[#5E5E5E]/60'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
