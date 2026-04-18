'use client';

import { UserProfile } from '@/types/user';
import { LEAGUES } from '@/constants/seasons';

interface Props {
  user: UserProfile;
}

/**
 * Compact 4-pill strip under the username showing the persistent achievements
 * that don't reset per season: best league ever reached, total ascensions,
 * prestige count, duel wins.
 */
export function ProfileHighlights({ user }: Props) {
  const userRaw = user as unknown as Record<string, unknown>;
  const bestLeagueId = (userRaw.bestLeagueId as string) || 'bronze';
  const bestLeague = LEAGUES.find((l) => l.id === bestLeagueId) || LEAGUES[0];
  const ascensions = (userRaw.orbAscensions as number) || 0;
  const prestige = (userRaw.prestige as number) || 0;
  const duelWins = (userRaw.duelWins as number) || 0;

  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      <Pill
        label="Best League"
        value={bestLeague.name}
        color={bestLeague.color}
        icon={<LeagueCrest color={bestLeague.color} />}
      />
      <Pill
        label="Ascensions"
        value={String(ascensions)}
        color="#ec4899"
        icon={
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15 10 22 10 16 15 18 22 12 17 6 22 8 15 2 10 9 10" />
          </svg>
        }
      />
      <Pill
        label="Prestige"
        value={String(prestige)}
        color="#f9a8d4"
        icon={
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5z" fill="currentColor" opacity="0.3" />
            <path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5z" />
          </svg>
        }
      />
      <Pill
        label="Duel Wins"
        value={String(duelWins)}
        color="#f97316"
        icon={
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
            <line x1="13" y1="19" x2="19" y2="13" />
            <line x1="16" y1="16" x2="20" y2="20" />
            <line x1="19" y1="21" x2="21" y2="19" />
          </svg>
        }
      />
    </div>
  );
}

function Pill({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-2 text-center"
      style={{
        background: `linear-gradient(145deg, ${color}15, #0b0b14 70%)`,
        border: `1px solid ${color}35`,
      }}
    >
      <div className="flex justify-center mb-0.5" style={{ color }}>{icon}</div>
      <p className="text-[10px] font-mono font-bold text-white truncate">{value}</p>
      <p className="text-[9px] text-slate-500 truncate">{label}</p>
    </div>
  );
}

function LeagueCrest({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-3 h-3.5"
      style={{
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: color,
      }}
    />
  );
}
