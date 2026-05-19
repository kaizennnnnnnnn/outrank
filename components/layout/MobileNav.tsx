'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HomeIcon, TargetIcon, SwordsIcon, FeedIcon } from '@/components/ui/Icons';
import { ReactNode } from 'react';

// 4-tab bottom nav. The orb command center fuses into /dashboard, so
// no center FAB — Home is the entry to the orb.
const navItems: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/dashboard', label: 'Home',    icon: <HomeIcon size={22} /> },
  { href: '/habits',    label: 'Habits',  icon: <TargetIcon size={22} /> },
  { href: '/compete',   label: 'Compete', icon: <SwordsIcon size={22} /> },
  { href: '/feed',      label: 'Feed',    icon: <FeedIcon size={22} /> },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d15]/95 backdrop-blur-xl border-t border-[#1e1e30] safe-area-bottom">
      <div className="flex items-end justify-around h-16 px-2">
        {navItems.map((item) => (
          <TabItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: ReactNode };
  pathname: string;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link href={item.href} className="flex-1">
      <div
        className={cn(
          'flex flex-col items-center gap-0.5 py-1 transition-all',
          isActive ? 'text-orange-400' : 'text-slate-500',
        )}
      >
        {item.icon}
        <span className="text-[10px] font-medium">{item.label}</span>
        {isActive && <div className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
      </div>
    </Link>
  );
}
