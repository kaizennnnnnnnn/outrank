'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserProfile } from '@/types/user';
import {
  getCurrentSeason, getSeasonDaysLeft,
  getLeague, getNextLeague, LEAGUES,
  getSeasonPassTier, getSeasonPassProgress, SEASON_PASS_TIERS,
} from '@/constants/seasons';
import { RanksModal } from './RanksModal';
import { LeagueCrest } from './LeagueCrest';

interface Props { user: UserProfile; }

export function SeasonCard({ user }: Props) {
  const [ranksOpen, setRanksOpen] = useState(false);
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

  // Suppress: still imported elsewhere. Remove explicit unused.
  void LEAGUES;

  return (
    <div
      style={{
        padding: '14px 0',
        borderTop: `2px solid ${league.color}`,
        borderBottom: '1px solid var(--b-rule)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            Season {season}
          </div>
          <div
            className="font-display league-crest-shine"
            style={{
              ['--crest-color' as string]: league.color,
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {league.name}
          </div>
          <div
            className="font-body"
            style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4 }}
          >
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} until reset
          </div>
        </div>

        {/* Premium league crest — chevron-stack mark + roman numeral
            with metallic shine and pulsing color halo on the active rank. */}
        <LeagueCrest league={league} size={62} active />

      </div>

      {/* Promotion bar */}
      <button
        onClick={() => setRanksOpen(true)}
        style={{
          marginTop: 14,
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
        }}
      >
        <div
          className="font-body"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--b-ink-60)',
            marginBottom: 4,
          }}
        >
          <span>Promotion · view ranks →</span>
          <span className="tabular">
            {weeklyXP} / {nextLeague ? nextLeague.minWeeklyXP : '—'}
            {nextLeague && <span style={{ color: 'var(--b-ink-40)' }}> · {nextLeague.name}</span>}
          </span>
        </div>
        <div style={{ height: 2, background: 'var(--b-rule)' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(4, Math.min(100, promoProgress * 100))}%`,
              background: league.color,
              transition: 'width 500ms',
            }}
          />
        </div>
      </button>

      {/* Season pass */}
      <Link
        href="/battle-pass"
        style={{
          display: 'block',
          marginTop: 12,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div
          className="font-body"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--b-ink-60)',
            marginBottom: 4,
          }}
        >
          <span>Season Pass · view tiers →</span>
          <span className="tabular">Tier {passTier} / {SEASON_PASS_TIERS}</span>
        </div>
        <div style={{ height: 2, background: 'var(--b-rule)' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(3, Math.min(100, passProgress * 100))}%`,
              background: 'var(--b-accent)',
              transition: 'width 500ms',
            }}
          />
        </div>
      </Link>

      <RanksModal isOpen={ranksOpen} onClose={() => setRanksOpen(false)} weeklyXP={weeklyXP} />
    </div>
  );
}
