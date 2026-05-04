'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useDocument } from '@/hooks/useFirestore';
import { getCategoryBySlug } from '@/constants/categories';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { HabitLogHistory } from '@/components/habits/HabitLogHistory';
import { HabitProgressGraph } from '@/components/habits/HabitProgressGraph';
import { LeaderboardRow } from '@/components/competition/LeaderboardRow';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { PillarTip } from '@/components/habits/PillarTip';
import { PillarReminderSettings } from '@/components/habits/PillarReminderSettings';
import { PillarStatsCard } from '@/components/habits/PillarStatsCard';
import { GymPRsBlock } from '@/components/habits/GymPRsBlock';
import { isPillarSlug } from '@/constants/pillars';
import { UserHabit } from '@/types/habit';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { LEAGUES, getLeague, getNextLeague } from '@/constants/seasons';
import { Masthead } from '@/components/editorial/Masthead';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'alltime', label: 'All Time' },
];

export default function HabitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const category = getCategoryBySlug(slug);
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const { entries, loading: lbLoading } = useLeaderboard(slug, period);
  const addToast = useUIStore((s) => s.addToast);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const { data: habit, loading: habitLoading } = useDocument<UserHabit>(
    `habits/${user?.uid}/userHabits`,
    user ? slug : null
  );

  useEffect(() => {
    if (habit) setGoalDraft(String(habit.goal));
  }, [habit]);

  const saveGoal = async () => {
    if (!user || !habit) return;
    const newGoal = parseInt(goalDraft, 10);
    if (!Number.isFinite(newGoal) || newGoal <= 0 || newGoal > 100000) {
      addToast({ type: 'error', message: 'Enter a goal between 1 and 100000' });
      return;
    }
    setSavingGoal(true);
    try {
      await updateDocument(`habits/${user.uid}/userHabits`, slug, { goal: newGoal });
      addToast({ type: 'success', message: 'Goal updated!' });
      setEditingGoal(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to update goal' });
    } finally {
      setSavingGoal(false);
    }
  };

  if (!category) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500 }}
          >
            Category not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section={category.section || 'Habit'} />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            {category.section}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CategoryIcon icon={category.icon} color={category.color} size="lg" slug={category.slug} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                className="font-display"
                style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '2px 0' }}
              >
                <em style={{ fontStyle: 'italic' }}>{category.name}</em>
              </h1>
              <div
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
              >
                Measured in {category.unit}
              </div>
            </div>
            {habit && habit.currentStreak > 0 && (
              <StreakFlame streak={habit.currentStreak} size="lg" />
            )}
          </div>

          {/* Pillar daily tip */}
          <div style={{ marginTop: 14 }}>
            <PillarTip slug={category.slug} color={category.color} />
          </div>

          {/* Pillar reminder settings */}
          {(category.slug === 'water' || category.slug === 'sleep') && (
            <div style={{ marginTop: 14 }}>
              <PillarReminderSettings pillar={category.slug} color={category.color} />
            </div>
          )}

          {/* Pillar stats */}
          {habit && isPillarSlug(category.slug) && (
            <div style={{ marginTop: 14 }}>
              <PillarStatsCard habit={habit} />
            </div>
          )}

          {/* Gym PRs */}
          {category.slug === 'gym' && (
            <div style={{ marginTop: 14 }}>
              <GymPRsBlock />
            </div>
          )}

          {/* Stats */}
          {habitLoading ? (
            <div style={{ marginTop: 18 }}>
              <Skeleton className="h-20" />
            </div>
          ) : habit ? (
            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                borderTop: '1px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-rule)',
              }}
            >
              <StatCell label="Streak" value={`${habit.currentStreak}d`} accent="#f97316" />
              <StatCell label="Best" value={`${habit.longestStreak}d`} accent="#fbbf24" border />
              <StatCell label="Total Logs" value={habit.totalLogs.toString()} accent="#ef4444" border />
              <div
                style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--b-rule)',
                  background: editingGoal ? 'rgba(249,115,22,0.06)' : 'transparent',
                }}
              >
                {editingGoal ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, paddingTop: 4 }}>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={goalDraft}
                        onChange={(e) => setGoalDraft(e.target.value)}
                        className="font-display tabular"
                        style={{
                          width: 60,
                          background: 'transparent',
                          border: '1px solid var(--b-accent)',
                          padding: '2px 4px',
                          textAlign: 'center',
                          fontSize: 16,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          color: 'var(--b-ink)',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <span
                        className="font-body"
                        style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                      >
                        {habit.unit}
                      </span>
                    </div>
                    <div
                      className="spread"
                      style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
                    >
                      Daily Goal
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                      <button
                        onClick={saveGoal}
                        disabled={savingGoal}
                        className="font-body"
                        style={{
                          padding: '2px 8px',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          background: 'var(--b-accent)',
                          color: '#fff',
                          border: 'none',
                          cursor: savingGoal ? 'wait' : 'pointer',
                        }}
                      >
                        {savingGoal ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingGoal(false); setGoalDraft(String(habit.goal)); }}
                        className="font-body"
                        style={{
                          padding: '2px 8px',
                          fontSize: 9,
                          fontWeight: 600,
                          background: 'transparent',
                          color: 'var(--b-ink-60)',
                          border: '1px solid var(--b-rule)',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="font-display tabular"
                      style={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: 'var(--b-accent)' }}
                    >
                      {habit.goal}
                      <span
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', fontWeight: 400, marginLeft: 2 }}
                      >
                        {habit.unit}
                      </span>
                    </div>
                    <div
                      className="spread"
                      style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
                    >
                      Daily Goal
                    </div>
                    <button
                      onClick={() => setEditingGoal(true)}
                      className="font-body"
                      style={{
                        marginTop: 4,
                        padding: '2px 6px',
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background: 'transparent',
                        color: 'var(--b-accent)',
                        border: '1px solid var(--b-accent)',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                padding: '24px',
                border: '1px dashed var(--b-rule)',
                textAlign: 'center',
              }}
            >
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', fontStyle: 'italic' }}
              >
                You haven&rsquo;t added this habit yet.
              </p>
            </div>
          )}

          {/* Progress vs Goal */}
          {user && habit && (
            <Section title="Progress vs Goal" eyebrow="Trend">
              <HabitProgressGraph
                userId={user.uid}
                habitId={slug}
                goal={habit.goal}
                unit={habit.unit}
                color={category.color}
              />
            </Section>
          )}

          {/* League info */}
          {user && (
            <LeagueInfoCard
              weeklyXP={user.weeklyXP || 0}
              categoryColor={category.color}
              categoryName={category.name}
            />
          )}

          {/* Leaderboard */}
          <Section title="Leaderboard" eyebrow="Standings">
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {periods.map((p) => {
                const active = period === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className="font-body"
                    style={{
                      padding: '5px 10px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      background: active ? 'var(--b-ink)' : 'transparent',
                      color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                      border: '1px solid var(--b-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div>
              {lbLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : entries.length === 0 ? (
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink-40)', padding: '24px 0', textAlign: 'center', fontStyle: 'italic' }}
                >
                  No entries yet.
                </p>
              ) : (
                entries.slice(0, 20).map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId}
                    rank={i + 1}
                    username={entry.username}
                    avatarUrl={entry.avatarUrl}
                    score={entry.score}
                    delta={entry.delta}
                    isCurrentUser={entry.userId === user?.uid}
                    index={i}
                  />
                ))
              )}
            </div>
          </Section>

          {/* Recent logs */}
          {user && habit && (
            <Section title="Recent Logs" eyebrow="History">
              <HabitLogHistory userId={user.uid} habitId={slug} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
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
        <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
          {title}
        </div>
        {eyebrow && (
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            {eyebrow}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function StatCell({ label, value, accent, border }: { label: string; value: string; accent: string; border?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 0',
        textAlign: 'center',
        borderLeft: border ? '1px solid var(--b-rule)' : 'none',
      }}
    >
      <div
        className="font-display tabular"
        style={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: accent }}
      >
        {value}
      </div>
      <div
        className="spread"
        style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}

function LeagueInfoCard({ weeklyXP, categoryColor, categoryName }: {
  weeklyXP: number;
  categoryColor: string;
  categoryName: string;
}) {
  const current = getLeague(weeklyXP);
  const next = getNextLeague(weeklyXP);
  const currentIdx = LEAGUES.findIndex((l) => l.id === current.id);
  const toNext = next ? Math.max(0, next.minWeeklyXP - weeklyXP) : 0;
  const segmentSpan = next ? (next.minWeeklyXP - current.minWeeklyXP) : 1;
  const segmentProgress = next ? ((weeklyXP - current.minWeeklyXP) / segmentSpan) * 100 : 100;

  const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: `2px solid ${current.color}`,
          borderBottom: '1px solid var(--b-rule)',
          paddingBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="spread"
              style={{ fontSize: 9, color: current.color }}
            >
              League · {categoryName}
            </div>
            <div
              className="font-display"
              style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1, marginTop: 2 }}
            >
              You&rsquo;re in <span style={{ color: current.color }}>{current.name}</span>
            </div>
            <p
              className="font-body"
              style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4, lineHeight: 1.5, maxWidth: 360 }}
            >
              Your <b>weekly XP</b> determines your league on every habit leaderboard. Log <b style={{ color: categoryColor }}>{categoryName}</b> to keep climbing.
            </p>
          </div>
          <div
            style={{
              width: 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${current.color}`,
              flexShrink: 0,
            }}
          >
            <span
              className="font-display tabular"
              style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: current.color }}
            >
              {NUMERALS[currentIdx] ?? ''}
            </span>
          </div>
        </div>

        {/* Progress to next league */}
        <div style={{ marginTop: 12 }}>
          <div
            className="font-mono tabular"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: 'var(--b-ink-60)',
              marginBottom: 4,
              letterSpacing: '0.04em',
            }}
          >
            <span>{weeklyXP.toLocaleString()} weekly XP</span>
            {next ? (
              <span>{toNext.toLocaleString()} to <b style={{ color: next.color }}>{next.name}</b></span>
            ) : (
              <span style={{ color: '#ec4899', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Max tier
              </span>
            )}
          </div>
          <div style={{ height: 2, background: 'var(--b-rule)' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(2, segmentProgress))}%`,
                background: current.color,
                transition: 'width 700ms',
              }}
            />
          </div>
        </div>

        {/* Ladder preview */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[currentIdx, currentIdx + 1, currentIdx + 2].map((idx, i) => {
            const l = LEAGUES[idx];
            if (!l) {
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    border: '1px dashed var(--b-rule)',
                    opacity: 0.55,
                  }}
                >
                  <p
                    className="font-body"
                    style={{ fontSize: 10, color: 'var(--b-ink-40)', fontStyle: 'italic' }}
                  >
                    — top —
                  </p>
                </div>
              );
            }
            const isCurrent = i === 0;
            return (
              <div
                key={l.id}
                style={{
                  padding: '10px',
                  textAlign: 'center',
                  border: isCurrent ? `2px solid ${l.color}` : `1px solid ${l.color}55`,
                }}
              >
                <div
                  className="font-display tabular"
                  style={{
                    fontSize: 18,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: l.color,
                  }}
                >
                  {NUMERALS[idx] ?? ''}
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: 11, fontStyle: 'italic', fontWeight: 500, color: l.color, marginTop: 2 }}
                >
                  {l.name}
                </div>
                <div
                  className="font-mono tabular"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2 }}
                >
                  {l.minWeeklyXP.toLocaleString()}+ XP
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
