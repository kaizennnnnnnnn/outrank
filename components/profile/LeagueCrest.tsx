'use client';

import { LEAGUES, League } from '@/constants/seasons';

interface Props {
  league: League;
  /** Pixel size of the square crest. */
  size?: number;
  /** Active rank renders the metallic shine + a halo. Non-active crests
   *  are static so 7-row ladders don't all animate at once. */
  active?: boolean;
  /** Slightly muted state — used when displaying ranks the user hasn't
   *  reached yet. The crest shape is still drawn but at lower opacity. */
  locked?: boolean;
}

/**
 * Premium-feeling rank crest. A stacked chevron mark counts the league
 * tier (bronze = 1 chevron up to grandmaster = 7), plus a roman numeral
 * floating above. Active rank gets the metallic foil-stamp sheen and a
 * pulsing color halo behind it. Static otherwise so the ladder doesn't
 * become a chaos of competing animations.
 *
 * Shape choice: chevrons stacking upward read as climbing — each rank
 * accumulates one more chevron, so a glance at the crest tells you
 * which tier it is without needing to read the name.
 */
export function LeagueCrest({ league, size = 56, active, locked }: Props) {
  const idx = LEAGUES.indexOf(league);
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  // Number of chevrons to draw — capped at 7 (grandmaster).
  const chevronCount = Math.min(idx + 1, 7);
  // Vertical layout: chevrons start near the bottom and stack upward.
  // For the SVG viewBox of 32x32 we draw chevrons of height 4, spaced
  // every 3.6 units from y=27 (bottom) upward.
  const baseY = 27;
  const chevronSpacing = 3.6;

  const opacity = locked ? 0.35 : 1;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      {/* Halo — color-tinted radial pulse behind the crest, active only */}
      {active && !locked && (
        <div
          aria-hidden
          className="league-halo"
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 12,
            background: `radial-gradient(circle, ${league.color}55, transparent 70%)`,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Crest frame */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          border: `1.5px solid ${league.color}`,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: active
            ? `radial-gradient(circle at 50% 30%, ${league.color}22, transparent 70%)`
            : 'transparent',
        }}
      >
        {/* Roman numeral up top — small, gives at-a-glance tier */}
        <span
          className={active ? 'font-display tabular league-crest-shine' : 'font-display tabular'}
          style={{
            ['--crest-color' as string]: league.color,
            fontSize: size * 0.32,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1,
            color: active ? undefined : league.color,
            paddingTop: size * 0.08,
            letterSpacing: '0.04em',
          }}
        >
          {numerals[idx] ?? ''}
        </span>

        {/* Chevron stack — bottom-half SVG. Wider chevrons at the bottom
            (older trophy shape), narrower as they climb. The stack
            count == league index + 1. */}
        <svg
          viewBox="0 0 32 32"
          width={size * 0.7}
          height={size * 0.5}
          style={{
            marginTop: 'auto',
            marginBottom: size * 0.06,
            display: 'block',
          }}
        >
          {Array.from({ length: chevronCount }).map((_, i) => {
            const y = baseY - i * chevronSpacing;
            const widthHalf = 8 - i * 0.6;
            const cx = 16;
            return (
              <polyline
                key={i}
                className="league-chevron"
                points={`${cx - widthHalf},${y} ${cx},${y - 3.2} ${cx + widthHalf},${y}`}
                fill="none"
                stroke={league.color}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={i === chevronCount - 1 ? 1 : 0.85 - i * 0.04}
                style={{
                  ['--i' as string]: i,
                  ['--target-opacity' as string]: i === chevronCount - 1 ? 1 : 0.85 - i * 0.04,
                }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
