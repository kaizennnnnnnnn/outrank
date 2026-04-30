'use client';

import { cn } from '@/lib/utils';

/**
 * Outrank's onboarding mascot — a cute baby phoenix that guides the
 * user through the funnel. Cartoon style, big eyes, idle bob via CSS
 * keyframes. Different role from the Logo phoenix (which is the brand
 * mark) — this one talks.
 *
 * Compound silhouette: layered tail fan, two-tone body with chest
 * fluff, three-feather wings, tri-tongue head crest. Sub-element
 * animations (wing flutter, tail flicker, tuft sway) wire to CSS
 * keyframes in globals.css. Per CLAUDE.md ambient animations belong
 * in CSS so they don't burn the paint budget.
 *
 * Mood is reserved for future use (thinking head-tilt, celebrate
 * wings-up, etc.). v1 only ships idle.
 */

type Mood = 'idle' | 'thinking' | 'celebrating';

interface PhoenixMascotProps {
  size?: number;
  mood?: Mood;
  className?: string;
  /** Disable the idle bob — useful in static contexts. */
  paused?: boolean;
}

export function PhoenixMascot({
  size = 130,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mood = 'idle',
  className,
  paused = false,
}: PhoenixMascotProps) {
  // Aspect ratio matches the viewBox below.
  const aspectRatio = 180 / 160;
  return (
    <div
      className={cn(
        'inline-block',
        !paused && 'animate-mascot-bob',
        className,
      )}
      style={{ width: size, height: size * aspectRatio }}
    >
      <svg
        viewBox="0 0 160 180"
        width="100%"
        height="100%"
        className="overflow-visible drop-shadow-[0_10px_28px_rgba(220,38,38,0.4)]"
      >
        <defs>
          {/* Body — bright amber to deep red, saturated */}
          <linearGradient id="mascotBody" x1="80" y1="78" x2="80" y2="155">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="35%" stopColor="#fb923c" />
            <stop offset="75%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          {/* Chest fluff — lighter cream-amber overlay */}
          <radialGradient id="mascotChest" cx="50%" cy="60%" r="36%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#fdba74" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
          </radialGradient>
          {/* Body specular — small highlight near top-left */}
          <radialGradient id="mascotBodyShine" cx="38%" cy="22%" r="22%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Head — cream → soft amber */}
          <linearGradient id="mascotHead" x1="80" y1="20" x2="80" y2="84">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="55%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          {/* Wing feathers — layered amber to red */}
          <linearGradient id="mascotWingTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="60%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="mascotWingMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="mascotWingTip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          {/* Tail flames — fan plumes */}
          <linearGradient id="mascotTailOuter" x1="80" y1="100" x2="80" y2="170">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="55%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="mascotTailInner" x1="80" y1="105" x2="80" y2="160">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          {/* Head crest flames */}
          <linearGradient id="mascotCrest" x1="80" y1="0" x2="80" y2="32">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* ─── Tail fan — drawn first, behind everything ─── */}
        <g
          className={paused ? '' : 'mascot-tail'}
          style={{ transformOrigin: '80px 115px' }}
        >
          {/* Outer plumes (deepest) */}
          <path
            d="M48 108 Q 30 132 30 158 Q 36 168 46 162 Q 56 152 60 130 Q 60 116 48 108 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.85"
          />
          <path
            d="M112 108 Q 130 132 130 158 Q 124 168 114 162 Q 104 152 100 130 Q 100 116 112 108 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.85"
          />
          {/* Mid plumes */}
          <path
            d="M62 110 Q 52 138 54 162 Q 60 170 66 166 Q 72 154 72 132 Q 72 118 62 110 Z"
            fill="url(#mascotTailOuter)"
          />
          <path
            d="M98 110 Q 108 138 106 162 Q 100 170 94 166 Q 88 154 88 132 Q 88 118 98 110 Z"
            fill="url(#mascotTailOuter)"
          />
          {/* Center plume — tallest */}
          <path
            d="M80 110 Q 74 138 76 168 Q 78 174 80 174 Q 82 174 84 168 Q 86 138 80 110 Z"
            fill="url(#mascotTailOuter)"
          />
          {/* Center inner highlight */}
          <path
            d="M80 116 Q 76 138 78 164 Q 79 168 80 168 Q 81 168 82 164 Q 84 138 80 116 Z"
            fill="url(#mascotTailInner)"
            opacity="0.8"
          />
          {/* Tail tip sparks */}
          <circle cx="80" cy="170" r="1.4" fill="#fef3c7" opacity="0.9" />
          <circle cx="60" cy="161" r="1" fill="#fde68a" opacity="0.85" />
          <circle cx="100" cy="161" r="1" fill="#fde68a" opacity="0.85" />
        </g>

        {/* ─── Wings — three layered feathers per side ─── */}
        {/* Left wing */}
        <g
          className={paused ? '' : 'mascot-wing-l'}
          style={{ transformOrigin: '52px 110px' }}
        >
          {/* Back feather (longest, lightest) */}
          <path
            d="M52 96 Q 24 102 16 128 Q 22 132 32 128 Q 44 122 56 110 Q 58 102 52 96 Z"
            fill="url(#mascotWingTop)"
          />
          {/* Mid feather */}
          <path
            d="M52 100 Q 30 110 26 128 Q 32 130 40 126 Q 50 120 58 112 Q 58 104 52 100 Z"
            fill="url(#mascotWingMid)"
          />
          {/* Front feather (shortest, darkest tip) */}
          <path
            d="M52 106 Q 38 116 36 128 Q 42 128 48 124 Q 56 118 60 114 Q 58 108 52 106 Z"
            fill="url(#mascotWingTip)"
          />
          {/* Highlight ridge along back feather */}
          <path
            d="M22 122 Q 36 117 50 108"
            stroke="#fef3c7"
            strokeWidth="0.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </g>
        {/* Right wing — mirror */}
        <g
          className={paused ? '' : 'mascot-wing-r'}
          style={{ transformOrigin: '108px 110px' }}
        >
          <path
            d="M108 96 Q 136 102 144 128 Q 138 132 128 128 Q 116 122 104 110 Q 102 102 108 96 Z"
            fill="url(#mascotWingTop)"
          />
          <path
            d="M108 100 Q 130 110 134 128 Q 128 130 120 126 Q 110 120 102 112 Q 102 104 108 100 Z"
            fill="url(#mascotWingMid)"
          />
          <path
            d="M108 106 Q 122 116 124 128 Q 118 128 112 124 Q 104 118 100 114 Q 102 108 108 106 Z"
            fill="url(#mascotWingTip)"
          />
          <path
            d="M138 122 Q 124 117 110 108"
            stroke="#fef3c7"
            strokeWidth="0.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </g>

        {/* ─── Body — chubby pear ─── */}
        <ellipse cx="80" cy="115" rx="34" ry="38" fill="url(#mascotBody)" />
        {/* Chest fluff — lighter belly */}
        <ellipse cx="80" cy="125" rx="22" ry="24" fill="url(#mascotChest)" />
        {/* Body specular */}
        <ellipse cx="80" cy="115" rx="34" ry="38" fill="url(#mascotBodyShine)" />
        {/* Subtle feather hint lines on chest */}
        <path d="M68 122 Q 70 128 72 134" stroke="#fcd34d" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.45" />
        <path d="M80 124 Q 80 130 80 136" stroke="#fcd34d" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.45" />
        <path d="M92 122 Q 90 128 88 134" stroke="#fcd34d" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.45" />

        {/* Tiny feet */}
        <line x1="68" y1="148" x2="65" y2="158" stroke="#7c2d12" strokeWidth="3.2" strokeLinecap="round" />
        <line x1="92" y1="148" x2="95" y2="158" stroke="#7c2d12" strokeWidth="3.2" strokeLinecap="round" />
        {/* Toe stubs */}
        <circle cx="62" cy="159" r="1.7" fill="#7c2d12" />
        <circle cx="65" cy="160" r="1.7" fill="#7c2d12" />
        <circle cx="68" cy="159.5" r="1.5" fill="#7c2d12" />
        <circle cx="92" cy="159.5" r="1.5" fill="#7c2d12" />
        <circle cx="95" cy="160" r="1.7" fill="#7c2d12" />
        <circle cx="98" cy="159" r="1.7" fill="#7c2d12" />

        {/* ─── Head ─── */}
        <circle cx="80" cy="60" r="30" fill="url(#mascotHead)" />
        {/* Side cheek tufts — small flame curls behind head */}
        <path
          d="M48 60 Q 42 56 44 50 Q 48 54 52 54 Q 50 58 48 60 Z"
          fill="#fb923c"
          opacity="0.85"
        />
        <path
          d="M112 60 Q 118 56 116 50 Q 112 54 108 54 Q 110 58 112 60 Z"
          fill="#fb923c"
          opacity="0.85"
        />

        {/* Head crest — three flame tongues with center dominant */}
        <g
          className={paused ? '' : 'mascot-tuft'}
          style={{ transformOrigin: '80px 32px' }}
        >
          {/* Left tongue */}
          <path
            d="M68 34 Q 64 22 66 12 Q 70 18 72 26 Q 73 32 70 36 Z"
            fill="url(#mascotCrest)"
            opacity="0.85"
          />
          {/* Right tongue */}
          <path
            d="M92 34 Q 96 22 94 12 Q 90 18 88 26 Q 87 32 90 36 Z"
            fill="url(#mascotCrest)"
            opacity="0.85"
          />
          {/* Center tongue — tallest */}
          <path
            d="M80 36 Q 72 22 76 4 Q 80 14 80 18 Q 80 14 84 4 Q 88 22 80 36 Z"
            fill="url(#mascotCrest)"
          />
          {/* Center hot core */}
          <path
            d="M80 30 Q 76 20 78 10 Q 80 16 80 18 Q 80 16 82 10 Q 84 20 80 30 Z"
            fill="#fef3c7"
            opacity="0.7"
          />
        </g>

        {/* ─── Eyes ─── */}
        <ellipse cx="68" cy="60" rx="5.5" ry="6.5" fill="#0c0c14" />
        <ellipse cx="92" cy="60" rx="5.5" ry="6.5" fill="#0c0c14" />
        {/* Big shines */}
        <circle cx="69.8" cy="57.6" r="1.8" fill="#ffffff" />
        <circle cx="93.8" cy="57.6" r="1.8" fill="#ffffff" />
        {/* Small secondary shines */}
        <circle cx="66.6" cy="62.4" r="1" fill="#ffffff" opacity="0.85" />
        <circle cx="90.6" cy="62.4" r="1" fill="#ffffff" opacity="0.85" />

        {/* Beak */}
        <path
          d="M76 70 L 84 70 L 80 76 Z"
          fill="#f59e0b"
          stroke="#92400e"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Beak shine */}
        <path d="M77.5 70.5 L 81 70.5" stroke="#fef3c7" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />

        {/* Cheek blush */}
        <ellipse cx="58" cy="68" rx="4" ry="2.4" fill="#ef4444" opacity="0.5" />
        <ellipse cx="102" cy="68" rx="4" ry="2.4" fill="#ef4444" opacity="0.5" />
      </svg>
    </div>
  );
}
