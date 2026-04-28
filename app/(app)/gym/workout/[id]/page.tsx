'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useWorkout } from '@/hooks/useGymState';
import { ActiveWorkoutSession } from '@/components/gym/ActiveWorkoutSession';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityIcon } from '@/components/ui/AppIcons';
import { formatRelativeTime } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Active workout route. If the workout is still in progress, mounts
 * the ActiveWorkoutSession orchestrator. If it's already completed,
 * renders a read-only summary so the user can review past sessions
 * from /gym's history list.
 */
export default function GymWorkoutPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const { workout, loading } = useWorkout(user?.uid, id);

  if (!user || loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ActivityIcon size={40} className="text-orange-400" />}
          title="Workout not found"
          description="This session may have been deleted, or it doesn't belong to your account."
          action={
            <Link href="/gym" className="text-orange-400 hover:underline text-sm">
              Back to gym
            </Link>
          }
        />
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
    <div className="max-w-3xl mx-auto space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(34,197,94,0.15), transparent 55%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(34,197,94,0.25)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
          Completed
        </p>
        <h1 className="font-heading text-2xl font-bold text-white mt-1 leading-none">
          {workout.dayName}
        </h1>
        <p className="text-[11px] font-mono text-slate-500 mt-1.5">
          {workout.programName}
          {completedAt && (
            <>
              <span className="text-slate-700 mx-1.5">·</span>
              {formatRelativeTime(completedAt)}
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Sets
            </p>
            <p className="font-heading text-2xl font-bold text-white mt-0.5">
              {workout.totalSets || 0}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Volume
            </p>
            <p className="font-heading text-2xl font-bold text-white mt-0.5">
              {Math.round(workout.totalVolume || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
        {workout.exercises.map((ex) => {
          const completed = ex.sets.filter((s) => s.completed);
          const heaviest = completed.reduce<{ reps: number; weight: number } | null>(
            (best, s) => (!best || s.weight > best.weight ? { reps: s.reps, weight: s.weight } : best),
            null,
          );
          return (
            <div key={ex.exerciseId + workoutId} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ex.exerciseName}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    <span className="capitalize">{ex.primaryMuscle}</span>
                    <span className="text-slate-700 mx-1.5">·</span>
                    {completed.length} of {ex.sets.length} sets
                  </p>
                </div>
                {heaviest && (
                  <p className="text-[11px] font-mono text-slate-300 flex-shrink-0">
                    <span>{heaviest.reps}</span>
                    <span className="text-slate-600 mx-0.5">×</span>
                    <span>{heaviest.weight}</span>
                    <span className="text-slate-600 ml-0.5">{heaviest.weight > 0 ? 'kg' : 'bw'}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {ex.sets.map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: s.completed ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${s.completed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      color: s.completed ? '#86efac' : '#475569',
                    }}
                  >
                    {s.completed ? `${s.reps}×${s.weight || 'bw'}` : '—'}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/gym"
        className="block text-center text-[11px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300"
      >
        Back to gym →
      </Link>
    </div>
  );
}
