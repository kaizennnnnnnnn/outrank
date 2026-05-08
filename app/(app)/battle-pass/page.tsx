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
import { getFrame, getNameEffect } from '@/constants/cosmetics';

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
  const [missionsOpen, setMissionsOpen] = useState(false);

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
              {/* Tier progress bar — hairline + filled with running shine */}
              <div
                style={{
                  marginTop: 6,
                  height: 4,
                  background: 'var(--b-rule)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(2, tierProgress)}%`,
                    background: 'var(--b-accent)',
                    transition: 'width 700ms',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    aria-hidden
                    className="bp-bar-shine"
                    style={{ position: 'absolute', inset: 0 }}
                  />
                </div>
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
                className="font-display tabular bp-numeral-shine"
                style={{ fontSize: 38, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}
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
                height: 5,
                background: 'var(--b-rule)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, seasonProgress)}%`,
                  background: 'var(--b-ink)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  aria-hidden
                  className="bp-bar-shine-soft"
                  style={{ position: 'absolute', inset: 0 }}
                />
              </div>
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

          {/* Action row — Missions toggle + Premium upsell, side by side */}
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <button
              onClick={() => setMissionsOpen((v) => !v)}
              className="font-body"
              style={{
                padding: '12px 14px',
                background: missionsOpen ? 'var(--b-ink)' : 'transparent',
                color: missionsOpen ? 'var(--b-paper)' : 'var(--b-ink)',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              aria-expanded={missionsOpen}
            >
              <span>Missions</span>
              {(() => {
                const ready = MISSIONS.filter((m) => !missionClaimed(m) && missionProgress(m) >= m.goal).length;
                if (ready === 0) return null;
                return (
                  <span
                    className="font-mono tabular animate-notif-dot-pulse"
                    style={{
                      background: 'var(--b-accent)',
                      color: '#ffffff',
                      padding: '0 6px',
                      borderRadius: 999,
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      lineHeight: '16px',
                      minWidth: 16,
                      textAlign: 'center',
                    }}
                  >
                    {ready}
                  </span>
                );
              })()}
            </button>
            <div
              className="font-body bp-premium-pill"
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '12px 14px',
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #fbbf24 16%, var(--b-paper)), color-mix(in srgb, var(--b-accent) 12%, var(--b-paper)))',
                border: '1px solid #fbbf24',
                color: 'var(--b-ink)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {/* Ambient gold sheen sweeping across the pill */}
              <div
                aria-hidden
                className="bp-premium-shimmer"
                style={{ position: 'absolute', inset: 0, zIndex: 0 }}
              />
              <BLockGlyph size={12} />
              <span style={{ position: 'relative', zIndex: 1 }}>
                Premium · <span className="bp-star-twinkle" style={{ color: '#fbbf24' }}>★</span> Soon
              </span>
            </div>
          </div>

          {/* Missions section — only when toggled open */}
          {missionsOpen && (
            <MissionsPanel
              missions={MISSIONS}
              progressFor={missionProgress}
              claimedFor={missionClaimed}
              onClaim={handleClaimMission}
              claimingId={claiming}
            />
          )}

          {/* Tier ladder — vertical spine with reward art */}
          <TierLadder
            tiers={tiers}
            currentTier={currentTier}
            isPremium={isPremium}
            claimed={claimedSet()}
            onClaim={handleClaim}
            claiming={claiming}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Tier ladder ──────────────────────────────────────────────────

const TIER_RANK_LABEL: Record<PassRow['rank'], string> = {
  minor:    'Tier',
  medium:   'Milestone',
  major:    'Major',
  capstone: 'Capstone',
};

function TierLadder({
  tiers,
  currentTier,
  isPremium,
  claimed,
  onClaim,
  claiming,
}: {
  tiers: { free: PassRow; premium: PassRow }[];
  currentTier: number;
  isPremium: boolean;
  claimed: Set<string>;
  onClaim: (row: PassRow) => void;
  claiming: string | null;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div className="font-display" style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500 }}>
          The Ladder
        </div>
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
        >
          {currentTier} / {SEASON_PASS_TIERS}
        </div>
      </div>

      {/* Column legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 44px 1fr',
          gap: 8,
          padding: '4px 0 8px',
          borderBottom: '1px solid var(--b-rule)',
          marginBottom: 4,
        }}
      >
        <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)' }}>
          Free Track
        </div>
        <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-40)', textAlign: 'center' }}>
          Tier
        </div>
        <div
          className="spread"
          style={{ fontSize: 8, color: '#fbbf24', textAlign: 'right', letterSpacing: '0.22em' }}
        >
          Premium ★
        </div>
      </div>

      {tiers.map(({ free, premium }) => {
        const reached = free.tier <= currentTier;
        const isMilestone = free.tier === 60 || free.tier === 50 || free.tier === 40 || free.tier === 30 || free.tier === 20 || free.tier === 10;
        const isCapstone = free.rank === 'capstone';
        const freeKey = `${free.tier}-free`;
        const premKey = `${free.tier}-premium`;
        const freeClaimed = claimed.has(freeKey);
        const premClaimedFlag = claimed.has(premKey);
        return (
          <TierRow
            key={free.tier}
            free={free}
            premium={premium}
            reached={reached}
            isMilestone={isMilestone}
            isCapstone={isCapstone}
            freeClaimed={freeClaimed}
            premClaimedFlag={premClaimedFlag}
            premiumLocked={!isPremium}
            onClaimFree={() => onClaim(free)}
            onClaimPremium={() => onClaim(premium)}
            claimingFree={claiming === freeKey}
            claimingPremium={claiming === premKey}
          />
        );
      })}
    </section>
  );
}

function TierRow({
  free,
  premium,
  reached,
  isMilestone,
  isCapstone,
  freeClaimed,
  premClaimedFlag,
  premiumLocked,
  onClaimFree,
  onClaimPremium,
  claimingFree,
  claimingPremium,
}: {
  free: PassRow;
  premium: PassRow;
  reached: boolean;
  isMilestone: boolean;
  isCapstone: boolean;
  freeClaimed: boolean;
  premClaimedFlag: boolean;
  premiumLocked: boolean;
  onClaimFree: () => void;
  onClaimPremium: () => void;
  claimingFree: boolean;
  claimingPremium: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 44px 1fr',
        gap: 8,
        padding: '10px 0',
        position: 'relative',
        borderBottom: isMilestone ? '1px solid var(--b-ink)' : '1px solid var(--b-rule)',
        opacity: reached ? 1 : 0.65,
      }}
    >
      {/* Spine — vertical accent line up the center connecting tiers.
          Reached tiers get an animated red flow; unreached stay
          static hairline rule. */}
      <div
        aria-hidden
        className={reached ? 'bp-spine' : ''}
        style={{
          position: 'absolute',
          left: 'calc(50% - 1px)',
          top: 0,
          bottom: 0,
          width: 2,
          background: reached ? undefined : 'var(--b-rule)',
        }}
      />

      <RewardCell
        row={free}
        side="free"
        reached={reached}
        claimed={freeClaimed}
        locked={false}
        onClaim={onClaimFree}
        claiming={claimingFree}
      />

      {/* Tier marker */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className={`font-display tabular ${isMilestone && reached ? 'bp-milestone-breathe' : ''}`}
          style={{
            fontSize: isCapstone ? 28 : isMilestone ? 22 : 15,
            fontStyle: isMilestone ? 'italic' : 'normal',
            fontWeight: 500,
            lineHeight: 1,
            color: reached
              ? (isMilestone ? 'var(--b-accent)' : 'var(--b-ink)')
              : 'var(--b-ink-40)',
            background: 'var(--b-paper)',
            padding: isMilestone ? '6px 0' : '3px 0',
            minWidth: isMilestone ? 36 : 26,
            textAlign: 'center',
          }}
        >
          {free.tier}
        </div>
        {isMilestone && (
          <span
            className="spread"
            style={{
              fontSize: 7.5,
              color: reached ? 'var(--b-accent)' : 'var(--b-ink-40)',
              marginTop: 2,
              letterSpacing: '0.18em',
              background: 'var(--b-paper)',
              padding: '1px 4px',
            }}
          >
            {isCapstone ? '★' : 'M'}
          </span>
        )}
      </div>

      <RewardCell
        row={premium}
        side="premium"
        reached={reached}
        claimed={premClaimedFlag}
        locked={premiumLocked}
        onClaim={onClaimPremium}
        claiming={claimingPremium}
      />
    </div>
  );
}

function RewardCell({
  row, side, reached, claimed, locked, onClaim, claiming,
}: {
  row: PassRow;
  side: 'free' | 'premium';
  reached: boolean;
  claimed: boolean;
  locked: boolean;
  onClaim: () => void;
  claiming: boolean;
}) {
  const isPremium = side === 'premium';
  const isCapstone = row.rank === 'capstone';
  const isMajor = row.rank === 'major';
  const ready = reached && !claimed && !locked;

  // Premium gets a static gold-tinted bg + gold border + a moving
  // gold sheen layered on top. Free stays plain paper with hairline
  // ink border.
  // Claimed FREE flips to RED — fits the editorial accent and reads
  // unmistakably as "this is yours". Claimed PREMIUM stays in its
  // gold lane (deeper amber tint).
  const baseBg = isPremium
    ? 'linear-gradient(135deg, color-mix(in srgb, #fbbf24 10%, var(--b-paper)), color-mix(in srgb, #fbbf24 4%, var(--b-paper)))'
    : 'var(--b-paper)';
  const borderColor = isPremium ? '#d97706' : 'var(--b-ink)';

  const claimedFreeBg     = 'color-mix(in srgb, var(--b-accent) 9%, var(--b-paper))';
  const claimedFreeBorder = 'var(--b-accent)';
  const claimedFreeText   = 'var(--b-accent)';

  const claimedPremBg     = 'color-mix(in srgb, #fbbf24 18%, var(--b-paper))';
  const claimedPremBorder = '#d97706';
  const claimedPremText   = '#b45309';

  const cellBorder = claimed
    ? (isPremium ? claimedPremBorder : claimedFreeBorder)
    : borderColor;
  const cellBg = claimed
    ? (isPremium ? claimedPremBg : claimedFreeBg)
    : baseBg;
  const eyebrowColor = claimed
    ? (isPremium ? claimedPremText : claimedFreeText)
    : (isPremium ? '#fbbf24' : 'var(--b-ink-60)');
  const fragmentColor = claimed
    ? (isPremium ? claimedPremText : claimedFreeText)
    : (isPremium ? '#fbbf24' : 'var(--b-ink)');

  // Animated layers selected by state. Claimed-free pulses red border;
  // ready cells lift up gently to attract the tap.
  const cellAnim = claimed && !isPremium
    ? 'bp-claimed-red'
    : ready
      ? 'bp-ready-pulse'
      : '';

  return (
    <div
      className={cellAnim}
      style={{
        position: 'relative',
        padding: isCapstone ? '10px 12px' : '8px 10px',
        border: `1px solid ${cellBorder}`,
        borderLeft: claimed
          ? `3px solid ${cellBorder}`
          : isPremium
            ? '3px solid #fbbf24'
            : '3px solid var(--b-ink)',
        background: cellBg,
        opacity: locked ? 0.55 : 1,
        textAlign: isPremium ? 'right' : 'left',
        display: 'flex',
        flexDirection: isPremium ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {/* Premium-only ambient gold shimmer — sweeping diagonal across
          the cell bg. Sits behind everything; unclaimed only so a
          claimed cell isn't oversold. */}
      {isPremium && !claimed && !locked && (
        <div
          aria-hidden
          className="bp-premium-shimmer"
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />
      )}

      {locked && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            color: '#fbbf24',
            zIndex: 2,
          }}
        >
          <BLockGlyph size={11} />
        </div>
      )}

      {/* Reward art — fragment shard, frame swatch, name effect chip,
          or capstone crown depending on the reward type. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <RewardArt
          row={row}
          isPremium={isPremium}
          size={isCapstone ? 38 : isMajor ? 30 : 24}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        {/* Eyebrow line — premium gets gold, free gets ink-60. When
            claimed, free flips red, premium flips amber. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: isPremium ? 'flex-end' : 'flex-start',
            gap: 6,
          }}
        >
          <span
            className="spread"
            style={{
              fontSize: 7.5,
              color: eyebrowColor,
              letterSpacing: '0.22em',
            }}
          >
            {isPremium
              ? <><span className="bp-star-twinkle">★</span> Premium</>
              : TIER_RANK_LABEL[row.rank]}
          </span>
          {claimed && (
            <span className="spread" style={{ fontSize: 7.5, color: eyebrowColor, fontWeight: 700 }}>
              ✓ Claimed
            </span>
          )}
        </div>

        {/* Reward main line: italic display fragments + small unit */}
        <div
          className="font-display tabular"
          style={{
            fontSize: isCapstone ? 22 : isMajor ? 18 : 16,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            marginTop: 2,
            color: fragmentColor,
            textDecoration: claimed ? 'line-through' : 'none',
            textDecorationThickness: '1px',
            textDecorationColor: claimed
              ? (isPremium ? `${claimedPremText}99` : `${claimedFreeText}99`)
              : 'transparent',
          }}
        >
          +{row.fragments}
          <span
            className="font-body"
            style={{
              fontSize: 9,
              fontStyle: 'normal',
              fontWeight: 600,
              color: claimed ? eyebrowColor : 'var(--b-ink-60)',
              marginLeft: 4,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Frag
          </span>
        </div>

        {row.extra && (
          <div
            className="font-body"
            style={{
              fontSize: 10,
              color: claimed
                ? (isPremium ? claimedPremText : claimedFreeText)
                : 'var(--b-ink)',
              marginTop: 3,
              lineHeight: 1.35,
              fontStyle: 'italic',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              opacity: claimed ? 0.85 : 1,
            }}
          >
            {row.extra}
          </div>
        )}

        {ready && (
          <Button
            size="sm"
            className="w-full mt-2"
            loading={claiming}
            onClick={onClaim}
            variant={isPremium ? 'primary' : 'secondary'}
          >
            Claim
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Visual representation of a tier reward. Frame cosmetic → small
 * gradient ring matching the frame's colors. Name effect cosmetic →
 * a stamped name-effect chip. Pure fragments → shard SVG. Capstone
 * gets a crowned shard. Premium track tints toward gold.
 */
function RewardArt({
  row,
  isPremium,
  size,
}: {
  row: PassRow;
  isPremium: boolean;
  size: number;
}) {
  const isCapstone = row.rank === 'capstone';
  const cosmetic = row.cosmetic;

  // Frame cosmetic — slow-spinning conic swatch with capstone halo.
  if (cosmetic && cosmetic.startsWith('frame_')) {
    const frame = getFrame(cosmetic);
    const grad = frame.colors.length > 1
      ? `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`
      : frame.colors[0] || 'var(--b-ink)';
    return (
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        {isCapstone && (
          <div
            className="bp-capstone-halo"
            style={{
              position: 'absolute',
              inset: -size * 0.25,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${frame.colors[0]}55 0%, ${frame.colors[1] || frame.colors[0]}22 50%, transparent 78%)`,
              pointerEvents: 'none',
            }}
          />
        )}
        <div
          className="bp-swatch-spin"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: grad,
            padding: 3,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--b-paper)',
            }}
          />
        </div>
      </div>
    );
  }

  // Name effect cosmetic — chip with sweeping gradient on the "Aa".
  if (cosmetic && cosmetic.startsWith('name_')) {
    const eff = getNameEffect(cosmetic);
    const grad = eff.colors.length > 1
      ? `linear-gradient(110deg, ${eff.colors.join(', ')})`
      : eff.colors[0] || 'var(--b-ink)';
    return (
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: size,
          height: size,
          flexShrink: 0,
          border: '1px solid var(--b-ink)',
          background: 'var(--b-paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isCapstone && (
          <div
            className="bp-capstone-halo"
            style={{
              position: 'absolute',
              inset: -size * 0.3,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${eff.colors[0]}66 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        <span
          className="metallic-shine"
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: Math.round(size * 0.45),
            fontStyle: 'italic',
            fontWeight: 600,
            background: grad,
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
          }}
        >
          Aa
        </span>
      </div>
    );
  }

  // Pure fragment reward — shard SVG with periodic glint sweep.
  // Premium tints gold; capstone gets an accent halo behind it.
  const stroke = isPremium ? '#fbbf24' : isCapstone ? 'var(--b-accent)' : 'var(--b-ink)';
  const fill = isPremium
    ? 'color-mix(in srgb, #fbbf24 22%, transparent)'
    : isCapstone
      ? 'color-mix(in srgb, var(--b-accent) 18%, transparent)'
      : 'transparent';
  const haloColor = isPremium ? '#fbbf24' : 'var(--b-accent)';
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {isCapstone && (
        <div
          className="bp-capstone-halo"
          style={{
            position: 'absolute',
            inset: -size * 0.3,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${haloColor}55 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        style={{ position: 'relative', zIndex: 1, display: 'block' }}
      >
        <defs>
          <clipPath id={`shard-${row.tier}-${row.track}`}>
            <path d="M16 3 L24 10 L20 28 L12 28 L8 10 Z" />
          </clipPath>
        </defs>
        <path
          d="M16 3 L24 10 L20 28 L12 28 L8 10 Z"
          stroke={stroke}
          strokeWidth="1.4"
          fill={fill}
          strokeLinejoin="round"
        />
        <path
          d="M16 3 L16 28 M8 10 L24 10 M12 28 L24 10 M20 28 L8 10"
          stroke={stroke}
          strokeWidth="0.6"
          fill="none"
          opacity="0.55"
        />
      </svg>
      {/* Glint sweep — clipped to the shard outline so the highlight
          only flashes within the gem facets, not the cell padding. */}
      <div
        className="bp-fragment-glint"
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: 'polygon(50% 9%, 75% 31%, 62.5% 87%, 37.5% 87%, 25% 31%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
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
      className={ready ? 'bp-mission-ready' : ''}
      style={{
        position: 'relative',
        padding: '12px 14px',
        border: ready ? `1px solid ${accent.color}` : '1px solid var(--b-rule)',
        borderLeft: `3px solid ${claimed ? 'var(--b-ink-60)' : accent.color}`,
        background: claimed ? 'var(--b-paper-2, color-mix(in srgb, var(--b-ink) 6%, var(--b-paper)))' : 'transparent',
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
        <div style={{ height: 3, background: 'var(--b-rule)', position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(2, pct)}%`,
              background: claimed ? 'var(--b-ink-60)' : accent.color,
              transition: 'width 500ms',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {!claimed && (
              <div
                aria-hidden
                className="bp-bar-shine"
                style={{ position: 'absolute', inset: 0 }}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {claimed ? (
          <p
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center', padding: '4px 0' }}
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
