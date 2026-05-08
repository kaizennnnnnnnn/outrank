'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGymState, useWorkoutHistory } from '@/hooks/useGymState';
import { GymProgramPicker } from '@/components/gym/GymProgramPicker';
import { TodayWorkoutCard } from '@/components/gym/TodayWorkoutCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { getTodaysDay, clearActiveProgram } from '@/lib/gym';
import { useUIStore } from '@/store/uiStore';
import { useState } from 'react';
import { Masthead } from '@/components/editorial/Masthead';
import type { Program } from '@/types/gym';
import { getExercise } from '@/constants/exercises';

export default function GymPage() {
  const { user } = useAuth();
  const { state, loading } = useGymState();
  const { workouts, loading: historyLoading } = useWorkoutHistory(8);
  const addToast = useUIStore((s) => s.addToast);
  const [switching, setSwitching] = useState(false);

  if (!user || loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!state?.activeProgramId) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto pb-32">
          <Masthead section="Gym" />
          <div style={{ padding: '0 22px' }}>
            <GymProgramPicker />
          </div>
        </div>
      </div>
    );
  }

  // Resolve custom program off the user doc when activeProgramId is
  // 'custom' — getTodaysDay needs it to find the right schedule.
  const userAny = user as unknown as Record<string, unknown> | null;
  const customProgram = userAny?.customProgram as import('@/types/gym').Program | undefined;
  const today = getTodaysDay(state, customProgram);
  if (!today) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto pb-32">
          <Masthead section="Gym" />
          <div style={{ padding: '0 22px' }}>
            <GymProgramPicker />
          </div>
        </div>
      </div>
    );
  }

  const handleSwitch = async () => {
    if (!user) return;
    setSwitching(true);
    try {
      await clearActiveProgram(user.uid);
    } catch {
      addToast({ type: 'error', message: 'Could not switch program' });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Gym" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="spread" style={{ fontSize: 9, color: '#ef4444' }}>
                Gym · Active Program
              </div>
              <h1
                className="font-display"
                style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
              >
                <em style={{ fontStyle: 'italic' }}>{today.program.name}</em>
              </h1>
              <p
                className="font-body tabular"
                style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
              >
                {today.program.audience} · {state.totalWorkouts || 0} workouts logged
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSwitch} disabled={switching}>
              Switch program
            </Button>
          </div>

          <div style={{ marginTop: 18 }}>
            <TodayWorkoutCard program={today.program} day={today.day} dayIndex={today.dayIndex} />
          </div>

          {/* Mon-Sun calendar projection — pins each cycle day to a
              real weekday so the user can see "I lift Mon/Wed/Fri".
              Reads workoutDays off the user doc; falls back to a
              sensible default spread based on daysPerWeek. */}
          <WeeklyScheduleView
            program={today.program}
            workoutDays={(userAny?.workoutDays as Array<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> | undefined) ?? null}
          />

          {/* Full routine — every day in the cycle, today highlighted */}
          <RoutineCycleView
            program={today.program}
            currentDayIndex={today.dayIndex}
            isCustom={state.activeProgramId === 'custom'}
          />

          {/* History */}
          <section style={{ marginTop: 24 }}>
            <div
              style={{
                paddingTop: 12,
                borderTop: '1px solid var(--b-ink)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
                Recent Workouts
              </div>
              <div
                className="font-mono tabular"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
              >
                § {String(workouts.length).padStart(2, '0')}
              </div>
            </div>

            {historyLoading ? (
              <Skeleton className="h-20" />
            ) : workouts.length === 0 ? (
              <div
                style={{
                  padding: '20px 14px',
                  border: '1px dashed var(--b-rule)',
                  textAlign: 'center',
                }}
              >
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink-60)', fontStyle: 'italic' }}
                >
                  No workouts yet — your first session is one tap away.
                </p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {workouts.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/gym/workout/${w.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className="font-display"
                          style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
                        >
                          {w.dayName}
                        </div>
                        <div
                          className="font-mono tabular"
                          style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 2, letterSpacing: '0.04em' }}
                        >
                          {w.programName} · {w.startedAt?.toDate?.().toLocaleDateString() || ''}
                          {w.completedAt && (
                            <>
                              <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                              <span style={{ color: '#34d399' }}>complete</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          className="font-mono tabular"
                          style={{ fontSize: 12, color: 'var(--b-ink)' }}
                        >
                          {w.totalSets || 0}
                          <span
                            style={{ color: 'var(--b-ink-60)', marginLeft: 4 }}
                          >
                            sets
                          </span>
                        </div>
                        {w.totalVolume ? (
                          <div
                            className="font-mono tabular"
                            style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 1 }}
                          >
                            {Math.round(w.totalVolume).toLocaleString()} vol
                          </div>
                        ) : (
                          <div
                            className="font-mono"
                            style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 1, fontStyle: 'italic' }}
                          >
                            in progress
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Full routine cycle — every day in the active program laid out as
 * an editorial scannable list. Today's day is marked with an accent
 * eyebrow + filled-in left rule. Custom programs get an Edit link
 * to /gym/custom; static programs offer "Build your own" instead.
 */
function RoutineCycleView({
  program,
  currentDayIndex,
  isCustom,
}: {
  program: Program;
  currentDayIndex: number;
  isCustom: boolean;
}) {
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
          Full routine
        </div>
        <Link
          href="/gym/custom"
          className="font-body"
          style={{
            fontSize: 9,
            color: 'var(--b-accent)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          {isCustom ? 'Edit routine →' : 'Build your own →'}
        </Link>
      </div>
      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-60)',
          margin: '0 0 12px',
          lineHeight: 1.5,
        }}
      >
        {program.daysPerWeek}-day cycle. Days advance in order — skipping a calendar day doesn&rsquo;t skip a workout.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {program.schedule.map((day, idx) => {
          const isToday = idx === currentDayIndex;
          return (
            <li
              key={idx}
              style={{
                position: 'relative',
                padding: '12px 0 12px 14px',
                borderBottom: '1px solid var(--b-rule)',
                borderLeft: isToday ? '3px solid var(--b-accent)' : '3px solid transparent',
                background: isToday ? 'color-mix(in srgb, var(--b-accent) 5%, var(--b-paper))' : 'transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                  <span
                    className="font-mono tabular"
                    style={{
                      fontSize: 9,
                      color: isToday ? 'var(--b-accent)' : 'var(--b-ink-40)',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="font-display"
                    style={{
                      fontSize: 16,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {day.name}
                  </span>
                </div>
                {isToday && (
                  <span
                    className="spread"
                    style={{
                      fontSize: 9,
                      color: 'var(--b-accent)',
                      flexShrink: 0,
                    }}
                  >
                    Today
                  </span>
                )}
              </div>
              {day.exercises.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
                  {day.exercises.map((ex, j) => {
                    const meta = getExercise(ex.exerciseId);
                    return (
                      <li
                        key={j}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          alignItems: 'baseline',
                          gap: 8,
                          padding: '3px 0',
                        }}
                      >
                        <span
                          className="font-body"
                          style={{
                            fontSize: 12,
                            color: 'var(--b-ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {meta?.name || ex.exerciseId}
                        </span>
                        <span
                          className="font-mono tabular"
                          style={{
                            fontSize: 10,
                            color: 'var(--b-ink-60)',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          {ex.sets} × {ex.repsMin}
                          {ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  className="font-body"
                  style={{ fontSize: 11, color: 'var(--b-ink-40)', margin: '6px 0 0', fontStyle: 'italic' }}
                >
                  — rest day —
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Weekly schedule view ─────────────────────────────────────────
//
// Projects the active cycle onto Mon-Sun based on the user's chosen
// workout days. If they didn't pin specific days during onboarding,
// we spread daysPerWeek across the week with sensible defaults.
// Today's column is marked with aria-current and an accent border.
// Cycle advancement is still completion-based (not calendar-based) —
// a missed Tuesday doesn't bump Wednesday's prescription. The view
// is a planning surface, not a hard schedule.

type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const WEEKDAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABEL: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
const WEEKDAY_LONG: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Default day-spread when the user didn't pick specific days. */
function defaultWorkoutDays(count: number): DayKey[] {
  switch (Math.max(0, Math.min(7, count))) {
    case 0: return [];
    case 1: return ['wed'];
    case 2: return ['mon', 'thu'];
    case 3: return ['mon', 'wed', 'fri'];
    case 4: return ['mon', 'tue', 'thu', 'fri'];
    case 5: return ['mon', 'tue', 'wed', 'thu', 'fri'];
    case 6: return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    case 7: return [...WEEKDAY_ORDER];
    default: return ['mon', 'wed', 'fri'];
  }
}

function todayDayKey(): DayKey {
  // JS getDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const d = new Date().getDay();
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[d];
}

function WeeklyScheduleView({
  program,
  workoutDays,
}: {
  program: Program;
  workoutDays: DayKey[] | null;
}) {
  const cycleLen = program.schedule.length;
  if (cycleLen === 0) return null;

  // Resolve workout-day pins. If the user picked specific days, take
  // those (clamped to cycle length). Otherwise, spread cycle across
  // the week by daysPerWeek.
  const pinnedDays: DayKey[] = (() => {
    if (workoutDays && workoutDays.length > 0) {
      return WEEKDAY_ORDER.filter((d) => workoutDays.includes(d)).slice(0, cycleLen);
    }
    return defaultWorkoutDays(program.daysPerWeek).slice(0, cycleLen);
  })();

  // Mapping from weekday → cycle day index (or null for rest).
  const dayMap: Record<DayKey, number | null> = {
    mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null,
  };
  pinnedDays.forEach((d, i) => {
    dayMap[d] = i;
  });

  const today = todayDayKey();

  return (
    <section style={{ marginTop: 24 }} aria-labelledby="weekly-heading">
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
          gap: 8,
        }}
      >
        <h2
          id="weekly-heading"
          className="font-display"
          style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, margin: 0 }}
        >
          This week
        </h2>
        <span
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          Mon → Sun
        </span>
      </div>
      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-60)',
          margin: '0 0 12px',
          lineHeight: 1.5,
        }}
      >
        Your cycle pinned to weekdays. Cycle advances when you finish a workout — skipping a day
        doesn&rsquo;t skip a cycle position.
      </p>

      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '8px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          borderTop: '1px solid var(--b-rule)',
          borderBottom: '1px solid var(--b-rule)',
        }}
      >
        {WEEKDAY_ORDER.map((dKey) => {
          const cycleIdx = dayMap[dKey];
          const day = cycleIdx !== null ? program.schedule[cycleIdx] : null;
          const isToday = dKey === today;
          const isWorkout = day !== null;

          return (
            <li
              key={dKey}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${WEEKDAY_LONG[dKey]}${isToday ? ' (today)' : ''}: ${
                isWorkout ? `${day!.name}, ${day!.exercises.length} exercises` : 'rest day'
              }`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                border: isToday ? '1px solid var(--b-accent)' : '1px solid transparent',
                background: isToday ? 'color-mix(in srgb, var(--b-accent) 7%, var(--b-paper))' : 'transparent',
                minHeight: 92,
                position: 'relative',
              }}
            >
              <span
                className="spread"
                style={{
                  fontSize: 9,
                  color: isToday ? 'var(--b-accent)' : 'var(--b-ink-60)',
                  letterSpacing: '0.16em',
                }}
              >
                {WEEKDAY_LABEL[dKey]}
              </span>
              <span
                aria-hidden
                className="font-mono tabular"
                style={{
                  fontSize: 8.5,
                  color: 'var(--b-ink-40)',
                  letterSpacing: '0.04em',
                }}
              >
                {(() => {
                  // Compute the calendar date for THIS weekday in the
                  // current week (Mon-anchored).
                  const now = new Date();
                  const todayJsDay = now.getDay() === 0 ? 7 : now.getDay(); // 1..7, Mon=1
                  const targetJsDay = WEEKDAY_ORDER.indexOf(dKey) + 1;       // 1..7, Mon=1
                  const offset = targetJsDay - todayJsDay;
                  const target = new Date(now);
                  target.setDate(target.getDate() + offset);
                  return String(target.getDate()).padStart(2, '0');
                })()}
              </span>

              {isWorkout && day ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--b-accent)',
                      marginTop: 2,
                    }}
                  />
                  <span
                    className="font-display"
                    style={{
                      fontSize: 10.5,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      lineHeight: 1.15,
                      textAlign: 'center',
                      color: 'var(--b-ink)',
                      marginTop: 2,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {day.name}
                  </span>
                  <span
                    className="font-mono tabular"
                    style={{
                      fontSize: 8.5,
                      color: 'var(--b-ink-60)',
                      letterSpacing: '0.04em',
                      marginTop: 'auto',
                    }}
                  >
                    {day.exercises.length} ex
                  </span>
                </>
              ) : (
                <span
                  className="font-body"
                  style={{
                    fontSize: 10,
                    color: 'var(--b-ink-40)',
                    fontStyle: 'italic',
                    marginTop: 'auto',
                  }}
                >
                  rest
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
