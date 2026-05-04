'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWorkout } from '@/hooks/useGymState';
import { ActiveWorkoutSession } from '@/components/gym/ActiveWorkoutSession';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import { Masthead } from '@/components/editorial/Masthead';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GymWorkoutPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const { workout, loading } = useWorkout(user?.uid, id);

  if (!user || loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-24" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            Workout not found.
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            This session may have been deleted, or it doesn&rsquo;t belong to your account.
          </p>
          <Link
            href="/gym"
            className="font-body"
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '8px 14px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--b-paper)',
              background: 'var(--b-ink)',
              textDecoration: 'none',
            }}
          >
            Back to gym →
          </Link>
        </div>
      </div>
    );
  }

  if (workout.completedAt) {
    return <CompletedSummary workout={workout} workoutId={id} />;
  }

  return <ActiveWorkoutSession workoutId={id} workout={workout} />;
}

function CompletedSummary({
  workout,
  workoutId,
}: {
  workout: import('@/types/gym').Workout;
  workoutId: string;
}) {
  const completedAt = workout.completedAt?.toDate();
  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Completed" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div
            style={{
              paddingTop: 4,
              paddingBottom: 14,
              borderTop: '2px solid #34d399',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: '#34d399' }}>
              Workout Complete
            </div>
            <h1
              className="font-display"
              style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '4px 0' }}
            >
              <em style={{ fontStyle: 'italic' }}>{workout.dayName}</em>
            </h1>
            <p
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', letterSpacing: '0.04em' }}
            >
              {workout.programName}
              {completedAt && (
                <>
                  <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                  {formatRelativeTime(completedAt)}
                </>
              )}
            </p>
            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                border: '1px solid var(--b-rule)',
              }}
            >
              <div style={{ padding: '12px 16px', borderRight: '1px solid var(--b-rule)' }}>
                <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)' }}>
                  Sets
                </div>
                <div
                  className="font-display tabular"
                  style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 4 }}
                >
                  {workout.totalSets || 0}
                </div>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)' }}>
                  Volume
                </div>
                <div
                  className="font-display tabular"
                  style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginTop: 4 }}
                >
                  {Math.round(workout.totalVolume || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
              Exercises
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(workout.exercises.length).padStart(2, '0')}
            </div>
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {workout.exercises.map((ex) => {
              const completed = ex.sets.filter((s) => s.completed);
              const heaviest = completed.reduce<{ reps: number; weight: number } | null>(
                (best, s) => (!best || s.weight > best.weight ? { reps: s.reps, weight: s.weight } : best),
                null,
              );
              return (
                <li
                  key={ex.exerciseId + workoutId}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--b-rule)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-display"
                        style={{ fontSize: 15, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
                      >
                        {ex.exerciseName}
                      </div>
                      <div
                        className="font-mono tabular"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.04em', textTransform: 'capitalize' }}
                      >
                        {ex.primaryMuscle}
                        <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                        {completed.length} of {ex.sets.length} sets
                      </div>
                    </div>
                    {heaviest && (
                      <div
                        className="font-mono tabular"
                        style={{ fontSize: 11, color: 'var(--b-ink)', flexShrink: 0 }}
                      >
                        {heaviest.reps}
                        <span style={{ color: 'var(--b-ink-40)', margin: '0 2px' }}>×</span>
                        {heaviest.weight}
                        <span style={{ color: 'var(--b-ink-40)', marginLeft: 2 }}>
                          {heaviest.weight > 0 ? 'kg' : 'bw'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {ex.sets.map((s, i) => (
                      <span
                        key={i}
                        className="font-mono tabular"
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          background: s.completed ? 'rgba(34,197,94,0.12)' : 'transparent',
                          border: `1px solid ${s.completed ? '#34d39966' : 'var(--b-rule)'}`,
                          color: s.completed ? '#34d399' : 'var(--b-ink-40)',
                        }}
                      >
                        {s.completed ? `${s.reps}×${s.weight || 'bw'}` : '—'}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <Link
              href="/gym"
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--b-accent)',
                textDecoration: 'none',
              }}
            >
              Back to gym →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
