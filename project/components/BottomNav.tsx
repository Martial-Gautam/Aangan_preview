'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Chrome as Home, UserPlus, User } from 'lucide-react';

const navItems = [
  { href: '/home', label: 'Family', icon: Home },
  { href: '/add-member', label: 'Add', icon: UserPlus },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="max-w-sm mx-auto flex items-center justify-around px-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-3 px-5 rounded-2xl transition-all ${
                active ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-orange-50' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
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
