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
          // For mythic wreath frames, MythicTreatment runs the show.
          // Skip the themed wreath overlay so we don't double-render
          // (e.g., Stargaze got both the wreath stars AND mythic stars).
          suppressOverlay={isMythic}
        />
      )}

      {/* Mythic-only ritual overlay. Each mythic frame gets its own
          signature animation. Wrapped in a circular clip so effects
          stay inside the avatar's footprint and don't bleed into the
          surrounding nameplate / username. */}
      {isMythic && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          <MythicTreatment
            frameId={frame.id}
            colors={frame.colors}
            accentColor={accentColor}
            hotColor={hotColor}
            outer={outer}
            size={size}
          />
        </div>
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
  suppressOverlay = false,
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
  suppressOverlay?: boolean;
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

      {!suppressOverlay && theme === 'flame' && (
        <FlameWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {!suppressOverlay && theme === 'wave' && (
        <WaveWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {!suppressOverlay && theme === 'stars' && (
        <StarsWreathOverlay outer={outer} colors={colors} intensity={intensity} />
      )}
      {!suppressOverlay && theme === 'gold' && (
        <GoldWreathOverlay hotColor={hotColor} accentColor={accentColor} pad={pad} />
      )}
      {!suppressOverlay && theme === 'default' && (
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
    case 'frame_eclipse':     return <EclipseTransit {...rest} />;
    case 'frame_tempest':     return <TempestStrike {...rest} />;
    case 'frame_bloom_myth':  return <BloomPetals {...rest} />;
    case 'frame_glitch_myth': return <RealityShard {...rest} />;
    case 'frame_serpent':     return <SerpentCoil {...rest} />;
    case 'frame_comet':       return <CometTrail {...rest} />;
    case 'frame_crystal':     return <CrystalFacets {...rest} />;
    case 'frame_runes':       return <RuneCircle {...rest} />;
    default:                  return <DefaultMythicGlow {...rest} />;
  }
}

/** Ascension — three soft feathers rise from inside the rim toward
 *  the top, fully contained within the avatar's circular footprint.
 *  Each feather lives in the bottom half of the orb and rises only
 *  to the top half so it never bleeds into the username text. */
function AscensionFeathers({ colors, outer }: MythicProps) {
  const featherColor1 = colors[0];
  const featherColor2 = colors[1] ?? colors[0];
  // Three feathers placed across the lower half of the orb, rising
  // upward through the orb on staggered phases. Positions are inside
  // the avatar circle so the parent clip keeps them contained.
  const positions = [
    { x: 0.30, delay: 0 },
    { x: 0.50, delay: 0.9 },
    { x: 0.70, delay: 1.8 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {positions.map((p, i) => {
        const w = Math.max(5, outer * 0.085);
        const h = Math.max(10, outer * 0.18);
        // Each feather starts low (~70% down the orb) and rises to
        // about 25% from the top — stays inside the orb circle.
        const cx = p.x * outer;
        const cy = outer * 0.6;
        return (
          <svg
            key={i}
            className="absolute animate-mythic-feather-rise"
            width={w}
            height={h}
            viewBox="0 0 10 24"
            style={{
              left: cx - w / 2,
              top: cy - h / 2,
              animationDelay: `${p.delay}s`,
              filter: `drop-shadow(0 0 4px ${featherColor1})`,
            }}
          >
            <path
              d="M5 1 Q1 6 1.5 14 Q3 22 5 23 Q7 22 8.5 14 Q9 6 5 1 Z M5 4 L5 23"
              fill={i % 2 ? featherColor2 : featherColor1}
              stroke="#ffffffaa"
              strokeWidth="0.4"
              opacity="0.85"
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

/** Eternal — yin/yang in motion. A gold semicircle and a dark
 *  semicircle (with a thin gold trim so it stays visible against
 *  paper or ink backdrops) ROTATE together as one ring, the meeting
 *  points sweeping around the rim. At the center, a lemniscate (∞)
 *  is perpetually traced and erased via stroke-dashoffset, making
 *  "eternity" the literal motion. Diamond sigils orbit with the
 *  arcs. Stays inside the avatar circle thanks to the parent clip. */
function EternalDuality({ outer }: MythicProps) {
  const gold = '#fbbf24';
  const dark = '#0c0a09';
  const r = outer / 2 - 2;
  const cx = outer / 2;
  const cy = outer / 2;
  // Lemniscate (figure-8) drawn with two cubic-bezier loops crossing
  // at the center. Compact horizontal ∞ sized to ~36% of the outer.
  const ir = outer * 0.18;
  const dy = ir * 0.65;
  const infinityD =
    `M ${cx} ${cy} ` +
    `C ${cx - ir * 0.4} ${cy - dy}, ${cx - ir} ${cy - dy}, ${cx - ir} ${cy} ` +
    `C ${cx - ir} ${cy + dy}, ${cx - ir * 0.4} ${cy + dy}, ${cx} ${cy} ` +
    `C ${cx + ir * 0.4} ${cy - dy}, ${cx + ir} ${cy - dy}, ${cx + ir} ${cy} ` +
    `C ${cx + ir} ${cy + dy}, ${cx + ir * 0.4} ${cy + dy}, ${cx} ${cy} Z`;
  return (
    <>
      {/* Rotating duality ring — both arcs + sigils sweep together. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none animate-mythic-eternal-rotate"
        style={{ zIndex: 2 }}
      >
        <svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`}>
          {/* Gold upper half */}
          <path
            d={`M 2 ${cy} A ${r} ${r} 0 0 1 ${outer - 2} ${cy}`}
            fill="none"
            stroke={gold}
            strokeWidth="3"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${gold})` }}
          />
          {/* Dark lower half — with a thin gold inline so it doesn't
              vanish on dark paper; it's still readably "the dark half". */}
          <path
            d={`M 2 ${cy} A ${r} ${r} 0 0 0 ${outer - 2} ${cy}`}
            fill="none"
            stroke={dark}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={`M 2 ${cy} A ${r} ${r} 0 0 0 ${outer - 2} ${cy}`}
            fill="none"
            stroke={gold}
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.7"
            style={{ filter: `drop-shadow(0 0 3px ${gold}88)` }}
          />
          {/* Two diamond sigils where the arcs meet — orbit with them. */}
          <circle cx={2} cy={cy}      r={3} fill={gold} style={{ filter: `drop-shadow(0 0 4px ${gold})` }} />
          <circle cx={outer - 2} cy={cy} r={3} fill={gold} style={{ filter: `drop-shadow(0 0 4px ${gold})` }} />
        </svg>
      </div>
      {/* Center ∞ sigil — perpetually drawn then erased. The path
          uses pathLength=100 so the dashoffset keyframe works at any
          avatar size without recalibration. */}
      <svg
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        style={{ zIndex: 3 }}
      >
        <path
          d={infinityD}
          pathLength={100}
          fill="none"
          stroke={gold}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="100"
          className="animate-mythic-eternal-infinity"
          style={{ filter: `drop-shadow(0 0 4px ${gold})` }}
        />
      </svg>
    </>
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

/** Stargaze — 8 stars at fixed positions JUST INSIDE the rim, each
 *  twinkling individually. Pulled inward from the previous "way
 *  outside" placement so the field reads as inhabiting the orb's
 *  own night sky, not the surrounding text. */
function StargazeField({ colors, outer }: MythicProps) {
  // Hand-placed angles around the rim. Distance is now negative
  // (radial dist BACK toward center) so stars sit between the rim
  // and the avatar face — fully inside the bounding box.
  const stars = [
    { angle: -75, dist: -0.10 },
    { angle: -30, dist: -0.08 },
    { angle:  20, dist: -0.12 },
    { angle:  60, dist: -0.07 },
    { angle: 110, dist: -0.10 },
    { angle: 155, dist: -0.09 },
    { angle: 200, dist: -0.08 },
    { angle: 250, dist: -0.11 },
  ];
  const r = outer / 2;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {stars.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        // (r + r * dist) where dist is negative pulls the star
        // inward from the rim by abs(dist)*r pixels.
        const radius = r + r * s.dist;
        const cx = Math.cos(rad) * radius + outer / 2;
        const cy = Math.sin(rad) * radius + outer / 2;
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

/** Void — three concentric rings IMPLODE inward (scale down + fade)
 *  starting at the rim and shrinking toward the center. Inset by a
 *  few px so even at the start scale they sit safely inside. */
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
          inset: 4,
          border: `2px solid ${ringColor1}`,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-void-implode"
        style={{
          inset: 4,
          border: `2px solid ${ringColor2}`,
          animationDelay: '0.8s',
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-void-implode"
        style={{
          inset: 4,
          border: `1px solid ${ringColor3}`,
          animationDelay: '1.6s',
          zIndex: 2,
        }}
      />
    </>
  );
}

/** Awakened — 12 sunburst rays radiating from inside the rim toward
 *  the rim edge, each pulsing in/out on staggered phases. Rays are
 *  short and INWARD-pointing so they live entirely inside the
 *  avatar circle — sun shining INTO you rather than outward. */
function AwakenedSunburst({ colors, outer }: MythicProps) {
  const rayCount = 12;
  const rayColors = colors.length >= 4 ? colors : [...colors, '#ffffff', '#fde047'];
  const rayLength = Math.max(8, outer * 0.18);
  const rayWidth  = Math.max(2, outer * 0.025);
  // The base of each ray sits a few px inside the rim. The tip
  // points TOWARD center (so rays look like beams converging onto
  // the avatar from the rim). Fully contained.
  const rimInset = Math.max(2, outer * 0.04);
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
                top: -(outer / 2 - rimInset),
                width: rayWidth,
                height: rayLength,
                // Bright at the rim end, fading toward center.
                background: `linear-gradient(to top, transparent, ${c})`,
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

/** Eclipse — a dark moon orbits inside the rim, eclipsing whatever
 *  portion of the rim it's currently passing across. The moon has a
 *  thin gold corona ring that glows along its leading edge. */
function EclipseTransit({ outer }: MythicProps) {
  const moonSize = Math.max(10, outer * 0.18);
  // Orbit just inside the rim so the moon is always visible inside
  // the clipped circle and the trailing corona reads as on-rim.
  const orbitRadius = outer / 2 - moonSize * 0.55;
  return (
    <div
      className="absolute pointer-events-none animate-mythic-eclipse-orbit"
      style={{ inset: 0, zIndex: 2 }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: moonSize,
          height: moonSize,
          marginLeft: -moonSize / 2,
          marginTop: -moonSize / 2,
          transform: `translateX(${orbitRadius}px)`,
        }}
      >
        {/* Gold corona ring — thin halo around the moon */}
        <div
          aria-hidden
          className="absolute rounded-full animate-mythic-eclipse-corona"
          style={{
            inset: -3,
            border: '1.5px solid #fde047',
            boxShadow: '0 0 8px #fde047aa',
          }}
        />
        {/* Dark moon disc */}
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            inset: 0,
            background: 'radial-gradient(circle at 35% 35%, #1f1d1c 20%, #0c0a09 80%)',
            boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    </div>
  );
}

/** Tempest — three lightning bolts strike at fixed positions on the
 *  rim, flickering in/out at staggered phases. SVG zigzag paths
 *  drawn from the rim toward the avatar face (so the body extends
 *  INWARD, never outside the bounding box). */
function TempestStrike({ outer }: MythicProps) {
  const positions = [
    { angle: -90, delay: 0    },
    { angle:  30, delay: 0.7  },
    { angle: 150, delay: 1.4  },
  ];
  // Bolt anchor sits just inside the rim. Bolt extends from there
  // toward the orb center.
  const anchorRadius = outer * 0.42;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {positions.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const cx = Math.cos(rad) * anchorRadius + outer / 2;
        const cy = Math.sin(rad) * anchorRadius + outer / 2;
        const w = Math.max(5, outer * 0.10);
        const h = Math.max(12, outer * 0.22);
        // SVG bolt is drawn pointing DOWN by default. Rotate it so
        // its body extends FROM the rim TOWARD orb center.
        // For angle=-90 (top): rotation 0 (default down points to center).
        // For angle=0  (right): rotation -90 (down → left).
        const rot = -(p.angle + 90);
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: cx - w / 2,
              top: cy - h / 2,
              width: w,
              height: h,
              transform: `rotate(${rot}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            <svg
              className="absolute inset-0 animate-mythic-bolt-flash"
              width={w}
              height={h}
              viewBox="0 0 6 18"
              style={{
                animationDelay: `${p.delay}s`,
                filter: 'drop-shadow(0 0 4px #60a5fa) drop-shadow(0 0 2px #fde047)',
              }}
            >
              <path
                d="M3.4 0 L1 7 L3 7 L0.8 17 L4.5 9 L2.5 9 L4.2 0 Z"
                fill="#fde047"
                stroke="#ffffff"
                strokeWidth="0.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

/** Bloom — five petals open and close at fixed rim positions.
 *  Each petal is anchored at its base (closest to the rim) so the
 *  scale-bloom unfurls inward without bleeding outside. */
function BloomPetals({ colors, outer }: MythicProps) {
  const petalCount = 5;
  // Petal base sits a few px inside the rim; tip extends inward.
  const baseRadius = outer * 0.42;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {Array.from({ length: petalCount }).map((_, i) => {
        const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
        const cx = Math.cos(angle) * baseRadius + outer / 2;
        const cy = Math.sin(angle) * baseRadius + outer / 2;
        const c = colors[i % colors.length];
        const sz = Math.max(8, outer * 0.16);
        const rot = (angle * 180) / Math.PI + 90;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: cx - sz / 2,
              top: cy - sz * 0.05,
              width: sz,
              height: sz * 1.4,
              transform: `rotate(${rot}deg) translateY(-${sz * 0.1}px)`,
              transformOrigin: '50% 0%',
            }}
          >
            <svg
              className="absolute inset-0 animate-mythic-petal-bloom"
              width={sz}
              height={sz * 1.4}
              viewBox="0 0 10 14"
              style={{
                animationDelay: `${(i / petalCount) * 1.6}s`,
                transformOrigin: '50% 0%',
                filter: `drop-shadow(0 0 3px ${c})`,
              }}
            >
              <path
                d="M5 0 Q1 4 1.5 9 Q2 13 5 14 Q8 13 8.5 9 Q9 4 5 0 Z"
                fill={c}
                stroke="#ffffff88"
                strokeWidth="0.3"
              />
              <path d="M5 0 L5 14" stroke="#ffffff66" strokeWidth="0.3" />
            </svg>
          </div>
        );
      })}
      {/* Bright center bud where the petals meet at the rim center */}
      <div
        aria-hidden
        className="absolute rounded-full animate-mythic-bloom-center"
        style={{
          left: '50%',
          top: '50%',
          width: 6,
          height: 6,
          marginLeft: -3,
          marginTop: -3,
          background: '#ffffff',
          boxShadow: '0 0 8px #ffffff, 0 0 4px #f9a8d4',
        }}
      />
    </div>
  );
}

/** Reality Shard — three thin chromatic borders (cyan / magenta /
 *  yellow) in the same place as the rim, jittering their position
 *  on different beats so the avatar reads as glitching. Plus a
 *  vertical scanline glitch that flashes occasionally. */
function RealityShard({ outer }: MythicProps) {
  return (
    <>
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-glitch-cyan"
        style={{
          inset: 1,
          border: '1.5px solid #22d3ee',
          mixBlendMode: 'screen',
          opacity: 0.85,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-glitch-magenta"
        style={{
          inset: 1,
          border: '1.5px solid #ec4899',
          mixBlendMode: 'screen',
          opacity: 0.85,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none animate-mythic-glitch-yellow"
        style={{
          inset: 1,
          border: '1px solid #fbbf24',
          mixBlendMode: 'screen',
          opacity: 0.7,
          zIndex: 2,
        }}
      />
      {/* Scanline glitch — a thin horizontal bar that occasionally
          flashes across the avatar at a random vertical position. */}
      <div
        aria-hidden
        className="absolute pointer-events-none animate-mythic-glitch-scan"
        style={{
          left: 0,
          right: 0,
          height: Math.max(2, outer * 0.04),
          background: 'linear-gradient(to bottom, transparent, #ffffff, transparent)',
          mixBlendMode: 'screen',
          zIndex: 3,
        }}
      />
    </>
  );
}

/** Serpent Coil — an ouroboros snake winds around the avatar rim.
 *  The whole snake (segmented body + head + tongue) rotates as a
 *  unit, so it reads as "slithering" around the orb. Tongue flicks
 *  on its own faster beat. Body is a near-full circular arc with
 *  scale dashes; head sits at the leading end with two eyes. */
function SerpentCoil({ outer, colors }: MythicProps) {
  const bodyDark   = colors[0] || '#052e16';
  const bodyLight  = colors[1] || '#65a30d';
  const accentEye  = colors[2] || '#fde047';
  const headColor  = colors[3] || '#16a34a';
  const r = outer * 0.40;
  const cx = outer / 2;
  const cy = outer / 2;
  // Arc covers ~340deg, leaving a 20deg gap where the snake's head
  // and tail almost meet — the ouroboros reading.
  const startA = 10;   // degrees (CCW from 12 o'clock when y is down)
  const endA   = 350;
  const startRad = (startA * Math.PI) / 180;
  const endRad   = (endA   * Math.PI) / 180;
  const sx = cx + Math.cos(startRad) * r;
  const sy = cy + Math.sin(startRad) * r;
  const ex = cx + Math.cos(endRad)   * r;
  const ey = cy + Math.sin(endRad)   * r;
  const bodyD = `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  // Head sits at the END of the body and points along the tangent
  // (CW direction = endA + 90). Translated into SVG transform.
  const headRot = endA + 90;
  const sw = Math.max(2.5, outer * 0.06);
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none animate-mythic-serpent-rotate"
      style={{ zIndex: 2 }}
    >
      <svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`}>
        {/* Body — outer dark stroke + lighter inline + scale dashes */}
        <path
          d={bodyD}
          fill="none"
          stroke={bodyDark}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={bodyD}
          fill="none"
          stroke={bodyLight}
          strokeWidth={sw * 0.45}
          strokeLinecap="round"
          strokeDasharray={`${sw * 0.9} ${sw * 0.5}`}
          style={{ filter: `drop-shadow(0 0 3px ${bodyLight})` }}
        />
        {/* Head — diamond shape with eyes + flicking tongue. Sized
            relative to outer so it scales with avatar size. */}
        <g transform={`translate(${ex} ${ey}) rotate(${headRot})`}>
          {/* Diamond head */}
          <path
            d={`M 0 ${-sw * 1.4} L ${sw} 0 L 0 ${sw * 0.7} L ${-sw} 0 Z`}
            fill={headColor}
            stroke={bodyDark}
            strokeWidth="0.6"
            style={{ filter: `drop-shadow(0 0 3px ${bodyLight})` }}
          />
          {/* Two beady eyes */}
          <circle cx={-sw * 0.4} cy={-sw * 0.2} r={sw * 0.18} fill={accentEye} />
          <circle cx={ sw * 0.4} cy={-sw * 0.2} r={sw * 0.18} fill={accentEye} />
          {/* Tongue — forked, flicks via opacity + scaleY */}
          <g
            className="animate-mythic-serpent-tongue"
            style={{ transformOrigin: `0 ${-sw * 1.4}px` }}
          >
            <path
              d={`M -${sw * 0.25} ${-sw * 1.4} L -${sw * 0.55} ${-sw * 2.3} M ${sw * 0.25} ${-sw * 1.4} L ${sw * 0.55} ${-sw * 2.3}`}
              stroke="#ef4444"
              strokeWidth={Math.max(0.7, sw * 0.18)}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Comet Trail — a bright head orbits the rim with a fading dot
 *  trail behind it. The dots rotate as a single unit so the whole
 *  comet drifts cleanly around the avatar. */
function CometTrail({ outer, colors }: MythicProps) {
  const tailColor = colors[1] || '#22d3ee';
  const auraColor = colors[3] || '#a78bfa';
  const orbitR = outer * 0.42;
  const cx = outer / 2;
  const cy = outer / 2;
  const headSize = Math.max(6, outer * 0.11);
  // Index 0 = head; the rest trail behind at decreasing angles +
  // sizes + opacities. Angles negative = CCW from head; CW rotation
  // of the whole div makes the head leading edge "forward".
  const trail = [
    { angle:   0, scale: 1.00, opacity: 1.00, isHead: true  },
    { angle:  -8, scale: 0.78, opacity: 0.78, isHead: false },
    { angle: -18, scale: 0.60, opacity: 0.55, isHead: false },
    { angle: -30, scale: 0.45, opacity: 0.38, isHead: false },
    { angle: -45, scale: 0.32, opacity: 0.22, isHead: false },
    { angle: -65, scale: 0.22, opacity: 0.12, isHead: false },
  ];
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none animate-mythic-comet-orbit"
      style={{ zIndex: 2 }}
    >
      {trail.map((t, i) => {
        const rad = (t.angle * Math.PI) / 180;
        const x = cx + Math.cos(rad) * orbitR;
        const y = cy + Math.sin(rad) * orbitR;
        const sz = headSize * t.scale;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - sz / 2,
              top:  y - sz / 2,
              width:  sz,
              height: sz,
              borderRadius: '50%',
              opacity: t.opacity,
              background: t.isHead
                ? `radial-gradient(circle, #ffffff 0%, ${tailColor}cc 45%, transparent 80%)`
                : `radial-gradient(circle, ${tailColor}cc 0%, ${auraColor}55 60%, transparent 100%)`,
              boxShadow: t.isHead
                ? `0 0 8px #ffffff, 0 0 18px ${tailColor}`
                : `0 0 6px ${tailColor}88`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Crystal Facets — six hexagonal facets at fixed positions just
 *  inside the rim. Each shimmers via opacity on staggered phases,
 *  and a single bright glint pulses at the center. Static layout
 *  but the lighting reads as "fractured light catching the faces". */
function CrystalFacets({ outer, colors }: MythicProps) {
  const facetFill = colors[1] || '#67e8f9';
  const facetEdge = colors[2] || '#ffffff';
  const accent    = colors[3] || '#a78bfa';
  const r = outer * 0.36;
  const cx = outer / 2;
  const cy = outer / 2;
  const faceSize = Math.max(4, outer * 0.075);
  const facets = Array.from({ length: 6 }).map((_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      // Tint varies between blue and violet at alternate positions
      // so the ring reads as multifaceted, not monochrome.
      fill: i % 2 === 0 ? facetFill : accent,
    };
  });
  return (
    <svg
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ zIndex: 2 }}
    >
      {facets.map((f, i) => {
        // Hexagon polygon points around (f.x, f.y).
        const points = Array.from({ length: 6 })
          .map((_, j) => {
            const a = (j / 6) * Math.PI * 2;
            return `${f.x + Math.cos(a) * faceSize},${f.y + Math.sin(a) * faceSize}`;
          })
          .join(' ');
        return (
          <polygon
            key={i}
            points={points}
            fill={f.fill}
            fillOpacity="0.25"
            stroke={facetEdge}
            strokeWidth="0.9"
            className="animate-mythic-crystal-shimmer"
            style={{
              animationDelay: `${(i / 6) * 1.6}s`,
              filter: `drop-shadow(0 0 3px ${f.fill})`,
              transformOrigin: `${f.x}px ${f.y}px`,
            }}
          />
        );
      })}
      {/* Center bright glint — periodic pop. */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(2, outer * 0.025)}
        fill={facetEdge}
        className="animate-mythic-crystal-glint"
        style={{ filter: `drop-shadow(0 0 4px ${accent}) drop-shadow(0 0 2px ${facetEdge})` }}
      />
    </svg>
  );
}

/** Rune Circle — eight runic glyphs at fixed positions around the
 *  inside of the rim. They light up in a chasing sequence, each
 *  with a brief glow flash. Stays inside the avatar bounds. */
function RuneCircle({ outer, colors }: MythicProps) {
  const runeColor = colors[1] || '#a78bfa';
  const flashColor = colors[2] || '#c084fc';
  const accent     = colors[3] || '#fde047';
  const count = 8;
  const r = outer * 0.40;
  const cx = outer / 2;
  const cy = outer / 2;
  // Eight abstract rune glyphs. Each is centered on (0,0) with a
  // ±3 unit footprint so they all visually balance.
  const glyphs = [
    'M -3 -3 L 3 3 M 3 -3 L -3 3',                       // X
    'M 0 -3 L 0 3 M -3 0 L 3 0',                         // +
    'M -3 -2 L 3 -2 L 0 3 Z',                            // △
    'M -3 0 A 3 3 0 1 0 3 0 M -3 0 L 3 0',               // half-circle with diameter
    'M -2.5 -3 L 2.5 -3 M -2.5 0 L 2.5 0 M -2.5 3 L 2.5 3', // ≡
    'M 0 -3 L 3 0 L 0 3 L -3 0 Z',                       // ◇
    'M -3 3 L 0 -3 L 3 3 M -1.5 0 L 1.5 0',              // A-shape
    'M -3 -2 L 3 -2 L 3 2 L -3 2 Z M 0 -2 L 0 2',        // boxed-bar
  ];
  const sz = Math.max(3, outer * 0.07);
  return (
    <svg
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      width={outer}
      height={outer}
      viewBox={`0 0 ${outer} ${outer}`}
      style={{ zIndex: 2 }}
    >
      {/* Faint guide circle behind the runes — just a thin hairline
          so the runes read as "on a circle" even when most are dim. */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={runeColor}
        strokeWidth="0.5"
        opacity="0.25"
        strokeDasharray="2 3"
      />
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        return (
          <g
            key={i}
            transform={`translate(${x} ${y}) scale(${sz / 6})`}
            className="animate-mythic-rune-flash"
            style={{
              animationDelay: `${(i / count) * 1.6}s`,
              filter: `drop-shadow(0 0 3px ${flashColor})`,
              color: runeColor,
            }}
          >
            <path
              d={glyphs[i % glyphs.length]}
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      {/* Center sigil — small accent diamond, quietly pulsing. */}
      <g
        transform={`translate(${cx} ${cy})`}
        className="animate-mythic-rune-center"
        style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
      >
        <path
          d="M 0 -3 L 3 0 L 0 3 L -3 0 Z"
          fill={accent}
          opacity="0.85"
        />
      </g>
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
