'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { HomeIcon, TargetIcon, TrophyIcon, SwordsIcon, LeagueIcon, UsersIcon, FeedIcon, BellIcon, SettingsIcon } from '@/components/ui/Icons';

// Small SVG orb glyph for the sidebar "My Orb" entry — avoids importing the
// full MiniOrb (which reads user state) into a static nav list.
function OrbSidebarIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="orbSidebarGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="35%" stopColor="#f97316" />
          <stop offset="80%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#450a0a" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="8" fill="url(#orbSidebarGrad)" />
      <ellipse cx="9.5" cy="9" rx="2.2" ry="1.3" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { ReactNode } from 'react';

const navItems: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
  { href: '/orb', label: 'My Orb', icon: <OrbSidebarIcon /> },
  { href: '/habits', label: 'Habits', icon: <TargetIcon /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <TrophyIcon /> },
  { href: '/compete', label: 'Compete', icon: <SwordsIcon /> },
  { href: '/leagues', label: 'Leagues', icon: <LeagueIcon /> },
  { href: '/friends', label: 'Friends', icon: <UsersIcon /> },
  { href: '/pacts', label: 'Pacts', icon: <SwordsIcon /> },
  { href: '/friends-league', label: 'Friends League', icon: <TrophyIcon /> },
  { href: '/feed', label: 'Feed', icon: <FeedIcon /> },
  { href: '/groups', label: 'Groups', icon: <UsersIcon /> },
  { href: '/battle-pass', label: 'Battle Pass', icon: <TrophyIcon /> },
  { href: '/orb-leaderboard', label: 'Orb Rankings', icon: <TrophyIcon /> },
  { href: '/shop', label: 'Shop', icon: <LeagueIcon /> },
  { href: '/inventory', label: 'Inventory', icon: <TargetIcon /> },
];

const bottomItems: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/notifications', label: 'Notifications', icon: <BellIcon /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const level = user ? getLevelForXP(user.totalXP) : null;
  const xpProgress = user ? getXPProgress(user.totalXP) : null;

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen fixed left-0 top-0 bg-[#08080f] border-r border-[#1e1e30] z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e1e30]">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'text-white bg-red-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e1e30]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-red-500"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
                <span className={cn(isActive && 'text-orange-400')}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Items */}
      <div className="px-3 py-2 space-y-1 border-t border-[#1e1e30]">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'text-white bg-red-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e1e30]'
                )}
              >
                <span className={cn(isActive && 'text-orange-400')}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* User Profile */}
      {user && (
        <Link href="/profile">
          <div className="px-3 py-4 border-t border-[#1e1e30] flex items-center gap-3 hover:bg-[#1e1e30] transition-colors">
            <Avatar src={user.avatarUrl} alt={user.username} size="md" level={xpProgress?.percentage} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-xs text-orange-400">
                Lv.{level?.level} {level?.title}
              </p>
            </div>
          </div>
        </Link>
      )}
    </aside>
  );
}
