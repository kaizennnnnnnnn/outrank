'use client';

import { Avatar } from '@/components/ui/Avatar';
import { getFrame, CosmeticRarity } from '@/constants/cosmetics';
import { cn } from '@/lib/utils';

interface Props {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  frameId?: string | null;
  className?: string;
}

const frameSizePadding: Record<string, number> = {
  sm: 3,
  md: 5,
  lg: 7,
  xl: 9,
};
// Matches Avatar's actual pxMap so the avatar fills the frame with no gap.
const sizeBase: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
};

/**
 * Visual-intensity tier derived from rarity. Controls scale of the
 * effects (glow strength, particle count) but NOT the motion type —
 * motion is dispatched by frame.style so every style reads as its
 * own design language. Rarity just turns the dial up.
 */
const intensityOf = (rarity: CosmeticRarity, animated: boolean): number => {
  if (!animated) return 0;
  if (rarity === 'mythic')    return 4;
  if (rarity === 'legendary') return 3;
  if (rarity === 'epic')      return 2;
  if (rarity === 'rare')      return 1;
  return 0;
};

/**
 * Avatar wrapped in a cosmetic frame. Each frame.style picks a
 * distinctive motion that differentiates it from the others by
 * BEHAVIOUR, not just colour:
 *
 *   ring    — solid band, optional slow conic sheen sweep
 *   double  — two concentric bands counter-rotating (outer cw, inner ccw)
 *   conic   — a single ring made of the conic-gradient, spinning
 *   halo    — static base ring + heartbeat radial pulse rings expanding
 *   wreath  — orbiting ember dots around the rim that twinkle in/out
 *
 * Rarity layers (mythic adds an aurora hue-shift wash on top).
 */
export function FramedAvatar({ src, alt, size = 'md', frameId, className }: Props) {
  const frame = getFrame(frameId);
  const pad = frameSizePadding[size];
  const base = sizeBase[size];
  const outer = base + pad * 2;

  if (frame.id === 'frame_none' || !frame.colors.length) {
    return <Avatar src={src} alt={alt} size={size} />;
  }

  const intensity = intensityOf(frame.rarity, !!frame.animated);

  const linearGradient = frame.colors.length === 1
    ? frame.colors[0]
    : `linear-gradient(135deg, ${frame.colors.join(', ')})`;
  const conicGradient = `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`;
  const hotColor = frame.colors[frame.colors.length - 1];
  const accentColor = frame.colors[0];

  const isMythic = frame.rarity === 'mythic';

  return (
    <div
      className={cn(
        'relative inline-block',
        intensity >= 4 && 'animate-frame-aurora',
        className,
      )}
      style={{ width: outer, height: outer }}
    >
      {frame.style === 'ring' && (
        <RingFrame
          intensity={intensity}
          gradient={linearGradient}
          conic={conicGradient}
          accentColor={accentColor}
          hotColor={hotColor}
          pad={pad}
        />
      )}
      {frame.style === 'double' && (
        <DoubleFrame
          intensity={intensity}
          gradient={linearGradient}
          conic={conicGradient}
          accentColor={accentColor}
          hotColor={hotColor}
          pad={pad}
        />
      )}
      {frame.style === 'conic' && (
        <ConicFrame
          intensity={intensity}
          conic={conicGradient}
          accentColor={accentColor}
          hotColor={hotColor}
          pad={pad}
        />
      )}
      {frame.style === 'halo' && (
        <HaloFrame
          intensity={intensity}
          gradient={linearGradient}
          accentColor={accentColor}
          hotColor={hotColor}
          pad={pad}
        />
      )}
      {frame.style === 'wreath' && (
        <WreathFrame
          theme={detectWreathTheme(frame.id)}
          intensity={intensity}
          gradient={linearGradient}
          colors={frame.colors}
          accentColor={accentColor}
          hotColor={hotColor}
          outer={outer}
          pad={pad}
          size={size}
        />
      )}

      {/* Mythic-only ritual overlay. One unique signature animation
          per mythic frame — no shared "dots orbiting" effect; each
          frame's motif comes from its name (feathers for ascension,
          prism for rainbow, sunburst for awakened, etc.). */}
      {isMythic && (
        <MythicTreatment
          frameId={frame.id}
          colors={frame.colors}
          accentColor={accentColor}
          hotColor={hotColor}
          outer={outer}
          size={size}
        />
      )}

      {/* The avatar itself — pixel-pinned to the inner cutout. */}
      <div
        className="absolute z-10 flex items-center justify-center leading-none"
        style={{
          inset: pad,
          width: outer - pad * 2,
          height: outer - pad * 2,
        }}
      >
        <Avatar src={src} alt={alt} size={size} />
      </div>
    </div>
  );
}

