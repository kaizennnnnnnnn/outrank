'use client';

/**
 * Daily calorie progress ring + macro mini-bars. Pure SVG, no canvas,
 * no animation libs — single re-render when totals change.
 *
 * Editorial palette only: paper / ink / accent red. The previous
 * orange-gradient look has been replaced with solid accent red and
 * neutral ink levels so the ring sits inside the rest of the
 * Direction-B chrome instead of glowing on top of it.
 */

interface Props {
  consumed: { kcal: number; protein: number; carbs: number; fat: number };
  goal:     { kcal: number; protein: number; carbs: number; fat: number };
  size?:    number;
}

export function CalorieRing({ consumed, goal, size = 220 }: Props) {
  const r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;
  const remaining = Math.max(0, goal.kcal - consumed.kcal);
  const overshoot = consumed.kcal > goal.kcal;
  const progress = goal.kcal > 0 ? Math.min(1, consumed.kcal / goal.kcal) : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center" style={{ width: '100%' }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track — hairline ink at low opacity, theme-aware */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--b-ink-15)"
            strokeWidth={10}
          />
          {/* Fill — solid accent red, no gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--b-accent)"
            strokeWidth={10}
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          {/* Inner hairline circle — adds an editorial frame inside the
              track, like a watch dial. */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r - 14}
            fill="none"
            stroke="var(--b-rule)"
            strokeWidth={1}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ textAlign: 'center' }}>
          <span
            className="spread"
            style={{
              fontSize: 9,
              color: overshoot ? 'var(--b-accent)' : 'var(--b-ink-60)',
            }}
          >
            {overshoot ? 'Over' : 'Left'}
          </span>
          <span
            className="font-display tabular"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1,
              color: overshoot ? 'var(--b-accent)' : 'var(--b-ink)',
              marginTop: 4,
              letterSpacing: '-0.02em',
            }}
          >
            {overshoot ? consumed.kcal - goal.kcal : remaining}
          </span>
          <span
            className="font-mono tabular"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            of {goal.kcal} kcal
          </span>
        </div>
      </div>

      {/* Macro bars — editorial palette only.
          Protein: accent red. Carbs: solid ink. Fat: muted ink. */}
      <div
        style={{
          marginTop: 22,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
          width: '100%',
          maxWidth: 360,
        }}
      >
        <MacroBar label="Protein" tone="var(--b-accent)" consumed={consumed.protein} goal={goal.protein} unit="g" />
        <MacroBar label="Carbs"   tone="var(--b-ink)"    consumed={consumed.carbs}   goal={goal.carbs}   unit="g" />
        <MacroBar label="Fat"     tone="var(--b-ink-40)" consumed={consumed.fat}     goal={goal.fat}     unit="g" />
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
      <div
        className="spread"
        style={{
          fontSize: 8.5,
          color: 'var(--b-ink-60)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular"
        style={{
          fontSize: 11,
          color: overshoot ? 'var(--b-accent)' : 'var(--b-ink)',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {Math.round(consumed)}
        <span style={{ color: 'var(--b-ink-40)', fontWeight: 400 }}>
          /{Math.round(goal)}{unit}
        </span>
      </div>
      <div
        style={{
          height: 3,
          background: 'var(--b-ink-15)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: overshoot ? 'var(--b-accent)' : tone,
            transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
