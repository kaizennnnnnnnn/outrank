'use client';

import { UserProfile } from '@/types/user';
import {
  getCurrentSeason, getSeasonDaysLeft,
  getLeague, getNextLeague, LEAGUES,
  getSeasonPassTier, getSeasonPassProgress, SEASON_PASS_TIERS,
} from '@/constants/seasons';

interface Props { user: UserProfile; }

/**
 * Season / League / Pass mini-dashboard. Replaces the old flat XP bar with
 * ranked context: current season number, countdown, league tier, and season
 * pass progress bar.
 */
export function SeasonCard({ user }: Props) {
  const weeklyXP = user.weeklyXP || 0;
  const league = getLeague(weeklyXP);
  const nextLeague = getNextLeague(weeklyXP);

  const userRaw = user as unknown as Record<string, unknown>;
  const seasonPassXP = (userRaw.seasonPassXP as number) || 0;
  const passTier = getSeasonPassTier(seasonPassXP);
  const passProgress = getSeasonPassProgress(seasonPassXP);
  const season = getCurrentSeason();
  const daysLeft = getSeasonDaysLeft();

  const promoProgress = nextLeague
    ? (weeklyXP - league.minWeeklyXP) / (nextLeague.minWeeklyXP - league.minWeeklyXP)
    : 1;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${league.color}15 0%, #10101a 50%, #0b0b14 100%)`,
        border: `1px solid ${league.color}35`,
        boxShadow: `0 0 22px -10px ${league.color}55`,
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.18] blur-3xl pointer-events-none"
        style={{ background: league.color }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Season {season}
          </p>
          <h3
            className="text-2xl font-bold font-heading mt-0.5"
            style={{ color: league.color, textShadow: `0 0 18px ${league.color}55` }}
          >
            {league.name}
          </h3>
          <p className="text-[11px] text-slate-500">
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} until reset
          </p>
        </div>

        <LeagueBadge color={league.color} index={LEAGUES.indexOf(league)} />
      </div>

      {/* Promotion bar */}
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Promotion</span>
          <span>
            {weeklyXP} / {nextLeague ? nextLeague.minWeeklyXP : '—'}
            {nextLeague && <span className="text-slate-600"> XP → {nextLeague.name}</span>}
          </span>
        </div>
        <div className="h-2 bg-[#18182a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(4, Math.min(100, promoProgress * 100))}%`,
              background: `linear-gradient(90deg, ${league.color}, ${nextLeague?.color ?? league.color})`,
              boxShadow: `0 0 8px ${league.color}80`,
            }}
          />
        </div>
      </div>

      {/* Season pass */}
      <div className="relative mt-4">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Season Pass</span>
          <span>Tier {passTier} / {SEASON_PASS_TIERS}</span>
        </div>
        <div className="h-2 bg-[#18182a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(3, Math.min(100, passProgress * 100))}%`,
              background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
              boxShadow: '0 0 8px rgba(249,115,22,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LeagueBadge({ color, index }: { color: string; index: number }) {
  // Small hex-shaped crest with roman numeral for the league index.
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  return (
    <div
      className="relative w-14 h-16 flex items-center justify-center shrink-0"
      style={{
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: `linear-gradient(145deg, ${color}55, #0b0b14)`,
      }}
    >
      <div
        className="absolute inset-[2px] flex items-center justify-center"
        style={{
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
          background: `linear-gradient(145deg, ${color}25, #10101a)`,
        }}
      >
        <span
          className="font-heading font-bold text-lg"
          style={{ color, textShadow: `0 0 10px ${color}80` }}
        >
          {numerals[index] ?? ''}
        </span>
      </div>
    </div>
  );
}