interface StyleProps {
  intensity: number;
  gradient?: string;
  conic?: string;
  accentColor: string;
  hotColor: string;
  pad: number;
}

/** RING — clean band. Common is static; rare gets a soft halo glow;
 *  epic+ adds a slow conic-gradient sheen sweep over the ring. */
function RingFrame({ intensity, gradient, conic, accentColor, hotColor, pad }: StyleProps) {
  return (
    <>
      {intensity >= 1 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -Math.max(4, pad),
            background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
            opacity: 0.7,
          }}
        />
      )}
      {/* Solid band */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          boxShadow: `0 0 22px -2px ${hotColor}aa, 0 0 6px ${accentColor}66`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: pad, background: 'var(--b-paper)' }}
        />
      </div>
      {/* Conic sheen sweep — only on epic+ for differentiation */}
      {intensity >= 2 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none animate-frame-ring-sheen"
          style={{
            background: conic,
            opacity: 0.55,
            mixBlendMode: 'screen',
            mask: `radial-gradient(circle, transparent ${`calc(50% - ${pad + 1}px)`}, black ${`calc(50% - ${pad}px)`}, black 50%, transparent 50%)`,
            WebkitMask: `radial-gradient(circle, transparent ${`calc(50% - ${pad + 1}px)`}, black ${`calc(50% - ${pad}px)`}, black 50%, transparent 50%)`,
          }}
        />
      )}
    </>
  );
}

/** DOUBLE — two concentric rings. Outer rotates CW; inner rotates
 *  CCW. The contrast in motion is what makes it feel different from
 *  the others. */
function DoubleFrame({ intensity, gradient, conic, accentColor, hotColor, pad }: StyleProps) {
  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -Math.max(4, pad),
          background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
          opacity: 0.6,
        }}
      />
      {/* Outer ring — CW slow spin */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          intensity >= 2 && 'animate-frame-conic-spin-slow',
        )}
        style={{
          background: conic,
          boxShadow: `0 0 22px -2px ${hotColor}cc, 0 0 6px ${accentColor}88`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: Math.max(2, pad / 2), background: 'var(--b-paper)' }}
        />
      </div>
      {/* Inner ring — CCW faster, opposite direction is the signature */}
      <div
        className={cn(
          'absolute rounded-full',
          intensity >= 2 && 'animate-frame-spin-reverse',
        )}
        style={{
          inset: pad - 1,
          background: gradient,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: 2, background: 'var(--b-paper)' }}
        />
      </div>
    </>
  );
}

/** CONIC — full conic gradient ring spinning. Speed scales with
 *  rarity. Mythic adds a counter-spinning blurred outer halo. */
function ConicFrame({ intensity, conic, accentColor, hotColor, pad }: StyleProps) {
  const spinClass =
    intensity >= 4 ? 'animate-frame-conic-spin-fast'
    : intensity >= 3 ? 'animate-frame-conic-spin-medium'
    : 'animate-frame-conic-spin-slow';

  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -Math.max(4, pad),
          background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
          opacity: 0.7,
        }}
      />
      {/* Counter-rotating blurred halo — mythic only */}
      {intensity >= 4 && (
        <div
          className="absolute -inset-[3px] rounded-full pointer-events-none animate-frame-spin-reverse"
          style={{
            background: conic,
            opacity: 0.45,
            filter: 'blur(2px) saturate(1.4)',
          }}
        />
      )}
      {/* Main spinning conic ring */}
      <div
        className={cn('absolute inset-0 rounded-full', spinClass)}
        style={{
          background: conic,
          boxShadow: `0 0 22px -2px ${hotColor}cc, 0 0 6px ${accentColor}88`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: pad, background: 'var(--b-paper)' }}
        />
      </div>
    </>
  );
}

