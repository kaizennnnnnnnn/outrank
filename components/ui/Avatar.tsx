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
  xl: 'w-20 h-20',
};

const pxMap = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export function Avatar({ src, alt = 'User', size = 'md', online, className, level }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {level && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="#1e1e30"
            strokeWidth="2"
          />
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray={`${Math.min(level, 100)} 100`}
            strokeLinecap="round"
          />
        </svg>
      )}
      <div className={cn(
        'rounded-full overflow-hidden bg-[#18182a] flex items-center justify-center',
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
          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#08080f]',
          online ? 'bg-emerald-500' : 'bg-slate-600'
        )} />
      )}
    </div>
  );
}
