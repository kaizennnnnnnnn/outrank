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

        {/* ─── Tail fan — bigger 7-plume spread, drawn first ─── */}
        <g
          className={paused ? '' : 'mascot-tail'}
          style={{ transformOrigin: '80px 115px' }}
        >
          {/* Outermost plumes — splayed wide */}
          <path
            d="M36 102 Q 14 130 16 158 Q 22 170 34 164 Q 46 152 52 124 Q 54 110 36 102 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.78"
          />
          <path
            d="M124 102 Q 146 130 144 158 Q 138 170 126 164 Q 114 152 108 124 Q 106 110 124 102 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.78"
          />
          {/* Outer plumes */}
          <path
            d="M48 106 Q 28 134 30 162 Q 36 172 46 166 Q 56 154 60 128 Q 60 114 48 106 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.92"
          />
          <path
            d="M112 106 Q 132 134 130 162 Q 124 172 114 166 Q 104 154 100 128 Q 100 114 112 106 Z"
            fill="url(#mascotTailOuter)"
            opacity="0.92"
          />
          {/* Mid plumes */}
          <path
            d="M62 108 Q 50 138 52 168 Q 58 176 66 172 Q 72 156 72 132 Q 72 116 62 108 Z"
            fill="url(#mascotTailOuter)"
          />
          <path
            d="M98 108 Q 110 138 108 168 Q 102 176 94 172 Q 88 156 88 132 Q 88 116 98 108 Z"
            fill="url(#mascotTailOuter)"
          />
          {/* Center plume — tallest, hottest */}
          <path
            d="M80 108 Q 72 140 74 174 Q 78 180 80 180 Q 82 180 86 174 Q 88 140 80 108 Z"
            fill="url(#mascotTailOuter)"
          />
          {/* Center inner highlight (hot core) */}
          <path
            d="M80 114 Q 75 140 77 168 Q 79 172 80 172 Q 81 172 83 168 Q 85 140 80 114 Z"
            fill="url(#mascotTailInner)"
            opacity="0.9"
          />
          {/* Bright tip on center plume */}
          <ellipse cx="80" cy="174" rx="1.6" ry="2.4" fill="#fef3c7" opacity="0.95" />
          {/* Side rachis highlights — feather spines */}
          <path d="M80 120 Q 78 144 78 170" stroke="#fef3c7" strokeWidth="0.5" strokeLinecap="round" opacity="0.55" fill="none" />
          {/* Tail tip sparks */}
          <circle cx="62" cy="166" r="1.1" fill="#fde68a" opacity="0.85" />
          <circle cx="98" cy="166" r="1.1" fill="#fde68a" opacity="0.85" />
          <circle cx="46" cy="160" r="0.9" fill="#fcd34d" opacity="0.75" />
          <circle cx="114" cy="160" r="0.9" fill="#fcd34d" opacity="0.75" />
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

        {/* ─── Real bird feet — short legs + 3 splayed toes w/ claws ─── */}
        {/* Left foot */}
        <g>
          {/* Leg — short and stubby, amber-brown */}
          <path
            d="M68 148 Q 67 154 66 160"
            stroke="#c2410c"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Three forward toes spreading from a single ankle point */}
          <path d="M66 160 Q 60 162 56 165 L 56 167 Q 61 165 67 163 Z" fill="#9a3412" />
          <path d="M66 160 Q 66 163 66 167 L 67.5 167 Q 68 163 67.5 160 Z" fill="#a74a16" />
          <path d="M66 160 Q 71 162 75 165 L 75 167 Q 70 164 66.5 162 Z" fill="#9a3412" />
          {/* Tiny claw tips */}
          <path d="M55 167 L 53 169 L 56 168 Z" fill="#451a03" />
          <path d="M67.2 167 L 67.2 169.2 L 68 168 Z" fill="#451a03" />
          <path d="M75.5 167 L 77 169 L 74.5 168 Z" fill="#451a03" />
          {/* Ankle highlight */}
          <circle cx="66" cy="160" r="1.6" fill="#7c2d12" />
        </g>
        {/* Right foot — mirror */}
        <g>
          <path
            d="M92 148 Q 93 154 94 160"
            stroke="#c2410c"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M94 160 Q 89 162 85 165 L 85 167 Q 90 164 93.5 162 Z" fill="#9a3412" />
          <path d="M94 160 Q 94 163 94 167 L 92.5 167 Q 92 163 92.5 160 Z" fill="#a74a16" />
          <path d="M94 160 Q 100 162 104 165 L 104 167 Q 99 165 93 163 Z" fill="#9a3412" />
          <path d="M85 167 L 83 169 L 86 168 Z" fill="#451a03" />
          <path d="M92.8 167 L 92.8 169.2 L 92 168 Z" fill="#451a03" />
          <path d="M104.5 167 L 106 169 L 103.5 168 Z" fill="#451a03" />
          <circle cx="94" cy="160" r="1.6" fill="#7c2d12" />
        </g>

        {/* ─── Head — slightly smaller for better proportions ─── */}
        <circle cx="80" cy="62" r="26" fill="url(#mascotHead)" />

        {/* Back-of-head feather wisps — small layered tufts that
            peek over the head silhouette near the crown */}
        <path d="M58 50 Q 54 46 54 40 Q 58 44 60 48 Z" fill="#fb923c" opacity="0.7" />
        <path d="M64 44 Q 62 38 64 32 Q 67 38 67 44 Z" fill="#fb923c" opacity="0.75" />
        <path d="M96 44 Q 98 38 96 32 Q 93 38 93 44 Z" fill="#fb923c" opacity="0.75" />
        <path d="M102 50 Q 106 46 106 40 Q 102 44 100 48 Z" fill="#fb923c" opacity="0.7" />

        {/* Side ear-tufts — small feather pairs near the temples */}
        <path
          d="M52 60 Q 46 58 46 52 Q 50 56 54 56 Q 53 58 52 60 Z"
          fill="#fb923c"
        />
        <path d="M50 56 Q 47 54 47 50 Q 50 53 52 54 Q 51 55 50 56 Z" fill="#dc2626" opacity="0.7" />
        <path
          d="M108 60 Q 114 58 114 52 Q 110 56 106 56 Q 107 58 108 60 Z"
          fill="#fb923c"
        />
        <path d="M110 56 Q 113 54 113 50 Q 110 53 108 54 Q 109 55 110 56 Z" fill="#dc2626" opacity="0.7" />

        {/* Head crest — dense base fringe + 7-tongue fan above */}
        <g
          className={paused ? '' : 'mascot-tuft'}
          style={{ transformOrigin: '80px 36px' }}
        >
          {/* ── Base fringe — small overlapping feather peaks all across
              the head crown, killing any gap between the bigger tongues
              behind them. Drawn first so the tongues rise out of them. */}
          <path d="M56 42 Q 54 36 56 32 Q 60 36 60 42 Z" fill="#dc2626" opacity="0.8" />
          <path d="M60 42 Q 60 34 64 30 Q 66 36 64 42 Z" fill="#ef4444" />
          <path d="M64 42 Q 64 32 68 26 Q 70 34 68 42 Z" fill="#fb923c" />
          <path d="M68 42 Q 68 30 72 24 Q 74 32 72 42 Z" fill="url(#mascotCrest)" />
          <path d="M72 42 Q 72 28 76 22 Q 78 30 76 42 Z" fill="url(#mascotCrest)" />
          <path d="M76 42 Q 76 26 80 20 Q 82 28 80 42 Z" fill="url(#mascotCrest)" />
          <path d="M80 42 Q 80 26 84 20 Q 84 28 84 42 Z" fill="url(#mascotCrest)" />
          <path d="M84 42 Q 84 28 88 22 Q 88 32 88 42 Z" fill="url(#mascotCrest)" />
          <path d="M88 42 Q 88 30 92 24 Q 92 34 92 42 Z" fill="#fb923c" />
          <path d="M92 42 Q 92 32 96 26 Q 96 36 96 42 Z" fill="#ef4444" />
          <path d="M96 42 Q 96 34 100 30 Q 100 36 100 42 Z" fill="#dc2626" opacity="0.85" />
          <path d="M100 42 Q 100 36 104 32 Q 104 36 104 42 Z" fill="#dc2626" opacity="0.8" />

          {/* ── Big crest tongues, drawn over the fringe ── */}
          {/* Outer left tongue */}
          <path
            d="M64 40 Q 56 28 58 18 Q 62 24 66 30 Q 67 34 66 40 Z"
            fill="url(#mascotCrest)"
            opacity="0.78"
          />
          {/* Outer right tongue */}
          <path
            d="M96 40 Q 104 28 102 18 Q 98 24 94 30 Q 93 34 94 40 Z"
            fill="url(#mascotCrest)"
            opacity="0.78"
          />
          {/* Inner left tongue (new — fills the gap between mid and center) */}
          <path
            d="M75 42 Q 70 28 71 16 Q 74 22 76 30 Q 78 36 77 42 Z"
            fill="url(#mascotCrest)"
            opacity="0.92"
          />
          {/* Inner right tongue (new — mirror) */}
          <path
            d="M85 42 Q 90 28 89 16 Q 86 22 84 30 Q 82 36 83 42 Z"
            fill="url(#mascotCrest)"
            opacity="0.92"
          />
          {/* Mid left tongue */}
          <path
            d="M70 40 Q 64 24 66 12 Q 70 18 72 26 Q 74 32 72 40 Z"
            fill="url(#mascotCrest)"
            opacity="0.9"
          />
          {/* Mid right tongue */}
          <path
            d="M90 40 Q 96 24 94 12 Q 90 18 88 26 Q 86 32 88 40 Z"
            fill="url(#mascotCrest)"
            opacity="0.9"
          />
          {/* Center tongue — tallest */}
          <path
            d="M80 42 Q 72 22 76 2 Q 80 12 80 16 Q 80 12 84 2 Q 88 22 80 42 Z"
            fill="url(#mascotCrest)"
          />
          {/* Center hot core */}
          <path
            d="M80 34 Q 76 18 78 8 Q 80 14 80 16 Q 80 14 82 8 Q 84 18 80 34 Z"
            fill="#fef3c7"
            opacity="0.78"
          />
        </g>

        {/* ─── Eyes ─── */}
        <ellipse cx="70" cy="62" rx="5" ry="6" fill="#0c0c14" />
        <ellipse cx="90" cy="62" rx="5" ry="6" fill="#0c0c14" />
        {/* Big shines */}
        <circle cx="71.6" cy="59.8" r="1.7" fill="#ffffff" />
        <circle cx="91.6" cy="59.8" r="1.7" fill="#ffffff" />
        {/* Small secondary shines */}
        <circle cx="68.6" cy="64.2" r="0.9" fill="#ffffff" opacity="0.85" />
        <circle cx="88.6" cy="64.2" r="0.9" fill="#ffffff" opacity="0.85" />

        {/* Beak */}
        <path
          d="M76.5 70 L 83.5 70 L 80 76 Z"
          fill="#f59e0b"
          stroke="#92400e"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Beak shine */}
        <path d="M77.8 70.5 L 81 70.5" stroke="#fef3c7" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />

        {/* Cheek blush */}
        <ellipse cx="61" cy="68" rx="3.4" ry="2.2" fill="#ef4444" opacity="0.5" />
        <ellipse cx="99" cy="68" rx="3.4" ry="2.2" fill="#ef4444" opacity="0.5" />
      </svg>
    </div>
  );
}
