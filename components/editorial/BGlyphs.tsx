/**
 * Bespoke editorial glyph set. Thin-stroke SVG icons that read as
 * etched / engraved type — emoji-free, matching the magazine grammar
 * of Direction B v2. Each glyph is 24×24 nominal (sized via prop)
 * and uses currentColor so they inherit the surrounding ink color.
 *
 * Stroke width is 1.4 by default — heavier than diagram lines, lighter
 * than UI icons — so glyphs feel hand-engraved rather than UI-flat.
 */

import * as React from 'react';

interface GlyphProps {
  size?:        number;
  strokeWidth?: number;
  className?:   string;
  style?:       React.CSSProperties;
}

function svg(props: GlyphProps, children: React.ReactNode) {
  return (
    <svg
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth ?? 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={props.style}
    >
      {children}
    </svg>
  );
}

// ─── Pillars + habit categories ─────────────────────────────────────

export function BGymGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <line x1="3"  y1="9"  x2="3"  y2="15" />
      <line x1="6"  y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="12" x2="18" y2="12" />
      <line x1="18" y1="6"  x2="18" y2="18" />
      <line x1="21" y1="9"  x2="21" y2="15" />
    </g>
  ));
}

export function BRunGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <circle cx="14" cy="5" r="1.6" />
      <path d="M9 21l3-6 3 2 3-3" />
      <path d="M5 13l4-4 5 1 1 4" />
    </g>
  ));
}

export function BShowerGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M4 11h16" />
      <path d="M12 4v7" />
      <path d="M8  14l-1 4" />
      <path d="M12 14l-1 5" />
      <path d="M16 14l-1 4" />
    </g>
  ));
}

export function BBookGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M4 5v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
      <path d="M4 17h15" />
      <path d="M9 7h6" />
      <path d="M9 10h6" />
    </g>
  ));
}

export function BMeditationGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <circle cx="12" cy="6" r="2" />
      <path d="M6 20c1-4 3-6 6-6s5 2 6 6" />
      <path d="M3 20h18" />
      <path d="M9 14l-3 -1" />
      <path d="M15 14l3 -1" />
    </g>
  ));
}

export function BFocusGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </g>
  ));
}

export function BWaterGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M12 3c-3 4-5 7-5 10a5 5 0 0 0 10 0c0-3-2-6-5-10z" />
      <path d="M9 13c0 2 1 3 2 3" />
    </g>
  ));
}

export function BSleepGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M20 14a8 8 0 1 1-9-9 6 6 0 0 0 9 9z" />
    </g>
  ));
}

export function BStepsGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <ellipse cx="8"  cy="8"  rx="2"  ry="2.5" />
      <path d="M6 11c-1 1-1.5 2.5-1 4l1.5 4 3-1 .5-3" />
      <ellipse cx="15" cy="13" rx="2" ry="2.5" />
      <path d="M13 16c-1 1-1.5 2.5-1 4l3 0 1-3 0-2" />
    </g>
  ));
}

export function BCodeGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M14 6l-4 12" />
    </g>
  ));
}

export function BSunGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.6 5.6l1.4 1.4" />
      <path d="M17 17l1.4 1.4" />
      <path d="M5.6 18.4l1.4-1.4" />
      <path d="M17 7l1.4-1.4" />
    </g>
  ));
}

// ─── Social + feed dispatches ───────────────────────────────────────

export function BHeartGlyph(p: GlyphProps) {
  return svg(p, (
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  ));
}

export function BCommentGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M4 5h16v11H10l-4 4V5z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </g>
  ));
}

export function BCheerGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M4 13l3-7 4 1-2 6" />
      <path d="M9 13h11l-1 6H10z" />
      <path d="M13 16v3" />
      <path d="M16 16v3" />
    </g>
  ));
}

// ─── Status + flair ─────────────────────────────────────────────────

export function BTrophyGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3" />
      <path d="M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M9 19h6" />
      <path d="M12 14v5" />
    </g>
  ));
}

export function BCrownGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M3 8l3 9h12l3-9-5 4-4-7-4 7z" />
      <path d="M5 19h14" />
    </g>
  ));
}

export function BCheckGlyph(p: GlyphProps) {
  return svg(p, <path d="M5 12l5 5 9-11" />);
}

