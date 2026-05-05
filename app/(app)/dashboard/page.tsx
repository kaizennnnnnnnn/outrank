'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { getLeague } from '@/constants/seasons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { UserHabit } from '@/types/habit';
import { RecapDraftPanel } from '@/components/recap/RecapDraftPanel';
import { StreakRepairBanner } from '@/components/habits/StreakRepairBanner';
import { PILLARS, isPillarSlug, type Pillar } from '@/constants/pillars';
import { Masthead } from '@/components/editorial/Masthead';
import {
  BCheckGlyph,
  BArrowRightGlyph,
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
  const friendCount = (user as unknown as { friendCount?: number }).friendCount ?? 0;

  const openLogModal = (habit: UserHabit) => {
    setSelectedHabit(habit);
    setLogModal(true);
  };

  // Click handler for a pillar row. Gym routes to /gym; water has its
  // own +0.25/+0.5/+1 quick-log surface but for the editorial dashboard
  // we just open the standard QuickLogModal (faithful to the design,
  // which shows uniform rows). Other pillars open the modal too.
  const handlePillarTap = (pillar: Pillar, habit: UserHabit | undefined) => {
    if (!habit) {
      router.push('/habits');
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
            Day{' '}
            <em
              className="font-display"
              style={{ fontStyle: 'italic', color: 'var(--b-accent)', fontWeight: 500 }}
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
                className="font-display tabular"
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
            <Stat value={league.name.toUpperCase()} label="league" small />
            <Stat value={String(friendCount)} label="friends" />
          </div>

          {/* Streak repair banner — preserved from old layout */}
          <div className="mt-4">
            <StreakRepairBanner />
          </div>

          {/* Diet quick-link — restyled as editorial row */}
          <Link
            href="/diet"
            className="block"
            style={{
              borderTop: '1px solid var(--b-rule)',
              borderBottom: '1px solid var(--b-rule)',
              padding: '12px 0',
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-accent)', width: 44 }}
            >
              NEW
            </span>
            <div style={{ flex: 1 }}>
              <div
                className="font-display"
                style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.1 }}
              >
                Track your diet
              </div>
              <div
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
              >
                Type what you ate · AI counts the calories.
              </div>
            </div>
            <BArrowRightGlyph size={18} style={{ color: 'var(--b-ink-60)' }} />
          </Link>

          {/* THE TOWN — discreet directory strip linking to /town */}
          <Link
            href="/town"
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
                marginBottom: 6,
              }}
            >
              <span className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                The Town
              </span>
              <span className="font-body" style={{ fontSize: 9, color: 'var(--b-ink-40)', letterSpacing: '0.08em' }}>
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
              {[
                { l: 'Market',    badge: '14' },
                { l: 'Quests',    badge: '02' },
                { l: 'Seasonal',  badge: '—', dim: true },
                { l: 'Travelers', badge: '⌛' },
                { l: 'Stable',    badge: '12' },
                { l: 'Inn',       badge: '·' },
                { l: 'Atelier',   badge: '◆', accent: true },
              ].map((c, i) => (
                <div
                  key={c.l}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px 0',
                    borderLeft: i ? '1px solid var(--b-rule)' : 'none',
                    opacity: c.dim ? 0.45 : 1,
                  }}
                >
                  <div
                    className="font-mono tabular"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: c.accent ? 'var(--b-accent)' : 'var(--b-ink)',
                      lineHeight: 1,
                    }}
                  >
                    {c.badge}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      marginTop: 4,
                      color: 'var(--b-ink-60)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
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
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 10, color: 'var(--b-ink-40)', width: 22 }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {Glyph && (
                        <Glyph size={18} style={{ color: 'var(--b-ink-60)', flexShrink: 0 }} />
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
                  return (
                    <li
                      key={habit.categorySlug}
                      onClick={() => openLogModal(habit)}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 10, color: 'var(--b-ink-40)', width: 22 }}
                      >
                        {String(i + 1).padStart(2, '0')}
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
}: {
  value:  string;
  label:  string;
  accent?: boolean;
  small?:  boolean;
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
        className="font-display tabular"
        style={{
          fontSize: small ? 16 : 26,
          fontWeight: 500,
          lineHeight: 1,
          color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
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
