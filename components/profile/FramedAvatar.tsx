'use client';

import { Avatar } from '@/components/ui/Avatar';
import { getFrame } from '@/constants/cosmetics';
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
 * Avatar wrapped in a cosmetic frame. Avatar sits flush against the frame —
 * no black gap. Animated frames get a second counter-rotating conic layer +
 * orbiting sparkles for a more alive feel.
 */
export function FramedAvatar({ src, alt, size = 'md', frameId, className }: Props) {
  const frame = getFrame(frameId);
  const pad = frameSizePadding[size];
  const base = sizeBase[size];
  const outer = base + pad * 2;

  if (frame.id === 'frame_none' || !frame.colors.length) {
    return <Avatar src={src} alt={alt} size={size} />;
  }

  const gradient = frame.colors.length === 1
    ? frame.colors[0]
    : frame.style === 'conic'
      ? `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`
      : `linear-gradient(135deg, ${frame.colors.join(', ')})`;

  const conicGradient = `conic-gradient(from 0deg, ${frame.colors.join(', ')}, ${frame.colors[0]})`;
  const hotColor = frame.colors[frame.colors.length - 1];
  const accentColor = frame.colors[0];
  const isAnimated = frame.animated;
  const sparkCount = size === 'sm' ? 4 : size === 'md' ? 5 : 6;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: outer, height: outer }}
    >
      {/* Pulsing soft halo — always on for animated frames */}
      {isAnimated && (
        <div
          className="absolute rounded-full pointer-events-none animate-frame-halo"
          style={{
            inset: -Math.max(4, pad),
            background: `radial-gradient(circle, ${accentColor}55 0%, ${hotColor}22 45%, transparent 72%)`,
          }}
        />
      )}

      {/* Counter-rotating conic under-layer — gives animated frames a richer swirl */}
      {isAnimated && (
        <div
          className="absolute inset-0 rounded-full animate-frame-spin-reverse pointer-events-none"
          style={{
            background: conicGradient,
            opacity: 0.55,
            filter: 'blur(1px) saturate(1.4)',
          }}
        />
      )}

      {/* Outer frame */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          isAnimated && frame.style === 'conic' && 'animate-frame-spin-fast',
          isAnimated && frame.style !== 'conic' && 'animate-frame-pulse',
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
            isAnimated && 'animate-frame-spin-reverse',
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

      {/* Wreath — mini sparks around the rim, orbiting when animated */}
      {frame.style === 'wreath' && (
        <div className={cn('absolute inset-0', isAnimated && 'animate-frame-orbit')}>
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

      {/* Orbiting sparks — added to every animated frame for extra life */}
      {isAnimated && frame.style !== 'wreath' && (
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
