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
 * Visual-intensity tier derived from rarity. Higher tier = more animated
 * layers. Common/Rare stay static even if `animated` is true; Mythic gets
 * everything plus an extra aurora/hue-rotate wash.
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
 * Avatar wrapped in a cosmetic frame. Avatar sits flush — no black gap.
 * Animation layers scale with the frame's rarity:
 *   0  common          → static ring
 *   1  rare            → ring + soft halo
 *   2  epic            → + slow spin / pulse
 *   3  legendary       → + counter-rotating conic + orbiting sparks
 *   4  mythic          → + aurora hue-rotate wash + extra spin layer
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

  const gradient = frame.colors.length === 1
    ? frame.colors[0]
    : frame.style === 'conic'
      ? `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`
      : `linear-gradient(135deg, ${frame.colors.join(', ')})`;

  const conicGradient = `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`;
  const hotColor = frame.colors[frame.colors.length - 1];
  const accentColor = frame.colors[0];
  const sparkCount = size === 'sm' ? 4 : size === 'md' ? 5 : 6;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        intensity >= 4 && 'animate-frame-aurora',
        className,
      )}
      style={{ width: outer, height: outer }}
    >
      {/* Soft halo — shown from rare upward */}
      {intensity >= 1 && (
        <div
          className={cn('absolute rounded-full pointer-events-none', intensity >= 2 && 'animate-frame-halo')}
          style={{
            inset: -Math.max(4, pad),
            background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
          }}
        />
      )}

      {/* Counter-rotating conic under-layer — legendary + mythic */}
      {intensity >= 3 && (
        <div
          className="absolute inset-0 rounded-full animate-frame-spin-reverse pointer-events-none"
          style={{
            background: conicGradient,
            opacity: 0.55,
            filter: 'blur(1px) saturate(1.4)',
          }}
        />
      )}

      {/* Extra fast spin layer — mythic only */}
      {intensity >= 4 && (
        <div
          className="absolute -inset-[2px] rounded-full animate-frame-spin-xfast pointer-events-none"
          style={{
            background: conicGradient,
            opacity: 0.35,
            filter: 'blur(2px) saturate(1.6)',
          }}
        />
      )}

      {/* Outer frame */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          intensity >= 2 && frame.style === 'conic' && 'animate-frame-spin-fast',
          intensity >= 2 && frame.style !== 'conic' && 'animate-frame-pulse',
        )}
        style={{
          background: gradient,
          boxShadow: `0 0 22px -2px ${hotColor}cc, 0 0 6px ${accentColor}88`,
          padding: frame.style === 'double' ? pad / 2 : 0,
        }}
      >
        {/* Inner cut-out — sized to match the avatar exactly (no black gap) */}
        <div
          className="absolute rounded-full bg-[#08080f]"
          style={{ inset: pad }}
        />
      </div>

      {/* Double-ring inner band */}
      {frame.style === 'double' && (
        <div
          className={cn(
            'absolute rounded-full',
            intensity >= 3 && 'animate-frame-spin-reverse',
          )}
          style={{
            inset: pad - 2,
            background: gradient,
          }}
        >
          <div
            className="absolute rounded-full bg-[#08080f]"
            style={{ inset: 2 }}
          />
        </div>
      )}

      {/* Wreath — mini sparks around the rim, orbiting on epic+ */}
      {frame.style === 'wreath' && (
        <div className={cn('absolute inset-0', intensity >= 2 && 'animate-frame-orbit')}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = outer / 2 - 1;
            const x = Math.cos(angle) * r + outer / 2;
            const y = Math.sin(angle) * r + outer / 2;
            const c = frame.colors[i % frame.colors.length];
            return (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: x - 3,
                  top: y - 3,
                  background: c,
                  boxShadow: `0 0 8px ${c}, 0 0 2px #fff`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Orbiting sparks — legendary + mythic on non-wreath frames */}
      {intensity >= 3 && frame.style !== 'wreath' && (
        <div className="absolute inset-0 animate-frame-orbit pointer-events-none">
          {Array.from({ length: sparkCount }).map((_, i) => {
            const angle = (i / sparkCount) * Math.PI * 2;
            const r = outer / 2 + 2;
            const x = Math.cos(angle) * r + outer / 2;
            const y = Math.sin(angle) * r + outer / 2;
            const c = frame.colors[i % frame.colors.length];
            const sz = size === 'sm' ? 3 : size === 'xl' ? 5 : 4;
            return (
              <div
                key={i}
                className="absolute rounded-full animate-frame-spark"
                style={{
                  width: sz,
                  height: sz,
                  left: x - sz / 2,
                  top: y - sz / 2,
                  background: c,
                  boxShadow: `0 0 10px ${c}, 0 0 4px #ffffffaa`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* The avatar itself, centered — flush to the frame, no black gap */}
      <div className="relative z-10">
        <Avatar src={src} alt={alt} size={size} />
      </div>
    </div>
  );
}
