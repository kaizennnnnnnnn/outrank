'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { SoulOrb } from '@/components/profile/SoulOrb';
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
import {
  BCheckGlyph,
  BArrowRightGlyph,
  BGymGlyph,
  BWaterGlyph,
  BSleepGlyph,
  BFocusGlyph,
  BStepsGlyph,
  BCaloriesGlyph,
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

  const [logModal, setLogModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);

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

          {/* Hero — Level / XP / SoulOrb */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px',
              gap: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--b-ink)',
              alignItems: 'start',
            }}
          >
            <div>
              <div
                className="spread"
                style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
              >
                Level
              </div>
              <div
                className="font-display tabular shine-light shine-alt-offset"
                style={{ fontSize: 64, fontWeight: 500, lineHeight: 0.95, marginTop: 2 }}
              >
                {level.level}
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  color: 'var(--b-ink-60)',
                  marginTop: -2,
                }}
              >
                {level.title}
              </div>
              <div
                style={{
                  marginTop: 14,
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
              <div
                className="tabular"
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: 'var(--b-ink-60)',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()} XP
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link href="/profile">
                <SoulOrb
                  intensity={Math.min(100, Math.round(
                    Math.min(user.totalXP / 500, 40) +
                    Math.min(habits.reduce((s, h) => s + h.currentStreak, 0) / 10, 30) +
                    Math.min(habits.reduce((s, h) => s + h.totalLogs, 0) / 20, 20) +
                    Math.min(level.level / 10, 10),
                  ))}
                  tier={MAX_ORB_TIER}
                  size={88}
                  hideLabel
                  baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
                  pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
                  ringColorId={(user as unknown as Record<string, string>).orbRingColor}
                />
              </Link>
            </div>
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

          {/* Diet quick-link — clickable editorial CTA card. Hairline
              perimeter + 3px accent left rule, italic display headline
              with metallic-shine, ink-filled OPEN pill on the right.
              Hover lifts the card and slides the arrow on the pill;
              tap pushes 1px right (.diet-card class in globals.css). */}
          <Link
            href="/diet"
            className="diet-card block"
            style={{
              position: 'relative',
              marginTop: 18,
              padding: '14px 14px 14px 14px',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-ink)',
              background: 'var(--b-paper)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textDecoration: 'none',
              color: 'var(--b-ink)',
              overflow: 'hidden',
            }}
          >
            {/* fork-flame mark */}
            <span
              aria-hidden
              style={{
                width: 38,
                height: 38,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--b-ink)',
                color: 'var(--b-accent)',
                flexShrink: 0,
              }}
            >
              <BCaloriesGlyph size={20} />
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="spread"
                style={{ fontSize: 8.5, color: 'var(--b-accent)', marginBottom: 2 }}
              >
                AI · New
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  fontStyle: 'italic',
                  lineHeight: 1.1,
                }}
              >
                <span className="metallic-shine">Track your diet.</span>
              </div>
              <div
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 3 }}
              >
                Type what you ate — we count the calories.
              </div>
            </div>

            {/* OPEN pill — explicit clickable affordance */}
            <span
              className="diet-card-pill font-body tabular"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px 7px 12px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Open
              <BArrowRightGlyph size={11} />
            </span>
          </Link>

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

          {/* Today's habits — five pillar rows, numbered */}
          <section style={{ marginTop: 22 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: '1px solid var(--b-ink)',
                paddingBottom: 6,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
              >
                Today&rsquo;s habits
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span
                  className="font-body tabular"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
                >
                  {String(pillarsLoggedToday).padStart(2, '0')} / {String(PILLARS.length).padStart(2, '0')}
                </span>
                <Link
                  href="/habits"
                  className="font-body"
                  style={{
                    fontSize: 10,
                    color: 'var(--b-accent)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Roster →
                </Link>
              </div>
            </div>

            {habitsLoading ? (
              <div className="space-y-3 mt-3">
                {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {PILLARS.map((pillar: Pillar, i: number) => {
                  const habit = pillarHabitsBySlug.get(pillar.slug);
                  const done  = !!habit && isLoggedToday(habit);
                  const Glyph = PILLAR_GLYPH[pillar.slug];
                  const goalText = habit
                    ? (() => {
                        // Lightweight goal display. UserHabit doesn't track today's
                        // partial progress on the doc itself (lives in /logs), so
                        // surface daily goal + status only.
                        const g = habit.goal ?? 0;
                        const u = habit.unit || '';
                        if (done) return 'logged';
                        if (g) return `0 / ${g}${u ? ' ' + u : ''}`;
                        return 'log →';
                      })()
                    : 'tap to add';
                  return (
                    <li
                      key={pillar.slug}
                      onClick={() => handlePillarTap(pillar, habit)}
                      aria-disabled={done}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        cursor: done ? 'default' : 'pointer',
                        pointerEvents: done ? 'none' : 'auto',
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 10, color: 'var(--b-ink-40)', width: 22 }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {Glyph && (
                        <Glyph size={18} style={{ color: done ? 'var(--b-ink-40)' : 'var(--b-ink-60)', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 17,
                            fontWeight: 500,
                            color: done ? 'var(--b-ink-40)' : 'var(--b-ink)',
                            textDecoration: done ? 'line-through' : 'none',
                          }}
                        >
                          {pillar.name}
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
                          {pillar.name.toUpperCase()}
                          <span className="tabular"> · {goalText}</span>
                        </div>
                      </div>
                      {done ? (
                        <BCheckGlyph size={14} style={{ color: 'var(--b-accent)' }} />
                      ) : habit ? (
                        <span
                          className="font-body"
                          style={{ fontSize: 10, color: 'var(--b-ink)', fontWeight: 600 }}
                        >
                          LOG →
                        </span>
                      ) : (
                        <span
                          className="font-body"
                          style={{ fontSize: 10, color: 'var(--b-ink-60)', fontWeight: 600 }}
                        >
                          ADD →
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

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
