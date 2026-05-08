'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { Program, ProgramDay } from '@/types/gym';
import { startWorkout } from '@/lib/gym';
import { getExercise } from '@/constants/exercises';

interface Props {
  program: Program;
  day: ProgramDay;
  dayIndex: number;
}

/**
 * Editorial Direction B v2 — today's planned session card. Replaces the
 * red-glow hero with a paper card: 2px ink top rule, accent left
 * stripe, italic Fraunces day name, hairline-bordered exercise list.
 */
export function TodayWorkoutCard({ program, day, dayIndex }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [starting, setStarting] = useState(false);

  const totalSets = day.exercises.reduce((s, e) => s + e.sets, 0);

  const handleStart = async () => {
    if (!user) return;
    setStarting(true);
    try {
      // Pass the custom program through so 'custom' resolves to the
      // user-built schedule when starting the workout.
      const userAny = user as unknown as Record<string, unknown>;
      const customProgram = userAny.customProgram as import('@/types/gym').Program | undefined;
      const id = await startWorkout(user.uid, program.id, dayIndex, customProgram);
      router.push(`/gym/workout/${id}`);
    } catch {
      addToast({ type: 'error', message: 'Could not start workout' });
      setStarting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        borderTop: '2px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-ink)',
        borderLeft: '2px solid var(--b-accent)',
        paddingLeft: 14,
      }}
    >
      <div style={{ padding: '14px 16px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
              Today&rsquo;s Workout
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 26,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.05,
                margin: '4px 0 0',
                color: 'var(--b-ink)',
              }}
            >
              {day.name}
            </h2>
            <p
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '4px 0 0', letterSpacing: '0.04em' }}
            >
              {program.shortName} · day {dayIndex + 1} of {program.schedule.length}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p
              className="font-display tabular"
              style={{ fontSize: 26, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, margin: 0 }}
            >
              {day.exercises.length}
            </p>
            <p className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}>
              Exercises
            </p>
            <p
              className="font-display tabular"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, margin: '8px 0 0' }}
            >
              {totalSets}
            </p>
            <p className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 3 }}>
              Sets
            </p>
          </div>
        </div>

        {/* Exercise preview list */}
        <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, border: '1px solid var(--b-rule)' }}>
          {day.exercises.map((p, idx) => {
            const ex = getExercise(p.exerciseId);
            return (
              <li
                key={p.exerciseId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--b-rule)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 13,
                      color: 'var(--b-ink)',
                      fontWeight: 500,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ex?.name || p.exerciseId}
                  </p>
                  {p.note && (
                    <p
                      style={{
                        fontSize: 10,
                        color: 'var(--b-ink-60)',
                        margin: '2px 0 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.note}
                    </p>
                  )}
                </div>
                <p
                  className="font-mono tabular"
                  style={{
                    fontSize: 11,
                    color: 'var(--b-ink-60)',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  <span style={{ color: 'var(--b-ink)' }}>{p.sets}</span>
                  <span style={{ margin: '0 4px' }}>×</span>
                  <span style={{ color: 'var(--b-ink)' }}>{p.repsMin}–{p.repsMax}</span>
                </p>
              </li>
            );
          })}
        </ul>

        <button
          onClick={handleStart}
          disabled={starting}
          className="font-body"
          style={{
            width: '100%',
            height: 44,
            border: '1px solid var(--b-ink)',
            background: starting ? 'transparent' : 'var(--b-ink)',
            color: starting ? 'var(--b-ink-40)' : 'var(--b-paper)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: starting ? 'not-allowed' : 'pointer',
          }}
        >
          {starting ? 'Starting…' : 'Start workout →'}
        </button>
      </div>
    </motion.div>
  );
}
