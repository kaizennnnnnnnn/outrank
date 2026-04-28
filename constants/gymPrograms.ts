import { Program } from '@/types/gym';

/**
 * Four starter programs — three lift, one calisthenics. The picker
 * shows them grouped by path. Days cycle in order: completing today's
 * workout advances `currentDayIndex` by one (mod schedule.length), so
 * skipping a calendar day doesn't skip the workout. More forgiving
 * than weekday pinning.
 *
 * v1 deliberately ships fixed programs — no custom plan builder.
 * Adding a program here is enough; the picker iterates this array.
 */
export const PROGRAMS: Program[] = [
  // ============================================================
  // PUSH / PULL / LEGS — 6 days
  // ============================================================
  {
    id: 'ppl-6',
    name: 'Push / Pull / Legs',
    shortName: 'PPL',
    daysPerWeek: 6,
    path: 'lift',
    description:
      'High-frequency split — each muscle group hit twice a week. Compounds anchor every session, isolation rounds it out.',
    audience: 'Intermediate · 6 days/week · gym access',
    schedule: [
      {
        name: 'Push A',
        exercises: [
          { exerciseId: 'bench-press',         sets: 4, repsMin: 6,  repsMax: 8,  note: 'Working sets after warm-ups.' },
          { exerciseId: 'overhead-press',      sets: 3, repsMin: 6,  repsMax: 10 },
          { exerciseId: 'incline-db-press',    sets: 3, repsMin: 8,  repsMax: 12 },
          { exerciseId: 'lateral-raise',       sets: 4, repsMin: 12, repsMax: 15 },
          { exerciseId: 'tricep-pushdown',     sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'overhead-tricep-ext', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Pull A',
        exercises: [
          { exerciseId: 'deadlift',         sets: 3, repsMin: 4, repsMax: 6, note: 'Reset between reps. Form > weight.' },
          { exerciseId: 'pullup',           sets: 4, repsMin: 6, repsMax: 10 },
          { exerciseId: 'barbell-row',      sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'face-pull',        sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'barbell-curl',     sets: 3, repsMin: 8,  repsMax: 12 },
          { exerciseId: 'hammer-curl',      sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Legs A',
        exercises: [
          { exerciseId: 'back-squat',          sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'romanian-deadlift',   sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'leg-press',           sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'leg-curl',            sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'standing-calf-raise', sets: 4, repsMin: 10, repsMax: 15 },
          { exerciseId: 'plank',               sets: 3, repsMin: 30, repsMax: 60, note: 'Reps = seconds held.' },
        ],
      },
      {
        name: 'Push B',
        exercises: [
          { exerciseId: 'overhead-press',      sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'incline-db-press',    sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'cable-crossover',     sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'lateral-raise',       sets: 4, repsMin: 12, repsMax: 15 },
          { exerciseId: 'close-grip-bench',    sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'tricep-pushdown',     sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Pull B',
        exercises: [
          { exerciseId: 'lat-pulldown',     sets: 4, repsMin: 8, repsMax: 12 },
          { exerciseId: 'seated-cable-row', sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'db-row',           sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'rear-delt-flye',   sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'preacher-curl',    sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'hammer-curl',      sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Legs B',
        exercises: [
          { exerciseId: 'front-squat',         sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'hip-thrust',          sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'walking-lunge',       sets: 3, repsMin: 10, repsMax: 12, note: 'Per leg.' },
          { exerciseId: 'leg-extension',       sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'seated-calf-raise',   sets: 4, repsMin: 12, repsMax: 15 },
          { exerciseId: 'hanging-leg-raise',   sets: 3, repsMin: 8, repsMax: 12 },
        ],
      },
    ],
  },

  // ============================================================
  // UPPER / LOWER — 4 days
  // ============================================================
  {
    id: 'ul-4',
    name: 'Upper / Lower',
    shortName: 'U/L',
    daysPerWeek: 4,
    path: 'lift',
    description:
      'Balanced 4-day split. More recovery between sessions; great if you can\'t hit the gym 5+ days. Each muscle worked twice a week.',
    audience: 'Beginner-friendly · 4 days/week · gym access',
    schedule: [
      {
        name: 'Upper A',
        exercises: [
          { exerciseId: 'bench-press',      sets: 4, repsMin: 6, repsMax: 8 },
          { exerciseId: 'barbell-row',      sets: 4, repsMin: 6, repsMax: 8 },
          { exerciseId: 'overhead-press',   sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'lat-pulldown',     sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'lateral-raise',    sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'barbell-curl',     sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'tricep-pushdown',  sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Lower A',
        exercises: [
          { exerciseId: 'back-squat',          sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'romanian-deadlift',   sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'leg-press',           sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'leg-curl',            sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'standing-calf-raise', sets: 4, repsMin: 10, repsMax: 15 },
          { exerciseId: 'plank',               sets: 3, repsMin: 30, repsMax: 60, note: 'Reps = seconds.' },
        ],
      },
      {
        name: 'Upper B',
        exercises: [
          { exerciseId: 'overhead-press',     sets: 4, repsMin: 5, repsMax: 8 },
          { exerciseId: 'pullup',             sets: 4, repsMin: 5, repsMax: 10 },
          { exerciseId: 'incline-db-press',   sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'seated-cable-row',   sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'face-pull',          sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'hammer-curl',        sets: 3, repsMin: 10, repsMax: 12 },
          { exerciseId: 'overhead-tricep-ext', sets: 3, repsMin: 10, repsMax: 12 },
        ],
      },
      {
        name: 'Lower B',
        exercises: [
          { exerciseId: 'deadlift',           sets: 3, repsMin: 4, repsMax: 6, note: 'Reset between reps.' },
          { exerciseId: 'front-squat',        sets: 3, repsMin: 6, repsMax: 8 },
          { exerciseId: 'walking-lunge',      sets: 3, repsMin: 10, repsMax: 12, note: 'Per leg.' },
          { exerciseId: 'leg-extension',      sets: 3, repsMin: 12, repsMax: 15 },
          { exerciseId: 'seated-calf-raise',  sets: 4, repsMin: 12, repsMax: 15 },
          { exerciseId: 'hanging-leg-raise',  sets: 3, repsMin: 8, repsMax: 12 },
        ],
      },
    ],
  },

  // ============================================================
  // FULL-BODY — 3 days
  // ============================================================
  {
    id: 'fb-3',
    name: 'Full Body',
    shortName: 'FB',
    daysPerWeek: 3,
    path: 'lift',
    description:
      'Three sessions a week, every muscle worked every session. Lowest time commitment, highest frequency. Ideal for beginners building base strength.',
    audience: 'Beginner · 3 days/week · gym access',
    schedule: [
      {
        name: 'Workout A',
        exercises: [
          { exerciseId: 'back-squat',       sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'bench-press',      sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'barbell-row',      sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'overhead-press',   sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'plank',            sets: 3, repsMin: 30, repsMax: 60, note: 'Reps = seconds.' },
        ],
      },
      {
        name: 'Workout B',
        exercises: [
          { exerciseId: 'deadlift',         sets: 3, repsMin: 4, repsMax: 6, note: 'Reset between reps.' },
          { exerciseId: 'incline-db-press', sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'lat-pulldown',     sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'walking-lunge',    sets: 3, repsMin: 10, repsMax: 12, note: 'Per leg.' },
          { exerciseId: 'face-pull',        sets: 3, repsMin: 12, repsMax: 15 },
        ],
      },
      {
        name: 'Workout C',
        exercises: [
          { exerciseId: 'front-squat',      sets: 3, repsMin: 6, repsMax: 8 },
          { exerciseId: 'overhead-press',   sets: 3, repsMin: 6, repsMax: 10 },
          { exerciseId: 'pullup',           sets: 3, repsMin: 5, repsMax: 10 },
          { exerciseId: 'romanian-deadlift', sets: 3, repsMin: 8, repsMax: 10 },
          { exerciseId: 'hanging-leg-raise', sets: 3, repsMin: 8, repsMax: 12 },
        ],
      },
    ],
  },

  // ============================================================
  // RECOMMENDED ROUTINE — bodyweight, 3 days
  // ============================================================
  {
    id: 'rr-3',
    name: 'Recommended Routine',
    shortName: 'RR',
    daysPerWeek: 3,
    path: 'calisthenics',
    description:
      'The r/bodyweightfitness classic. Pure bodyweight — no equipment beyond a pull-up bar. Three sessions a week with the same template repeated.',
    audience: 'Beginner-friendly · 3 days/week · pull-up bar only',
    schedule: [
      {
        name: 'Workout',
        exercises: [
          { exerciseId: 'pullup',            sets: 3, repsMin: 5, repsMax: 8, note: 'Substitute inverted rows if you can\'t do 3.' },
          { exerciseId: 'dip',               sets: 3, repsMin: 5, repsMax: 8 },
          { exerciseId: 'pushup',            sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'inverted-row',      sets: 3, repsMin: 8, repsMax: 12 },
          { exerciseId: 'pistol-squat',      sets: 3, repsMin: 5, repsMax: 8, note: 'Per leg. Box-pistol if you can\'t hit depth.' },
          { exerciseId: 'glute-bridge',      sets: 3, repsMin: 10, repsMax: 15 },
          { exerciseId: 'l-sit',             sets: 3, repsMin: 10, repsMax: 30, note: 'Reps = seconds. Tuck if you can\'t hold straight.' },
          { exerciseId: 'plank',             sets: 3, repsMin: 30, repsMax: 60, note: 'Reps = seconds.' },
        ],
      },
    ],
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}
