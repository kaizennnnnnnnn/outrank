// Seasons + Ranked Leagues + Season Pass — minimal viable data model.
//
// * A **season** is 28 days long, numbered from EPOCH.
// * Your **league** (Bronze → Grandmaster) is derived from weeklyXP on a
//   fixed XP ladder. Promotion/relegation happens naturally as XP fluctuates.
// * The **season pass** has 60 tiers. Each tier needs 100 seasonPassXP.
//   Rewards are fragments on milestone tiers; premium tiers are marked but
//   the premium economy is not wired yet.

// Fixed epoch — 2026-01-05 (Monday). Stable absolute reference.
const EPOCH_MS = Date.UTC(2026, 0, 5);
const SEASON_DAYS = 28;
const MS_PER_DAY = 86_400_000;

export function getCurrentSeason(now: Date = new Date()): number {
  const days = Math.floor((now.getTime() - EPOCH_MS) / MS_PER_DAY);
  return Math.max(1, Math.floor(days / SEASON_DAYS) + 1);
}

export function getSeasonEndDate(season: number = getCurrentSeason()): Date {
  return new Date(EPOCH_MS + season * SEASON_DAYS * MS_PER_DAY);
}

export function getSeasonDaysLeft(now: Date = new Date()): number {
  const end = getSeasonEndDate();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY));
}

// --- Leagues ---

export interface League {
  id: string;
  name: string;
  color: string;
  minWeeklyXP: number;
}

export const LEAGUES: League[] = [
  { id: 'bronze',     name: 'Bronze',      color: '#cd7f32', minWeeklyXP: 0 },
  { id: 'silver',     name: 'Silver',      color: '#cbd5e1', minWeeklyXP: 100 },
  { id: 'gold',       name: 'Gold',        color: '#fbbf24', minWeeklyXP: 250 },
  { id: 'platinum',   name: 'Platinum',    color: '#67e8f9', minWeeklyXP: 500 },
  { id: 'diamond',    name: 'Diamond',     color: '#93c5fd', minWeeklyXP: 900 },
  { id: 'master',     name: 'Master',      color: '#a855f7', minWeeklyXP: 1500 },
  { id: 'grandmaster',name: 'Grandmaster', color: '#ef4444', minWeeklyXP: 2500 },
];

export function getLeague(weeklyXP: number): League {
  let current = LEAGUES[0];
  for (const l of LEAGUES) {
    if (weeklyXP >= l.minWeeklyXP) current = l;
  }
  return current;
}

export function getNextLeague(weeklyXP: number): League | null {
  for (const l of LEAGUES) {
    if (weeklyXP < l.minWeeklyXP) return l;
  }
  return null;
}

// --- Season Pass ---

export const SEASON_PASS_TIERS = 60;
export const SEASON_PASS_XP_PER_TIER = 100;

export interface SeasonPassReward {
  tier: number;
  fragments: number;
  label: string;
}

// Milestone rewards every 5 tiers. Tier 60 is the capstone.
export const SEASON_PASS_REWARDS: SeasonPassReward[] = Array.from({ length: 12 }, (_, i) => {
  const tier = (i + 1) * 5;
  const fragments = tier === 60 ? 2500 : 50 + i * 35;
  return { tier, fragments, label: tier === 60 ? 'Season capstone' : `Tier ${tier}` };
});

export function getSeasonPassTier(seasonPassXP: number): number {
  return Math.min(SEASON_PASS_TIERS, Math.floor(seasonPassXP / SEASON_PASS_XP_PER_TIER));
}

export function getSeasonPassProgress(seasonPassXP: number): number {
  const inTier = seasonPassXP % SEASON_PASS_XP_PER_TIER;
  return inTier / SEASON_PASS_XP_PER_TIER;
}

// --- Prestige ---

export const LEVEL_CAP = 50;
export const PRESTIGE_XP_BONUS = 0.01; // +1% XP per prestige cycle
