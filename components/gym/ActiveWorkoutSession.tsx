'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { Workout, WorkoutExercise, SetLog } from '@/types/gym';
import { ExerciseSetLogger } from './ExerciseSetLogger';
import { RestTimer } from './RestTimer';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { updateWorkoutSets, completeWorkout } from '@/lib/gym';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';

interface Props {
  workoutId: string;
  workout: Workout;
}

/**
 * Active workout orchestrator. Renders each prescribed exercise as an
 * ExerciseSetLogger card, tracks which exercise is currently "active"
 * (the one whose sets aren't fully done), drives the rest timer
 * between sets, and handles workout completion → fires the gym log →
 * routes back to /gym with the recap flight in motion.
 *
 * Persistence: every set update writes through to the workout doc via
 * updateWorkoutSets. The doc is the source of truth — refreshing the
 * page mid-workout doesn't lose state.
 */
export function ActiveWorkoutSession({ workoutId, workout }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restNonce, setRestNonce] = useState(0); // forces RestTimer remount to re-trigger
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [burst, setBurst] = useState(0);

  // The "active" exercise is the first one with incomplete sets — the
  // user's natural focus point. Once everything is done we let any of
  // them stay editable.
  const activeIdx = exercises.findIndex((ex) => ex.sets.some((s) => !s.completed));
  const allDone = activeIdx === -1;

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (s, e) => s + e.sets.filter((set) => set.completed).length,
    0,
  );

  const updateExerciseSets = async (exIdx: number, sets: SetLog[]) => {
    const next = exercises.map((e, i) => (i === exIdx ? { ...e, sets } : e));
    setExercises(next);
    if (!user) return;
    try {
      await updateWorkoutSets(user.uid, workoutId, next);
    } catch {
      // Non-fatal — local state still reflects the user's input. They
      // can finish the workout and the completeWorkout call will write
      // the final state.
    }
  };

  const handleSetCompleted = (sec: number) => {
    setRestSeconds(sec);
    setRestNonce((n) => n + 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setConfirmFinish(false);
    setCompleting(true);
    try {
      await completeWorkout({
        userId: user.uid,
        workoutId,
        workout: { ...workout, exercises },
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        programPath: 'lift', // overridden inside completeWorkout via program lookup; kept for type
      });
      haptic('success');
      setBurst((n) => n + 1);
      addToast({ type: 'success', message: 'Workout complete — filed to today\'s record.' });
      // Brief delay so the burst is visible before route change
      setTimeout(() => router.push('/gym'), 600);
    } catch {
      addToast({ type: 'error', message: 'Could not save workout' });
      setCompleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-32">
      <ParticleBurst trigger={burst} color="#ef4444" count={50} />

      {/* Header — program/day + progress bar + finish button */}
      <div
        className="relative overflow-hidden rounded-2xl border p-4"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(239,68,68,0.18), transparent 55%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(239,68,68,0.25)',
          boxShadow: '0 0 24px -14px rgba(239,68,68,0.4), inset 0 1px 0 rgba(239,68,68,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">
              Active Workout
            </p>
            <h1 className="font-heading text-xl font-bold text-white mt-0.5 leading-none">
              {workout.dayName}
            </h1>
            <p className="text-[11px] font-mono text-slate-500 mt-1">{workout.programName}</p>
          </div>
          <Button
            variant={allDone ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setConfirmFinish(true)}
            loading={completing}
          >
            {allDone ? 'Finish' : 'End early'}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30]">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
              boxShadow: '0 0 10px rgba(239,68,68,0.6)',
            }}
            initial={false}
            animate={{ width: `${(completedSets / Math.max(totalSets, 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] font-mono text-slate-500 mt-1.5">
          <span className="text-white">{completedSets}</span>
          <span className="text-slate-600"> / {totalSets} sets</span>
        </p>
      </div>

      {/* Exercise stack */}
      <div className="space-y-3">
        {exercises.map((ex, i) => (
          <ExerciseSetLogger
            key={`${ex.exerciseId}-${i}`}
            exercise={ex}
            isActive={i === activeIdx || allDone}
            onChange={(sets) => updateExerciseSets(i, sets)}
            onSetCompleted={handleSetCompleted}
          />
        ))}
      </div>

      {/* Rest timer — only one slot, parent controls when it shows.
          Remount via key={restNonce} so a new set restarts cleanly. */}
      {restSeconds > 0 && (
        <RestTimer
          key={restNonce}
          seconds={restSeconds}
          onDone={() => setRestSeconds(0)}
          color="#ef4444"
        />
      )}

      <ConfirmDialog
        isOpen={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={handleFinish}
        title={allDone ? 'Finish workout?' : 'End workout early?'}
        description={
          allDone
            ? `${completedSets} sets logged across ${exercises.length} exercises. We'll file it to today's record and advance your program.`
            : `Only ${completedSets} of ${totalSets} sets are logged. We'll save what you've got and still advance your program.`
        }
        confirmText={allDone ? 'Finish' : 'End early'}
        loading={completing}
      />
    </div>
  );
}
