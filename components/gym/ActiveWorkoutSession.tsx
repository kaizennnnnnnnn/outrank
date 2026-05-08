'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { Workout, WorkoutExercise, SetLog } from '@/types/gym';
import { ExerciseSetLogger } from './ExerciseSetLogger';
import { RestTimer } from './RestTimer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { updateWorkoutSets, completeWorkout } from '@/lib/gym';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';

interface Props {
  workoutId: string;
  workout: Workout;
}

/**
 * Editorial Direction B v2 active-workout orchestrator. Hairline header
 * with italic Fraunces day name, mono progress counter, flat ink fill
 * progress bar, and a single-action Finish/End-early control.
 *
 * The exercise stack and rest timer are unchanged in behaviour — they
 * have their own conversions; this file only changes the chrome.
 */
export function ActiveWorkoutSession({ workoutId, workout }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restNonce, setRestNonce] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [burst, setBurst] = useState(0);

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
      // Non-fatal — local state still reflects the user's input.
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
      const userAny = user as unknown as Record<string, unknown>;
      const customProgram = userAny.customProgram as import('@/types/gym').Program | undefined;
      await completeWorkout({
        userId: user.uid,
        workoutId,
        workout: { ...workout, exercises },
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        customProgram,
      });
      haptic('success');
      setBurst((n) => n + 1);
      addToast({ type: 'success', message: 'Workout complete — filed to today\'s record.' });
      setTimeout(() => router.push('/gym'), 600);
    } catch {
      addToast({ type: 'error', message: 'Could not save workout' });
      setCompleting(false);
    }
  };

  const finishLabel = allDone ? 'Finish' : 'End early';
  const finishIsCta = allDone;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 128 }}>
      <ParticleBurst trigger={burst} color="#a85a3a" count={50} />

      {/* Header — program/day + progress + finish button */}
      <div
        style={{
          padding: '14px 0 14px 14px',
          borderTop: '2px solid var(--b-ink)',
          borderBottom: '1px solid var(--b-ink)',
          borderLeft: '2px solid var(--b-accent)',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
              Active Workout
            </div>
            <h1
              className="font-display"
              style={{
                fontSize: 24,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.05,
                margin: '4px 0 0',
                color: 'var(--b-ink)',
              }}
            >
              {workout.dayName}
            </h1>
            <p
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', margin: '4px 0 0', letterSpacing: '0.04em' }}
            >
              {workout.programName}
            </p>
          </div>
          <button
            onClick={() => setConfirmFinish(true)}
            disabled={completing}
            className="font-body"
            style={{
              flexShrink: 0,
              height: 32,
              padding: '0 14px',
              border: '1px solid var(--b-ink)',
              background: finishIsCta ? 'var(--b-ink)' : 'transparent',
              color: finishIsCta ? 'var(--b-paper)' : 'var(--b-ink)',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: completing ? 'not-allowed' : 'pointer',
              opacity: completing ? 0.6 : 1,
            }}
          >
            {completing ? '…' : finishLabel}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: 2, background: 'var(--b-rule)', overflow: 'hidden', marginRight: 14 }}>
          <motion.div
            style={{ height: '100%', background: 'var(--b-accent)' }}
            initial={false}
            animate={{ width: `${(completedSets / Math.max(totalSets, 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 6 }}
        >
          <span style={{ color: 'var(--b-ink)' }}>{completedSets}</span>
          <span> / {totalSets} sets</span>
        </p>
      </div>

      {/* Exercise stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {/* Rest timer */}
      {restSeconds > 0 && (
        <RestTimer
          key={restNonce}
          seconds={restSeconds}
          onDone={() => setRestSeconds(0)}
          color="var(--b-accent)"
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
