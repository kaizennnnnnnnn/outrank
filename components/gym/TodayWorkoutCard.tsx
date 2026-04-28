'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Program, ProgramDay } from '@/types/gym';
import { startWorkout } from '@/lib/gym';
import { getExercise } from '@/constants/exercises';

interface Props {
  program: Program;
  day: ProgramDay;
  dayIndex: number;
}

/**
 * Today's planned session, rendered on /gym when the user has an
 * active program. Shows the day's name, total sets, total exercises,
 * and the prescribed list (reps × sets per exercise). The big CTA
 * starts a fresh Workout doc and routes to the active session page.
 *
 * Design: hero-card style with a category-colored left edge so it
 * matches the look of the recap detail and dashboard hero.
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
      const id = await startWorkout(user.uid, program.id, dayIndex);
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
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background:
          'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(239,68,68,0.18), transparent 55%),' +
          'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
        borderColor: 'rgba(239,68,68,0.25)',
        boxShadow: '0 0 30px -14px rgba(239,68,68,0.4), inset 0 1px 0 rgba(239,68,68,0.08)',
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: 'linear-gradient(180deg, #ef4444, rgba(239,68,68,0.4) 70%, transparent)',
          boxShadow: '0 0 12px rgba(239,68,68,0.7)',
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">
              Today&rsquo;s Workout
            </p>
            <h2 className="font-heading text-2xl font-bold text-white mt-1 leading-none">
              {day.name}
            </h2>
            <p className="text-[11px] font-mono text-slate-500 mt-1.5">
              {program.shortName} · day {dayIndex + 1} of {program.schedule.length}
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold text-white leading-none">{day.exercises.length}</p>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-1">exercises</p>
            <p className="font-heading text-base font-bold text-white leading-none mt-2">{totalSets}</p>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">sets</p>
          </div>
        </div>

        {/* Exercise preview list */}
        <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden mb-4">
          {day.exercises.map((p) => {
            const ex = getExercise(p.exerciseId);
            return (
              <div key={p.exerciseId} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">
                    {ex?.name || p.exerciseId}
                  </p>
                  {p.note && (
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{p.note}</p>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 flex-shrink-0 ml-3">
                  <span className="text-white">{p.sets}</span>
                  <span className="text-slate-600 mx-1">×</span>
                  <span className="text-white">{p.repsMin}–{p.repsMax}</span>
                </p>
              </div>
            );
          })}
        </div>

        <Button className="w-full" onClick={handleStart} loading={starting}>
          Start workout
        </Button>
      </div>
    </motion.div>
  );
}