export function BLockGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </g>
  ));
}

export function BFlameGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M12 3c0 4-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-1-5 0 2-1 3-3 4 0-3 0-5 0-8z" />
    </g>
  ));
}

export function BPlusGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </g>
  ));
}

export function BArrowRightGlyph(p: GlyphProps) {
  return svg(p, (
    <g>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </g>
  ));
}

// ─── Finance / Creative / Misc ──────────────────────────────────────

export function BCoinGlyph(p: GlyphProps) {
  // Stacked coins — used for finance categories (savings, investments,
  // expenses, no-spend, side-income, etc.)
  return svg(p, (
    <g>
      <ellipse cx="12" cy="6"  rx="7" ry="2.4" />
      <ellipse cx="12" cy="6"  rx="3" ry="1" />
      <path d="M5 6v5c0 1.4 3.1 2.4 7 2.4s7-1 7-2.4V6" />
      <path d="M5 11v5c0 1.4 3.1 2.4 7 2.4s7-1 7-2.4v-5" />
    </g>
  ));
}

export function BPaletteGlyph(p: GlyphProps) {
  // Painter's palette w/ thumb hole + pigment dots — for designs +
  // drawings. Lighter weight than BCode.
  return svg(p, (
    <g>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5S13 18 13 17a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 9 9 0 0 0-9-8z" />
      <circle cx="8.5" cy="9" r="0.8" fill="currentColor" />
      <circle cx="12"  cy="6.5" r="0.8" fill="currentColor" />
      <circle cx="15.5" cy="9" r="0.8" fill="currentColor" />
      <circle cx="7"  cy="13" r="0.8" fill="currentColor" />
    </g>
  ));
}

export function BMusicGlyph(p: GlyphProps) {
  // Eighth note — for music + guitar.
  return svg(p, (
    <g>
      <path d="M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
      <path d="M9 18V5l11-3v13" />
      <path d="M20 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
    </g>
  ));
}

export function BCameraGlyph(p: GlyphProps) {
  // Camera body — for photos + videos.
  return svg(p, (
    <g>
      <path d="M3 8h4l2-3h6l2 3h4v11H3z" />
      <circle cx="12" cy="13" r="4" />
      <circle cx="17" cy="9.5" r="0.6" fill="currentColor" />
    </g>
  ));
}

export function BCalendarGlyph(p: GlyphProps) {
  // Calendar with a marker — for scheduling.
  return svg(p, (
    <g>
      <rect x="4" y="5" width="16" height="16" rx="1" />
      <path d="M4 10h16" />
      <path d="M9 3v4" />
      <path d="M15 3v4" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 18h2" />
    </g>
  ));
}

export function BInventoryGlyph(p: GlyphProps) {
  // Chest with a banded lid — for inventory / time-travelers.
  return svg(p, (
    <g>
      <rect x="3" y="9" width="18" height="11" rx="1" />
      <path d="M3 13h18" />
      <path d="M10 13v3h4v-3" />
      <path d="M5 9c0-2.5 3-4 7-4s7 1.5 7 4" />
    </g>
  ));
}

export function BCaloriesGlyph(p: GlyphProps) {
  // Flame inside a circular gauge — for calories.
  return svg(p, (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7c0 3-2.5 3-2.5 6a2.5 2.5 0 0 0 5 0c0-1-.5-2-.5-3 0 1.5-1 2-2 2.5 0-2 0-3.5 0-5.5z" />
    </g>
  ));
}

export function BBellGlyph(p: GlyphProps) {
  // Notification bell — used in Masthead.
  return svg(p, (
    <g>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </g>
  ));
}

export function BCompassGlyph(p: GlyphProps) {
  // Compass — for outside / outdoor habits.
  return svg(p, (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M16 8l-2.5 5.5L8 16l2.5-5.5L16 8z" />
    </g>
  ));
}

export function BWingsGlyph(p: GlyphProps) {
  // Wings — for ascension flair.
  return svg(p, (
    <g>
      <path d="M12 7v12" />
      <path d="M12 9c-3-2-6-3-9-3 0 2 2 6 9 7" />
      <path d="M12 9c3-2 6-3 9-3 0 2-2 6-9 7" />
    </g>
  ));
}
