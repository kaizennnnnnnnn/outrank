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

  const today = getTodaysDay(state);
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
