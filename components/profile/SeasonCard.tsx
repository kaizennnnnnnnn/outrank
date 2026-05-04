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

interface Props { user: UserProfile; }

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

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

  const leagueIndex = LEAGUES.indexOf(league);

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
            className="font-display"
            style={{
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 2,
              color: league.color,
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

        {/* Roman numeral crest */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            border: `1px solid ${league.color}`,
            flexShrink: 0,
          }}
        >
          <span
            className="font-display tabular"
            style={{
              fontSize: 22,
              fontStyle: 'italic',
              fontWeight: 500,
              color: league.color,
            }}
          >
            {NUMERALS[leagueIndex] ?? ''}
          </span>
        </div>
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
