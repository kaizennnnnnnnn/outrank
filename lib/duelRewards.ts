// Shared duel reward math — used by both DuelResultModal (the full-screen
// reveal) and DuelEndedCard (the compact preview on the Compete page).
// Kept here so the card can show the exact reward the modal will grant.

export type DuelOutcome = 'win' | 'tie' | 'loss';

const BASE: Record<DuelOutcome, { xp: number; fragments: number }> = {
  win: { xp: 100, fragments: 50 },
  tie: { xp: 35, fragments: 15 },
  loss: { xp: 15, fragments: 5 },
};

/**
 * Prize tiers scale with duel duration so longer commitments pay more.
 * 3d baseline · 7d ≈ 1.5× · 14d ≈ 2× · 30d ≈ 3×.
 */
export function getDurationMult(days: number | undefined): number {
  const d = days ?? 7;
  if (d >= 28) return 3;
  if (d >= 14) return 2;
  if (d >= 7) return 1.5;
  return 1;
}

export function getDuelRewards(
  outcome: DuelOutcome,
  durationDays: number | undefined,
): { xp: number; fragments: number } {
  const mult = getDurationMult(durationDays);
  const base = BASE[outcome];
  return {
    xp: Math.round(base.xp * mult),
    fragments: Math.round(base.fragments * mult),
  };
}
