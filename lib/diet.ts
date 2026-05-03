/**
 * Diet log Firestore helpers — write meal entries and query them by
 * day. Mirrors the shape of lib/logHabit.ts so it feels consistent
 * with the rest of the codebase.
 *
 * Stored at: dietLogs/{uid}/entries/{auto-id}
 *
 * We use Timestamp.now() (not serverTimestamp) for createdAt because
 * the dashboard subscribes ordered-by-createdAt and serverTimestamp
 * hides pending docs in the ordered query until the server confirms
 * (see CLAUDE.md "serverTimestamp + orderBy = invisible pending docs").
 */

import {
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  DietDailySummary,
  EntrySource,
  FoodItem,
  MealEntry,
  MealType,
} from '@/types/diet';

// ─── Date helpers ────────────────────────────────────────────────────

/** YYYY-MM-DD in the user's local timezone. We store entries by
 *  Timestamp and bucket client-side so the local view always matches
 *  the user's clock without timezone fields on every doc. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Write ───────────────────────────────────────────────────────────

export interface LogMealInput {
  uid:      string;
  mealType: MealType;
  items:    FoodItem[];
  source:   EntrySource;
  rawText?: string;
  loggedAt?: Date;
}

/** Persist a meal entry. Computes totals from items so callers don't
 *  have to keep two sources of truth in sync. */
export async function logMeal(input: LogMealInput): Promise<string> {
  const totalKcal    = input.items.reduce((s, i) => s + (i.kcal     || 0), 0);
  const totalProtein = input.items.reduce((s, i) => s + (i.protein  || 0), 0);
  const totalCarbs   = input.items.reduce((s, i) => s + (i.carbs    || 0), 0);
  const totalFat     = input.items.reduce((s, i) => s + (i.fat      || 0), 0);

  const ref = await addDoc(collection(db, 'dietLogs', input.uid, 'entries'), {
    userId:       input.uid,
    mealType:     input.mealType,
    items:        input.items,
    totalKcal,
    totalProtein,
    totalCarbs,
    totalFat,
    source:       input.source,
    ...(input.rawText ? { rawText: input.rawText } : {}),
    createdAt:    Timestamp.now(),
    loggedAt:     Timestamp.fromDate(input.loggedAt ?? new Date()),
  });
  return ref.id;
}

export async function deleteMeal(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'dietLogs', uid, 'entries', entryId));
}

// ─── Read ────────────────────────────────────────────────────────────

/** Subscribe to a single day's entries. Caller is responsible for
 *  unsubscribing — pattern matches the rest of our subscriptions. */
export function subscribeMealsForDate(
  uid:  string,
  date: Date,
  cb:   (entries: MealEntry[]) => void,
): () => void {
  const q = query(
    collection(db, 'dietLogs', uid, 'entries'),
    where('loggedAt', '>=', Timestamp.fromDate(startOfDay(date))),
    where('loggedAt', '<=', Timestamp.fromDate(endOfDay(date))),
    orderBy('loggedAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MealEntry);
    cb(entries);
  });
}

/** One-shot fetch of a day's entries (for SSR-style loading). */
export async function getMealsForDate(uid: string, date: Date): Promise<MealEntry[]> {
  const q = query(
    collection(db, 'dietLogs', uid, 'entries'),
    where('loggedAt', '>=', Timestamp.fromDate(startOfDay(date))),
    where('loggedAt', '<=', Timestamp.fromDate(endOfDay(date))),
    orderBy('loggedAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MealEntry);
}

// ─── Summarize ───────────────────────────────────────────────────────

export function summarizeDay(
  entries: MealEntry[],
  goals:   { kcal: number; protein: number; carbs: number; fat: number },
  date:    Date = new Date(),
): DietDailySummary {
  return {
    date:         todayKey(date),
    totalKcal:    entries.reduce((s, e) => s + e.totalKcal,    0),
    totalProtein: entries.reduce((s, e) => s + e.totalProtein, 0),
    totalCarbs:   entries.reduce((s, e) => s + e.totalCarbs,   0),
    totalFat:     entries.reduce((s, e) => s + e.totalFat,     0),
    goalKcal:     goals.kcal,
    goalProtein:  goals.protein,
    goalCarbs:    goals.carbs,
    goalFat:      goals.fat,
    entryCount:   entries.length,
  };
}
