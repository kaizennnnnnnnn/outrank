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
import { StatCard } from '@/components/profile/StatCard';
import { LeagueCrest } from '@/components/profile/RanksModal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserHabit } from '@/types/habit';
import { FireIcon, TrophyIconFull, ChartBarIcon, TargetFullIcon, SearchIcon } from '@/components/ui/AppIcons';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { LEAGUES, getLeague, getNextLeague } from '@/constants/seasons';

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
      <div className="max-w-3xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600 mx-auto" />
        <h1 className="text-xl font-bold text-white mt-4">Category not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <CategoryIcon icon={category.icon} color={category.color} size="lg" slug={category.slug} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white font-heading">{category.name}</h1>
            <p className="text-sm text-slate-500">{category.section} &bull; {category.unit}</p>
          </div>
          {habit && habit.currentStreak > 0 && (
            <StreakFlame streak={habit.currentStreak} size="lg" />
          )}
        </div>
      </div>

      {/* My Stats */}
      {habitLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : habit ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<FireIcon size={24} className="text-orange-400" />} value={`${habit.currentStreak}d`} label="Current Streak" />
          <StatCard icon={<TrophyIconFull size={24} className="text-yellow-400" />} value={`${habit.longestStreak}d`} label="Best Streak" />
          <StatCard icon={<ChartBarIcon size={24} className="text-red-400" />} value={habit.totalLogs.toString()} label="Total Logs" />

          {/* Editable Daily Goal */}
          <div className={cn(
            'relative rounded-xl p-4 text-center border-2 transition-all',
            editingGoal
              ? 'bg-orange-500/5 border-orange-500/40'
              : 'bg-[#10101a] border-orange-500/25 hover:border-orange-500/50'
          )}>
            <div className="flex justify-center"><TargetFullIcon size={24} className="text-orange-400" /></div>

            {editingGoal ? (
              <>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    className="w-20 bg-[#0b0b14] border border-orange-500/40 rounded-md px-2 py-1 text-center font-mono text-lg font-bold text-white focus:outline-none focus:border-orange-400"
                    autoFocus
                  />
                  <span className="text-xs text-slate-500">{habit.unit}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Daily Goal</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    onClick={saveGoal}
                    disabled={savingGoal}
                    className="px-3 py-1 rounded-md bg-orange-500 hover:bg-orange-400 text-[11px] font-bold text-white transition-colors disabled:opacity-60"
                  >
                    {savingGoal ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingGoal(false); setGoalDraft(String(habit.goal)); }}
                    className="px-3 py-1 rounded-md bg-[#1e1e30] hover:bg-[#2a2a40] text-[11px] font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-mono text-lg font-bold text-white mt-1">
                  {habit.goal} <span className="text-xs text-slate-500 font-normal">{habit.unit}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Daily Goal</p>
                <button
                  onClick={() => setEditingGoal(true)}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 text-[11px] font-semibold transition-colors"
                >
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Edit Goal
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-slate-500">You haven&apos;t added this habit yet.</p>
        </div>
      )}

      {/* Progress Graph */}
      {user && habit && (
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-bold text-white mb-3">Progress vs Goal</h2>
          <HabitProgressGraph
            userId={user.uid}
            habitId={slug}
            goal={habit.goal}
            unit={habit.unit}
            color={category.color}
          />
        </div>
      )}

      {/* League info — where you stand on this habit's weekly ladder */}
      {user && (
        <LeagueInfoCard
          weeklyXP={user.weeklyXP || 0}
          categoryColor={category.color}
          categoryName={category.name}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Leaderboard</h2>
          <div className="flex gap-1 bg-[#10101a] rounded-xl p-1 border border-[#1e1e30] w-fit">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  period === p.value ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#1e1e30]">
            {lbLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : entries.length === 0 ? (
              <p className="p-8 text-center text-slate-600">No entries yet</p>
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
        </div>

        {/* Log History */}
        {user && habit && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Recent Logs</h2>
            <HabitLogHistory userId={user.uid} habitId={slug} />
          </div>
        )}
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 border"
      style={{
        background: `radial-gradient(ellipse 120% 80% at 100% 0%, ${current.color}22, transparent 55%), linear-gradient(160deg, #10101a 0%, #0b0b14 100%)`,
        borderColor: `${current.color}40`,
        boxShadow: `0 0 28px -10px ${current.color}66`,
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: current.color }}>
            League · {categoryName}
          </p>
          <p className="font-heading text-xl font-bold text-white mt-1">
            You&rsquo;re in <span style={{ color: current.color }}>{current.name}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-[320px]">
            Your <b>weekly XP</b> determines your league on every habit leaderboard. Log <b style={{ color: categoryColor }}>{categoryName}</b> to keep climbing.
          </p>
        </div>
        <LeagueCrest color={current.color} tier={current.id} size={52} />
      </div>

      {/* Progress to next league */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
          <span>{weeklyXP.toLocaleString()} weekly XP</span>
          {next ? (
            <span>{toNext.toLocaleString()} to <b style={{ color: next.color }}>{next.name}</b></span>
          ) : (
            <span className="text-pink-400 font-bold uppercase tracking-widest">Max tier</span>
          )}
        </div>
        <div className="w-full h-2 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, Math.max(0, segmentProgress))}%`,
              background: next
                ? `linear-gradient(90deg, ${current.color}, ${next.color})`
                : `linear-gradient(90deg, ${current.color}, #fde047)`,
              boxShadow: `0 0 10px ${current.color}aa`,
            }}
          />
        </div>
      </div>

      {/* League ladder preview — current, next, one above */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[currentIdx, currentIdx + 1, currentIdx + 2].map((idx, i) => {
          const l = LEAGUES[idx];
          if (!l) {
            return (
              <div key={i} className="rounded-xl p-3 text-center bg-[#08080f] border border-dashed border-[#1e1e30] opacity-60">
                <p className="text-[10px] text-slate-600">— top —</p>
              </div>
            );
          }
          const isCurrent = i === 0;
          return (
            <div
              key={l.id}
              className={cn(
                'rounded-xl p-3 text-center border flex flex-col items-center gap-1.5',
                isCurrent && 'ring-1 ring-orange-500/40',
              )}
              style={{
                background: `linear-gradient(145deg, ${l.color}14, #0b0b14 70%)`,
                borderColor: `${l.color}35`,
              }}
            >
              <LeagueCrest color={l.color} tier={l.id} size={32} />
              <p className="text-[11px] font-heading font-bold leading-tight" style={{ color: l.color }}>
                {l.name}
              </p>
              <p className="text-[9px] font-mono text-slate-500">
                {l.minWeeklyXP.toLocaleString()}+ XP
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
