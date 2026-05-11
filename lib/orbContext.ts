/**
 * Server-side snapshot of everything the Soul Orb assistant needs to
 * know about a user when answering. Built fresh on each conversation
 * turn (or cached for ~5 min via Anthropic's prompt caching), then
 * rendered as a markdown block at the top of the system prompt.
 *
 * Lives in /lib because both the text chat route and the ElevenLabs
 * Conversational AI webhook will share it.
 */

import { adminDb } from './firebaseAdmin';
import { PILLARS, getPillar, type PillarSlug } from '@/constants/pillars';
import { getLevelForXP } from '@/constants/levels';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_LOG_WINDOW_DAYS = 7;

export interface OrbContext {
  capturedAt: string;
  profile: {
    name: string;
    level: number;
    totalXP: number;
    weeklyXP: number;
    title: string;
    isPremium: boolean;
    streakFreezeTokens: number;
  };
  body?: {
    sex?: 'male' | 'female';
    age?: number;
    heightCm?: number;
    weightKg?: number;
    targetWeightKg?: number;
  };
  goals: {
    primary: string[];
    dietGoal?: 'lose' | 'maintain' | 'gain';
    activityLevel?: string;
    experienceLevel?: string;
    struggles: string[];
  };
  orb: {
    tier: number;
    awakening: number;
    fragments: number;
    fullAwakenings: number;
    ascensions: number;
  };
  gym?: {
    activeProgramId: string | null;
    currentDayIndex: number;
    totalWorkouts: number;
    lastWorkoutAgo: string | null;
    path: 'lift' | 'calisthenics' | null;
  };
  pillars: Array<{
    slug: PillarSlug;
    name: string;
    target: number;
    unit: string;
    todayValue: number;
    todayPercent: number;
    streak: number;
    longestStreak: number;
    last7DaysHits: number;
  }>;
  today: {
    dateKey: string;
    pillarsLogged: number;
    pillarsNotLogged: PillarSlug[];
    totalXP: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  weakest?: { slug: PillarSlug; name: string; reason: string };
  hottest?: { slug: PillarSlug; name: string; streak: number };
}

interface RawDoc {
  [key: string]: unknown;
}

interface FirestoreTimestamp {
  toDate(): Date;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as FirestoreTimestamp).toDate === 'function') {
    return (value as FirestoreTimestamp).toDate();
  }
  return null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Onboarding stores body stats as `{ value, unit }` blobs. Normalize
 * them to flat numbers in metric so the orb prompt is one consistent
 * unit regardless of what the user picked.
 */
function readWeightKg(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const m = value as { value?: unknown; unit?: unknown };
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) return undefined;
  if (m.unit === 'lbs') return Math.round(m.value * 0.453592 * 10) / 10;
  return m.value;
}