/** HALO — static ring + heartbeat radial pulse rings expanding
 *  outward from the avatar. No rotation; the motion is the pulse. */
function HaloFrame({ intensity, gradient, accentColor, hotColor, pad }: StyleProps) {
  return (
    <>
      {/* Outer pulse rings — multiple staggered for legendary+ */}
      {intensity >= 2 && (
        <>
          <div
            className="absolute rounded-full pointer-events-none animate-frame-halo-radiate"
            style={{
              inset: -2,
              border: `2px solid ${accentColor}`,
              boxShadow: `0 0 18px ${hotColor}88`,
            }}
          />
          {intensity >= 3 && (
            <div
              className="absolute rounded-full pointer-events-none animate-frame-halo-radiate"
              style={{
                inset: -2,
                border: `1.5px solid ${hotColor}`,
                animationDelay: '1.3s',
              }}
            />
          )}
          {intensity >= 4 && (
            <div
              className="absolute rounded-full pointer-events-none animate-frame-halo-radiate"
              style={{
                inset: -2,
                border: `1px solid ${accentColor}`,
                animationDelay: '0.65s',
              }}
            />
          )}
        </>
      )}
      {/* Soft static halo glow behind the ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -Math.max(4, pad),
          background: `radial-gradient(circle, ${accentColor}66 0%, ${hotColor}22 45%, transparent 72%)`,
        }}
      />
      {/* Ring band — static, no rotation */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          boxShadow: `0 0 24px -2px ${hotColor}cc, 0 0 8px ${accentColor}aa`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: pad, background: 'var(--b-paper)' }}
        />
      </div>
    </>
  );
}

/** Wreath theme — derived from the frame id keyword so we can give
 *  each themed wreath frame its own motion language instead of all
 *  of them being orbiting dots. */
type WreathTheme = 'flame' | 'wave' | 'stars' | 'gold' | 'default';
function detectWreathTheme(frameId: string): WreathTheme {
  if (/phoenix|inferno/.test(frameId)) return 'flame';
  if (/tide|abyss/.test(frameId))      return 'wave';
  if (/stargaze|celestial|ascension|awakened/.test(frameId)) return 'stars';
  if (/eternal/.test(frameId))         return 'gold';
  return 'default';
}

/** WREATH — themed dispatch. Frame.id keyword chooses between
 *  flame tongues / wave ripples / star pops / gold sheen / orbiting
 *  embers. Static band is the same across themes; the motion is
 *  what makes each frame read distinct. */
