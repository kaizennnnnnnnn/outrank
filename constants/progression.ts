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
  { id: 'dc_run_3k', text: 'Run at least 3km', category: 'running', value: 3, bonusXP: 25 },
  { id: 'dc_water_3l', text: 'Drink 3 liters of water', category: 'water', value: 3, bonusXP: 25 },
  { id: 'dc_meditate_15', text: 'Meditate for 15 minutes', category: 'meditation', value: 15, bonusXP: 25 },
  { id: 'dc_read_30', text: 'Read for 30 pages', category: 'pages', value: 30, bonusXP: 25 },
  { id: 'dc_cold_shower', text: 'Take a cold shower', category: 'cold-shower', value: 1, bonusXP: 25 },
  { id: 'dc_gym', text: 'Hit the gym today', category: 'gym', value: 1, bonusXP: 25 },
  { id: 'dc_no_social', text: 'Stay off social media today', category: 'no-social', value: 1, bonusXP: 30 },
  { id: 'dc_journal', text: 'Write a journal entry', category: 'journaling', value: 1, bonusXP: 25 },
  { id: 'dc_code_3', text: 'Solve 3 coding problems', category: 'coding', value: 3, bonusXP: 25 },
  { id: 'dc_deep_work_2h', text: 'Do 2 hours of deep work', category: 'deep-work', value: 2, bonusXP: 30 },
  { id: 'dc_yoga_20', text: 'Do 20 minutes of yoga', category: 'yoga', value: 20, bonusXP: 25 },
  { id: 'dc_early_wake', text: 'Wake up before 6 AM', category: 'early-wake', value: 1, bonusXP: 30 },
  { id: 'dc_gratitude_3', text: 'Write 3 things you are grateful for', category: 'gratitude', value: 3, bonusXP: 25 },
  { id: 'dc_stretch_15', text: 'Stretch for 15 minutes', category: 'stretch', value: 15, bonusXP: 25 },
  { id: 'dc_walk_30', text: 'Walk outside for 30 minutes', category: 'outside', value: 30, bonusXP: 25 },
];

// Get today's challenge — deterministic based on day, excluding user's active habits
export function getTodaysChallenge(userHabitSlugs: string[]): DailyChallengeDef | null {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Filter out challenges that match user's tracked habits
  const available = DAILY_CHALLENGE_POOL.filter(
    (c) => !userHabitSlugs.includes(c.category)
  );

  if (available.length === 0) return null;

  // Pick based on day — deterministic so all users get the same challenge
  return available[dayOfYear % available.length];
}