function readHeightCm(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const m = value as { value?: unknown; unit?: unknown };
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) return undefined;
  if (m.unit === 'in') return Math.round(m.value * 2.54);
  return m.value;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeOfDay(d: Date): OrbContext['today']['timeOfDay'] {
  const h = d.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

function relativeAgo(d: Date | null, now: Date): string | null {
  if (!d) return null;
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Fetch a user-doc snapshot bundle in parallel. Each piece is shaped
 * defensively because the user document is the field-fishing pattern
 * (CLAUDE.md gotcha) — fields like onboarding goals, weight, height,
 * etc. live on the same doc but aren't typed in UserProfile.
 */
export async function buildOrbContext(uid: string): Promise<OrbContext> {
  const now = new Date();
  const todayKey = localDateKey(now);
  const dayWindowStart = new Date(now.getTime() - RECENT_LOG_WINDOW_DAYS * DAY_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [userSnap, habitsSnap, recentLogsSnap] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('habits').doc(uid).collection('userHabits').get(),
    adminDb
      .collection('logs')
      .doc(uid)
      .collection('habitLogs')
      .where('loggedAt', '>=', dayWindowStart)
      .orderBy('loggedAt', 'desc')
      .get(),
  ]);

  const user: RawDoc = userSnap.exists ? (userSnap.data() as RawDoc) : {};
  const gymState = (user.gymState ?? {}) as RawDoc;

  const habitsBySlug = new Map<string, RawDoc>();
  habitsSnap.forEach((doc) => {
    habitsBySlug.set(doc.id, doc.data() as RawDoc);
  });

  const recentLogs = recentLogsSnap.docs.map((d) => d.data() as RawDoc);

  // Bucket recent logs by (slug, dateKey) so we can compute today's
  // value per pillar AND last-7-day hit counts in one pass.
  const todayValueBySlug = new Map<string, number>();
  const dayHitsBySlug = new Map<string, Set<string>>();
  let todayXP = 0;

  for (const log of recentLogs) {
    const slug = asString(log.categorySlug);
    if (!slug) continue;
    const loggedAt = asDate(log.loggedAt) ?? asDate(log.createdAt);
    if (!loggedAt) continue;
    const dateKey = localDateKey(loggedAt);
    const value = asNumber(log.value);

    if (dateKey === todayKey) {
      todayValueBySlug.set(slug, (todayValueBySlug.get(slug) ?? 0) + value);
      todayXP += asNumber(log.xpEarned);
    }
    if (!dayHitsBySlug.has(slug)) dayHitsBySlug.set(slug, new Set());
    dayHitsBySlug.get(slug)!.add(dateKey);
  }

  const pillars: OrbContext['pillars'] = PILLARS.map((p) => {
    const userHabit = habitsBySlug.get(p.slug);
    const target = asNumber(userHabit?.goal, p.defaultGoal);
    const unit = asString(userHabit?.unit, '');
    const todayValue = todayValueBySlug.get(p.slug) ?? 0;
    const todayPercent = target > 0 ? Math.min(100, Math.round((todayValue / target) * 100)) : 0;
    const last7DaysHits = dayHitsBySlug.get(p.slug)?.size ?? 0;
    return {
      slug: p.slug,
      name: p.name,
      target,
      unit,
      todayValue,
      todayPercent,
      streak: asNumber(userHabit?.currentStreak),
      longestStreak: asNumber(userHabit?.longestStreak),
      last7DaysHits,
    };
  });

  const pillarsLoggedToday = pillars.filter((p) => p.todayValue > 0).length;
  const pillarsNotLogged = pillars.filter((p) => p.todayValue === 0).map((p) => p.slug);

  // Weakest / hottest are pure derivations from the pillar table, so
  // the orb doesn't have to do the math itself in the system prompt.
  let weakest: OrbContext['weakest'];
  let hottest: OrbContext['hottest'];
  const sortedByHits = [...pillars].sort((a, b) => a.last7DaysHits - b.last7DaysHits);
  const worst = sortedByHits[0];
  if (worst && worst.last7DaysHits < RECENT_LOG_WINDOW_DAYS) {
    weakest = {
      slug: worst.slug,
      name: worst.name,
      reason: `${worst.last7DaysHits}/${RECENT_LOG_WINDOW_DAYS} days hit`,
    };
  }
  const sortedByStreak = [...pillars].sort((a, b) => b.streak - a.streak);
  const best = sortedByStreak[0];
  if (best && best.streak >= 3) {
    hottest = { slug: best.slug, name: best.name, streak: best.streak };
  }

  const lastWorkoutAt = asDate(gymState.lastWorkoutAt);

  // Level + title are derived from totalXP — the user.level field gets
  // stale (sidebar uses the same derivation, so this matches what the
  // user sees in the UI).
  const totalXP = asNumber(user.totalXP);
  const levelInfo = getLevelForXP(totalXP);

  return {
    capturedAt: now.toISOString(),
    profile: {
      name: asString(user.username, 'friend'),
      level: levelInfo.level,
      totalXP,
      weeklyXP: asNumber(user.weeklyXP),
      title: levelInfo.title,
      isPremium: user.isPremium === true,
      streakFreezeTokens: asNumber(user.streakFreezeTokens),
    },
    body: {
      sex: user.sex === 'male' || user.sex === 'female' ? user.sex : undefined,
      age: typeof user.age === 'number' ? user.age : undefined,
      heightCm: readHeightCm(user.height),
      weightKg: readWeightKg(user.weight),
      targetWeightKg: readWeightKg(user.targetWeight),
    },
    goals: {
      primary: asArray<string>(user.goals),
      dietGoal:
        user.dietGoal === 'lose' || user.dietGoal === 'maintain' || user.dietGoal === 'gain'
          ? user.dietGoal
          : undefined,
      activityLevel: typeof user.activityLevel === 'string' ? user.activityLevel : undefined,
      experienceLevel:
        typeof user.experienceLevel === 'string' ? user.experienceLevel : undefined,
      struggles: asArray<string>(user.struggles),
    },
    orb: {
      tier: asNumber(user.orbTier, 1),
      awakening: asNumber(user.awakening),
      fragments: asNumber(user.fragments),
      fullAwakenings: asNumber(user.fullAwakenings),
      ascensions: asNumber(user.orbAscensions),
    },
    gym: gymState.activeProgramId
      ? {
          activeProgramId: asString(gymState.activeProgramId) || null,
          currentDayIndex: asNumber(gymState.currentDayIndex),
          totalWorkouts: asNumber(gymState.totalWorkouts),
          lastWorkoutAgo: relativeAgo(lastWorkoutAt, now),
          path:
            gymState.path === 'lift' || gymState.path === 'calisthenics'
              ? gymState.path
              : null,
        }
      : undefined,
    pillars,
    today: {
      dateKey: todayKey,
      pillarsLogged: pillarsLoggedToday,
      pillarsNotLogged,
      totalXP: todayXP,
      timeOfDay: timeOfDay(now),
    },
    weakest,
    hottest,
  };
}

/**
 * Renders the structured snapshot as a compact markdown block to slot
 * into the system prompt. Kept short — every token here is paid input.
 */
export function renderOrbContextMarkdown(ctx: OrbContext): string {
  const lines: string[] = [];

  lines.push(`# ${ctx.profile.name} — level ${ctx.profile.level}`);
  if (ctx.profile.title) lines.push(`Title: ${ctx.profile.title}`);

  const bodyBits: string[] = [];
  if (ctx.body?.sex) bodyBits.push(ctx.body.sex);
  if (ctx.body?.age) bodyBits.push(`${ctx.body.age}y`);
  if (ctx.body?.heightCm) bodyBits.push(`${ctx.body.heightCm}cm`);
  if (ctx.body?.weightKg) bodyBits.push(`${ctx.body.weightKg}kg`);
  if (ctx.body?.targetWeightKg) bodyBits.push(`→ ${ctx.body.targetWeightKg}kg target`);
  if (bodyBits.length) lines.push(`Body: ${bodyBits.join(', ')}`);

  if (ctx.goals.primary.length) {
    lines.push(`Goals: ${ctx.goals.primary.join(', ')}`);
  }
  if (ctx.goals.dietGoal) {
    lines.push(`Diet goal: ${ctx.goals.dietGoal}`);
  }
  if (ctx.goals.experienceLevel) {
    lines.push(`Experience: ${ctx.goals.experienceLevel}`);
  }
  if (ctx.goals.activityLevel) {
    lines.push(`Activity level: ${ctx.goals.activityLevel}`);
  }
  if (ctx.goals.struggles.length) {
    lines.push(`Struggles: ${ctx.goals.struggles.join(', ')}`);
  }

  lines.push('');
  lines.push(`# Today (${ctx.today.dateKey}, ${ctx.today.timeOfDay})`);
  lines.push(`Pillars logged: ${ctx.today.pillarsLogged}/5 · XP: ${ctx.today.totalXP}`);
  if (ctx.today.pillarsNotLogged.length) {
    const names = ctx.today.pillarsNotLogged
      .map((s) => getPillar(s)?.shortName ?? s)
      .join(', ');
    lines.push(`Not yet logged: ${names}`);
  }

  lines.push('');
  lines.push('# Pillar status');
  for (const p of ctx.pillars) {
    const todayBit =
      p.todayValue > 0
        ? `today ${p.todayValue}${p.unit ? ' ' + p.unit : ''}/${p.target} (${p.todayPercent}%)`
        : 'today: not logged';
    const streakBit = p.streak > 0 ? ` · streak ${p.streak}` : '';
    const weeklyBit = ` · ${p.last7DaysHits}/7 last week`;
    lines.push(`- ${p.name}: ${todayBit}${streakBit}${weeklyBit}`);
  }

  if (ctx.gym) {
    lines.push('');
    lines.push('# Gym');
    lines.push(
      `Program: ${ctx.gym.activeProgramId ?? 'none'} (day ${ctx.gym.currentDayIndex}, ${ctx.gym.path ?? 'mixed'})`,
    );
    lines.push(`Total workouts: ${ctx.gym.totalWorkouts}`);
    if (ctx.gym.lastWorkoutAgo) lines.push(`Last workout: ${ctx.gym.lastWorkoutAgo}`);
  }

  if (ctx.weakest || ctx.hottest) {
    lines.push('');
    lines.push('# Pattern');
    if (ctx.weakest) lines.push(`Weakest: ${ctx.weakest.name} (${ctx.weakest.reason})`);
    if (ctx.hottest) lines.push(`Hottest: ${ctx.hottest.name} (streak ${ctx.hottest.streak})`);
  }

  lines.push('');
  lines.push(
    `# Orb state\nTier ${ctx.orb.tier} · awakening ${ctx.orb.awakening}% · fragments ${ctx.orb.fragments} · full-awakens ${ctx.orb.fullAwakenings} · ascensions ${ctx.orb.ascensions}`,
  );

  return lines.join('\n');
}
