'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { WorkoutExercise, SetLog } from '@/types/gym';
import { getExercise } from '@/constants/exercises';
import { getLastSetForExercise } from '@/lib/gym';
import { haptic } from '@/lib/haptics';

interface Props {
  exercise: WorkoutExercise;
  isActive: boolean;
  onChange: (sets: SetLog[]) => void;
  /** Caller fires the rest timer when a set is completed. */
  onSetCompleted: (restSec: number) => void;
}

/**
 * One exercise inside the active workout. Renders a compact card with:
 *
 *   - Exercise name + form cue + last-time numbers (best set in the
 *     last ~10 workouts).
 *   - A row per prescribed set with editable weight + reps and a
 *     check-off button. Tapping check stamps the set complete and
 *     fires the rest timer via the parent.
 *
 * Sets are mutated in-memory and reported up via `onChange` — the
 * parent persists to Firestore on every change. Last-time data is
 * fetched once on mount per exercise.
 */
export function ExerciseSetLogger({ exercise, isActive, onChange, onSetCompleted }: Props) {
  const { user } = useAuth();
  const ex = getExercise(exercise.exerciseId);
  const restSec = ex?.defaultRestSec || 90;
  const [lastSet, setLastSet] = useState<{ reps: number; weight: number } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getLastSetForExercise(user.uid, exercise.exerciseId)
      .then((res) => {
        if (!cancelled) setLastSet(res);
      })
      .catch(() => { /* non-fatal — no last-time hint shown */ });
    return () => { cancelled = true; };
  }, [user?.uid, exercise.exerciseId]);

  const updateSet = (idx: number, patch: Partial<SetLog>) => {
    const next = exercise.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const completeSet = (idx: number) => {
    const set = exercise.sets[idx];
    if (set.completed) {
      // Toggle off — un-complete
      updateSet(idx, { completed: false });
      return;
    }
    if (set.reps <= 0) {
      // Don't fire the rest timer for an empty set
      haptic('error');
      return;
    }
    updateSet(idx, { completed: true });
    haptic('success');
    onSetCompleted(restSec);
  };

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const allDone = completedCount === exercise.sets.length;

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.55 }}
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: isActive
          ? 'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(239,68,68,0.12), transparent 55%), linear-gradient(160deg, #10101a 0%, #0b0b14 100%)'
          : 'linear-gradient(160deg, rgba(16,16,26,0.6), rgba(11,11,20,0.4))',
        borderColor: isActive ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.05)',
        boxShadow: isActive ? '0 0 24px -12px rgba(239,68,68,0.5)' : undefined,
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{exercise.exerciseName}</p>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
              {exercise.prescribedSets} × {exercise.prescribedRepsMin}–{exercise.prescribedRepsMax} reps
              {ex?.primaryMuscle && (
                <>
                  <span className="text-slate-700 mx-1.5">·</span>
                  <span className="capitalize">{ex.primaryMuscle}</span>
                </>
              )}
            </p>
            {ex?.cue && (
              <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{ex.cue}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Done
            </p>
            <p className="font-mono text-sm font-bold text-white">
              {completedCount}<span className="text-slate-600">/{exercise.sets.length}</span>
            </p>
          </div>
        </div>

        {lastSet && (
          <p className="text-[10px] font-mono text-slate-500 mb-3">
            <span className="text-slate-600 uppercase tracking-widest mr-1">Last:</span>
            <span className="text-slate-300">{lastSet.reps}</span>
            <span className="text-slate-600 mx-0.5">×</span>
            <span className="text-slate-300">{lastSet.weight}</span>
            <span className="text-slate-600 ml-0.5">{lastSet.weight > 0 ? 'kg' : 'bw'}</span>
          </p>
        )}

        {/* Set rows */}
        <div className="space-y-1.5">
          {exercise.sets.map((set, i) => (
            <SetRow
              key={i}
              setIndex={i}
              set={set}
              onUpdate={(patch) => updateSet(i, patch)}
              onComplete={() => completeSet(i)}
              isActive={isActive}
            />
          ))}
        </div>

        {allDone && (
          <p className="text-[11px] text-emerald-400 mt-3 text-center font-mono">
            All sets logged.
          </p>
        )}
      </div>
    </motion.div>
  );
}

function SetRow({
  setIndex,
  set,
  onUpdate,
  onComplete,
  isActive,
}: {
  setIndex: number;
  set: SetLog;
  onUpdate: (patch: Partial<SetLog>) => void;
  onComplete: () => void;
  isActive: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: set.completed
          ? 'linear-gradient(90deg, rgba(34,197,94,0.10), rgba(11,11,20,0.5))'
          : 'rgba(11,11,20,0.5)',
        border: `1px solid ${set.completed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.04)'}`,
      }}
    >
      <span className="text-[10px] font-mono text-slate-500 w-6 flex-shrink-0">
        #{setIndex + 1}
      </span>
      <NumField
        label="kg"
        value={set.weight}
        onChange={(v) => onUpdate({ weight: v })}
        disabled={!isActive || set.completed}
      />
      <span className="text-slate-700 text-xs">×</span>
      <NumField
        label="reps"
        value={set.reps}
        onChange={(v) => onUpdate({ reps: v })}
        disabled={!isActive || set.completed}
      />
      <button
        onClick={onComplete}
        disabled={!isActive}
        className="ml-auto w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50"
        style={{
          background: set.completed
            ? 'rgba(34,197,94,0.3)'
            : 'rgba(239,68,68,0.15)',
          border: `1.5px solid ${set.completed ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.5)'}`,
          boxShadow: set.completed ? '0 0 10px rgba(34,197,94,0.4)' : undefined,
        }}
        aria-label={set.completed ? 'Un-complete set' : 'Complete set'}
      >
        {set.completed ? (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'opacity-70' : ''}`}>
      <input
        type="number"
        value={value || ''}
        disabled={disabled}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(isFinite(n) ? n : 0);
        }}
        placeholder="0"
        inputMode="decimal"
        className="w-14 bg-[#0b0b14] border border-[#1e1e30] rounded-md px-2 py-1 font-mono text-sm font-bold text-white focus:outline-none focus:border-red-400/50 disabled:cursor-not-allowed"
      />
      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600 ml-1.5">
        {label}
      </span>
    </label>
  );
}
