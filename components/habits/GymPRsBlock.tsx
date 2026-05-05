'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkoutHistory } from '@/hooks/useGymState';
import { Skeleton } from '@/components/ui/Skeleton';

interface PR {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  bestReps: number;
  bestWeight: number;
  bestVolume: number;  // bestReps * bestWeight (single set)
  achievedAt: number;  // ms timestamp of the workout the PR was set in
}

/**
 * Gym-only personal-records block. Scans the user's recent workouts
 * (capped at 30 sessions) and surfaces the heaviest single set per
 * exercise — the standard "what's my PR" view that lift apps lead
 * with.
 *
 * Editorial Direction B v2: paper background, hairline border with a
 * 2px ink top-rule, italic display weight in accent ink. PRs are
 * bounded by the workout history window: anything older than ~30
 * sessions falls off this view but is still in the underlying data.
 */
export function GymPRsBlock() {
  const { workouts, loading } = useWorkoutHistory(30);

  const prs = useMemo<PR[]>(() => {
    const byExercise = new Map<string, PR>();
    for (const w of workouts) {
      const t = w.startedAt?.toDate?.()?.getTime?.() || 0;
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (!s.completed) continue;
          const candidate: PR = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            primaryMuscle: ex.primaryMuscle,
            bestReps: s.reps,
            bestWeight: s.weight,
            bestVolume: s.reps * s.weight,
            achievedAt: t,
          };
          const existing = byExercise.get(ex.exerciseId);
          if (
            !existing ||
            candidate.bestWeight > existing.bestWeight ||
            (candidate.bestWeight === existing.bestWeight && candidate.bestReps > existing.bestReps)
          ) {
            byExercise.set(ex.exerciseId, candidate);
          }
        }
      }
    }
    return Array.from(byExercise.values()).sort((a, b) => {
      // Bodyweight (weight=0) sorts after weighted lifts
      if ((a.bestWeight === 0) !== (b.bestWeight === 0)) {
        return a.bestWeight === 0 ? 1 : -1;
      }
      if (b.bestWeight !== a.bestWeight) return b.bestWeight - a.bestWeight;
      return b.bestReps - a.bestReps;
    });
  }, [workouts]);

  if (loading) {
    return <Skeleton className="h-32" />;
  }

  if (prs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-rule)',
        borderTop: '2px solid var(--b-ink)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          padding: '16px 16px 12px',
        }}
      >
        <p
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-accent)' }}
        >
          Personal records
        </p>
        <span
          className="font-body tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
        >
          · {prs.length} exercise{prs.length === 1 ? '' : 's'}
        </span>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {prs.slice(0, 8).map((pr, i) => (
          <li
            key={pr.exerciseId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--b-rule)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p
                className="font-display"
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  color: 'var(--b-ink)',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {pr.exerciseName}
              </p>
              <p
                className="spread"
                style={{
                  fontSize: 9,
                  color: 'var(--b-ink-40)',
                  marginTop: 2,
                  textTransform: 'capitalize',
                }}
              >
                {pr.primaryMuscle}
              </p>
            </div>
            <p
              className="font-body tabular"
              style={{ fontSize: 12, color: 'var(--b-ink)', flexShrink: 0 }}
            >
              <span
                className="font-display"
                style={{ fontStyle: 'italic', fontWeight: 600 }}
              >
                {pr.bestReps}
              </span>
              <span style={{ color: 'var(--b-ink-40)', margin: '0 4px' }}>×</span>
              {pr.bestWeight > 0 ? (
                <>
                  <span
                    className="font-display"
                    style={{
                      fontStyle: 'italic',
                      fontWeight: 600,
                      color: 'var(--b-accent)',
                    }}
                  >
                    {pr.bestWeight}
                  </span>
                  <span style={{ color: 'var(--b-ink-40)', marginLeft: 2 }}>kg</span>
                </>
              ) : (
                <span style={{ color: 'var(--b-ink-60)' }}>bw</span>
              )}
            </p>
          </li>
        ))}
      </ul>

      {prs.length > 8 && (
        <p
          className="font-body tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-40)',
            textAlign: 'center',
            padding: '8px 16px',
            borderTop: '1px solid var(--b-rule)',
            fontStyle: 'italic',
          }}
        >
          +{prs.length - 8} more in your history
        </p>
      )}
    </motion.div>
  );
}