function WreathFrame({
  theme,
  intensity,
  gradient,
  colors,
  accentColor,
  hotColor,
  outer,
  pad,
  size,
}: {
  theme: WreathTheme;
  intensity: number;
  gradient: string;
  colors: string[];
  accentColor: string;
  hotColor: string;
  outer: number;
  pad: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -Math.max(4, pad),
          background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
        }}
      />
      {/* Static ring band */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          boxShadow: `0 0 22px -2px ${hotColor}cc, 0 0 6px ${accentColor}88`,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{ inset: pad, background: 'var(--b-paper)' }}
        />
      </div>

      {theme === 'flame' && (
        <FlameWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {theme === 'wave' && (
        <WaveWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {theme === 'stars' && (
        <StarsWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {theme === 'gold' && (
        <GoldWreathOverlay hotColor={hotColor} accentColor={accentColor} pad={pad} />
      )}
      {theme === 'default' && (
        <DefaultEmberOverlay outer={outer} colors={colors} intensity={intensity} size={size} />
      )}
    </>
  );
}

/** Flame tongues at fixed rim positions, flickering vertically. */
function FlameWreathOverlay({ outer, colors, intensity }: { outer: number; colors: string[]; intensity: number }) {
  const count = intensity >= 4 ? 6 : 5;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const r = outer / 2;
        const cx = Math.cos(angle) * r + outer / 2;
        const cy = Math.sin(angle) * r + outer / 2;
        const c = colors[i % colors.length];
        const w = Math.max(3, outer * 0.08);
        const h = Math.max(6, outer * 0.16);
        // Each flame is a vertical triangle pointing OUTWARD from
        // the rim, rotated to align with its angle. transform-origin
        // is bottom-center so flickering scaleY keeps it rooted.
        return (
          <svg
            key={i}
            className="absolute animate-frame-flame-flicker"
            width={w}
            height={h}
            viewBox="0 0 10 16"
            style={{
              left: cx - w / 2,
              top: cy - h,
              transform: `rotate(${(angle * 180) / Math.PI + 90}deg)`,
              transformOrigin: '50% 100%',
              animationDelay: `${i * 0.13}s`,
              filter: `drop-shadow(0 0 4px ${c})`,
            }}
          >
            <path d="M5 0 Q1 6 3 10 Q4 7 5 10 Q6 7 7 10 Q9 6 5 0 Z" fill={c} />
          </svg>
        );
      })}
    </div>
  );
}

/** Wave ripples expanding outward from the rim — sonar-style. */
function WaveWreathOverlay({ outer, colors, intensity }: { outer: number; colors: string[]; intensity: number }) {
  const ripples = intensity >= 4 ? 3 : 2;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: ripples }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-frame-wave-ripple"
          style={{
            inset: 0,
            border: `1.5px solid ${colors[i % colors.length]}`,
            animationDelay: `${(i / ripples) * 1.1}s`,
            boxShadow: `0 0 14px ${colors[i % colors.length]}66`,
          }}
        />
      ))}
    </div>
  );
}

/** Sparkle bursts (× / + glyphs) appearing in place at the rim. */
function StarsWreathOverlay({ outer, colors, intensity }: { outer: number; colors: string[]; intensity: number }) {
  const count = intensity >= 4 ? 7 : 5;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        // Spread the stars around the rim with a touch of randomness
        // (deterministic via index so SSR matches client).
        const angleOffset = (i * 137.5) % 360; // golden-angle distribution
        const angle = (angleOffset * Math.PI) / 180;
        const r = outer / 2;
        const cx = Math.cos(angle) * r + outer / 2;
        const cy = Math.sin(angle) * r + outer / 2;
        const c = colors[i % colors.length];
        const sz = Math.max(5, outer * 0.13);
        return (
          <svg
            key={i}
            className="absolute animate-frame-star-pop"
            width={sz}
            height={sz}
            viewBox="0 0 12 12"
            style={{
              left: cx - sz / 2,
              top: cy - sz / 2,
              animationDelay: `${(i / count) * 2.4}s`,
              filter: `drop-shadow(0 0 4px ${c})`,
            }}
          >
            <path d="M6 0 L6 12 M0 6 L12 6 M2 2 L10 10 M10 2 L2 10" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        );
      })}
    </div>
  );
}

