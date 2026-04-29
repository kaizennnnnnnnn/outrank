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
 * Rendered only on /habits/gym. PRs are bounded by the workout
 * history window: anything older than ~30 sessions falls off this
 * view but is still in the underlying data.
 *
 * Sort: heaviest weight first, ties broken by reps. Bodyweight (kg=0)
 * ranked last so e.g. a 100kg deadlift outranks a 25-rep pushup.
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
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (prs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(239,68,68,0.10) 0%, rgba(11,11,20,0.7) 70%)',
        borderColor: 'rgba(239,68,68,0.28)',
      }}
    >
      <div className="flex items-center gap-2 px-4 pt-4 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
          Personal records
        </p>
        <span className="text-[10px] font-mono text-slate-500 ml-1">
          · {prs.length} exercise{prs.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {prs.slice(0, 8).map((pr) => (
          <div key={pr.exerciseId} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{pr.exerciseName}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 capitalize">
                {pr.primaryMuscle}
              </p>
            </div>
            <p className="text-[12px] font-mono text-white flex-shrink-0">
              <span className="font-bold">{pr.bestReps}</span>
              <span className="text-slate-600 mx-1">×</span>
              {pr.bestWeight > 0 ? (
                <>
                  <span className="font-bold" style={{ color: '#fca5a5' }}>{pr.bestWeight}</span>
                  <span className="text-slate-600 ml-0.5">kg</span>
                </>
              ) : (
                <span className="text-slate-400">bw</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {prs.length > 8 && (
        <p className="text-[10px] font-mono text-slate-600 text-center px-4 py-2 border-t border-white/[0.04]">
          +{prs.length - 8} more in your history
        </p>
      )}
    </motion.div>
  );
}
