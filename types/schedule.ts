import { Timestamp } from 'firebase/firestore';

// One block on the weekly schedule grid.
// dayOfWeek: 0 = Monday, 6 = Sunday. hour: 0-23 (occupies a 1-hour slot).
export interface ScheduleEntry {
  id?: string;
  habitSlug: string;
  habitName: string;
  habitIcon: string;
  habitColor: string;
  dayOfWeek: number;
  hour: number;
  createdAt: Timestamp;
}