/** Single bright sheen highlight sweeping around the static band. */
function GoldWreathOverlay({ hotColor, accentColor, pad }: { hotColor: string; accentColor: string; pad: number }) {
  return (
    <div
      className="absolute inset-0 rounded-full pointer-events-none animate-frame-gold-sheen"
      style={{
        background: `conic-gradient(from 0deg, transparent 0%, transparent 35%, ${hotColor}aa 47%, #ffffffdd 50%, ${accentColor}aa 53%, transparent 65%, transparent 100%)`,
        mask: `radial-gradient(circle, transparent calc(50% - ${pad + 1}px), black calc(50% - ${pad}px), black 50%, transparent 50%)`,
        WebkitMask: `radial-gradient(circle, transparent calc(50% - ${pad + 1}px), black calc(50% - ${pad}px), black 50%, transparent 50%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

/** Mythic ritual overlay. Dispatches on frame.id so each mythic
 *  frame gets a hand-crafted signature motion that matches its
 *  name (feathers rising for Ascension, prism beams for Rainbow,
 *  black-hole implosion for Void, etc.). All effects are SVG +
 *  transform/opacity only — GPU-friendly and don't share keyframes
 *  across frames so no two read alike. */
type MythicProps = {
  colors: string[];
  accentColor: string;
  hotColor: string;
  outer: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
};
function MythicTreatment({ frameId, ...rest }: { frameId: string } & MythicProps) {
  switch (frameId) {
    case 'frame_ascension':   return <AscensionFeathers {...rest} />;
    case 'frame_rainbow':     return <RainbowPrism {...rest} />;
    case 'frame_eternal':     return <EternalDuality {...rest} />;
    case 'frame_cosmic':      return <CosmicNebula {...rest} />;
    case 'frame_prismatic':   return <PrismaticRefraction {...rest} />;
    case 'frame_stargaze':    return <StargazeField {...rest} />;
    case 'frame_celestial':   return <CelestialConstellation {...rest} />;
    case 'frame_void':        return <VoidImplosion {...rest} />;
    case 'frame_awakened':    return <AwakenedSunburst {...rest} />;
    case 'frame_pact_holder': return <PactHeartbeat {...rest} />;
    default:                  return <DefaultMythicGlow {...rest} />;
  }
}

/** Ascension — three soft feathers rise from the rim and fade out.
 *  Sits at 10, 12, 2 o'clock; staggered delays sell the cascade. */
function AscensionFeathers({ colors, outer }: MythicProps) {
  const featherColor1 = colors[0];
  const featherColor2 = colors[1] ?? colors[0];
  const positions = [
    { angle: -100, delay: 0 },
    { angle:  -90, delay: 0.9 },
    { angle:  -80, delay: 1.8 },
  ];
  const r = outer / 2;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {positions.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const cx = Math.cos(rad) * r + outer / 2;
        const cy = Math.sin(rad) * r + outer / 2;
        const w = Math.max(6, outer * 0.11);
        const h = Math.max(14, outer * 0.26);
        return (
          <svg
            key={i}
            className="absolute animate-mythic-feather-rise"
            width={w}
            height={h}
            viewBox="0 0 10 24"
            style={{
              left: cx - w / 2,
              top: cy - h,
              animationDelay: `${p.delay}s`,
              filter: `drop-shadow(0 0 4px ${featherColor1})`,
            }}
          >
            <path
              d="M5 1 Q1 6 1.5 14 Q3 22 5 23 Q7 22 8.5 14 Q9 6 5 1 Z M5 4 L5 23"
              fill={i % 2 ? featherColor2 : featherColor1}
              stroke="#ffffffaa"
              strokeWidth="0.4"
            />
          </svg>
        );
      })}
    </div>
  );
}

/** Rainbow — five colored beam-streaks fan outward from the top of
 *  the rim like white light through a prism. Beams pulse in/out on
 *  staggered phases so the spectrum "sparkles" rather than spinning. */
function RainbowPrism({ colors, outer }: MythicProps) {
  const beamColors = colors.length >= 5
    ? colors
    : ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  // Five beams fanning out from the top center — angles -40 to +40
  const angles = [-40, -20, 0, 20, 40];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2, borderRadius: '50%' }}>
      {angles.map((a, i) => {
        const w = Math.max(2, outer * 0.04);
        const h = outer * 0.55;
        return (
          <div
            key={i}
            className="absolute animate-mythic-prism-fan"
            style={{
              left: '50%',
              top: 0,
              width: w,
              height: h,
              marginLeft: -w / 2,
              transformOrigin: '50% 100%',
              transform: `translateY(-30%) rotate(${a}deg)`,
              background: `linear-gradient(to top, ${beamColors[i]}, transparent)`,
              animationDelay: `${i * 0.2}s`,
              filter: `drop-shadow(0 0 3px ${beamColors[i]})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Eternal — top semicircle gold, bottom semicircle black. Their
 *  brightness trades on a slow infinite cycle. The duality IS the
 *  motion — no rotation, no orbiting. */
function EternalDuality({ outer }: MythicProps) {
  const gold = '#fbbf24';
  const dark = '#0c0a09';
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ zIndex: 2 }}
    >
      {/* Top gold half */}
      <path
        className="animate-mythic-eternal-gold"
        d={`M ${outer / 2 - outer / 2 + 2} ${outer / 2} A ${outer / 2 - 2} ${outer / 2 - 2} 0 0 1 ${outer - 2} ${outer / 2}`}
        fill="none"
        stroke={gold}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${gold})` }}
      />
      {/* Bottom dark half */}
      <path
        className="animate-mythic-eternal-dark"
        d={`M 2 ${outer / 2} A ${outer / 2 - 2} ${outer / 2 - 2} 0 0 0 ${outer - 2} ${outer / 2}`}
        fill="none"
        stroke={dark}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${gold}66)` }}
      />
      {/* Hairline diamond sigil where the two halves meet, marking
          the cycle's pivot. */}
      <circle cx={2} cy={outer / 2} r={2.5} fill={gold} />
      <circle cx={outer - 2} cy={outer / 2} r={2.5} fill={gold} />
    </svg>
  );
}

