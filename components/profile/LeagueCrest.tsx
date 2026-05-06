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
 * Premium rank crest. A stamped-medallion frame with notched corners,
 * a tinted gradient interior, the league's roman numeral on top, and
 * a stacked-chevron count below (bronze = 1 chevron … grandmaster = 7).
 * Active rank gets a foil-stamp shine that sweeps across the entire
 * frame, plus a pulsing color halo. Locked ranks render at low opacity.
 *
 * Shape rationale: the chevron count tells you the tier from across
 * the screen. The notched-corner medallion frame makes the crest feel
 * struck rather than drawn.
 */
export function LeagueCrest({ league, size = 56, active, locked }: Props) {
  const idx = LEAGUES.indexOf(league);
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const chevronCount = Math.min(idx + 1, 7);

  const opacity = locked ? 0.45 : 1;
  const notch = size * 0.1; // corner-notch size for the clip-path

  // Notched octagon clip-path: cuts each corner at `notch` so the crest
  // reads as a struck medallion. Same shape used for the inner area.
  const notchedPath = `polygon(
    ${notch}px 0,
    calc(100% - ${notch}px) 0,
    100% ${notch}px,
    100% calc(100% - ${notch}px),
    calc(100% - ${notch}px) 100%,
    ${notch}px 100%,
    0 calc(100% - ${notch}px),
    0 ${notch}px
  )`;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        opacity,
      }}
    >
      {/* Color halo behind the crest — active only, blurred radial pulse */}
      {active && !locked && (
        <div
          aria-hidden
          className="league-halo"
          style={{
            position: 'absolute',
            inset: -8,
            background: `radial-gradient(circle, ${league.color}66, transparent 65%)`,
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Outer ring — tinted color frame, shaped as a notched octagon.
          Active rank gets a slowly-rotating conic shimmer underneath
          via a sibling pseudo-via inline gradient. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: active
            ? `conic-gradient(from 0deg, ${league.color}, ${league.color}99, ${league.color}, ${league.color}cc, ${league.color})`
            : league.color,
          clipPath: notchedPath,
          animation: active ? 'league-frame-rotate 7s linear infinite' : undefined,
          willChange: active ? 'transform' : undefined,
        }}
      />

      {/* Inner medallion — paper face with a subtle vertical gradient and
          a faint color wash from the top. Sits inside the frame with a
          1.5px reveal so the outer frame reads as a struck rim. */}
      <div
        style={{
          position: 'absolute',
          inset: 1.5,
          clipPath: notchedPath,
          background: active
            ? `linear-gradient(180deg,
                ${league.color}26 0%,
                var(--b-paper-2) 50%,
                var(--b-paper) 100%)`
            : `linear-gradient(180deg,
                ${league.color}14 0%,
                var(--b-paper) 70%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: size * 0.08,
          paddingBottom: size * 0.08,
          gap: size * 0.04,
        }}
      >
        {/* Roman numeral — bigger, with a subtle ink shadow for weight */}
        <span
          className={active ? 'font-display tabular league-crest-shine' : 'font-display tabular'}
          style={{
            ['--crest-color' as string]: league.color,
            fontSize: size * 0.34,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1,
            color: active ? undefined : league.color,
            letterSpacing: '0.04em',
            textShadow: active ? `0 1px 0 rgba(0,0,0,0.3)` : undefined,
          }}
        >
          {numerals[idx] ?? ''}
        </span>

        {/* Chevron stack */}
        <svg
          viewBox="0 0 32 16"
          width={size * 0.66}
          height={size * 0.32}
          style={{ display: 'block' }}
        >
          {Array.from({ length: chevronCount }).map((_, i) => {
            // Stack from bottom up. Bottom chevron at y=14, each next 1.7
            // higher with slightly narrower width — gives a tapered look.
            const y = 14 - i * 1.7;
            const widthHalf = 8 - i * 0.5;
            const cx = 16;
            const isTop = i === chevronCount - 1;
            return (
              <polyline
                key={i}
                className="league-chevron"
                points={`${cx - widthHalf},${y} ${cx},${y - 1.6} ${cx + widthHalf},${y}`}
                fill="none"
                stroke={league.color}
                strokeWidth={isTop ? 1.6 : 1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isTop ? 1 : 0.85 - i * 0.04}
                style={{
                  ['--i' as string]: i,
                  ['--target-opacity' as string]: isTop ? 1 : 0.85 - i * 0.04,
                  filter: active && isTop
                    ? `drop-shadow(0 0 3px ${league.color}88)`
                    : undefined,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Foil-shine sheen — only on active. A bright diagonal band that
          sweeps across the medallion every few seconds. Clipped to the
          notched shape so it doesn't bleed past the frame. GPU-composited. */}
      {active && !locked && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 1.5,
            clipPath: notchedPath,
            pointerEvents: 'none',
            background: `linear-gradient(110deg,
              transparent 35%,
              rgba(255,255,255,0.18) 48%,
              rgba(255,255,255,0.32) 52%,
              transparent 65%)`,
            backgroundSize: '300% 100%',
            animation: 'league-crest-sweep 3.8s linear infinite',
            mixBlendMode: 'screen',
            willChange: 'background-position',
          }}
        />
      )}
    </div>
  );
}
