'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HomeIcon, TargetIcon, TrophyIcon, SwordsIcon, FeedIcon } from '@/components/ui/Icons';
import { ReactNode } from 'react';

const navItems: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/dashboard', label: 'Home', icon: <HomeIcon size={22} /> },
  { href: '/habits', label: 'Habits', icon: <TargetIcon size={22} /> },
  { href: '/leaderboard', label: 'Ranks', icon: <TrophyIcon size={22} /> },
  { href: '/compete', label: 'Compete', icon: <SwordsIcon size={22} /> },
  { href: '/feed', label: 'Feed', icon: <FeedIcon size={22} /> },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08080f]/95 backdrop-blur-xl border-t border-[#1e1e30] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className={cn(
                'flex flex-col items-center gap-0.5 py-1 transition-all',
                isActive ? 'text-cyan-400' : 'text-slate-500'
              )}>
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
