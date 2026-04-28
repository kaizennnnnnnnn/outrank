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

/**
 * Gym pillar landing surface. Three modes:
 *
 *   1. **No active program** → renders the program picker.
 *   2. **Active program** → today's planned workout + recent history.
 *   3. **Loading** → skeletons.
 *
 * "Switch program" sits in the header so the user can change routes
 * without losing workout history (history persists across program
 * changes — gym state stays per-user, not per-program).
 */
export default function GymPage() {
  const { user } = useAuth();
  const { state, loading } = useGymState();
  const { workouts, loading: historyLoading } = useWorkoutHistory(8);
  const addToast = useUIStore((s) => s.addToast);
  const [switching, setSwitching] = useState(false);

  if (!user || loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!state?.activeProgramId) {
    return (
      <div className="max-w-3xl mx-auto">
        <GymProgramPicker />
      </div>
    );
  }

  const today = getTodaysDay(state);
  if (!today) {
    // Active program id is stale (program removed from constants).
    // Bounce the user back to the picker.
    return (
      <div className="max-w-3xl mx-auto">
        <GymProgramPicker />
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header strip — program identity + switch link */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">Gym</p>
          <h1 className="font-heading text-2xl font-bold text-white mt-0.5 leading-none">
            {today.program.name}
          </h1>
          <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
            {today.program.audience} · {state.totalWorkouts || 0} workouts logged
          </p>
        </div>
        <SwitchLink onClick={handleSwitch} disabled={switching} />
      </div>

      <TodayWorkoutCard program={today.program} day={today.day} dayIndex={today.dayIndex} />

      {/* History strip */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
              Recent Workouts
            </p>
          </div>
        </div>

        {historyLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : workouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#1e1e30] px-4 py-6 text-center">
            <p className="text-[12px] text-slate-500">
              No workouts yet — your first session is one tap away.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
            {workouts.map((w) => (
              <Link
                key={w.id}
                href={`/gym/workout/${w.id}`}
                className="block px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{w.dayName}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {w.programName} · {w.startedAt?.toDate?.().toLocaleDateString() || ''}
                      {w.completedAt && (
                        <>
                          <span className="text-slate-700 mx-1.5">·</span>
                          <span className="text-emerald-400">complete</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-mono text-white">
                      {w.totalSets || 0} <span className="text-slate-500">sets</span>
                    </p>
                    {w.totalVolume ? (
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {Math.round(w.totalVolume).toLocaleString()} vol
                      </p>
                    ) : (
                      <p className="text-[10px] font-mono text-slate-700 mt-0.5">in progress</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SwitchLink({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  // Use a button styled as a quiet link rather than a Button, so it
  // doesn't compete with the "Start workout" primary CTA below.
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled}>
      Switch program
    </Button>
  );
}
