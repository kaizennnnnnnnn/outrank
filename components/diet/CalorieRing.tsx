'use client';

import { cn } from '@/lib/utils';

/**
 * Daily calorie progress ring + macro mini-bars. Pure SVG, no canvas,
 * no animation libs — single re-render when totals change.
 *
 * The ring fills clockwise from 12 o'clock. We cap visual fill at 1.0
 * but track real progress separately so we can flash a warning band
 * when the user crosses 100% of their goal.
 */

interface Props {
  consumed: { kcal: number; protein: number; carbs: number; fat: number };
  goal:     { kcal: number; protein: number; carbs: number; fat: number };
  size?:    number;
}

export function CalorieRing({ consumed, goal, size = 220 }: Props) {
  const r = size / 2 - 14;
  const circumference = 2 * Math.PI * r;
  const remaining = Math.max(0, goal.kcal - consumed.kcal);
  const overshoot = consumed.kcal > goal.kcal;
  const progress = goal.kcal > 0 ? Math.min(1, consumed.kcal / goal.kcal) : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={14}
          />
          {/* Fill */}
          <defs>
            <linearGradient id="cal-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor={overshoot ? '#ef4444' : '#dc2626'} />
              <stop offset="100%" stopColor={overshoot ? '#dc2626' : '#f97316'} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#cal-ring-grad)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">
            {overshoot ? 'Over' : 'Left'}
          </span>
          <span className={cn(
            'font-heading font-black text-4xl tabular-nums',
            overshoot ? 'text-red-400' : 'text-white',
          )}>
            {overshoot ? consumed.kcal - goal.kcal : remaining}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            of {goal.kcal} kcal
          </span>
        </div>
      </div>

      {/* Macro bars */}
      <div className="mt-5 grid grid-cols-3 gap-3 w-full max-w-xs">
        <MacroBar label="Protein" tone="#ef4444" consumed={consumed.protein} goal={goal.protein} unit="g" />
        <MacroBar label="Carbs"   tone="#f59e0b" consumed={consumed.carbs}   goal={goal.carbs}   unit="g" />
        <MacroBar label="Fat"     tone="#3b82f6" consumed={consumed.fat}     goal={goal.fat}     unit="g" />
      </div>
    </div>
  );
}

function MacroBar({
  label, tone, consumed, goal, unit,
}: { label: string; tone: string; consumed: number; goal: number; unit: string }) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const overshoot = consumed > goal;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</span>
        <span className={cn('text-[11px] font-mono tabular-nums', overshoot ? 'text-red-300' : 'text-slate-300')}>
          {Math.round(consumed)}<span className="text-slate-500">/{Math.round(goal)}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct * 100}%`,
            background: overshoot
              ? 'linear-gradient(90deg, #b91c1c, #ef4444)'
              : `linear-gradient(90deg, ${tone}99, ${tone})`,
          }}
        />
      </div>
    </div>
  );
}