/** Cosmic — pulsing nebula at center + a slow spiral pinwheel.
 *  Reads as a galaxy rather than dots in a circle. */
function CosmicNebula({ colors, outer }: MythicProps) {
  const purple = colors[1] || '#7c3aed';
  const pink   = colors[2] || '#ec4899';
  const cyan   = colors[3] || '#22d3ee';
  return (
    <>
      {/* Pulsing nebula core */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-cosmic-core"
        style={{
          inset: '20%',
          background: `radial-gradient(circle, #ffffff 0%, ${pink}cc 25%, ${purple}88 55%, transparent 80%)`,
          mixBlendMode: 'screen',
          zIndex: 1,
        }}
      />
      {/* Slow spiral pinwheel — single conic gradient masked to two
          opposing thin arms; rotation makes them sweep without the
          dots-in-circle feeling. */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none animate-mythic-cosmic-spiral"
        style={{
          background: `conic-gradient(from 0deg,
            transparent 0%,
            ${cyan}99 8%,
            transparent 18%,
            transparent 50%,
            ${pink}99 58%,
            transparent 68%,
            transparent 100%)`,
          opacity: 0.55,
          mixBlendMode: 'screen',
          mask: 'radial-gradient(circle, transparent 28%, black 32%, black 70%, transparent 78%)',
          WebkitMask: 'radial-gradient(circle, transparent 28%, black 32%, black 70%, transparent 78%)',
          zIndex: 2,
        }}
      />
    </>
  );
}

/** Prismatic — three thin RGB beams refract from one point at the
 *  top of the rim, each pulsing on its own beat. Like white light
 *  splitting through a prism, fully static positions. */
function PrismaticRefraction({ outer }: MythicProps) {
  const beams = [
    { color: '#ff3366', angle: -25 },
    { color: '#33ff88', angle:   0 },
    { color: '#3366ff', angle:  25 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2, borderRadius: '50%' }}>
      {beams.map((b, i) => {
        const w = Math.max(2, outer * 0.05);
        const h = outer * 0.7;
        return (
          <div
            key={i}
            className="absolute animate-mythic-prism-beam"
            style={{
              left: '50%',
              top: '8%',
              width: w,
              height: h,
              marginLeft: -w / 2,
              transformOrigin: '50% 0%',
              transform: `rotate(${b.angle}deg)`,
              background: `linear-gradient(to bottom, ${b.color}, ${b.color}77 60%, transparent)`,
              animationDelay: `${i * 0.4}s`,
              filter: `drop-shadow(0 0 3px ${b.color})`,
            }}
          />
        );
      })}
      {/* Single white pinpoint at the prism's apex */}
      <div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '8%',
          width: 4,
          height: 4,
          marginLeft: -2,
          marginTop: -2,
          background: '#ffffff',
          boxShadow: '0 0 6px #ffffff',
        }}
      />
    </div>
  );
}

