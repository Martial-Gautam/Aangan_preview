'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chrome as Home, UserPlus, User, Bell, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/home', label: 'Family', icon: Home },
  { href: '/add-member', label: 'Add', icon: UserPlus },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/connections/pending', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.requests?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending requests count:', error);
      }
    };

    fetchPendingCount();
  }, [session]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100/60">
      <div className="max-w-sm mx-auto flex items-center justify-around px-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-3 px-5 rounded-2xl transition-all relative ${
                active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-orange-50' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {href === '/notifications' && pendingCount > 0 && (
                  <span className="absolute top-3 right-5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-orange-500' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
