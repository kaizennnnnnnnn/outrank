'use client';

import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { FlameIcon } from '@/components/ui/Icons';
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
            <span className="text-xs font-mono text-cyan-400 font-bold">Lv.{level.level}</span>
            <div className="w-48 h-2 bg-[#18182a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${xp.percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              {xp.current}/{xp.needed} XP
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-orange-400">
            <FlameIcon size={16} className="text-orange-500" />
            {user.weeklyXP} XP
          </div>
          <NotificationBell count={unreadCount} />
          <Link href="/profile" className="lg:hidden">
            <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
