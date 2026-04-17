'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useSchedule } from '@/hooks/useSchedule';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDocument, removeDocument, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { UserHabit } from '@/types/habit';
import { ScheduleEntry } from '@/types/schedule';
import Link from 'next/link';

// 0 = Monday through 6 = Sunday (European convention)
const DAYS = [
  { idx: 0, short: 'Mon', long: 'Monday' },
  { idx: 1, short: 'Tue', long: 'Tuesday' },
  { idx: 2, short: 'Wed', long: 'Wednesday' },
  { idx: 3, short: 'Thu', long: 'Thursday' },
  { idx: 4, short: 'Fri', long: 'Friday' },
  { idx: 5, short: 'Sat', long: 'Saturday' },
  { idx: 6, short: 'Sun', long: 'Sunday' },
];
// 6 AM through 11 PM (inclusive) — waking hours
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function fmtHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const { entries, loading: scheduleLoading } = useSchedule();
  const addToast = useUIStore((s) => s.addToast);

  // Habit selected via tap-to-place (mobile) or being dragged (desktop)
  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);
  const [placing, setPlacing] = useState(false);

  // Map (day, hour) -> entry for O(1) lookup while rendering
  const entryMap = useMemo(() => {
    const m = new Map<string, ScheduleEntry>();
    for (const e of entries) m.set(`${e.dayOfWeek}-${e.hour}`, e);
    return m;
  }, [entries]);

  const placeHabit = async (habit: UserHabit, dayOfWeek: number, hour: number) => {
    if (!user || placing) return;
    const key = `${dayOfWeek}-${hour}`;
    if (entryMap.has(key)) {
      addToast({ type: 'error', message: 'That slot is already taken' });
      return;
    }
    setPlacing(true);
    try {
      await createDocument(`scheduleEntries/${user.uid}/items`, {
        habitSlug: habit.categorySlug,
        habitName: habit.categoryName,
        habitIcon: habit.categoryIcon,
        habitColor: habit.color,
        dayOfWeek,
        hour,
        createdAt: Timestamp.now(),
      });
      addToast({ type: 'success', message: `Scheduled ${habit.categoryName}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to schedule' });
    } finally {
      setPlacing(false);
    }
  };

  const removeEntry = async (entry: ScheduleEntry) => {
    if (!user || !entry.id) return;
    try {
      await removeDocument(`scheduleEntries/${user.uid}/items`, entry.id);
      addToast({ type: 'info', message: 'Removed from schedule' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove' });
    }
  };

  // HTML5 drag handlers (desktop)
  const onHabitDragStart = (e: React.DragEvent, habit: UserHabit) => {
    e.dataTransfer.setData('application/habit-slug', habit.categorySlug);
    e.dataTransfer.effectAllowed = 'copy';
    setSelectedHabit(habit);
  };
  const onSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onSlotDrop = (e: React.DragEvent, dayOfWeek: number, hour: number) => {
    e.preventDefault();
    const slug = e.dataTransfer.getData('application/habit-slug');
    const habit = habits.find((h) => h.categorySlug === slug);
    if (habit) placeHabit(habit, dayOfWeek, hour);
  };

  // Tap-to-place (mobile + desktop click)
  const onSlotClick = (dayOfWeek: number, hour: number) => {
    const key = `${dayOfWeek}-${hour}`;
    const existing = entryMap.get(key);
    if (existing) {
      if (confirm(`Remove ${existing.habitName} from this slot?`)) removeEntry(existing);
      return;
    }
    if (selectedHabit) {
      placeHabit(selectedHabit, dayOfWeek, hour);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Schedule</h1>
          <p className="text-sm text-slate-500">
            {selectedHabit
              ? <>Tap a slot to place <span className="text-orange-400 font-medium">{selectedHabit.categoryName}</span>, or drag it.</>
              : <>Pick a habit on the right, then tap a slot — or drag it onto the grid.</>
            }
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
          &larr; Back
        </Link>
      </div>

      {/* Main layout: grid + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        {/* Scheduler grid */}
        <div className="glass-card rounded-2xl p-3 overflow-x-auto">
          {scheduleLoading ? (
            <Skeleton className="h-[500px] rounded-xl" />
          ) : (
            <div className="min-w-[720px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-1 mb-1 sticky top-0">
                <div />
                {DAYS.map((d) => (
                  <div
                    key={d.idx}
                    className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2 bg-[#0b0b14] rounded-md"
                  >
                    {d.short}
                  </div>
                ))}
              </div>

              {/* Rows: one per hour */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-1 mb-1"
                >
                  <div className="text-[10px] font-mono text-slate-600 text-right pr-2 pt-2 whitespace-nowrap">
                    {fmtHour(h)}
                  </div>
                  {DAYS.map((d) => {
                    const key = `${d.idx}-${h}`;
                    const entry = entryMap.get(key);
                    if (entry) {
                      return (
                        <button
                          key={key}
                          onClick={() => onSlotClick(d.idx, h)}
                          className="relative h-12 rounded-md text-[10px] font-medium text-white transition-all overflow-hidden group"
                          style={{
                            background: `linear-gradient(145deg, ${entry.habitColor}40, ${entry.habitColor}15)`,
                            border: `1px solid ${entry.habitColor}60`,
                            boxShadow: `0 0 14px -6px ${entry.habitColor}60`,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center gap-1 px-1.5">
                            <CategoryIcon
                              slug={entry.habitSlug}
                              icon={entry.habitIcon}
                              color={entry.habitColor}
                              size="sm"
                            />
                            <span className="truncate text-[10px]">{entry.habitName}</span>
                          </div>
                          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/40 text-white/70 text-[9px] leading-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            &times;
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={key}
                        onClick={() => onSlotClick(d.idx, h)}
                        onDragOver={onSlotDragOver}
                        onDrop={(e) => onSlotDrop(e, d.idx, h)}
                        className={cn(
                          'h-12 rounded-md border border-dashed transition-all',
                          selectedHabit
                            ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-400/50'
                            : 'border-[#1e1e30] bg-[#0b0b14] hover:bg-[#10101a]'
                        )}
                        aria-label={`${d.long} ${fmtHour(h)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Habit sidebar */}
        <div className="glass-card rounded-2xl p-3 h-fit lg:sticky lg:top-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Your Habits
          </h2>
          {habitsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : habits.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-500 mb-3">No habits yet</p>
              <Link
                href="/habits"
                className="text-xs text-orange-400 hover:underline"
              >
                Add a habit &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const isSelected = selectedHabit?.categorySlug === habit.categorySlug;
                return (
                  <button
                    key={habit.categorySlug}
                    draggable
                    onDragStart={(e) => onHabitDragStart(e, habit)}
                    onDragEnd={() => setSelectedHabit(null)}
                    onClick={() =>
                      setSelectedHabit(isSelected ? null : habit)
                    }
                    className={cn(
                      'w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left cursor-grab active:cursor-grabbing',
                      isSelected
                        ? 'bg-orange-500/15 border border-orange-500/40 shadow-[0_0_16px_-4px_rgba(249,115,22,0.4)]'
                        : 'bg-[#0b0b14] border border-[#1e1e30] hover:border-orange-500/20'
                    )}
                  >
                    <CategoryIcon
                      icon={habit.categoryIcon}
                      color={habit.color}
                      size="sm"
                      slug={habit.categorySlug}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {habit.categoryName}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {habit.goal} {habit.unit}
                      </p>
                    </div>
                  </button>
                );
              })}
              {selectedHabit && (
                <button
                  onClick={() => setSelectedHabit(null)}
                  className="w-full text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1"
                >
                  Clear selection
                </button>
              )}
            </div>
          )}

          {/* Tip */}
          <div className="mt-4 p-2.5 rounded-lg bg-[#0b0b14] border border-[#1e1e30]">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="text-orange-400 font-medium">Tip:</span> drag on desktop, or tap a habit then tap a slot on mobile. Tap a scheduled block to remove it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
