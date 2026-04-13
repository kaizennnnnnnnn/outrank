export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Rookie', xpRequired: 0 },
  { level: 2, title: 'Rookie', xpRequired: 50 },
  { level: 3, title: 'Rookie', xpRequired: 120 },
  { level: 4, title: 'Rookie', xpRequired: 200 },
  { level: 5, title: 'Grinder', xpRequired: 500 },
  { level: 6, title: 'Grinder', xpRequired: 620 },
  { level: 7, title: 'Grinder', xpRequired: 750 },
  { level: 8, title: 'Grinder', xpRequired: 900 },
  { level: 9, title: 'Grinder', xpRequired: 1050 },
  { level: 10, title: 'Contender', xpRequired: 1200 },
  { level: 11, title: 'Contender', xpRequired: 1380 },
  { level: 12, title: 'Contender', xpRequired: 1570 },
  { level: 13, title: 'Contender', xpRequired: 1770 },
  { level: 14, title: 'Contender', xpRequired: 1980 },
  { level: 15, title: 'Rival', xpRequired: 2100 },
  { level: 16, title: 'Rival', xpRequired: 2320 },
  { level: 17, title: 'Rival', xpRequired: 2550 },
  { level: 18, title: 'Rival', xpRequired: 2790 },
  { level: 19, title: 'Rival', xpRequired: 3040 },
  { level: 20, title: 'Warrior', xpRequired: 3200 },
  { level: 21, title: 'Warrior', xpRequired: 3460 },
  { level: 22, title: 'Warrior', xpRequired: 3730 },
  { level: 23, title: 'Warrior', xpRequired: 4010 },
  { level: 24, title: 'Warrior', xpRequired: 4300 },
  { level: 25, title: 'Veteran', xpRequired: 4500 },
  { level: 26, title: 'Veteran', xpRequired: 4800 },
  { level: 27, title: 'Veteran', xpRequired: 5110 },
  { level: 28, title: 'Veteran', xpRequired: 5430 },
  { level: 29, title: 'Veteran', xpRequired: 5760 },
  { level: 30, title: 'Champion', xpRequired: 6000 },
  { level: 31, title: 'Champion', xpRequired: 6340 },
  { level: 32, title: 'Champion', xpRequired: 6690 },
  { level: 33, title: 'Champion', xpRequired: 7050 },
  { level: 34, title: 'Champion', xpRequired: 7420 },
  { level: 35, title: 'Elite', xpRequired: 7700 },
  { level: 36, title: 'Elite', xpRequired: 8080 },
  { level: 37, title: 'Elite', xpRequired: 8470 },
  { level: 38, title: 'Elite', xpRequired: 8870 },
  { level: 39, title: 'Elite', xpRequired: 9280 },
  { level: 40, title: 'Master', xpRequired: 9600 },
  { level: 41, title: 'Master', xpRequired: 10020 },
  { level: 42, title: 'Master', xpRequired: 10450 },
  { level: 43, title: 'Master', xpRequired: 10890 },
  { level: 44, title: 'Master', xpRequired: 11340 },
  { level: 45, title: 'Grandmaster', xpRequired: 11700 },
  { level: 46, title: 'Grandmaster', xpRequired: 12160 },
  { level: 47, title: 'Grandmaster', xpRequired: 12630 },
  { level: 48, title: 'Grandmaster', xpRequired: 13110 },
  { level: 49, title: 'Grandmaster', xpRequired: 13600 },
  { level: 50, title: 'Legend', xpRequired: 14000 },
  { level: 55, title: 'Legend', xpRequired: 16500 },
  { level: 60, title: 'Mythic', xpRequired: 19500 },
  { level: 65, title: 'Mythic', xpRequired: 22500 },
  { level: 70, title: 'Immortal', xpRequired: 26000 },
  { level: 75, title: 'Immortal', xpRequired: 29500 },
  { level: 80, title: 'Ascended', xpRequired: 33500 },
  { level: 85, title: 'Ascended', xpRequired: 37500 },
  { level: 90, title: 'Transcendent', xpRequired: 42000 },
  { level: 95, title: 'Transcendent', xpRequired: 47000 },
  { level: 100, title: 'The GOAT', xpRequired: 52000 },
];

export const getLevelForXP = (xp: number): LevelInfo => {
  let result = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      result = level;
    } else {
      break;
    }
  }
  return result;
};

export const getNextLevel = (currentLevel: number): LevelInfo | null => {
  const idx = LEVELS.findIndex((l) => l.level === currentLevel);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1];
};

export const getXPProgress = (xp: number): { current: number; needed: number; percentage: number } => {
  const currentLevel = getLevelForXP(xp);
  const nextLevel = getNextLevel(currentLevel.level);
  if (!nextLevel) return { current: 0, needed: 0, percentage: 100 };

  const current = xp - currentLevel.xpRequired;
  const needed = nextLevel.xpRequired - currentLevel.xpRequired;
  const percentage = Math.min((current / needed) * 100, 100);
  return { current, needed, percentage };
};
