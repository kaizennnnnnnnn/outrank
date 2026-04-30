'use client';

import { cn } from '@/lib/utils';

/**
 * Outrank's onboarding mascot — a cute baby phoenix that guides the
 * user through the funnel. Cartoon style, big eyes, idle bob via CSS
 * keyframes. Different role from the Logo phoenix (which is the brand
 * mark) — this one talks.
 *
 * Sub-element animations (wing flutter, tuft sway) live in the SVG via
 * CSS classes wired to keyframes in globals.css. Per CLAUDE.md, ambient
 * animations belong in CSS so they don't burn the paint budget.
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
  size = 140,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mood = 'idle',
  className,
  paused = false,
}: PhoenixMascotProps) {
  return (
    <div
      className={cn(
        'inline-block',
        !paused && 'animate-mascot-bob',
        className,
      )}
      style={{ width: size, height: size * (140 / 120) }}
    >
      <svg
        viewBox="0 0 120 140"
        width="100%"
        height="100%"
        className="overflow-visible drop-shadow-[0_8px_24px_rgba(220,38,38,0.35)]"
      >
        <defs>
          {/* Body — bright amber to deep red */}
          <linearGradient id="mascotBody" x1="60" y1="55" x2="60" y2="125">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="30%" stopColor="#fb923c" />
            <stop offset="75%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          {/* Body specular sheen — top-left */}
          <radialGradient id="mascotBodyShine" cx="42%" cy="28%" r="40%">
            <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff7ed" stopOpacity="0" />
          </radialGradient>
          {/* Head — same scheme but lighter top */}
          <linearGradient id="mascotHead" x1="60" y1="20" x2="60" y2="72">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="35%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          {/* Wings — warm orange to deep red, used by both wings */}
          <linearGradient id="mascotWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          {/* Tail flames */}
          <linearGradient id="mascotTail" x1="60" y1="80" x2="60" y2="135">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="55%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          {/* Top tuft flame */}
          <linearGradient id="mascotTuft" x1="60" y1="2" x2="60" y2="26">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="45%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Tail flames — drawn first, behind body */}
        <g className={paused ? '' : 'mascot-tail'} style={{ transformOrigin: '60px 95px' }}>
          {/* Center plume */}
          <path
            d="M60 85 Q 56 105 58 125 Q 60 132 60 132 Q 60 132 62 125 Q 64 105 60 85 Z"
            fill="url(#mascotTail)"
          />
          {/* Left plume */}
          <path
            d="M48 92 Q 38 108 38 124 Q 40 130 44 128 Q 48 122 50 108 Q 50 100 48 92 Z"
            fill="url(#mascotTail)"
            opacity="0.85"
          />
          {/* Right plume */}
          <path
            d="M72 92 Q 82 108 82 124 Q 80 130 76 128 Q 72 122 70 108 Q 70 100 72 92 Z"
            fill="url(#mascotTail)"
            opacity="0.85"
          />
        </g>

        {/* Wings — drawn before body so body covers their inner edge */}
        <g className={paused ? '' : 'mascot-wing-l'} style={{ transformOrigin: '36px 92px' }}>
          <path
            d="M36 78 Q 18 88 22 110 Q 32 104 42 96 Q 44 86 36 78 Z"
            fill="url(#mascotWing)"
          />
        </g>
        <g className={paused ? '' : 'mascot-wing-r'} style={{ transformOrigin: '84px 92px' }}>
          <path
            d="M84 78 Q 102 88 98 110 Q 88 104 78 96 Q 76 86 84 78 Z"
            fill="url(#mascotWing)"
          />
        </g>

        {/* Body — chubby pear */}
        <ellipse cx="60" cy="92" rx="30" ry="34" fill="url(#mascotBody)" />
        <ellipse cx="60" cy="92" rx="30" ry="34" fill="url(#mascotBodyShine)" />

        {/* Tiny feet — twigs */}
        <line x1="50" y1="124" x2="48" y2="132" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" />
        <line x1="70" y1="124" x2="72" y2="132" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" />
        {/* Toe stubs */}
        <circle cx="46" cy="133" r="1.6" fill="#7c2d12" />
        <circle cx="49" cy="133.5" r="1.6" fill="#7c2d12" />
        <circle cx="71" cy="133.5" r="1.6" fill="#7c2d12" />
        <circle cx="74" cy="133" r="1.6" fill="#7c2d12" />

        {/* Head — round, sits on top of body */}
        <circle cx="60" cy="48" r="26" fill="url(#mascotHead)" />

        {/* Head tuft — small flame on top */}
        <g className={paused ? '' : 'mascot-tuft'} style={{ transformOrigin: '60px 24px' }}>
          <path
            d="M60 24 Q 54 14 56 6 Q 58 12 60 14 Q 62 12 64 6 Q 66 14 60 24 Z"
            fill="url(#mascotTuft)"
          />
        </g>

        {/* Eyes — big and friendly */}
        <ellipse cx="51" cy="48" rx="5" ry="6" fill="#0c0c14" />
        <ellipse cx="69" cy="48" rx="5" ry="6" fill="#0c0c14" />
        {/* Eye shines */}
        <circle cx="52.5" cy="46" r="1.6" fill="#ffffff" />
        <circle cx="70.5" cy="46" r="1.6" fill="#ffffff" />
        <circle cx="50" cy="50" r="0.9" fill="#ffffff" opacity="0.9" />
        <circle cx="68" cy="50" r="0.9" fill="#ffffff" opacity="0.9" />

        {/* Beak — tiny triangle */}
        <path d="M57 58 L 63 58 L 60 63 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="0.5" strokeLinejoin="round" />

        {/* Cheek blush — gentle warm spots */}
        <ellipse cx="44" cy="56" rx="3.5" ry="2" fill="#ef4444" opacity="0.45" />
        <ellipse cx="76" cy="56" rx="3.5" ry="2" fill="#ef4444" opacity="0.45" />
      </svg>
    </div>
  );
}
