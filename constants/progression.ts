// Habit slots unlock as you level up
// This makes leveling up meaningful — you EARN the right to track more

export interface SlotTier {
  level: number;
  slots: number;
  label: string;
}

export const HABIT_SLOT_TIERS: SlotTier[] = [
  { level: 1, slots: 5, label: 'Starter' },
  { level: 5, slots: 6, label: '+1 slot at Lv.5' },
  { level: 10, slots: 7, label: '+1 slot at Lv.10' },
  { level: 15, slots: 8, label: '+1 slot at Lv.15' },
  { level: 20, slots: 10, label: '+2 slots at Lv.20' },
  { level: 30, slots: 12, label: '+2 slots at Lv.30' },
  { level: 40, slots: 15, label: '+3 slots at Lv.40' },
  { level: 50, slots: 20, label: '+5 slots at Lv.50' },
];

export function getMaxHabits(level: number): number {
  let max = 5;
  for (const tier of HABIT_SLOT_TIERS) {
    if (level >= tier.level) max = tier.slots;
    else break;
  }
  return max;
}

export function getNextSlotUnlock(level: number): SlotTier | null {
  for (const tier of HABIT_SLOT_TIERS) {
    if (level < tier.level) return tier;
  }
  return null;
}

// Daily challenge pool — curated challenges separate from regular habits
export interface DailyChallengeDef {
  id: string;
  text: string;
  category: string; // which habit slug it counts toward (if user has it)
  value: number;
  bonusXP: number;
}

export const DAILY_CHALLENGE_POOL: DailyChallengeDef[] = [
  // Pillar stretch goals — push above the typical default. Pillars are
  // never filtered out, so these always appear in rotation. Higher
  // bonusXP than discovery prompts because the user is doing extra,
  // not just trying a new category.
  { id: 'dc_water_4l',    text: 'Hit 4L of water today (stretch goal)',    category: 'water',     value: 4,     bonusXP: 35 },
  { id: 'dc_water_5l',    text: 'Hydrate hard — 5L today',                category: 'water',     value: 5,     bonusXP: 50 },
  { id: 'dc_sleep_8h',    text: 'Get 8 hours of sleep tonight',           category: 'sleep',     value: 8,     bonusXP: 30 },
  { id: 'dc_sleep_9h',    text: 'Sleep 9 hours — full recovery',          category: 'sleep',     value: 9,     bonusXP: 45 },
  { id: 'dc_steps_12k',   text: 'Hit 12,000 steps today',                 category: 'steps',     value: 12000, bonusXP: 35 },
  { id: 'dc_steps_15k',   text: 'Big walk — 15,000 steps',                category: 'steps',     value: 15000, bonusXP: 50 },
  { id: 'dc_gym_session', text: 'Get a gym session in',                   category: 'gym',       value: 1,     bonusXP: 30 },
  { id: 'dc_no_social',   text: 'Stay off social media today',            category: 'no-social', value: 1,     bonusXP: 35 },

  // Discovery prompts — only fire if the user doesn't already track
  // them. Lower bonus, idea is to nudge breadth.
  { id: 'dc_run_3k',         text: 'Run at least 3km',                  category: 'running',     value: 3,  bonusXP: 25 },
  { id: 'dc_meditate_15',    text: 'Meditate for 15 minutes',           category: 'meditation',  value: 15, bonusXP: 25 },
  { id: 'dc_read_30',        text: 'Read for 30 pages',                 category: 'pages',       value: 30, bonusXP: 25 },
  { id: 'dc_cold_shower',    text: 'Take a cold shower',                category: 'cold-shower', value: 1,  bonusXP: 25 },
  { id: 'dc_journal',        text: 'Write a journal entry',             category: 'journaling',  value: 1,  bonusXP: 25 },
  { id: 'dc_code_3',         text: 'Solve 3 coding problems',           category: 'coding',      value: 3,  bonusXP: 25 },
  { id: 'dc_deep_work_2h',   text: 'Do 2 hours of deep work',           category: 'deep-work',   value: 2,  bonusXP: 30 },
  { id: 'dc_yoga_20',        text: 'Do 20 minutes of yoga',             category: 'yoga',        value: 20, bonusXP: 25 },
  { id: 'dc_early_wake',     text: 'Wake up before 6 AM',               category: 'early-wake',  value: 1,  bonusXP: 30 },
  { id: 'dc_gratitude_3',    text: 'Write 3 things you are grateful for', category: 'gratitude', value: 3,  bonusXP: 25 },
  { id: 'dc_stretch_15',     text: 'Stretch for 15 minutes',            category: 'stretch',     value: 15, bonusXP: 25 },
  { id: 'dc_walk_30',        text: 'Walk outside for 30 minutes',       category: 'outside',     value: 30, bonusXP: 25 },
];

// The five pillars are first-class — they always count as eligible
// challenges regardless of whether the user "has" them as habits
// (they always do, post-onboarding). Discovery challenges still skip
// when the user already tracks the matching category.
const PILLAR_SLUGS_FOR_QUEST: ReadonlySet<string> = new Set([
  'gym',
  'steps',
  'water',
  'sleep',
  'no-social',
]);

/**
 * Today's challenge — deterministic by day-of-year so everyone on a
 * given day sees the same prompt. Pillar challenges are always
 * candidates; discovery challenges drop out if the user already
 * tracks them (would be redundant with their normal habit log).
 */
export function getTodaysChallenge(userHabitSlugs: string[]): DailyChallengeDef | null {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  const available = DAILY_CHALLENGE_POOL.filter((c) => {
    if (PILLAR_SLUGS_FOR_QUEST.has(c.category)) return true;
    return !userHabitSlugs.includes(c.category);
  });

  if (available.length === 0) return null;

  return available[dayOfYear % available.length];
}
