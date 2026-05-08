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