/** Stargaze — 8 stars at fixed positions OUTSIDE the rim, each
 *  twinkling individually. Static positions, never orbits. */
function StargazeField({ colors, outer }: MythicProps) {
  // Hand-placed positions so the constellation reads as deliberate.
  const stars = [
    { angle: -75, dist: 0.62 },
    { angle: -30, dist: 0.58 },
    { angle:  20, dist: 0.65 },
    { angle:  60, dist: 0.55 },
    { angle: 110, dist: 0.62 },
    { angle: 155, dist: 0.58 },
    { angle: 200, dist: 0.6 },
    { angle: 250, dist: 0.6 },
  ];
  const r = outer / 2;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {stars.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const cx = Math.cos(rad) * (r + r * s.dist) + outer / 2;
        const cy = Math.sin(rad) * (r + r * s.dist) + outer / 2;
        const c = i % 3 === 0 ? '#ffffff' : (colors[i % colors.length] || '#ffffff');
        const sz = i % 4 === 0 ? 4 : 2.4;
        return (
          <div
            key={i}
            className="absolute rounded-full animate-mythic-star-twinkle"
            style={{
              left: cx - sz / 2,
              top: cy - sz / 2,
              width: sz,
              height: sz,
              background: c,
              boxShadow: `0 0 5px ${c}, 0 0 2px #ffffff`,
              animationDelay: `${(i / stars.length) * 2.2}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Celestial — connect-the-dots constellation: stars at fixed
 *  positions, an SVG line traces between them by drawing in via
 *  stroke-dashoffset, holds, then erases backward. */
function CelestialConstellation({ colors, outer }: MythicProps) {
  const lineColor = colors[1] || '#ffffff';
  // Five stars forming a "W" / Cassiopeia-style constellation
  const stars = [
    { x: 0.18, y: 0.78 },
    { x: 0.32, y: 0.30 },
    { x: 0.50, y: 0.62 },
    { x: 0.68, y: 0.30 },
    { x: 0.82, y: 0.78 },
  ];
  const points = stars.map(s => `${s.x * outer},${s.y * outer}`);
  const pathD = `M ${points[0]} L ${points[1]} L ${points[2]} L ${points[3]} L ${points[4]}`;
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ zIndex: 2 }}
    >
      <path
        d={pathD}
        className="animate-mythic-constellation-draw"
        fill="none"
        stroke={lineColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="100%"
        style={{ filter: `drop-shadow(0 0 3px ${lineColor})` }}
      />
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x * outer}
          cy={s.y * outer}
          r={2}
          fill="#ffffff"
          style={{ filter: `drop-shadow(0 0 3px ${lineColor})` }}
        />
      ))}
    </svg>
  );
}

/** Void — three concentric rings IMPLODE inward (scale down + fade).
 *  Pure event-horizon energy: things get pulled in. */
function VoidImplosion({ colors }: MythicProps) {
  const ringColor1 = colors[1] || '#4c1d95';
  const ringColor2 = colors[2] || '#ec4899';
  const ringColor3 = colors[3] || '#f5d0fe';
  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-void-implode"
        style={{
          inset: 0,
          border: `2px solid ${ringColor1}`,
          boxShadow: `0 0 12px ${ringColor1}`,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-void-implode"
        style={{
          inset: 0,
          border: `2px solid ${ringColor2}`,
          animationDelay: '0.8s',
          boxShadow: `0 0 12px ${ringColor2}`,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-void-implode"
        style={{
          inset: 0,
          border: `1px solid ${ringColor3}`,
          animationDelay: '1.6s',
          zIndex: 2,
        }}
      />
    </>
  );
}

/** Awakened — 12 sunburst rays radiating outward at fixed angles,
 *  each pulsing in/out (length + opacity) on staggered phases. No
 *  rotation — the rays "breathe" rather than orbit. Uses a zero-size
 *  rotation wrapper at center; the ray is positioned absolutely
 *  inside it so it ends up at the rim, pointing outward. */
function AwakenedSunburst({ colors, outer }: MythicProps) {
  const rayCount = 12;
  const rayColors = colors.length >= 4 ? colors : [...colors, '#ffffff', '#fde047'];
  const rayLength = outer * 0.3;
  const rayWidth  = Math.max(2, outer * 0.025);
  return (
    <div className="absolute pointer-events-none" style={{ inset: 0, zIndex: 2 }}>
      {Array.from({ length: rayCount }).map((_, i) => {
        const angle = (i / rayCount) * 360;
        const c = rayColors[i % rayColors.length];
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: 0,
              height: 0,
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              className="animate-mythic-sunburst-ray"
              style={{
                position: 'absolute',
                left: -rayWidth / 2,
                top: -(outer / 2 + rayLength),
                width: rayWidth,
                height: rayLength,
                background: `linear-gradient(to top, ${c}, transparent)`,
                animationDelay: `${(i % 4) * 0.3}s`,
                filter: `drop-shadow(0 0 4px ${c})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Pact Holder — left and right halves of the rim trade brightness
 *  in a synchronized heartbeat, representing the bond between two
 *  pact-holders breathing in sync. */
function PactHeartbeat({ outer }: MythicProps) {
  const gold  = '#fbbf24';
  const amber = '#f97316';
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ zIndex: 2 }}
    >
      {/* Left half — gold */}
      <path
        className="animate-mythic-pact-a"
        d={`M ${outer / 2} 2 A ${outer / 2 - 2} ${outer / 2 - 2} 0 0 0 ${outer / 2} ${outer - 2}`}
        fill="none"
        stroke={gold}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${gold})` }}
      />
      {/* Right half — amber */}
      <path
        className="animate-mythic-pact-b"
        d={`M ${outer / 2} 2 A ${outer / 2 - 2} ${outer / 2 - 2} 0 0 1 ${outer / 2} ${outer - 2}`}
        fill="none"
        stroke={amber}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${amber})` }}
      />
      {/* Two pact-points where the halves meet */}
      <circle cx={outer / 2} cy={2}        r={3} fill="#ffffff" />
      <circle cx={outer / 2} cy={outer - 2} r={3} fill="#ffffff" />
    </svg>
  );
}

