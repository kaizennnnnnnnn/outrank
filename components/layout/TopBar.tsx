'use client';

import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { FlameIcon, SettingsIcon, UsersIcon } from '@/components/ui/Icons';
import { XPBoostBadge } from '@/components/profile/XPBoostBadge';
import Link from 'next/link';
import { getXPProgress, getLevelForXP } from '@/constants/levels';

export function TopBar() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const xp = getXPProgress(user.totalXP);
  const level = getLevelForXP(user.totalXP);

  return (
    <header className="sticky top-0 z-30 bg-[#08080f]/80 backdrop-blur-xl border-b border-[#1e1e30]">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        {/* Mobile Logo */}
        <div className="lg:hidden">
          <Logo size="sm" showText={false} />
        </div>

        {/* XP Bar (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-orange-400 font-bold">Lv.{level.level}</span>
            <div className="w-48 h-2 bg-[#18182a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${xp.percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              {xp.current}/{xp.needed} XP
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <XPBoostBadge activatedAt={(user as unknown as Record<string, unknown>).xpBoostActivatedAt as never} size="sm" />
          <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-orange-400">
            <FlameIcon size={16} className="text-orange-500" />
            {user.weeklyXP}
          </div>
          <Link href="/schedule" className="lg:hidden p-2 rounded-xl hover:bg-[#1e1e30] transition-colors" aria-label="Schedule">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </Link>
          <Link href="/shop" className="lg:hidden p-2 rounded-xl hover:bg-[#1e1e30] transition-colors" aria-label="Shop">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </Link>
          <Link href="/inventory" className="lg:hidden p-2 rounded-xl hover:bg-[#1e1e30] transition-colors" aria-label="Inventory">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
              <path d="M3 12h18" />
            </svg>
          </Link>
          <Link href="/friends" className="lg:hidden p-2 rounded-xl hover:bg-[#1e1e30] transition-colors">
            <UsersIcon size={18} className="text-slate-400" />
          </Link>
          <NotificationBell count={unreadCount} />
          <Link href="/settings" className="lg:hidden p-2 rounded-xl hover:bg-[#1e1e30] transition-colors">
            <SettingsIcon size={18} className="text-slate-400" />
          </Link>
          <Link href="/profile" className="lg:hidden">
            <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
