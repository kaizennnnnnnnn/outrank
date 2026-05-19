'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { OrbVoicePanel } from '@/components/profile/OrbVoicePanel';
import { OrbLootReveal } from '@/components/profile/OrbLootReveal';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { getLeague } from '@/constants/seasons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { UserHabit } from '@/types/habit';
import { RecapDraftPanel } from '@/components/recap/RecapDraftPanel';
import { StreakRepairBanner } from '@/components/habits/StreakRepairBanner';
import { FriendPresenceRail } from '@/components/social/FriendPresenceRail';
import { PILLARS, isPillarSlug, type Pillar } from '@/constants/pillars';
import { Masthead } from '@/components/editorial/Masthead';
import { getCategoryIconComponent } from '@/components/ui/CategoryIcons';
import { resolveSlug } from '@/constants/categories';
import { rollOrbLoot, type OrbLoot } from '@/lib/orbLoot';
import { useUIStore } from '@/store/uiStore';
import {
  BCheckGlyph,
  BGymGlyph,
  BWaterGlyph,
  BSleepGlyph,
  BFocusGlyph,
  BStepsGlyph,
} from '@/components/editorial/BGlyphs';

/**
 * Dashboard — editorial Direction B v2 conversion.
 *
 * The "Front Page" of Outrank: a magazine-style cover for today.
 * Headline counts the user's longest current streak ("Day forty-
 * seven."), subtitle reports how many of the 5 pillars are logged.
 * Hero pairs Level + XP progress with the SoulOrb canvas (pinned to
 * MAX_ORB_TIER per the orb-mechanic rework). 3-stat strip below.
 *
 * The 5 pillars are the focus — they show as numbered editorial rows.
 * Personal habits get a smaller section underneath when present.
 * StreakRepairBanner + RecapDraftPanel + QuickLogModal preserved
 * as-is so all signup-to-log flows still work end-to-end.
 */

const PILLAR_GLYPH: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  gym:        BGymGlyph,
  water:      BWaterGlyph,
  sleep:      BSleepGlyph,
  'no-social': BFocusGlyph,
  steps:      BStepsGlyph,
};