/** Default mythic — soft inner pulse only, used for any future
 *  mythic frame ID we haven't custom-designed yet. */
function DefaultMythicGlow({ accentColor, hotColor }: MythicProps) {
  return (
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        inset: '15%',
        background: `radial-gradient(circle, ${accentColor}aa 0%, ${hotColor}55 50%, transparent 78%)`,
        mixBlendMode: 'screen',
        zIndex: 1,
      }}
    />
  );
}

/** Default ember twinkle — kept for any wreath frame that doesn't
 *  match a theme keyword. Cuts the dot count in half from before so
 *  it doesn't read as the same "lots of dots" pattern. */
function DefaultEmberOverlay({
  outer,
  colors,
  intensity,
  size,
}: {
  outer: number;
  colors: string[];
  intensity: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const emberCount = intensity >= 4 ? 6 : 4;
  const emberSize = size === 'sm' ? 2.5 : size === 'xl' ? 5 : 3.5;
  return (
    <div className="absolute inset-0 animate-frame-orbit pointer-events-none">
      {Array.from({ length: emberCount }).map((_, i) => {
        const angle = (i / emberCount) * Math.PI * 2;
        const r = outer / 2 + 1;
        const x = Math.cos(angle) * r + outer / 2;
        const y = Math.sin(angle) * r + outer / 2;
        const c = colors[i % colors.length];
        return (
          <div
            key={i}
            className="absolute rounded-full animate-frame-ember-twinkle"
            style={{
              width: emberSize,
              height: emberSize,
              left: x - emberSize / 2,
              top: y - emberSize / 2,
              background: c,
              boxShadow: `0 0 8px ${c}, 0 0 2px #ffffffaa`,
              animationDelay: `${(i / emberCount) * 1.4}s`,
            }}
          />
        );
      })}
    </div>
  );
}
