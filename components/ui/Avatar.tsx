'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  level?: number;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-24 h-24',
};

const pxMap = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
};

// Ring size is larger than avatar to create padding
const ringSizeMap = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-[68px] h-[68px]',
  xl: 'w-[120px] h-[120px]',
};

export function Avatar({ src, alt = 'User', size = 'md', online, className, level }: AvatarProps) {
  const hasRing = level !== undefined && level > 0;

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', hasRing ? ringSizeMap[size] : '', className)}>
      {hasRing && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
          {/* Background ring */}
          <circle
            cx="20" cy="20" r="18"
            fill="none"
            stroke="#1e1e30"
            strokeWidth="2.5"
          />
          {/* Progress ring */}
          <circle
            cx="20" cy="20" r="18"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeDasharray={`${Math.min(level, 100) * 1.131} 113.1`}
            strokeLinecap="round"
          />
        </svg>
      )}
      <div className={cn(
        'rounded-full overflow-hidden bg-[#18182a] flex items-center justify-center relative z-10',
        sizeMap[size]
      )}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={pxMap[size]}
            height={pxMap[size]}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-slate-500 font-bold text-sm">
            {alt.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#08080f] z-20',
          online ? 'bg-emerald-500' : 'bg-slate-600'
        )} />
      )}
    </div>
  );
}
