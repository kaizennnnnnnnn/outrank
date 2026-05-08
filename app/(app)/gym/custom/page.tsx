'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { Masthead } from '@/components/editorial/Masthead';
import { Skeleton } from '@/components/ui/Skeleton';
import { EXERCISES } from '@/constants/exercises';
import { selectCustomProgram } from '@/lib/gym';
import { Program, ProgramDay, Exercise } from '@/types/gym';

/**
 * Custom workout builder. The user picks how many days the routine
 * cycles through, names each day, and adds exercises from the catalog.
 * Saved to users/{uid}.customProgram and the program is set as the
 * active program (id='custom'). The /gym page renders it like any
 * other program; getTodaysDay / instantiateWorkout look up the
 * customProgram off the user doc when activeProgramId === 'custom'.
 */

interface DraftExercise {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
}

interface DraftDay {
  name: string;
  exercises: DraftExercise[];
}

const DEFAULT_DAY_NAMES = ['Workout A', 'Workout B', 'Workout C', 'Workout D', 'Workout E', 'Workout F', 'Workout G'];

export default function CustomGymPage() {
  const { user } = useAuth();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const [name, setName] = useState('My Routine');
  const [days, setDays] = useState<DraftDay[]>([
    { name: 'Workout A', exercises: [] },
  ]);
  const [pickerForDay, setPickerForDay] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const totalExercises = useMemo(
    () => days.reduce((sum, d) => sum + d.exercises.length, 0),
    [days],
  );
  const canSave = totalExercises > 0 && days.every((d) => d.exercises.length > 0);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISES;
    return EXERCISES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscle.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q),
    );
  }, [search]);

  const addDay = () => {
    if (days.length >= 7) return;
    setDays((d) => [...d, { name: DEFAULT_DAY_NAMES[d.length] || `Workout ${d.length + 1}`, exercises: [] }]);
  };
  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays((d) => d.filter((_, i) => i !== idx));
  };
  const renameDay = (idx: number, value: string) => {
    setDays((d) => d.map((day, i) => (i === idx ? { ...day, name: value } : day)));
  };
  const addExercise = (dayIdx: number, exId: string) => {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { exerciseId: exId, sets: 3, repsMin: 8, repsMax: 12 },
              ],
            }
          : day,
      ),
    );
    setPickerForDay(null);
    setSearch('');
  };
  const removeExercise = (dayIdx: number, exIdx: number) => {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) }
          : day,
      ),
    );
  };
  const updateExercise = (dayIdx: number, exIdx: number, patch: Partial<DraftExercise>) => {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              exercises: day.exercises.map((e, j) => (j === exIdx ? { ...e, ...patch } : e)),
            }
          : day,
      ),
    );
  };

  const save = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      // Most exercises in the catalog are 'lift'. If every selected
      // exercise is bodyweight + calisthenics-flagged, mark the
      // program as calisthenics; otherwise default to lift.
      const allBodyweight = days.every((day) =>
        day.exercises.every((e) => {
          const ex = EXERCISES.find((c) => c.id === e.exerciseId);
          return ex?.path === 'calisthenics';
        }),
      );
      const program: Program = {
        id: 'custom',
        name: name.trim() || 'My Routine',
        shortName: 'Custom',
        daysPerWeek: days.length,
        path: allBodyweight ? 'calisthenics' : 'lift',
        description: 'Built by you. Edit any time from the gym tab.',
        audience: `Custom · ${days.length} day${days.length === 1 ? '' : 's'} per cycle`,
        schedule: days.map<ProgramDay>((d) => ({
          name: d.name.trim() || 'Workout',
          exercises: d.exercises,
        })),
      };
      await selectCustomProgram(user.uid, program);
      addToast({ type: 'success', message: 'Routine saved — ready to go.' });
      router.push('/gym');
    } catch {
      addToast({ type: 'error', message: 'Could not save routine' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Build your routine" />
        <div style={{ padding: '0 22px' }}>
          {/* Header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
            Custom Routine
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Build your own.</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 420, lineHeight: 1.55 }}
          >
            Mirror what you&rsquo;re already doing. Pick how many days the routine cycles through, name each day, and stack exercises from the catalog.
          </p>

          {/* Routine name */}
          <div style={{ marginTop: 18 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 4 }}>
              Routine name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wendler 5/3/1"
              className="font-display"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--b-ink)',
                color: 'var(--b-ink)',
                fontSize: 22,
                fontStyle: 'italic',
                fontWeight: 500,
                padding: '6px 0',
                outline: 'none',
              }}
            />
          </div>

          {/* Days */}
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {days.map((day, dayIdx) => (
              <DayCard
                key={dayIdx}
                day={day}
                index={dayIdx}
                canRemove={days.length > 1}
                onRename={(v) => renameDay(dayIdx, v)}
                onRemove={() => removeDay(dayIdx)}
                onAdd={() => setPickerForDay(dayIdx)}
                onRemoveExercise={(j) => removeExercise(dayIdx, j)}
                onUpdateExercise={(j, p) => updateExercise(dayIdx, j, p)}
              />
            ))}
          </div>

          <button
            onClick={addDay}
            disabled={days.length >= 7}
            className="font-body"
            style={{
              marginTop: 14,
              width: '100%',
              padding: '10px 14px',
              border: '1px dashed var(--b-ink)',
              background: 'transparent',
              cursor: days.length >= 7 ? 'not-allowed' : 'pointer',
              color: 'var(--b-ink)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: days.length >= 7 ? 0.4 : 1,
            }}
          >
            + Add another day
          </button>

          {/* Save / cancel */}
          <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
            <Link
              href="/gym"
              className="font-body"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'transparent',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--b-ink)',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="font-body"
              style={{
                flex: 2,
                padding: '12px 14px',
                background: canSave ? 'var(--b-ink)' : 'var(--b-ink-15)',
                border: '1px solid var(--b-ink)',
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: canSave ? 'var(--b-paper)' : 'var(--b-ink-40)',
              }}
            >
              {saving ? 'Saving…' : `Save · ${totalExercises} exercise${totalExercises === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>

      {/* Exercise picker overlay */}
      {pickerForDay !== null && (
        <div
          onClick={() => setPickerForDay(null)}
          className="dir-b"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '80vh',
              background: 'var(--b-paper)',
              border: '1px solid var(--b-ink)',
              borderBottom: 'none',
              padding: '16px 18px 22px',
              overflowY: 'auto',
              color: 'var(--b-ink)',
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 4 }}>
              Add exercise
            </div>
            <h2
              className="font-display"
              style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, margin: '0 0 10px' }}
            >
              {days[pickerForDay].name}
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, muscle, or equipment"
              className="font-body"
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--b-ink)',
                color: 'var(--b-ink)',
                fontSize: 13,
                padding: '8px 12px',
                outline: 'none',
                marginBottom: 12,
              }}
            />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filteredCatalog.map((ex) => (
                <li key={ex.id}>
                  <button
                    onClick={() => addExercise(pickerForDay, ex.id)}
                    className="font-body"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 0',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--b-rule)',
                      cursor: 'pointer',
                      color: 'var(--b-ink)',
                    }}
                  >
                    <div className="font-display" style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}>
                      {ex.name}
                    </div>
                    <div
                      className="font-mono tabular"
                      style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      {ex.primaryMuscle} · {ex.equipment}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  index,
  canRemove,
  onRename,
  onRemove,
  onAdd,
  onRemoveExercise,
  onUpdateExercise,
}: {
  day: DraftDay;
  index: number;
  canRemove: boolean;
  onRename: (v: string) => void;
  onRemove: () => void;
  onAdd: () => void;
  onRemoveExercise: (j: number) => void;
  onUpdateExercise: (j: number, p: Partial<DraftExercise>) => void;
}) {
  return (
    <div style={{ border: '1px solid var(--b-rule)', padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-40)', letterSpacing: '0.04em' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <input
          value={day.name}
          onChange={(e) => onRename(e.target.value)}
          className="font-display"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--b-ink)',
            fontSize: 18,
            fontStyle: 'italic',
            fontWeight: 500,
            outline: 'none',
            padding: 0,
          }}
        />
        {canRemove && (
          <button
            onClick={onRemove}
            aria-label="Remove day"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--b-ink-40)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {day.exercises.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {day.exercises.map((e, j) => {
            const meta = EXERCISES.find((c) => c.id === e.exerciseId);
            return (
              <ExerciseRow
                key={j}
                exercise={e}
                meta={meta}
                onRemove={() => onRemoveExercise(j)}
                onUpdate={(p) => onUpdateExercise(j, p)}
              />
            );
          })}
        </ul>
      ) : (
        <p
          className="font-body"
          style={{ fontSize: 11, color: 'var(--b-ink-40)', fontStyle: 'italic', margin: '4px 0 8px' }}
        >
          — no exercises yet —
        </p>
      )}

      <button
        onClick={onAdd}
        className="font-body"
        style={{
          marginTop: 8,
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: '1px solid var(--b-ink)',
          cursor: 'pointer',
          color: 'var(--b-ink)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        + Add exercise
      </button>
    </div>
  );
}

function ExerciseRow({
  exercise,
  meta,
  onRemove,
  onUpdate,
}: {
  exercise: DraftExercise;
  meta: Exercise | undefined;
  onRemove: () => void;
  onUpdate: (p: Partial<DraftExercise>) => void;
}) {
  const numInput = (value: number, onChange: (v: number) => void, min = 1, max = 30) => (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
      }}
      className="font-mono tabular"
      style={{
        width: 36,
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        color: 'var(--b-ink)',
        fontSize: 11,
        textAlign: 'center',
        padding: '2px 0',
        outline: 'none',
      }}
    />
  );
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 16px',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid var(--b-rule)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="font-display"
          style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.15 }}
        >
          {meta?.name || exercise.exerciseId}
        </div>
        {meta && (
          <div
            className="font-mono tabular"
            style={{ fontSize: 8.5, color: 'var(--b-ink-40)', marginTop: 1, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {meta.primaryMuscle} · {meta.equipment}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {numInput(exercise.sets, (v) => onUpdate({ sets: v }), 1, 12)}
        <span className="spread" style={{ fontSize: 8, color: 'var(--b-ink-40)' }}>×</span>
        {numInput(exercise.repsMin, (v) => onUpdate({ repsMin: v }), 1, 60)}
        <span className="spread" style={{ fontSize: 8, color: 'var(--b-ink-40)' }}>–</span>
        {numInput(exercise.repsMax, (v) => onUpdate({ repsMax: v }), 1, 60)}
      </div>
      <button
        onClick={onRemove}
        aria-label="Remove exercise"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--b-ink-40)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </li>
  );
}
