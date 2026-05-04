'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useSchedule } from '@/hooks/useSchedule';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDocument, removeDocument, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { UserHabit } from '@/types/habit';
import { ScheduleEntry } from '@/types/schedule';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

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
  if (h === 0) return '12';
  if (h < 12) return `${h}`;
  if (h === 12) return '12';
  return `${h - 12}`;
}
function fmtHourMeridian(h: number): string {
  return h < 12 ? 'AM' : 'PM';
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const { entries, loading: scheduleLoading } = useSchedule();
  const addToast = useUIStore((s) => s.addToast);

  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);
  const [placing, setPlacing] = useState(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const todayIdx = (now.getDay() + 6) % 7;
  const currentHour = now.getHours();
  const tz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  const sendTestNotification = async () => {
    if (!user) return;
    try {
      await createDocument(`notifications/${user.uid}/items`, {
        type: 'schedule_reminder',
        message: 'Test reminder — your schedule notifications are working',
        isRead: false,
        relatedId: '',
        actorId: '',
        actorAvatar: '',
        createdAt: Timestamp.now(),
      });
      addToast({ type: 'success', message: 'Test notification sent — check your device' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send test' });
    }
  };

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
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-5xl mx-auto pb-32">
        <Masthead section="The Almanac" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            The Almanac
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Schedule</em>
            </h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <button
                onClick={sendTestNotification}
                className="font-body"
                style={{
                  fontSize: 10,
                  padding: '5px 10px',
                  background: 'transparent',
                  border: '1px solid var(--b-ink)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--b-ink)',
                }}
                title={`Your timezone: ${tz}`}
              >
                Test push
              </button>
              <Link
                href="/dashboard"
                className="font-body"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', textDecoration: 'none', letterSpacing: '0.08em' }}
              >
                ← BACK
              </Link>
            </div>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 420, lineHeight: 1.5 }}
          >
            {selectedHabit
              ? <>Tap a slot to place <em style={{ color: 'var(--b-accent)' }}>{selectedHabit.categoryName}</em>.</>
              : (
                <>
                  <span className="lg:hidden">Tap a habit, then tap a slot.</span>
                  <span className="hidden lg:inline">Pick a habit on the right, then tap a slot — or drag it onto the grid.</span>
                </>
              )
            }
          </p>

          {/* Mobile habit strip */}
          <div
            className="lg:hidden"
            style={{
              marginTop: 14,
              paddingTop: 10,
              paddingBottom: 10,
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: 'var(--b-paper)',
            }}
          >
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
            >
              Your Habits
            </div>
            {habitsLoading ? (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ minWidth: 120 }}>
                    <Skeleton className="h-10" />
                  </div>
                ))}
              </div>
            ) : habits.length === 0 ? (
              <Link
                href="/habits"
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-accent)', letterSpacing: '0.04em' }}
              >
                Add habits first →
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {habits.map((habit) => {
                  const isSelected = selectedHabit?.categorySlug === habit.categorySlug;
                  return (
                    <button
                      key={habit.categorySlug}
                      onClick={() => setSelectedHabit(isSelected ? null : habit)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        flexShrink: 0,
                        background: isSelected ? 'var(--b-ink)' : 'transparent',
                        color: isSelected ? 'var(--b-paper)' : 'var(--b-ink)',
                        border: '1px solid var(--b-ink)',
                        cursor: 'pointer',
                      }}
                    >
                      <CategoryIcon
                        icon={habit.categoryIcon}
                        color={isSelected ? '#fff' : habit.color}
                        size="sm"
                        slug={habit.categorySlug}
                      />
                      <span
                        className="font-body"
                        style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        {habit.categoryName}
                      </span>
                    </button>
                  );
                })}
                {selectedHabit && (
                  <button
                    onClick={() => setSelectedHabit(null)}
                    style={{
                      flexShrink: 0,
                      fontSize: 9,
                      color: 'var(--b-ink-60)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 6px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grid + sidebar */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gap: 14,
            }}
            className="lg:grid-cols-[1fr_220px]"
          >
            {/* Grid */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--b-rule)', padding: 10 }}>
              {scheduleLoading ? (
                <Skeleton className="h-[500px]" />
              ) : (
                <div style={{ minWidth: 720 }}>
                  {/* Day headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px repeat(7, minmax(0, 1fr))',
                      gap: 2,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ position: 'sticky', left: 0, zIndex: 12, background: 'var(--b-paper)' }} />
                    {DAYS.map((d) => {
                      const isToday = d.idx === todayIdx;
                      return (
                        <div
                          key={d.idx}
                          className="font-body"
                          style={{
                            textAlign: 'center',
                            padding: '8px 0',
                            fontSize: 10,
                            fontWeight: isToday ? 700 : 500,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: isToday ? 'var(--b-accent)' : 'var(--b-ink-60)',
                            borderBottom: isToday ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
                          }}
                        >
                          {d.short}
                          {isToday && (
                            <div
                              className="font-mono"
                              style={{ fontSize: 8, color: 'var(--b-accent)', marginTop: 2 }}
                            >
                              today
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hour rows */}
                  {HOURS.map((h) => {
                    const isCurrentHour = h === currentHour;
                    return (
                      <div
                        key={h}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px repeat(7, minmax(0, 1fr))',
                          gap: 2,
                          marginBottom: 2,
                        }}
                      >
                        <div
                          className="font-mono tabular"
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 11,
                            fontSize: 10,
                            textAlign: 'right',
                            paddingRight: 6,
                            paddingTop: 4,
                            background: 'var(--b-paper)',
                            color: isCurrentHour ? 'var(--b-accent)' : 'var(--b-ink-40)',
                            fontWeight: isCurrentHour ? 700 : 400,
                          }}
                        >
                          {fmtHour(h)}
                          <span
                            style={{
                              fontSize: 7,
                              marginLeft: 1,
                              color: 'var(--b-ink-40)',
                            }}
                          >
                            {fmtHourMeridian(h)}
                          </span>
                        </div>
                        {DAYS.map((d) => {
                          const key = `${d.idx}-${h}`;
                          const entry = entryMap.get(key);
                          if (entry) {
                            return (
                              <button
                                key={key}
                                onClick={() => onSlotClick(d.idx, h)}
                                style={{
                                  position: 'relative',
                                  height: 38,
                                  padding: '0 6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: `${entry.habitColor}18`,
                                  border: `1px solid ${entry.habitColor}80`,
                                  borderLeft: `3px solid ${entry.habitColor}`,
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  color: 'var(--b-ink)',
                                }}
                              >
                                <CategoryIcon
                                  slug={entry.habitSlug}
                                  icon={entry.habitIcon}
                                  color={entry.habitColor}
                                  size="sm"
                                />
                                <span
                                  className="font-body"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {entry.habitName}
                                </span>
                              </button>
                            );
                          }
                          const isNow = d.idx === todayIdx && h === currentHour;
                          return (
                            <button
                              key={key}
                              onClick={() => onSlotClick(d.idx, h)}
                              onDragOver={onSlotDragOver}
                              onDrop={(e) => onSlotDrop(e, d.idx, h)}
                              aria-label={`${d.long} ${fmtHour(h)}${fmtHourMeridian(h)}`}
                              style={{
                                height: 38,
                                background: selectedHabit
                                  ? 'rgba(249,115,22,0.06)'
                                  : isNow
                                    ? 'rgba(249,115,22,0.04)'
                                    : 'transparent',
                                border: selectedHabit
                                  ? '1px dashed var(--b-accent)'
                                  : '1px dashed var(--b-rule)',
                                cursor: 'pointer',
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop sidebar */}
            <div
              className="hidden lg:block"
              style={{
                position: 'sticky',
                top: 16,
                alignSelf: 'flex-start',
                height: 'fit-content',
              }}
            >
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
              >
                Your Habits
              </div>
              {habitsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : habits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '14px 0' }}>
                  <p className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-60)', marginBottom: 6 }}>
                    No habits yet
                  </p>
                  <Link
                    href="/habits"
                    className="font-body"
                    style={{ fontSize: 11, color: 'var(--b-accent)', textDecoration: 'none', letterSpacing: '0.04em' }}
                  >
                    Add a habit →
                  </Link>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid var(--b-rule)' }}>
                  {habits.map((habit) => {
                    const isSelected = selectedHabit?.categorySlug === habit.categorySlug;
                    return (
                      <li key={habit.categorySlug}>
                        <button
                          draggable
                          onDragStart={(e) => onHabitDragStart(e, habit)}
                          onDragEnd={() => setSelectedHabit(null)}
                          onClick={() => setSelectedHabit(isSelected ? null : habit)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 6px',
                            background: isSelected ? `${habit.color}15` : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--b-rule)',
                            cursor: 'grab',
                            textAlign: 'left',
                            color: 'var(--b-ink)',
                          }}
                        >
                          <CategoryIcon
                            icon={habit.categoryIcon}
                            color={habit.color}
                            size="sm"
                            slug={habit.categorySlug}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="font-display"
                              style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {habit.categoryName}
                            </div>
                            <div
                              className="font-body tabular"
                              style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                            >
                              {habit.goal} {habit.unit}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selectedHabit && (
                <button
                  onClick={() => setSelectedHabit(null)}
                  className="font-body"
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: '6px 0',
                    fontSize: 9,
                    color: 'var(--b-ink-60)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  Clear selection
                </button>
              )}

              {/* Tip block */}
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 12px',
                  border: '1px solid var(--b-rule)',
                  background: 'var(--b-paper-2, transparent)',
                }}
              >
                <div
                  className="spread"
                  style={{ fontSize: 8, color: 'var(--b-accent)', marginBottom: 4 }}
                >
                  Note
                </div>
                <p
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', lineHeight: 1.5 }}
                >
                  Drag on desktop, or tap a habit then tap a slot on mobile. Tap a scheduled block to remove it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
