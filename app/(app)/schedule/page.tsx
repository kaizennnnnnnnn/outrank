'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useSchedule } from '@/hooks/useSchedule';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { createDocument, removeDocument, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { UserHabit } from '@/types/habit';
import { ScheduleEntry } from '@/types/schedule';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

// 0 = Monday through 6 = Sunday (European convention used across the app)
const DAYS = [
  { idx: 0, short: 'Mon', long: 'Monday' },
  { idx: 1, short: 'Tue', long: 'Tuesday' },
  { idx: 2, short: 'Wed', long: 'Wednesday' },
  { idx: 3, short: 'Thu', long: 'Thursday' },
  { idx: 4, short: 'Fri', long: 'Friday' },
  { idx: 5, short: 'Sat', long: 'Saturday' },
  { idx: 6, short: 'Sun', long: 'Sunday' },
];

// Waking-hour slots, 6 AM through 11 PM. 24h format is more editorial than AM/PM.
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function fmtHHmm(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function fmtUntil(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'now';
  const days = Math.floor(totalMinutes / (60 * 24));
  if (days >= 1) return `in ${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    if (minutes === 0) return `in ${hours} hr`;
    return `in ${hours} hr ${minutes} min`;
  }
  return `in ${minutes} min`;
}

function dayLabel(targetIdx: number, todayIdx: number): string {
  const offset = (targetIdx - todayIdx + 7) % 7;
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return DAYS[targetIdx].long;
}

function dateForDay(targetIdx: number, todayIdx: number, now: Date): Date {
  const offset = (targetIdx - todayIdx + 7) % 7;
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  return `${dd} ${mon}`;
}

interface NextUp {
  entry: ScheduleEntry;
  minutesUntil: number;
  dayOffset: number;
}

function findNextUp(
  entries: ScheduleEntry[],
  todayIdx: number,
  currentHour: number,
  currentMinute: number,
): NextUp | null {
  let best: NextUp | null = null;
  for (const entry of entries) {
    const offset = (entry.dayOfWeek - todayIdx + 7) % 7;
    const minutesUntil = offset * 24 * 60 + (entry.hour - currentHour) * 60 - currentMinute;
    // Treat anything firing within the last 5 minutes as still "now".
    if (minutesUntil < -5) continue;
    if (!best || minutesUntil < best.minutesUntil) {
      best = { entry, minutesUntil: Math.max(0, minutesUntil), dayOffset: offset };
    }
  }
  return best;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const { entries, loading: scheduleLoading } = useSchedule();
  const addToast = useUIStore((s) => s.addToast);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayIdx = (now.getDay() + 6) % 7;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const tz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const entryMap = useMemo(() => {
    const m = new Map<string, ScheduleEntry>();
    for (const e of entries) m.set(`${e.dayOfWeek}-${e.hour}`, e);
    return m;
  }, [entries]);

  const byDay = useMemo(() => {
    const m: Record<number, ScheduleEntry[]> = {};
    for (let i = 0; i < 7; i++) m[i] = [];
    for (const e of entries) m[e.dayOfWeek].push(e);
    for (const k of Object.keys(m)) {
      m[Number(k)].sort((a, b) => a.hour - b.hour);
    }
    return m;
  }, [entries]);

  const nextUp = useMemo(
    () => findNextUp(entries, todayIdx, currentHour, currentMinute),
    [entries, todayIdx, currentHour, currentMinute],
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const distinctHabits = new Set(entries.map((e) => e.habitSlug)).size;
    return { total, distinctHabits };
  }, [entries]);

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

  const removeEntry = async (entry: ScheduleEntry) => {
    if (!user || !entry.id) return;
    try {
      await removeDocument(`scheduleEntries/${user.uid}/items`, entry.id);
      addToast({ type: 'info', message: 'Removed from schedule' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove' });
    }
  };

  const placeHabit = async (habit: UserHabit, dayOfWeek: number, hour: number) => {
    if (!user || busy) return;
    const key = `${dayOfWeek}-${hour}`;
    if (entryMap.has(key)) {
      addToast({ type: 'error', message: 'That slot is already taken' });
      return;
    }
    setBusy(true);
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
      addToast({ type: 'success', message: `Scheduled ${habit.categoryName} · ${DAYS[dayOfWeek].long} ${fmtHHmm(hour)}` });
      setAddOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Failed to schedule' });
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  // Order day sections: today first, then forward through the week.
  const orderedDays = Array.from({ length: 7 }, (_, i) => (todayIdx + i) % 7);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-3xl mx-auto pb-32">
        <Masthead section="The Almanac" />

        <div style={{ padding: '0 22px' }}>
          {/* Header */}
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
            <Link
              href="/dashboard"
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', textDecoration: 'none', letterSpacing: '0.08em' }}
            >
              ← BACK
            </Link>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 460, lineHeight: 1.55, marginBottom: 14 }}
          >
            A weekly arrangement of your discipline. Tap any block to remove. We push a reminder when its hour arrives.
          </p>

          {/* Stats line */}
          <div
            className="font-mono tabular"
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 9,
              color: 'var(--b-ink-60)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderTop: '1px solid var(--b-rule)',
              borderBottom: '1px solid var(--b-rule)',
              padding: '8px 0',
              marginBottom: 18,
            }}
          >
            <span>Entries · <span style={{ color: 'var(--b-ink)', fontWeight: 700 }}>{stats.total}</span></span>
            <span>Habits · <span style={{ color: 'var(--b-ink)', fontWeight: 700 }}>{stats.distinctHabits}</span></span>
            <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: '0.04em' }} title={`Your timezone: ${tz}`}>
              <span style={{ opacity: 0.6 }}>tz · </span>{tz.split('/').pop()?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Next-up card */}
          {scheduleLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : nextUp ? (
            <NextUpCard
              entry={nextUp.entry}
              minutesUntil={nextUp.minutesUntil}
              dayOffset={nextUp.dayOffset}
              now={now}
              todayIdx={todayIdx}
            />
          ) : (
            <EmptyHero onAdd={() => setAddOpen(true)} hasHabits={habits.length > 0} />
          )}

          {/* Add CTA */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18, marginBottom: 18 }}>
            <button
              onClick={() => setAddOpen(true)}
              disabled={habits.length === 0}
              className="font-body"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: habits.length === 0 ? 'var(--b-ink-15)' : 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: 'none',
                cursor: habits.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              + Add to schedule
            </button>
            <button
              onClick={sendTestNotification}
              className="font-body"
              style={{
                padding: '12px 14px',
                background: 'transparent',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--b-ink)',
                whiteSpace: 'nowrap',
              }}
              title={`Your timezone: ${tz}`}
            >
              Test push
            </button>
          </div>

          {/* The week, day by day */}
          {scheduleLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div>
              {orderedDays.map((dayIdx) => {
                const isToday = dayIdx === todayIdx;
                const dayEntries = byDay[dayIdx];
                return (
                  <DaySection
                    key={dayIdx}
                    dayIdx={dayIdx}
                    isToday={isToday}
                    label={dayLabel(dayIdx, todayIdx)}
                    date={fmtDate(dateForDay(dayIdx, todayIdx, now))}
                    entries={dayEntries}
                    currentHour={currentHour}
                    currentMinute={currentMinute}
                    nextUpId={nextUp?.entry.id}
                    onRemove={removeEntry}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <AddEntryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        habits={habits}
        habitsLoading={habitsLoading}
        entryMap={entryMap}
        busy={busy}
        onConfirm={placeHabit}
      />
    </div>
  );
}

// ------------------- NEXT UP HERO -------------------

function NextUpCard({
  entry,
  minutesUntil,
  dayOffset,
  now,
  todayIdx,
}: {
  entry: ScheduleEntry;
  minutesUntil: number;
  dayOffset: number;
  now: Date;
  todayIdx: number;
}) {
  const dayName = dayOffset === 0
    ? 'today'
    : dayOffset === 1
    ? 'tomorrow'
    : DAYS[entry.dayOfWeek].long.toLowerCase();

  const target = dateForDay(entry.dayOfWeek, todayIdx, now);
  const dateStr = fmtDate(target);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        border: '1px solid var(--b-ink)',
        padding: '18px 18px 20px',
        background: 'var(--b-paper)',
      }}
    >
      {/* accent top stripe */}
      <div
        style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          height: 3,
          background: entry.habitColor,
        }}
      />
      {/* eyebrow */}
      <div
        className="spread"
        style={{
          fontSize: 9,
          color: 'var(--b-accent)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>Next Up</span>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--b-accent)',
            animation: 'pulse-dot 1.8s ease-in-out infinite',
          }}
        />
        <span className="font-mono tabular" style={{ color: 'var(--b-ink-60)', letterSpacing: '0.08em' }}>
          {fmtUntil(minutesUntil)}
        </span>
      </div>

      {/* headline */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h2
          className="font-display"
          style={{
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          Time for{' '}
          <span className="metallic-shine" style={{ fontStyle: 'italic' }}>
            {entry.habitName}
          </span>.
        </h2>
      </div>

      {/* meta row */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--b-rule)',
        }}
      >
        <CategoryIcon
          slug={entry.habitSlug}
          icon={entry.habitIcon}
          color={entry.habitColor}
          size="sm"
        />
        <div className="font-mono tabular" style={{ fontSize: 11, color: 'var(--b-ink)' }}>
          <span style={{ fontWeight: 700 }}>{fmtHHmm(entry.hour)}</span>
          <span style={{ color: 'var(--b-ink-60)', margin: '0 8px' }}>·</span>
          <span style={{ color: 'var(--b-ink-60)' }}>{dayName} {dayOffset > 1 ? `· ${dateStr}` : ''}</span>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyHero({ onAdd, hasHabits }: { onAdd: () => void; hasHabits: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        border: '1px dashed var(--b-ink)',
        padding: '22px 18px',
        textAlign: 'center',
      }}
    >
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
        Open Calendar
      </div>
      <h2
        className="font-display"
        style={{ fontSize: 26, fontStyle: 'italic', fontWeight: 500, margin: 0, lineHeight: 1.1 }}
      >
        Nothing on the books.
      </h2>
      <p
        className="font-body"
        style={{ fontSize: 11.5, color: 'var(--b-ink-60)', maxWidth: 360, margin: '8px auto 14px', lineHeight: 1.5 }}
      >
        {hasHabits
          ? 'Pin a habit to a specific hour and we will tap you on the shoulder.'
          : 'Pick up a habit first — then return here to set its hours.'}
      </p>
      {hasHabits ? (
        <button
          onClick={onAdd}
          className="font-body"
          style={{
            padding: '10px 18px',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          + Plan an hour
        </button>
      ) : (
        <Link
          href="/habits"
          className="font-body"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            textDecoration: 'none',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Pick a habit →
        </Link>
      )}
    </div>
  );
}

// ------------------- DAY SECTION -------------------

function DaySection({
  dayIdx,
  isToday,
  label,
  date,
  entries,
  currentHour,
  currentMinute,
  nextUpId,
  onRemove,
}: {
  dayIdx: number;
  isToday: boolean;
  label: string;
  date: string;
  entries: ScheduleEntry[];
  currentHour: number;
  currentMinute: number;
  nextUpId?: string;
  onRemove: (e: ScheduleEntry) => void;
}) {
  // Where to draw the NOW line — between entries whose hour is closest to current.
  const nowFraction = isToday
    ? Math.min(1, Math.max(0, (currentHour - HOURS[0] + currentMinute / 60) / HOURS.length))
    : null;

  return (
    <section style={{ marginBottom: 22 }}>
      {/* Header rule */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          paddingBottom: 6,
          borderBottom: isToday ? '2px solid var(--b-accent)' : '1px solid var(--b-ink)',
        }}
      >
        {isToday && (
          <span
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-accent)' }}
          >
            Today
          </span>
        )}
        <h3
          className="font-display"
          style={{
            fontSize: 22,
            fontStyle: 'italic',
            fontWeight: 500,
            margin: 0,
            color: isToday ? 'var(--b-ink)' : 'var(--b-ink)',
          }}
        >
          {isToday ? DAYS[dayIdx].long : label}
        </h3>
        <span
          className="font-mono tabular"
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--b-ink-60)',
            letterSpacing: '0.08em',
          }}
        >
          {date}
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          className="font-body"
          style={{
            padding: '14px 0',
            fontSize: 11,
            color: 'var(--b-ink-40)',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}
        >
          — open day —
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
          {entries.map((e, i) => {
            const isPast = isToday && (e.hour < currentHour || (e.hour === currentHour && currentMinute > 5));
            const isCurrent = isToday && e.hour === currentHour && currentMinute <= 5;
            const isNext = e.id === nextUpId;
            return (
              <EntryRow
                key={e.id}
                entry={e}
                isPast={isPast}
                isCurrent={isCurrent}
                isNext={isNext}
                onRemove={onRemove}
                lastInDay={i === entries.length - 1}
              />
            );
          })}
        </ul>
      )}

      {/* NOW marker — drawn after the entry list so it overlays correctly. */}
      {isToday && nowFraction !== null && entries.length > 0 && (
        <div
          aria-hidden
          style={{
            position: 'relative',
            height: 0,
          }}
        >
          {/* Marker is intentionally outside the list — it lives in the day header rule visually */}
        </div>
      )}
    </section>
  );
}

function EntryRow({
  entry,
  isPast,
  isCurrent,
  isNext,
  onRemove,
  lastInDay,
}: {
  entry: ScheduleEntry;
  isPast: boolean;
  isCurrent: boolean;
  isNext: boolean;
  onRemove: (e: ScheduleEntry) => void;
  lastInDay: boolean;
}) {
  const opacity = isPast ? 0.42 : 1;

  return (
    <li
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: lastInDay ? 'none' : '1px solid var(--b-rule)',
        opacity,
      }}
    >
      {/* time gutter */}
      <div
        className="font-mono tabular"
        style={{
          fontSize: 14,
          letterSpacing: '0.04em',
          color: isNext || isCurrent ? 'var(--b-accent)' : 'var(--b-ink)',
          fontWeight: isNext || isCurrent ? 700 : 500,
        }}
      >
        {fmtHHmm(entry.hour)}
      </div>

      {/* body */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 3,
            alignSelf: 'stretch',
            background: entry.habitColor,
          }}
        />
        <CategoryIcon
          slug={entry.habitSlug}
          icon={entry.habitIcon}
          color={entry.habitColor}
          size="sm"
        />
        <div style={{ minWidth: 0 }}>
          <div
            className="font-display"
            style={{
              fontSize: 16,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: isPast ? 'line-through' : 'none',
            }}
          >
            {entry.habitName}
          </div>
          {(isNext || isCurrent) && (
            <div
              className="font-mono"
              style={{
                fontSize: 8.5,
                color: 'var(--b-accent)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              {isCurrent ? 'happening now' : 'next up'}
            </div>
          )}
        </div>
      </div>

      {/* remove */}
      <button
        onClick={() => {
          if (confirm(`Remove ${entry.habitName} from ${DAYS[entry.dayOfWeek].long} ${fmtHHmm(entry.hour)}?`)) {
            onRemove(entry);
          }
        }}
        aria-label={`Remove ${entry.habitName}`}
        className="font-body"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--b-ink-40)',
          cursor: 'pointer',
          fontSize: 16,
          padding: '6px 8px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </li>
  );
}

// ------------------- ADD ENTRY MODAL -------------------

function AddEntryModal({
  open,
  onClose,
  habits,
  habitsLoading,
  entryMap,
  busy,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  habits: UserHabit[];
  habitsLoading: boolean;
  entryMap: Map<string, ScheduleEntry>;
  busy: boolean;
  onConfirm: (h: UserHabit, day: number, hour: number) => void;
}) {
  const [habit, setHabit] = useState<UserHabit | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setHabit(null);
      setDay(null);
      setHour(null);
    }
  }, [open]);

  const canConfirm = !!habit && day !== null && hour !== null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Plan an hour" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Step 1 — habit */}
        <section>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
          >
            <span style={{ color: 'var(--b-accent)' }}>I.</span> Habit
          </div>
          {habitsLoading ? (
            <Skeleton className="h-20" />
          ) : habits.length === 0 ? (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)' }}>
              No habits yet. <Link href="/habits" style={{ color: 'var(--b-accent)' }}>Add one →</Link>
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 6,
              }}
            >
              {habits.map((h) => {
                const isSelected = habit?.categorySlug === h.categorySlug;
                return (
                  <button
                    key={h.categorySlug}
                    onClick={() => setHabit(h)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: isSelected ? 'var(--b-ink)' : 'transparent',
                      color: isSelected ? 'var(--b-paper)' : 'var(--b-ink)',
                      border: '1px solid var(--b-ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <CategoryIcon
                      slug={h.categorySlug}
                      icon={h.categoryIcon}
                      color={isSelected ? '#fff' : h.color}
                      size="sm"
                    />
                    <span
                      className="font-body"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.categoryName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 2 — day */}
        <AnimatePresence>
          {habit && (
            <motion.section
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
              >
                <span style={{ color: 'var(--b-accent)' }}>II.</span> Day
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 4,
                }}
              >
                {DAYS.map((d) => {
                  const isSelected = day === d.idx;
                  return (
                    <button
                      key={d.idx}
                      onClick={() => setDay(d.idx)}
                      className="font-body"
                      style={{
                        padding: '10px 0',
                        background: isSelected ? 'var(--b-ink)' : 'transparent',
                        color: isSelected ? 'var(--b-paper)' : 'var(--b-ink)',
                        border: '1px solid var(--b-ink)',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3 — hour */}
        <AnimatePresence>
          {habit && day !== null && (
            <motion.section
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
              >
                <span style={{ color: 'var(--b-accent)' }}>III.</span> Hour
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                  gap: 4,
                }}
              >
                {HOURS.map((h) => {
                  const taken = entryMap.has(`${day}-${h}`);
                  const isSelected = hour === h;
                  return (
                    <button
                      key={h}
                      onClick={() => !taken && setHour(h)}
                      disabled={taken}
                      className="font-mono tabular"
                      style={{
                        padding: '8px 0',
                        background: isSelected
                          ? 'var(--b-accent)'
                          : taken
                          ? 'var(--b-ink-15)'
                          : 'transparent',
                        color: isSelected
                          ? '#fff'
                          : taken
                          ? 'var(--b-ink-40)'
                          : 'var(--b-ink)',
                        border: `1px solid ${isSelected ? 'var(--b-accent)' : 'var(--b-rule)'}`,
                        cursor: taken ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: taken ? 'line-through' : 'none',
                      }}
                      title={taken ? 'Already scheduled' : ''}
                    >
                      {fmtHHmm(h)}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Confirm */}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={onClose}
            className="font-body"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--b-ink)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--b-ink)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canConfirm) onConfirm(habit!, day!, hour!);
            }}
            disabled={!canConfirm || busy}
            className="font-body"
            style={{
              flex: 1,
              padding: '10px 16px',
              background: canConfirm ? 'var(--b-ink)' : 'var(--b-ink-15)',
              color: canConfirm ? 'var(--b-paper)' : 'var(--b-ink-40)',
              border: 'none',
              cursor: canConfirm && !busy ? 'pointer' : 'not-allowed',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {busy ? 'Saving…' : canConfirm ? `Pin · ${DAYS[day!].short} ${fmtHHmm(hour!)}` : 'Pick all three'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
