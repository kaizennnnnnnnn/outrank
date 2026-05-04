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
