// Battle Pass — 60 tiers per season. Every tier grants a baseline reward,
// with milestone tiers (5, 10, 20, 30, 40, 50, 60) paying much more.

export interface PassRow {
  tier: number;
  fragments: number;
  extra?: string;
  /** 'free' rewards are claimable by everyone; 'premium' requires Outrank+ */
  track: 'free' | 'premium';
  rank: 'minor' | 'medium' | 'major' | 'capstone';
  /** Optional cosmetic unlock id added to ownedCosmetics when claimed. */
  cosmetic?: string;
}

export function buildBattlePass(): PassRow[] {
  const rows: PassRow[] = [];
  for (let t = 1; t <= 60; t++) {
    // --- Free track ---
    let fragments = 15;
    let rank: PassRow['rank'] = 'minor';
    let extra: string | undefined;
    let cosmetic: string | undefined;
    if (t === 60) {
      fragments = 2500;
      extra = 'Phoenix Crown frame + Seasonal title';
      cosmetic = 'frame_phoenix';
      rank = 'capstone';
    } else if (t === 50) {
      fragments = 400;
      extra = 'Gold Name effect';
      cosmetic = 'name_gold';
      rank = 'major';
    } else if (t === 40) {
      fragments = 400;
      extra = 'Ruby Double frame';
      cosmetic = 'frame_ruby';
      rank = 'major';
    } else if (t === 30) {
      fragments = 400;
      extra = 'Emerald Double frame';
      cosmetic = 'frame_emerald';
      rank = 'major';
    } else if (t === 20) {
      fragments = 300;
      extra = 'Ember Name effect';
      cosmetic = 'name_ember';
      rank = 'major';
    } else if (t === 10) {
      fragments = 200;
      extra = 'Silver Ring frame';
      cosmetic = 'frame_silver';
      rank = 'major';
    } else if (t % 5 === 0) {
      fragments = 80;
      extra = '1 Streak Freeze';
      rank = 'medium';
    }
    rows.push({ tier: t, fragments, extra, track: 'free', rank, cosmetic });

    // --- Premium track (mirrored, richer) ---
    let pFragments = 25;
    let pRank: PassRow['rank'] = 'minor';
    let pExtra: string | undefined;
    let pCosmetic: string | undefined;
    if (t === 60) {
      pFragments = 5000;
      pExtra = 'Rainbow Crown frame + Rainbow Name effect';
      pCosmetic = 'frame_rainbow';
      pRank = 'capstone';
    } else if (t === 50) {
      pFragments = 750;
      pExtra = 'Nebula Halo frame';
      pCosmetic = 'frame_nebula';
      pRank = 'major';
    } else if (t === 40) {
      pFragments = 750;
      pExtra = 'Plasma Name effect';
      pCosmetic = 'name_plasma';
      pRank = 'major';
    } else if (t === 30) {
      pFragments = 500;
      pExtra = 'Sapphire Halo frame';
      pCosmetic = 'frame_sapphire';
      pRank = 'major';
    } else if (t === 20) {
      pFragments = 400;
      pExtra = 'Ice Name effect';
      pCosmetic = 'name_ice';
      pRank = 'major';
    } else if (t === 10) {
      pFragments = 300;
      pExtra = 'Gold Ring frame';
      pCosmetic = 'frame_gold';
      pRank = 'major';
    } else if (t % 5 === 0) {
      pFragments = 150;
      pExtra = 'Epic ring color';
      pRank = 'medium';
    }
    rows.push({ tier: t, fragments: pFragments, extra: pExtra, track: 'premium', rank: pRank, cosmetic: pCosmetic });
  }
  return rows;
}

export const BATTLE_PASS = buildBattlePass();
