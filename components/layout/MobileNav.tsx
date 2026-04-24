'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HomeIcon, TargetIcon, SwordsIcon, FeedIcon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { ReactNode } from 'react';

// 4 regular tab items split around a raised central orb FAB.
// The FAB routes to /orb — the orb command center. Ranks moved to the
// top bar so the bottom nav stays uncluttered.
const sideItems: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/dashboard', label: 'Home',    icon: <HomeIcon size={22} /> },
  { href: '/habits',    label: 'Habits',  icon: <TargetIcon size={22} /> },
  { href: '/compete',   label: 'Compete', icon: <SwordsIcon size={22} /> },
  { href: '/feed',      label: 'Feed',    icon: <FeedIcon size={22} /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Alert pulse on the orb when there's a pending orb action — an evolution
  // charge ready to spend, or the awakening bar at 100%.
  const userAny = user as unknown as Record<string, number> | null;
  const charges = userAny?.orbEvolutionCharges || 0;
  const awakening = userAny?.awakening || 0;
  const orbTier = userAny?.orbTier || 1;
  const hasOrbAction = charges > 0 || awakening >= 100;
  const orbActive = pathname === '/orb' || pathname.startsWith('/orb/');

  const leftItems = sideItems.slice(0, 2);
  const rightItems = sideItems.slice(2);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08080f]/95 backdrop-blur-xl border-t border-[#1e1e30] safe-area-bottom">
      <div className="relative flex items-end justify-around h-16 px-2">
        {leftItems.map((item) => (
          <TabItem key={item.href} item={item} pathname={pathname} />
        ))}

        {/* Orb FAB — raised pedestal in the middle of the nav. Takes the
            visual weight of a primary action without stealing tab slots. */}
        <Link
          href="/orb"
          className="relative flex-1 flex items-start justify-center"
          aria-label="Open orb command center"
        >
          <div className="relative -top-5 flex flex-col items-center">
            {/* Pedestal ring that anchors the orb into the nav bar */}
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(249,115,22,0.10) 40%, transparent 70%)',
                filter: 'blur(6px)',
              }}
            />
            <div
              className={cn(
                'relative rounded-full p-0.5 transition-transform overflow-hidden',
                orbActive && 'scale-[1.08]',
              )}
              style={{
                background: 'linear-gradient(145deg, #1a1a2a, #0b0b14)',
                boxShadow: orbActive
                  ? '0 8px 24px -6px rgba(249,115,22,0.55), inset 0 0 0 1px rgba(251,146,60,0.55)'
                  : '0 6px 18px -8px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(236,72,153,0.25)',
                width: 52,
                height: 52,
              }}
            >
              {/* Real canvas SoulOrb in miniature — identical rendering to
                  what the user sees on the /orb page. interactive={false}
                  disables drag + the evolve/ascend/awaken button cluster so
                  it behaves as a pure visual preview in the nav. */}
              <SoulOrb
                tier={orbTier}
                size={48}
                intensity={awakening}
                interactive={false}
                hideLabel
                baseColorId={userAny?.orbBaseColor as unknown as string}
                pulseColorId={userAny?.orbPulseColor as unknown as string}
                ringColorId={userAny?.orbRingColor as unknown as string}
              />
            </div>
            {/* Alert dot — only visible when there's an action pending */}
            {hasOrbAction && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4"
              >
                <span className="absolute inset-0 rounded-full animate-ping bg-pink-500/70" />
                <span
                  className="relative w-2.5 h-2.5 rounded-full border-2 border-[#08080f]"
                  style={{ background: awakening >= 100 ? '#fde047' : '#ec4899' }}
                />
              </span>
            )}
            <span
              className={cn(
                'text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5',
                orbActive ? 'text-orange-400' : 'text-slate-400',
              )}
            >
              Orb
            </span>
          </div>
        </Link>

        {rightItems.map((item) => (
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