// Word-form day count, 1-99. Falls through to numeric for higher.
function dayWord(n: number): string {
  if (n <= 0) return 'one';
  const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? tens[t] : `${tens[t]}-${ones[o]}`;
  }
  return String(n);
}

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  // Live friend count from the friendships subscription, not the
  // denormalized user.friendCount field — that counter drifts when
  // unfriend writes fail or pre-Cloud-Function legacy data sticks
  // around. friends.length is the source of truth.
  const { friends } = useFriends();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const [logModal, setLogModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);

  // Orb command state — folded in from the deleted /orb page. Local
  // copies sync from the useAuth snapshot so the optimistic write +
  // server confirm don't double-apply (per CLAUDE.md gotcha).
  const userAny = user as unknown as Record<string, number> | null;
  const realTier = userAny?.orbTier || 1;
  const evolveCharges = userAny?.orbEvolutionCharges || 0;
  const storedAwakening = Math.min(100, userAny?.awakening || 0);

  const [localTier, setLocalTier] = useState(realTier);
  const [localCharges, setLocalCharges] = useState(evolveCharges);
  const [localAwakening, setLocalAwakening] = useState(storedAwakening);
  const [lootReveal, setLootReveal] = useState<OrbLoot | null>(null);

  // SoulOrb hands us its evolve/ascend/full-awaken triggers via these
  // refs so the external action row can fire each animation. Without
  // them, clicking a button skips straight to the Firestore write
  // with no animation.
  const evolveTriggerRef     = useRef<(() => void) | null>(null);
  const ascendTriggerRef     = useRef<(() => void) | null>(null);
  const fullAwakenTriggerRef = useRef<(() => void) | null>(null);
  // Shared with OrbVoicePanel — voice writes ~60Hz amplitude, the
  // SoulOrb canvas reads each render frame and pulses in sync.
  const audioLevelRef = useRef(0);
  const voiceActiveRef = useRef(false);

  useEffect(() => { setLocalTier(realTier); }, [realTier]);
  useEffect(() => { setLocalCharges(evolveCharges); }, [evolveCharges]);
  useEffect(() => { setLocalAwakening(storedAwakening); }, [storedAwakening]);

  // Safety net: if Firebase user exists but no Firestore profile after 3s,
  // the user likely signed in before profile creation was fixed — redirect to onboarding
  useEffect(() => {
    if (firebaseUser && !user) {
      const timeout = setTimeout(() => {
        router.push('/onboarding');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [firebaseUser, user, router]);

  if (!user) {
    return (
      <div className="dir-b max-w-2xl mx-auto space-y-6 px-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const level = getLevelForXP(user.totalXP);
  const xpProgress = getXPProgress(user.totalXP);
  const league = getLeague(user.weeklyXP || 0);

  // Orb action handlers — folded in from /orb. SoulOrb's evolve
  // animation runs 2.5s end-to-end; the loot modal lands ~3s after
  // the spin starts so it follows the post-explosion beat.
  const handleEvolve = async () => {
    if (localCharges <= 0) return;
    const ownedCosmetics = (userAny as unknown as { ownedCosmetics?: string[] } | null)?.ownedCosmetics ?? [];
    const loot = rollOrbLoot(ownedCosmetics);
    const startedAt = Date.now();
    const POST_WRITE_DELAY_MS = 850;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      const updates: Record<string, unknown> = {
        orbEvolutionCharges: increment(-1),
      };
      if (localTier < 10) updates.orbTier = localTier + 1;
      if (loot.fragments) updates.fragments = increment(loot.fragments);
      if (loot.xp) {
        updates.totalXP      = increment(loot.xp);
        updates.weeklyXP     = increment(loot.xp);
        updates.monthlyXP    = increment(loot.xp);
        updates.seasonPassXP = increment(loot.xp);
      }
      if (loot.awakening) {
        const next = Math.min(100, localAwakening + loot.awakening);
        updates.awakening = next;
      }
      if (loot.cosmeticId) {
        updates.ownedCosmetics = arrayUnion(loot.cosmeticId);
      }
      await updateDocument('users', user.uid, updates);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, POST_WRITE_DELAY_MS - elapsed);
      window.setTimeout(() => setLootReveal(loot), remaining);
    } catch {
      addToast({ type: 'error', message: 'Evolution failed — try again' });
    }
  };

  // Ascend only at MAX tier. Resets orbTier to 1, grants ascension
  // cosmetics on first ascension, pays out increasing fragments per
  // cycle (500 / 750 / 1000 / …).
  const handleAscend = async () => {
    if (localTier < MAX_ORB_TIER) return;
    const ascensions = ((user as unknown as { orbAscensions?: number }).orbAscensions ?? 0) + 1;
    const fragmentReward = 500 + (ascensions - 1) * 250;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(fragmentReward),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
      addToast({
        type: 'success',
        message: ascensions === 1
          ? `First ascension. +${fragmentReward} fragments + Ascension wreath unlocked.`
          : `Ascension ${ascensions}. +${fragmentReward} fragments. The cycle begins again.`,
      });
    } catch {
      addToast({ type: 'error', message: 'Ascension failed' });
    }
  };

  const handleFullAwaken = async () => {
    if (localAwakening < 100) return;
    const userRaw = user as unknown as Record<string, number>;
    const firstTime = (userRaw.fullAwakenings || 0) === 0;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        awakening: 0,
        fullAwakenings: increment(1),
        awakeningBonus: increment(0.05),
        fragments: increment(2000),
        totalXP: increment(1000),
        weeklyXP: increment(1000),
        monthlyXP: increment(1000),
        seasonPassXP: increment(1000),
        orbEvolutionCharges: increment(2),
        ...(firstTime
          ? {
              ownedCosmetics: arrayUnion('frame_awakened', 'name_awakened'),
              equippedFrame: 'frame_awakened',
              equippedNameEffect: 'name_awakened',
            }
          : {}),
      });
    } catch { /* silent */ }
  };

  // Split user's habits into the 5 pillars vs personal/custom.
  const pillarHabitsBySlug = new Map<string, UserHabit>();
  const personalHabits: UserHabit[] = [];
  for (const h of habits) {
    if (isPillarSlug(h.categorySlug)) pillarHabitsBySlug.set(h.categorySlug, h);
    else personalHabits.push(h);
  }
  const todayStr = new Date().toDateString();
  const isLoggedToday = (h: UserHabit) =>
    h.lastLogDate?.toDate?.()?.toDateString?.() === todayStr;

  const pillarsLoggedToday = PILLARS.reduce((acc: number, p: Pillar) => {
    const h = pillarHabitsBySlug.get(p.slug);
    return acc + (h && isLoggedToday(h) ? 1 : 0);
  }, 0);

  // Day count = the longest current streak across the user's habits.
  // Reads as "your unbroken streak" rather than calendar days since signup.
  const longestCurrentStreak = habits.reduce((m, h) => Math.max(m, h.currentStreak || 0), 0);
  const dayN = Math.max(1, longestCurrentStreak);
  const friendCount = friends.length;

  const openLogModal = (habit: UserHabit) => {
    setSelectedHabit(habit);
    setLogModal(true);
  };

  // Click handler for a pillar row. Gym routes to /gym; water has its
  // own +0.25/+0.5/+1 quick-log surface but for the editorial dashboard
  // we just open the standard QuickLogModal (faithful to the design,
  // which shows uniform rows). Other pillars open the modal too.
  //
  // Already-logged habits are no-ops — the row visibly strikes through,
  // and a second tap shouldn't quietly produce a second log.
  const handlePillarTap = (pillar: Pillar, habit: UserHabit | undefined) => {
    if (!habit) {
      router.push('/habits');
      return;
    }
    if (habit && isLoggedToday(habit)) {
      return;
    }
    if (pillar.slug === 'gym') {
      router.push('/gym');
      return;
    }
    openLogModal(habit);
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead />

        <div style={{ padding: '0 22px' }}>
          {/* Eyebrow + headline */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            The Front Page
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 38,
              fontWeight: 500,
              lineHeight: 1,
              margin: '4px 0 12px',
              color: 'var(--b-ink)',
            }}
          >
            <span className="shine-light">Day</span>{' '}
            <em
              className="font-display metallic-shine"
              style={{ fontStyle: 'italic', fontWeight: 500 }}
            >
              {dayWord(dayN)}
            </em>
            .
          </h1>
          <p
            className="font-body"
            style={{
              fontSize: 13,
              color: 'var(--b-ink-60)',
              lineHeight: 1.5,
              margin: '0 0 14px',
            }}
          >
            {pillarsLoggedToday} of {PILLARS.length} logged.
            {pillarsLoggedToday < PILLARS.length
              ? ' Keep moving — clear the day before midnight.'
              : ' Day complete.'}
          </p>

          {/* Orb hero — folded in from the deleted /orb page. The big
              interactive canvas is now the dashboard's centerpiece;
              evolve/ascend/awaken actions sit directly below it, then
              the TALK + CHAT voice panel. Field-guide details (tier
              card, specs, ascension narrative, nickname, history) live
              on /profile so the home page stays focused on action. */}
          <div
            style={{
              paddingTop: 14,
              borderTop: '1px solid var(--b-ink)',
              textAlign: 'center',
            }}
          >
            {/* Constellation — orb at center, 5 pillar habits orbiting
                around it at 72° intervals. Each satellite is a 40px
                button: pillar icon when pending, accent fill + check
                when logged today. The orbital layout puts the day's
                action surface front-and-center instead of buried
                in a list below. */}
            <div
              style={{
                position: 'relative',
                width: 270,
                height: 270,
                margin: '14px auto 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <SoulOrb
                  intensity={localAwakening}
                  tier={MAX_ORB_TIER}
                  size={160}
                  onEvolve={localCharges > 0 ? handleEvolve : undefined}
                  onAscend={localTier >= MAX_ORB_TIER ? handleAscend : undefined}
                  onFullAwaken={localAwakening >= 100 ? handleFullAwaken : undefined}
                  baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
                  pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
                  ringColorId={(user as unknown as Record<string, string>).orbRingColor}
                  suppressInternalActions
                  registerEvolveTrigger={(t) => { evolveTriggerRef.current = t; }}
                  registerAscendTrigger={(t) => { ascendTriggerRef.current = t; }}
                  registerFullAwakenTrigger={(t) => { fullAwakenTriggerRef.current = t; }}
                  audioLevelRef={audioLevelRef}
                  voiceActiveRef={voiceActiveRef}
                />
              </div>

              {PILLARS.map((pillar: Pillar, i: number) => {
                // -90° offset puts pillar 0 (gym) at the top; subsequent
                // pillars space 72° clockwise.
                const angle = (-90 + 72 * i) * Math.PI / 180;
                const r = 110;
                const dx = Math.round(r * Math.cos(angle));
                const dy = Math.round(r * Math.sin(angle));
                const habit = pillarHabitsBySlug.get(pillar.slug);
                const done  = !!habit && isLoggedToday(habit);
                const Glyph = PILLAR_GLYPH[pillar.slug];
                const hasHabit = !!habit;
                return (
                  <button
                    key={pillar.slug}
                    type="button"
                    onClick={() => { if (!done) handlePillarTap(pillar, habit); }}
                    aria-label={`${pillar.name}${done ? ' — logged' : hasHabit ? ' — log' : ' — add'}`}
                    title={pillar.name}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${dx}px)`,
                      top:  `calc(50% + ${dy}px)`,
                      transform: 'translate(-50%, -50%)',
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      border: `1px ${hasHabit ? 'solid' : 'dashed'} ${done ? 'var(--b-accent)' : hasHabit ? 'var(--b-ink)' : 'var(--b-ink-40)'}`,
                      background: done ? 'var(--b-accent)' : 'var(--b-paper)',
                      color: done ? '#ffffff' : hasHabit ? 'var(--b-ink)' : 'var(--b-ink-40)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: done ? 'default' : 'pointer',
                      padding: 0,
                      transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease',
                      // Lift the node above the orb's glow so the
                      // satellite reads as foreground.
                      zIndex: 2,
                    }}
                  >
                    {done ? (
                      <BCheckGlyph size={18} />
                    ) : Glyph ? (
                      <Glyph size={18} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {(() => {
              const fullAwakenable = localAwakening >= 100;
              const ascendable     = localTier >= MAX_ORB_TIER && !fullAwakenable;
              const showThird      = fullAwakenable || ascendable;
              const ascensions     = (user as unknown as { orbAscensions?: number }).orbAscensions ?? 0;
              const nextAscendReward = 500 + ascensions * 250;
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showThird ? '1fr 1fr 1fr' : '1fr 1fr',
                    gap: 8,
                    textAlign: 'left',
                  }}
                >
                  <button
                    onClick={() => {
                      if (localCharges <= 0) return;
                      if (evolveTriggerRef.current) {
                        evolveTriggerRef.current();
                      } else {
                        void handleEvolve();
                      }
                    }}
                    disabled={localCharges <= 0}
                    className="font-body"
                    style={{
                      height: 48,
                      border: '1px solid var(--b-ink)',
                      background: localCharges > 0 ? 'var(--b-ink)' : 'var(--b-paper-2)',
                      color: localCharges > 0 ? 'var(--b-paper)' : 'var(--b-ink-40)',
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      cursor: localCharges > 0 ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    EVOLVE — {localCharges} ▶
                  </button>
                  <Link
                    href="/shop"
                    className="font-body"
                    style={{
                      height: 48,
                      border: '1px solid var(--b-ink)',
                      background: 'transparent',
                      color: 'var(--b-ink)',
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    CUSTOMIZE
                  </Link>
                  {fullAwakenable && (
                    <button
                      onClick={() => {
                        if (fullAwakenTriggerRef.current) {
                          fullAwakenTriggerRef.current();
                        } else {
                          void handleFullAwaken();
                        }
                      }}
                      className="font-body"
                      style={{
                        height: 48,
                        border: '1px solid var(--b-accent)',
                        background: 'var(--b-accent)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                      }}
                      aria-label="Full Awaken — permanent XP bonus"
                    >
                      FULL AWAKEN ✦
                    </button>
                  )}
                  {ascendable && (
                    <button
                      onClick={() => {
                        if (ascendTriggerRef.current) {
                          ascendTriggerRef.current();
                        } else {
                          void handleAscend();
                        }
                      }}
                      className="font-body"
                      style={{
                        height: 48,
                        border: '1px solid var(--b-accent)',
                        background: 'transparent',
                        color: 'var(--b-accent)',
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                      }}
                      aria-label={`Ascend for +${nextAscendReward} fragments`}
                    >
                      ASCEND ◆
                    </button>
                  )}
                </div>
              );
            })()}

            <OrbVoicePanel audioLevelRef={audioLevelRef} voiceActiveRef={voiceActiveRef} />

            <p
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                textAlign: 'center',
                marginTop: 10,
                lineHeight: 1.6,
              }}
            >
              {localCharges === 0 && localAwakening < 100 ? (
                <>Log <b style={{ color: 'var(--b-accent)' }}>every pillar today</b> to earn an evolution charge.</>
              ) : localAwakening >= 100 ? (
                <>
                  <b style={{ color: 'var(--b-accent)' }}>100% awakening reached.</b>{' '}
                  Tap the orb to fully awaken — permanent XP bonus + exclusive frame.
                </>
              ) : (
                <>Each evolution rolls a drop. Higher rarities are rare; the math is on your side over time.</>
              )}
            </p>
          </div>

          {/* Level + XP strip — full-width slim row below the orb hero. */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--b-rule)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                className="font-display tabular shine-light shine-alt-offset"
                style={{ fontSize: 38, fontWeight: 500, lineHeight: 0.95 }}
              >
                {level.level}
              </span>
              <span
                className="font-display"
                style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--b-ink-60)' }}
              >
                {level.title}
              </span>
            </div>
            <span
              className="tabular"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()} XP
            </span>
          </div>
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
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.round((xpProgress.current / xpProgress.needed) * 100)}%`,
                background: 'var(--b-ink)',
              }}
            />
          </div>

          {/* 3-stat strip */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--b-rule)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <Stat value={String(longestCurrentStreak)} label="streak" accent />
            <Stat value={league.name.toUpperCase()} label="league" small toneColor={league.color} />
            <Stat value={String(friendCount)} label="friends" />
          </div>

          {/* Friend presence rail — pulls top accepted friends from
              useFriends, sorts by weekly XP desc, renders top 5 with
              live duel chip. Sits here as the transition from the
              user's own stats above to their action surface below. */}
          <FriendPresenceRail
            viewerId={user.uid}
            viewerWeeklyXP={user.weeklyXP || 0}
            viewerDuelRecord={user.duelRecord}
          />

          {/* Streak repair banner — preserved from old layout */}
          <div className="mt-4">
            <StreakRepairBanner />
          </div>

          {/* THE TOWN — directory strip linking to /town. Animated
              red headline + per-cell hover lift + bespoke ink badges
              instead of the old hourglass emoji. */}
          <Link
            href="/town"
            className="town-strip"
            style={{
              display: 'block',
              marginTop: 18,
              padding: '8px 0',
              borderBottom: '1px solid var(--b-rule)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: '1px solid var(--b-rule)',
                paddingBottom: 4,
                marginBottom: 8,
              }}
            >
              <span
                className="font-display metallic-shine"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}
              >
                The Town
              </span>
              <span
                className="font-body metallic-shine"
                style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}
              >
                VISIT →
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0,
                fontFamily: 'var(--font-inter)',
              }}
            >
              {([
                { l: 'Market',    kind: 'text' as const, badge: '14', tone: '#dc2626' },
                { l: 'Quests',    kind: 'text' as const, badge: '02', tone: '#f97316' },
                { l: 'Seasonal',  kind: 'text' as const, badge: '—',  tone: 'var(--b-ink-40)', dim: true },
                { l: 'Travelers', kind: 'svg'  as const, tone: '#a855f7' },
                { l: 'Stable',    kind: 'text' as const, badge: '12', tone: '#3b82f6' },
                { l: 'Inn',       kind: 'text' as const, badge: '·',  tone: '#22c55e' },
                { l: 'Atelier',   kind: 'text' as const, badge: '◆',  tone: '#ec4899' },
              ]).map((c, i) => (
                <div
                  key={c.l}
                  className="town-cell"
                  style={{
                    ['--cell-tone' as string]: c.tone,
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 0',
                    borderLeft: i ? '1px solid var(--b-rule)' : 'none',
                    opacity: c.dim ? 0.5 : 1,
                    position: 'relative',
                  }}
                >
                  <div
                    className="font-display tabular"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: c.tone,
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 16,
                    }}
                  >
                    {c.kind === 'svg' ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2h12" />
                        <path d="M6 22h12" />
                        <path d="M6 2v4l6 6 6-6V2" fill="currentColor" fillOpacity="0.18" />
                        <path d="M6 22v-4l6-6 6 6v4" fill="currentColor" fillOpacity="0.18" />
                      </svg>
                    ) : (
                      c.badge
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      marginTop: 5,
                      color: 'var(--b-ink-60)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 600,
                    }}
                  >
                    {c.l}
                  </div>
                </div>
              ))}
            </div>
          </Link>

          {/* Personal habits — only when present */}
          {!habitsLoading && personalHabits.length > 0 && (
            <section style={{ marginTop: 22 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: '1px solid var(--b-rule)',
                  paddingBottom: 4,
                }}
              >
                <span
                  className="font-display"
                  style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}
                >
                  Personal
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    color: 'var(--b-ink-40)',
                    letterSpacing: '0.04em',
                  }}
                >
                  PRIVATE — NOT IN RECAP
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {personalHabits.map((habit, i) => {
                  const done = isLoggedToday(habit);
                  const slug = resolveSlug(habit.categorySlug, habit.categoryName) || 'generic';
                  const HabitGlyph = getCategoryIconComponent(slug);
                  return (
                    <li
                      key={habit.categorySlug}
                      onClick={() => { if (!done) openLogModal(habit); }}
                      aria-disabled={done}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        cursor: done ? 'default' : 'pointer',
                        pointerEvents: done ? 'none' : 'auto',
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 10, color: 'var(--b-ink-40)', width: 22, alignSelf: 'flex-start', paddingTop: 2 }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          color: habit.color || 'var(--b-ink-60)',
                          flexShrink: 0,
                          display: 'inline-flex',
                          opacity: done ? 0.4 : 1,
                        }}
                      >
                        <HabitGlyph size={20} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: done ? 'var(--b-ink-40)' : 'var(--b-ink)',
                            textDecoration: done ? 'line-through' : 'none',
                          }}
                        >
                          {habit.categoryName || habit.categorySlug}
                        </div>
                        <div
                          className="font-body"
                          style={{
                            fontSize: 10,
                            color: 'var(--b-ink-60)',
                            marginTop: 1,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {habit.currentStreak > 0 ? `${habit.currentStreak}-DAY STREAK` : 'NEW'}
                        </div>
                      </div>
                      {done ? (
                        <BCheckGlyph size={14} style={{ color: 'var(--b-accent)' }} />
                      ) : (
                        <span
                          className="font-body"
                          style={{ fontSize: 10, color: 'var(--b-ink)', fontWeight: 600 }}
                        >
                          LOG →
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Today's record — recap publish CTA, preserved */}
          <div style={{ marginTop: 22 }}>
            <RecapDraftPanel />
          </div>
        </div>
      </div>

      <QuickLogModal
        isOpen={logModal}
        onClose={() => setLogModal(false)}
        habit={selectedHabit}
        userId={user.uid}
      />

      {/* Evolution loot — fires after a successful evolve, ~3s after
          the spin starts so it follows the explosion beat. */}
      <OrbLootReveal loot={lootReveal} onClose={() => setLootReveal(null)} />
    </div>
  );
}

// ─── Stat cell ──────────────────────────────────────────────────────

function Stat({
  value,
  label,
  accent,
  small,
  toneColor,
}: {
  value:  string;
  label:  string;
  accent?: boolean;
  small?:  boolean;
  /** When supplied, the value renders as a slow shine sweep that
      uses this tone — used for the league name so it picks up the
      bronze / silver / gold / etc colour of the current league. */
  toneColor?: string;
}) {
  return (
    <div
      style={{
        padding: '12px 8px',
        borderLeft: '1px solid var(--b-rule)',
        textAlign: 'center',
      }}
    >
      <div
        className={toneColor ? 'font-display tabular tone-shine' : 'font-display tabular'}
        style={{
          fontSize: small ? 16 : 26,
          fontWeight: 500,
          lineHeight: 1,
          color: toneColor ? undefined : (accent ? 'var(--b-accent)' : 'var(--b-ink)'),
          ...(toneColor
            ? ({ ['--tone' as string]: toneColor } as React.CSSProperties)
            : {}),
        }}
      >
        {value}
      </div>
      <div
        className="font-body"
        style={{
          fontSize: 9,
          color: 'var(--b-ink-60)',
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
    </div>
  );
}
