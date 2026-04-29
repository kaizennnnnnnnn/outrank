/**
 * Publish-time reward — fires once per recap publish, scaled by the
 * number of distinct pillars the user logged that day.
 *
 * Replaces the XP+fragments portion of the old all-habits-done daily
 * bonus (which lived inside logHabit and only fired when the LAST
 * habit of the day was logged). That model rewarded all-or-nothing
 * effort and ignored the actual social action (publishing). This
 * tier table redistributes the same total magnitude across partial
 * coverage so a 1-pillar day still earns something for submitting.
 *
 * The orb evolution charge stays gated on "all habits done" inside
 * logHabit — that's the orb-mechanic premium, not a general reward.
 */

export interface PublishReward {
  xp: number;
  fragments: number;
}

/**
 * Reward for publishing a recap with N distinct pillar slugs in the
 * entries. Index 0 is unused (a 0-pillar publish is blocked
 * client-side anyway). Each step ~80% bigger than the previous;
 * 5-pillar tier is the meaningful "you did the whole day" payoff.
 */
const PUBLISH_REWARD_TABLE: ReadonlyArray<PublishReward> = [
  { xp: 0,   fragments: 0 },   // 0 pillars — should never publish
  { xp: 30,  fragments: 5 },   // 1
  { xp: 75,  fragments: 15 },  // 2
  { xp: 135, fragments: 30 },  // 3
  { xp: 210, fragments: 55 },  // 4
  { xp: 300, fragments: 90 },  // 5 (full day)
];

/**
 * Reward for publishing a recap covering `pillarsLogged` distinct
 * pillars. Cap at 5 — additional non-pillar entries don't bump the
 * tier. Returns the full struct so the toast / display can render
 * both XP and fragments without separate lookups.
 */
export function getPublishReward(pillarsLogged: number): PublishReward {
  const idx = Math.max(0, Math.min(5, Math.floor(pillarsLogged)));
  return PUBLISH_REWARD_TABLE[idx];
}

/** Pillar slugs from constants/pillars.ts duplicated here to avoid a
 *  circular import for what's just a 5-element set. Keep in sync. */
const PILLAR_SLUG_SET: ReadonlySet<string> = new Set([
  'gym',
  'steps',
  'water',
  'sleep',
  'no-social',
]);

/**
 * Distinct count of pillar slugs in a list of recap entries. Custom
 * habits don't currently flow into recaps, but we filter defensively
 * so the count is bounded at the 5 pillars regardless.
 */
export function countPillarsLogged(entries: Array<{ habitSlug: string }>): number {
  const seen = new Set<string>();
  for (const e of entries) {
    if (PILLAR_SLUG_SET.has(e.habitSlug)) seen.add(e.habitSlug);
  }
  return seen.size;
}
