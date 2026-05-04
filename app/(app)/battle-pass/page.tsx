'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { BATTLE_PASS, PassRow, MISSIONS, Mission, isoWeekKey } from '@/constants/battlePass';
import { getCurrentSeason, getSeasonDaysLeft, getSeasonPassTier, SEASON_PASS_TIERS, SEASON_PASS_XP_PER_TIER } from '@/constants/seasons';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Masthead } from '@/components/editorial/Masthead';
import { BLockGlyph } from '@/components/editorial/BGlyphs';

export default function BattlePassPage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const addToast = useUIStore((s) => s.addToast);

  const userRaw = user as unknown as Record<string, unknown> | undefined;
  const seasonPassXP = (userRaw?.seasonPassXP as number) || 0;
  const currentTier = getSeasonPassTier(seasonPassXP);
  const season = getCurrentSeason();
  const daysLeft = getSeasonDaysLeft();
  const xpInTier = seasonPassXP % SEASON_PASS_XP_PER_TIER;
  const xpToNext = SEASON_PASS_XP_PER_TIER - xpInTier;
  const tierProgress = (xpInTier / SEASON_PASS_XP_PER_TIER) * 100;
  const seasonProgress = (currentTier / SEASON_PASS_TIERS) * 100;
  const isPremium = false;
  const claimed = (userRaw?.claimedPassTiers as number[]) || [];

  const [claiming, setClaiming] = useState<string | null>(null);

  const todayStr = new Date().toDateString();
  const weekStr = isoWeekKey();
  const dailyClaimed = (userRaw?.dailyMissionsClaimed as Record<string, string>) || {};
  const weeklyClaimed = (userRaw?.weeklyMissionsClaimed as Record<string, string>) || {};
  const permClaimed = (userRaw?.permanentMissionsClaimed as string[]) || [];

  const habitsLoggedToday = habits.filter(
    (h) => h.lastLogDate?.toDate?.()?.toDateString?.() === todayStr,
  ).length;
  const allHabitsDoneToday =
    (userRaw?.lastDailyBonusDate as { toDate?: () => Date } | undefined)?.toDate?.()?.toDateString?.() ===
    todayStr;
  const weeklyXP = (userRaw?.weeklyXP as number) || 0;
  const longestCurrentStreak = Math.max(...habits.map((h) => h.currentStreak), 0);

  const missionProgress = (m: Mission): number => {
    switch (m.id) {
      case 'log_3':     return Math.min(habitsLoggedToday, m.goal);
      case 'log_all':   return allHabitsDoneToday ? 1 : 0;
      case 'weekly_xp': return Math.min(weeklyXP, m.goal);
      case 'streak_7':
      case 'streak_30': return Math.min(longestCurrentStreak, m.goal);
    }
    return 0;
  };

  const missionClaimed = (m: Mission): boolean => {
    if (m.kind === 'daily')     return dailyClaimed[m.id] === todayStr;
    if (m.kind === 'weekly')    return weeklyClaimed[m.id] === weekStr;
    if (m.kind === 'permanent') return permClaimed.includes(m.id);
    return false;
  };

  const handleClaimMission = async (m: Mission) => {
    if (!user) return;
    if (missionClaimed(m)) return;
    if (missionProgress(m) < m.goal) return;
    setClaiming(`mission-${m.id}`);
    try {
      const update: Record<string, unknown> = {
        seasonPassXP: increment(m.reward),
      };
      if (m.kind === 'daily')     update[`dailyMissionsClaimed.${m.id}`]  = todayStr;
      if (m.kind === 'weekly')    update[`weeklyMissionsClaimed.${m.id}`] = weekStr;
      if (m.kind === 'permanent') update.permanentMissionsClaimed = arrayUnion(m.id);
      await updateDocument('users', user.uid, update);
      addToast({ type: 'success', message: `Mission claimed · +${m.reward} Pass XP` });
    } catch {
      addToast({ type: 'error', message: 'Could not claim mission' });
    } finally {
      setClaiming(null);
    }
  };

  const claimKey = (row: PassRow) => `${row.tier}-${row.track}`;

  function claimedSet(): Set<string> {
    return new Set((claimed as unknown as string[]).map(String));
  }

  const handleClaim = async (row: PassRow) => {
    if (!user) return;
    const key = claimKey(row);
    setClaiming(key);
    try {
      const update: Record<string, unknown> = {
        fragments: increment(row.fragments),
        claimedPassTiers: arrayUnion(key),
      };
      if (row.cosmetic) update.ownedCosmetics = arrayUnion(row.cosmetic);
      await updateDocument('users', user.uid, update);
      addToast({
        type: 'success',
        message: `Tier ${row.tier} claimed · +${row.fragments} fragments${row.cosmetic ? ' + cosmetic' : ''}`,
      });
    } catch {
      addToast({ type: 'error', message: 'Could not claim' });
    } finally {
      setClaiming(null);
    }
  };

  const grouped: Record<number, { free: PassRow; premium: PassRow }> = {};
  for (const r of BATTLE_PASS) {
    grouped[r.tier] = grouped[r.tier] || ({} as { free: PassRow; premium: PassRow });
    grouped[r.tier][r.track] = r;
  }
  const tiers = Object.values(grouped).sort((a, b) => a.free.tier - b.free.tier);

  if (!user) return null;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section={`Volume ${season}`} />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Volume {season} · {daysLeft}d remaining
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>The Season Pass</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 360, lineHeight: 1.5 }}
          >
            Every habit log earns season-pass XP. Climb {SEASON_PASS_TIERS} tiers to claim exclusive cosmetics.
          </p>

          {/* Tier strip — current tier on the right, season progress bar */}
          <div
            style={{
              marginTop: 18,
              padding: '14px 0',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
              >
                Tier {currentTier} → {currentTier + 1}
              </div>
              <div
                className="font-body tabular"
                style={{ fontSize: 11, color: 'var(--b-ink)', marginTop: 2 }}
              >
                <b>{xpInTier}</b>
                <span style={{ color: 'var(--b-ink-60)' }}> / {SEASON_PASS_XP_PER_TIER}</span>
                <span style={{ color: 'var(--b-ink-60)' }}> Pass XP</span>
              </div>
              {/* Tier progress bar — hairline + filled */}
              <div
                style={{
                  marginTop: 6,
                  height: 2,
                  background: 'var(--b-rule)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(2, tierProgress)}%`,
                    background: 'var(--b-accent)',
                    transition: 'width 700ms',
                  }}
                />
              </div>
              <div
                className="font-body"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 6 }}
              >
                {xpToNext} more for tier {currentTier + 1}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                className="font-display tabular"
                style={{ fontSize: 38, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, color: 'var(--b-accent)' }}
              >
                {currentTier}
              </div>
              <div
                className="font-mono tabular"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2 }}
              >
                / {SEASON_PASS_TIERS}
              </div>
            </div>
          </div>

          {/* Season-wide bar */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                height: 4,
                background: 'var(--b-rule)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, seasonProgress)}%`,
                  background: 'var(--b-ink)',
                }}
              />
              {[10, 20, 30, 40, 50].map((n) => (
                <span
                  key={n}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${(n / SEASON_PASS_TIERS) * 100}%`,
                    width: 1,
                    background: 'var(--b-paper)',
                  }}
                />
              ))}
            </div>
            <div
              className="font-mono tabular"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 8,
                color: 'var(--b-ink-40)',
                marginTop: 4,
              }}
            >
              <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60</span>
            </div>
          </div>

          {/* Premium banner — locked */}
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              border: '1px dashed var(--b-rule)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              color: 'var(--b-ink-60)',
            }}
          >
            <BLockGlyph size={12} />
            <span
              className="spread"
              style={{ fontSize: 9 }}
            >
              Premium Track — coming soon
            </span>
          </div>

          {/* Missions section */}
          <MissionsPanel
            missions={MISSIONS}
            progressFor={missionProgress}
            claimedFor={missionClaimed}
            onClaim={handleClaimMission}
            claimingId={claiming}
          />

          {/* Section header for tiers */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
              The Tier Ladder
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(SEASON_PASS_TIERS).padStart(2, '0')}
            </div>
          </div>

          {/* Column header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 1fr',
              gap: 8,
              padding: '6px 0',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <div />
            <div
              className="spread"
              style={{ fontSize: 8, color: 'var(--b-ink-60)', textAlign: 'center' }}
            >
              Free
            </div>
            <div
              className="spread"
              style={{ fontSize: 8, color: 'var(--b-ink-40)', textAlign: 'center' }}
            >
              Premium
            </div>
          </div>

          {/* Tier rows */}
          {tiers.map(({ free, premium }) => {
            const reached = free.tier <= currentTier;
            const freeKey = `${free.tier}-free`;
            const premKey = `${free.tier}-premium`;
            const freeClaimed = claimedSet().has(freeKey);
            const premClaimedFlag = claimedSet().has(premKey);
            const isMilestone = free.tier % 10 === 0 || free.tier === 60;
            return (
              <div
                key={free.tier}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr',
                  gap: 8,
                  padding: '10px 0',
                  borderBottom: isMilestone ? '1px solid var(--b-ink)' : '1px solid var(--b-rule)',
                  opacity: reached ? 1 : 0.55,
                }}
              >
                {/* Tier number */}
                <div
                  className="font-display tabular"
                  style={{
                    fontSize: isMilestone ? 22 : 16,
                    fontStyle: isMilestone ? 'italic' : 'normal',
                    fontWeight: 500,
                    textAlign: 'center',
                    color: reached
                      ? (isMilestone ? 'var(--b-accent)' : 'var(--b-ink)')
                      : 'var(--b-ink-40)',
                  }}
                >
                  {free.tier}
                </div>
                <RewardCell
                  row={free}
                  reached={reached}
                  claimed={freeClaimed}
                  locked={false}
                  onClaim={() => handleClaim(free)}
                  claiming={claiming === freeKey}
                />
                <RewardCell
                  row={premium}
                  reached={reached}
                  claimed={premClaimedFlag}
                  locked={!isPremium}
                  onClaim={() => handleClaim(premium)}
                  claiming={claiming === premKey}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RewardCell({
  row, reached, claimed, locked, onClaim, claiming,
}: {
  row: PassRow; reached: boolean; claimed: boolean; locked: boolean; onClaim: () => void; claiming: boolean;
}) {
  const isPremium = row.track === 'premium';
  return (
    <div
      style={{
        position: 'relative',
        padding: '8px 10px',
        border: '1px solid var(--b-rule)',
        background: claimed
          ? 'rgba(16,185,129,0.06)'
          : reached
            ? 'transparent'
            : 'transparent',
        opacity: locked ? 0.45 : 1,
      }}
    >
      {locked && (
        <div style={{ position: 'absolute', top: 4, right: 4, color: 'var(--b-ink-40)' }}>
          <BLockGlyph size={10} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <span
          className="spread"
          style={{
            fontSize: 8,
            color: isPremium ? 'var(--b-ink-40)' : 'var(--b-ink-60)',
          }}
        >
          {row.rank === 'capstone' ? 'Capstone' : row.rank === 'major' ? 'Major' : row.rank === 'medium' ? 'Milestone' : 'Free'}
        </span>
        {claimed && (
          <span
            className="spread"
            style={{ fontSize: 8, color: '#10b981' }}
          >
            ✓
          </span>
        )}
      </div>
      <div
        className="font-display tabular"
        style={{
          fontSize: 16,
          fontStyle: 'italic',
          fontWeight: 500,
          marginTop: 2,
          color: claimed ? 'var(--b-ink-60)' : 'var(--b-ink)',
        }}
      >
        +{row.fragments}
      </div>
      {row.extra && (
        <div
          className="font-body"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-60)',
            marginTop: 1,
            lineHeight: 1.3,
          }}
        >
          {row.extra}
        </div>
      )}
      {reached && !claimed && !locked && (
        <Button size="sm" className="w-full mt-2" loading={claiming} onClick={onClaim}>
          Claim
        </Button>
      )}
    </div>
  );
}

const kindLabel: Record<Mission['kind'], { label: string; color: string }> = {
  daily:     { label: 'Daily',     color: '#f97316' },
  weekly:    { label: 'Weekly',    color: '#60a5fa' },
  permanent: { label: 'Milestone', color: '#fbbf24' },
};

function MissionsPanel({
  missions, progressFor, claimedFor, onClaim, claimingId,
}: {
  missions: Mission[];
  progressFor: (m: Mission) => number;
  claimedFor: (m: Mission) => boolean;
  onClaim: (m: Mission) => void;
  claimingId: string | null;
}) {
  const ready = missions.filter((m) => !claimedFor(m) && progressFor(m) >= m.goal);
  const inProgress = missions.filter((m) => !claimedFor(m) && progressFor(m) < m.goal);
  const done = missions.filter((m) => claimedFor(m));
  const ordered = [...ready, ...inProgress, ...done];

  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
          Missions
        </div>
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: ready.length > 0 ? 'var(--b-accent)' : 'var(--b-ink-60)', letterSpacing: '0.14em' }}
        >
          {ready.length > 0 ? `${ready.length} READY` : `§ ${String(missions.length).padStart(2, '0')}`}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-2">
        {ordered.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            progress={progressFor(m)}
            claimed={claimedFor(m)}
            claiming={claimingId === `mission-${m.id}`}
            onClaim={() => onClaim(m)}
          />
        ))}
      </div>
    </section>
  );
}

function MissionCard({
  mission, progress, claimed, claiming, onClaim,
}: {
  mission: Mission;
  progress: number;
  claimed: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const accent = kindLabel[mission.kind];
  const pct = Math.min(100, (progress / mission.goal) * 100);
  const ready = !claimed && progress >= mission.goal;

  return (
    <div
      style={{
        position: 'relative',
        padding: '12px 14px',
        border: ready ? `1px solid ${accent.color}` : '1px solid var(--b-rule)',
        borderLeft: `3px solid ${claimed ? '#10b981' : accent.color}`,
        background: claimed ? 'rgba(16,185,129,0.04)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="spread"
            style={{ fontSize: 8, color: accent.color }}
          >
            {accent.label}
          </span>
          <p
            className="font-body"
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginTop: 4,
              lineHeight: 1.35,
              color: claimed ? 'var(--b-ink-60)' : 'var(--b-ink)',
              textDecoration: claimed ? 'line-through' : 'none',
            }}
          >
            {mission.text}
          </p>
          {mission.hint && !claimed && (
            <p
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {mission.hint}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            className="spread"
            style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
          >
            Pass XP
          </div>
          <div
            className="font-display tabular"
            style={{
              fontSize: 18,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 2,
              color: claimed ? 'var(--b-ink-60)' : accent.color,
            }}
          >
            +{mission.reward}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div
          className="font-mono tabular"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: 'var(--b-ink-60)',
            marginBottom: 4,
          }}
        >
          <span>{progress} / {mission.goal}</span>
          <span>{Math.floor(pct)}%</span>
        </div>
        <div style={{ height: 2, background: 'var(--b-rule)' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(2, pct)}%`,
              background: claimed ? '#10b981' : accent.color,
              transition: 'width 500ms',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {claimed ? (
          <p
            className="spread"
            style={{ fontSize: 9, color: '#10b981', textAlign: 'center', padding: '4px 0' }}
          >
            Claimed ✓
          </p>
        ) : ready ? (
          <Button size="sm" className="w-full" loading={claiming} onClick={onClaim}>
            Claim +{mission.reward} XP
          </Button>
        ) : (
          <p
            className="font-body"
            style={{ fontSize: 10, color: 'var(--b-ink-40)', textAlign: 'center', padding: '4px 0' }}
          >
            {mission.goal - progress} to go
          </p>
        )}
      </div>
    </div>
  );
}
