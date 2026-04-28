/**
 * Friends-League helpers — week math + ISO week keys.
 *
 * The "week" boundary aligns with the existing weeklyLeaderboardReset
 * Cloud Function, which runs Monday 00:05 UTC. Settlement runs at
 * 00:00 UTC the same day — five minutes before the reset zeros
 * everyone's weeklyXP.
 */

/**
 * ISO 8601 week key (e.g. "2026-W17") for a given UTC date. Picks the
 * Thursday in the week containing the date and computes the year/week
 * from there — handles Dec 29-31 / Jan 1-3 correctly.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday (UTC)
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Monday and Sunday (UTC) of the ISO week containing `date`. Used for
 * display ranges on the league page.
 */
export function isoWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  // Start of week (Monday)
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - (dayNum - 1));
  // End of week (Sunday)
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

export function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Last week's key, used for "did I get my settlement yet?" lookups. */
export function lastIsoWeekKey(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 7);
  return isoWeekKey(d);
}
