'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

// Editorial paper-tone shimmer. No glow, no orange — just a hairline
// rectangle with a soft pulse on the rule fill.
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse', className)}
      style={{
        background: 'var(--b-rule)',
        border: '1px solid var(--b-rule)',
        borderRadius: 0,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      className="dir-b p-4 space-y-3"
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-rule)',
        borderRadius: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
