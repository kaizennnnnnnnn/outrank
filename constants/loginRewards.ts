// Daily login streak — user opens the app → streak += 1 if it's been ~1 day
// since the last claim, or resets to 1 if >1 day. Each day grants escalating
// rewards from a 7-day loop.

export interface LoginReward {
  day: number;     // 1..7
  fragments: number;
  bonus?: string;  // short human label for "special" days
}

export const LOGIN_REWARDS: LoginReward[] = [
  { day: 1, fragments: 10 },
  { day: 2, fragments: 15 },
  { day: 3, fragments: 25 },
  { day: 4, fragments: 40 },
  { day: 5, fragments: 60 },
  { day: 6, fragments: 90 },
  { day: 7, fragments: 150, bonus: 'Weekly chest' },
];

export function getLoginReward(day: number): LoginReward {
  const idx = ((day - 1) % LOGIN_REWARDS.length + LOGIN_REWARDS.length) % LOGIN_REWARDS.length;
  return LOGIN_REWARDS[idx];
}
