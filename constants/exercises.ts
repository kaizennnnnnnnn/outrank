import { Exercise } from '@/types/gym';

/**
 * Curated exercise library — v1 covers the lifts + bodyweight movements
 * needed by the four starter programs. Add freely; programs reference
 * exercises by id.
 *
 * Default rest seconds are conservative for compounds (3–4 min on heavy
 * primary lifts) and shorter for isolation work. Users can skip the
 * timer at any point; this is a starting suggestion.
 */

export const EXERCISES: Exercise[] = [
  // ---------- CHEST ----------
  { id: 'bench-press',         name: 'Barbell Bench Press',     primaryMuscle: 'chest',     secondaryMuscles: ['triceps', 'shoulders'], equipment: 'barbell',  path: 'lift',          cue: 'Tuck elbows ~45°. Bar to mid-chest. Drive feet.',                 defaultRestSec: 180 },
  { id: 'incline-db-press',    name: 'Incline Dumbbell Press',  primaryMuscle: 'chest',     secondaryMuscles: ['triceps', 'shoulders'], equipment: 'dumbbell', path: 'lift',          cue: 'Bench at 30°. Press over upper chest, not face.',                  defaultRestSec: 120 },
  { id: 'db-flye',             name: 'Dumbbell Flye',           primaryMuscle: 'chest',                                                  equipment: 'dumbbell', path: 'lift',          cue: 'Slight elbow bend, locked. Stretch, then squeeze.',               defaultRestSec: 90  },
  { id: 'cable-crossover',     name: 'Cable Crossover',         primaryMuscle: 'chest',                                                  equipment: 'cable',    path: 'lift',          cue: 'Step forward. Hands meet at hip height. Pause + squeeze.',         defaultRestSec: 90  },
  { id: 'pushup',              name: 'Push-up',                 primaryMuscle: 'chest',     secondaryMuscles: ['triceps', 'core'],       equipment: 'bodyweight', path: 'calisthenics', cue: 'Body in a straight plank. Chest to fist height.',                  defaultRestSec: 90  },
  { id: 'dip',                 name: 'Parallel Bar Dip',        primaryMuscle: 'chest',     secondaryMuscles: ['triceps', 'shoulders'], equipment: 'bodyweight', path: 'calisthenics', cue: 'Lean forward for chest emphasis. Lower until shoulders meet bar.', defaultRestSec: 120 },

  // ---------- BACK ----------
  { id: 'deadlift',            name: 'Conventional Deadlift',   primaryMuscle: 'back',      secondaryMuscles: ['hamstrings', 'glutes'],  equipment: 'barbell',  path: 'lift',          cue: 'Hips and bar move together. Neutral spine. Push the floor away.',  defaultRestSec: 240 },
  { id: 'pullup',              name: 'Pull-up',                 primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'bodyweight', path: 'calisthenics', cue: 'Dead hang start. Chin over bar. Slow descent.',                    defaultRestSec: 150 },
  { id: 'chinup',              name: 'Chin-up',                 primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'bodyweight', path: 'calisthenics', cue: 'Underhand grip. Drive elbows down to lift chest to bar.',         defaultRestSec: 150 },
  { id: 'lat-pulldown',        name: 'Lat Pulldown',            primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'cable',    path: 'lift',          cue: 'Bar to upper chest. Squeeze shoulder blades together.',            defaultRestSec: 90  },
  { id: 'barbell-row',         name: 'Barbell Row',             primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'barbell',  path: 'lift',          cue: 'Hinge ~45°. Bar to lower chest. Don\'t round.',                    defaultRestSec: 150 },
  { id: 'db-row',              name: 'Dumbbell Row',            primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'dumbbell', path: 'lift',          cue: 'Brace against bench. Pull elbow back, not up.',                    defaultRestSec: 90  },
  { id: 'seated-cable-row',    name: 'Seated Cable Row',        primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'cable',    path: 'lift',          cue: 'Chest tall. Squeeze shoulder blades; control the negative.',       defaultRestSec: 90  },
  { id: 'inverted-row',        name: 'Inverted Row',            primaryMuscle: 'back',      secondaryMuscles: ['biceps'],                equipment: 'bodyweight', path: 'calisthenics', cue: 'Hips locked, body straight. Pull chest to bar.',                   defaultRestSec: 90  },
  { id: 'face-pull',           name: 'Face Pull',               primaryMuscle: 'back',      secondaryMuscles: ['shoulders'],             equipment: 'cable',    path: 'lift',          cue: 'Rope to forehead. External rotation at the end.',                  defaultRestSec: 60  },

  // ---------- SHOULDERS ----------
  { id: 'overhead-press',      name: 'Overhead Press',          primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'core'],       equipment: 'barbell',  path: 'lift',          cue: 'Bar over mid-foot. Glutes squeezed. Press straight up.',           defaultRestSec: 180 },
  { id: 'db-shoulder-press',   name: 'DB Shoulder Press',       primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'],               equipment: 'dumbbell', path: 'lift',          cue: 'Seated, slight back angle. Press until elbows almost lock.',       defaultRestSec: 120 },
  { id: 'lateral-raise',       name: 'Lateral Raise',           primaryMuscle: 'shoulders',                                              equipment: 'dumbbell', path: 'lift',          cue: 'Slight forward lean. Lead with elbows, not hands.',                defaultRestSec: 60  },
  { id: 'rear-delt-flye',      name: 'Rear Delt Flye',          primaryMuscle: 'shoulders',                                              equipment: 'dumbbell', path: 'lift',          cue: 'Hinge forward 60°. Open arms wide; pinch shoulder blades.',        defaultRestSec: 60  },
  { id: 'pike-pushup',         name: 'Pike Push-up',            primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'],               equipment: 'bodyweight', path: 'calisthenics', cue: 'Hips high, head between arms. Press head toward floor.',         defaultRestSec: 90  },

  // ---------- BICEPS ----------
  { id: 'barbell-curl',        name: 'Barbell Curl',            primaryMuscle: 'biceps',                                                 equipment: 'barbell',  path: 'lift',          cue: 'Elbows pinned. Don\'t swing the hips.',                            defaultRestSec: 60  },
  { id: 'db-curl',             name: 'Dumbbell Curl',           primaryMuscle: 'biceps',                                                 equipment: 'dumbbell', path: 'lift',          cue: 'Supinate as you curl — pinky toward shoulder.',                    defaultRestSec: 60  },
  { id: 'hammer-curl',         name: 'Hammer Curl',             primaryMuscle: 'biceps',    secondaryMuscles: ['forearms'],              equipment: 'dumbbell', path: 'lift',          cue: 'Neutral grip. Slow eccentric — count to 3 down.',                  defaultRestSec: 60  },
  { id: 'preacher-curl',       name: 'Preacher Curl',           primaryMuscle: 'biceps',                                                 equipment: 'dumbbell', path: 'lift',          cue: 'Don\'t fully lock at the bottom — keep tension.',                  defaultRestSec: 60  },

  // ---------- TRICEPS ----------
  { id: 'close-grip-bench',    name: 'Close-Grip Bench Press',  primaryMuscle: 'triceps',   secondaryMuscles: ['chest'],                 equipment: 'barbell',  path: 'lift',          cue: 'Shoulder-width grip. Elbows tucked tight.',                        defaultRestSec: 120 },
  { id: 'tricep-pushdown',     name: 'Tricep Pushdown',         primaryMuscle: 'triceps',                                                equipment: 'cable',    path: 'lift',          cue: 'Elbows pinned to ribs. Lock out and squeeze.',                     defaultRestSec: 60  },
  { id: 'overhead-tricep-ext', name: 'Overhead Tricep Ext.',    primaryMuscle: 'triceps',                                                equipment: 'dumbbell', path: 'lift',          cue: 'Elbows narrow. Stretch deep then drive up.',                       defaultRestSec: 60  },
  { id: 'diamond-pushup',      name: 'Diamond Push-up',         primaryMuscle: 'triceps',   secondaryMuscles: ['chest'],                 equipment: 'bodyweight', path: 'calisthenics', cue: 'Hands form a diamond. Elbows skim the ribs.',                     defaultRestSec: 90  },

  // ---------- LEGS — QUADS ----------
  { id: 'back-squat',          name: 'Barbell Back Squat',      primaryMuscle: 'quads',     secondaryMuscles: ['glutes', 'core'],        equipment: 'barbell',  path: 'lift',          cue: 'Brace, break at hips and knees together. Below parallel.',         defaultRestSec: 240 },
  { id: 'front-squat',         name: 'Front Squat',             primaryMuscle: 'quads',     secondaryMuscles: ['core'],                  equipment: 'barbell',  path: 'lift',          cue: 'Elbows high. Stay vertical through the descent.',                  defaultRestSec: 180 },
  { id: 'leg-press',           name: 'Leg Press',               primaryMuscle: 'quads',     secondaryMuscles: ['glutes'],                equipment: 'machine',  path: 'lift',          cue: 'Lower until knees ~90°. Don\'t lock out at the top.',              defaultRestSec: 120 },
  { id: 'leg-extension',       name: 'Leg Extension',           primaryMuscle: 'quads',                                                  equipment: 'machine',  path: 'lift',          cue: 'Slow eccentric. Pause for 1s at the top.',                         defaultRestSec: 60  },
  { id: 'walking-lunge',       name: 'Walking Lunge',           primaryMuscle: 'quads',     secondaryMuscles: ['glutes'],                equipment: 'dumbbell', path: 'lift',          cue: 'Long stride. Drop the back knee toward the floor.',                defaultRestSec: 90  },
  { id: 'bulgarian-split-sq',  name: 'Bulgarian Split Squat',   primaryMuscle: 'quads',     secondaryMuscles: ['glutes'],                equipment: 'dumbbell', path: 'lift',          cue: 'Rear foot elevated. Front knee tracks over toe.',                  defaultRestSec: 90  },
  { id: 'pistol-squat',        name: 'Pistol Squat',            primaryMuscle: 'quads',     secondaryMuscles: ['glutes', 'core'],        equipment: 'bodyweight', path: 'calisthenics', cue: 'Low and slow. Heel down, opposite leg straight forward.',         defaultRestSec: 90  },

  // ---------- LEGS — POSTERIOR ----------
  { id: 'romanian-deadlift',   name: 'Romanian Deadlift',       primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'],       equipment: 'barbell',  path: 'lift',          cue: 'Push hips back. Soft knees. Bar drags down legs.',                 defaultRestSec: 150 },
  { id: 'leg-curl',            name: 'Leg Curl',                primaryMuscle: 'hamstrings',                                             equipment: 'machine',  path: 'lift',          cue: 'Hips down on the pad. Slow eccentric.',                            defaultRestSec: 60  },
  { id: 'hip-thrust',          name: 'Hip Thrust',              primaryMuscle: 'glutes',    secondaryMuscles: ['hamstrings'],            equipment: 'barbell',  path: 'lift',          cue: 'Squeeze glutes hard at the top. Chin tucked.',                     defaultRestSec: 120 },
  { id: 'glute-bridge',        name: 'Glute Bridge',            primaryMuscle: 'glutes',                                                 equipment: 'bodyweight', path: 'calisthenics', cue: 'Press through heels. Squeeze at the top for 2 seconds.',           defaultRestSec: 60  },

  // ---------- CALVES ----------
  { id: 'standing-calf-raise', name: 'Standing Calf Raise',     primaryMuscle: 'calves',                                                 equipment: 'machine',  path: 'lift',          cue: 'Full stretch at bottom, full rise on toes.',                       defaultRestSec: 60  },
  { id: 'seated-calf-raise',   name: 'Seated Calf Raise',       primaryMuscle: 'calves',                                                 equipment: 'machine',  path: 'lift',          cue: 'Pause for 1s in the stretch.',                                     defaultRestSec: 60  },

  // ---------- CORE ----------
  { id: 'plank',               name: 'Plank',                   primaryMuscle: 'core',                                                   equipment: 'bodyweight', path: 'calisthenics', cue: 'Hold strong line. Glutes squeezed; don\'t sag the hips.',          defaultRestSec: 60  },
  { id: 'hanging-leg-raise',   name: 'Hanging Leg Raise',       primaryMuscle: 'core',                                                   equipment: 'bodyweight', path: 'calisthenics', cue: 'No swinging. Knees to chest, then straighten as you progress.',    defaultRestSec: 90  },
  { id: 'ab-wheel-rollout',    name: 'Ab Wheel Rollout',        primaryMuscle: 'core',                                                   equipment: 'other',    path: 'lift',          cue: 'Hips don\'t drop. Stop where you can still pull back.',            defaultRestSec: 60  },
  { id: 'l-sit',               name: 'L-sit',                   primaryMuscle: 'core',                                                   equipment: 'bodyweight', path: 'calisthenics', cue: 'Hands pressed into floor. Legs straight, parallel to ground.',     defaultRestSec: 90  },

  // ---------- WHOLE-BODY / WARMUP ----------
  { id: 'farmer-carry',        name: 'Farmer Carry',            primaryMuscle: 'forearms',  secondaryMuscles: ['core', 'full-body'],     equipment: 'dumbbell', path: 'lift',          cue: 'Tall posture. Walk smooth — no lateral shift.',                    defaultRestSec: 90  },
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
