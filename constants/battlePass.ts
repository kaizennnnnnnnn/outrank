// Battle Pass — 60 tiers per season. Every tier grants a baseline reward,
// with milestone tiers (5, 10, 20, 30, 40, 50, 60) paying much more.

export interface PassRow {
  tier: number;
  fragments: number;
  extra?: string;
  /** 'free' rewards are claimable by everyone; 'premium' requires Outrank+ */
  track: 'free' | 'premium';
  rank: 'minor' | 'medium' | 'major' | 'capstone';
}

export function buildBattlePass(): PassRow[] {
  const rows: PassRow[] = [];
  for (let t = 1; t <= 60; t++) {
    // --- Free track ---
    let fragments = 15;
    let rank: PassRow['rank'] = 'minor';
    let extra: string | undefined;
    if (t === 60) {
      fragments = 2500;
      extra = 'Mythic capstone orb skin + Seasonal title';
      rank = 'capstone';
    } else if (t === 50 || t === 40 || t === 30 || t === 20) {
      fragments = 400;
      extra = 'Epic pulse color';
      rank = 'major';
    } else if (t === 10) {
      fragments = 200;
      extra = 'Rare base color';
      rank = 'major';
    } else if (t % 5 === 0) {
      fragments = 80;
      extra = '1 Streak Freeze';
      rank = 'medium';
    }
    rows.push({ tier: t, fragments, extra, track: 'free', rank });

    // --- Premium track (mirrored, richer) ---
    let pFragments = 25;
    let pRank: PassRow['rank'] = 'minor';
    let pExtra: string | undefined;
    if (t === 60) {
      pFragments = 5000;
      pExtra = 'Mythic ring palette + permanent +5% XP boost';
      pRank = 'capstone';
    } else if (t % 10 === 0) {
      pFragments = 750;
      pExtra = 'Legendary pulse or ring color';
      pRank = 'major';
    } else if (t % 5 === 0) {
      pFragments = 150;
      pExtra = 'Epic ring color';
      pRank = 'medium';
    }
    rows.push({ tier: t, fragments: pFragments, extra: pExtra, track: 'premium', rank: pRank });
  }
  return rows;
}

export const BATTLE_PASS = buildBattlePass();
