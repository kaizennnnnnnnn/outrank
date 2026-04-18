// Per-level rewards. Every level gives a trickle; milestone levels (5, 10,
// 20, 30, 40, 50) escalate. Tier 50 is the final-level capstone; after that
// the user can prestige.

export interface LevelReward {
  level: number;
  fragments: number;
  /** Human label shown next to the reward, e.g. "1 Streak Freeze" */
  extra?: string;
  tier: 'minor' | 'medium' | 'major' | 'capstone';
}

function build(): LevelReward[] {
  const out: LevelReward[] = [];
  for (let lv = 1; lv <= 50; lv++) {
    let fragments = 10;
    let extra: string | undefined;
    let tier: LevelReward['tier'] = 'minor';

    if (lv === 50) {
      fragments = 2000;
      extra = 'Legendary orb skin + Legend title + Prestige unlock';
      tier = 'capstone';
    } else if (lv % 10 === 0) {
      fragments = 400;
      extra = 'Epic color unlock + 3 Streak Freezes';
      tier = 'major';
    } else if (lv % 5 === 0) {
      fragments = 100;
      extra = '1 Streak Freeze';
      tier = 'medium';
    }
    out.push({ level: lv, fragments, extra, tier });
  }
  return out;
}

export const LEVEL_REWARDS = build();
