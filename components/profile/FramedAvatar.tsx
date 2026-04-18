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
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
};
const sizeBase: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 112,
};

/**
 * Avatar wrapped in a cosmetic frame. The base Avatar is left untouched; we
 * draw the frame behind / around it using CSS. Supports: ring, double, conic,
 * halo, wreath.
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

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: outer, height: outer }}
    >
      {/* Outer frame */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          frame.animated && frame.style === 'conic' && 'animate-frame-spin',
          frame.animated && frame.style !== 'conic' && 'animate-frame-pulse',
        )}
        style={{
          background: gradient,
          boxShadow: `0 0 18px -4px ${frame.colors[frame.colors.length - 1]}aa`,
          padding: frame.style === 'double' ? pad / 2 : 0,
        }}
      >
        {/* Inner cut-out */}
        <div
          className="absolute rounded-full bg-[#08080f]"
          style={{ inset: pad }}
        />
      </div>

      {/* Double-ring inner band */}
      {frame.style === 'double' && (
        <div
          className="absolute rounded-full"
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

      {/* Halo — an extra soft outer glow ring */}
      {frame.style === 'halo' && (
        <div
          className="absolute inset-[-6px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${frame.colors[0]}55, transparent 70%)`,
          }}
        />
      )}

      {/* Wreath — mini stars around the rim */}
      {frame.style === 'wreath' && (
        <>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = outer / 2 - 1;
            const x = Math.cos(angle) * r + outer / 2;
            const y = Math.sin(angle) * r + outer / 2;
            return (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: x - 3,
                  top: y - 3,
                  background: frame.colors[i % frame.colors.length],
                  boxShadow: `0 0 6px ${frame.colors[i % frame.colors.length]}`,
                }}
              />
            );
          })}
        </>
      )}

      {/* The avatar itself, centered */}
      <div className="relative z-10">
        <Avatar src={src} alt={alt} size={size} />
      </div>
    </div>
  );
}
