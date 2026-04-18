'use client';

import { UserHabit } from '@/types/habit';
import { getMasteryTier, getNextMasteryTier, getMasteryProgress } from '@/constants/mastery';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface Props { habits: UserHabit[]; }

/**
 * A small shelf of medals — one per habit that has earned at least Bronze.
 * Shows category icon + mastery tier crystal + progress ring around it.
 */
export function MasteryShelf({ habits }: Props) {
  const shelf = habits
    .map((h) => ({ habit: h, tier: getMasteryTier(h.totalLogs), next: getNextMasteryTier(h.totalLogs), progress: getMasteryProgress(h.totalLogs) }))
    .filter((e) => e.tier)
    .sort((a, b) => (b.tier!.tier - a.tier!.tier) || (b.habit.totalLogs - a.habit.totalLogs));

  if (shelf.length === 0) {
    return (
      <p className="text-[11px] text-slate-600">Log 5 times on any habit to earn your first medal.</p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {shelf.map(({ habit, tier, next, progress }) => (
        <div
          key={habit.categorySlug}
          className="flex-shrink-0 flex flex-col items-center"
          title={`${habit.categoryName} — ${tier!.name}${next ? ` (${habit.totalLogs}/${next.minLogs} to ${next.name})` : ' (MAX)'}`}
        >
          <div className="relative w-14 h-14">
            {/* Progress ring */}
            <svg className="absolute inset-0" width={56} height={56} viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="25" fill="none" stroke="#1e1e30" strokeWidth="3" />
              <circle
                cx="28" cy="28" r="25"
                fill="none"
                stroke={tier!.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2 * Math.PI * 25} ${2 * Math.PI * 25}`}
                transform="rotate(-90 28 28)"
                style={{ filter: `drop-shadow(0 0 4px ${tier!.color}80)` }}
              />
            </svg>
            <div
              className="absolute inset-1 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${tier!.color}20, #0b0b14 70%)`,
                border: `1px solid ${tier!.color}60`,
              }}
            >
              <CategoryIcon
                slug={habit.categorySlug}
                name={habit.categoryName}
                icon={habit.categoryIcon}
                color={habit.color}
                size="sm"
              />
            </div>
          </div>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: tier!.color }}>
            {tier!.name}
          </p>
        </div>
      ))}
    </div>
  );
}
