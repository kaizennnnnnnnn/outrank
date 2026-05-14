import { Timestamp } from 'firebase/firestore';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

// One block on the weekly schedule grid.
// dayOfWeek: 0 = Monday, 6 = Sunday. hour: 0-23 (occupies a 1-hour slot).
//
// Two flavors:
//   - kind === 'habit' (or undefined for legacy) — habit reminder block,
//     uses habitSlug / habitName / habitIcon / habitColor.
//   - kind === 'meal' — meal reminder block, uses mealType to pick the
//     label/icon. Stored in the same collection so the existing per-hour
//     scheduleNotifier query handles both.
export interface ScheduleEntry {
  id?: string;
  kind?: 'habit' | 'meal';
  // Habit fields — required when kind === 'habit'.
  habitSlug: string;
  habitName: string;
  habitIcon: string;
  habitColor: string;
  // Meal fields — present when kind === 'meal'.
  mealType?: MealType;
  dayOfWeek: number;
  hour: number;
  createdAt: Timestamp;
}
