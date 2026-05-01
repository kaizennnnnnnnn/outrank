'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const TICK_WIDTH = 10;

export interface ScrollPickerProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** Smallest increment between tick stops. Default 1. */
  step?: number;
  /** Custom display formatter for the big value (e.g. "5'10" for height). */
  formatValue?: (v: number) => string;
  /** Unit string shown alongside the value (e.g. "kg", "cm"). */
  unit?: string;
  /** Every Nth tick gets the longer "major" treatment. Default 5. */
  majorEvery?: number;
  className?: string;
}

/**
 * Horizontal ruler-style number picker.
 *
 * Implementation uses ABSOLUTE-positioned ticks inside a
 * fixed-width content div, NOT flex children with spacer divs. The
 * flex approach kept biting us — mobile Safari doesn't always
 * honor `width: <px>` on flex children with `flex-shrink: 0`,
 * leaving spacers at content-size (0px) and cutting reachable
 * scroll to roughly the middle of the range. Absolute positioning
 * with an explicit container width has no such ambiguity: every
 * tick lands at a known x, and the container's outer width
 * dictates the scroll bounds exactly.
 */
export function ScrollPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue,
  unit,
  majorEvery = 5,
  className,
}: ScrollPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const totalTicks = Math.floor((max - min) / step) + 1;

  const valueRef = useRef(value);
  valueRef.current = value;

  // Measure the container width once on mount + on every resize.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHalfWidth(el.clientWidth / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Seed scroll position once the half-width is known. rAF defers
  // the write until after the new content layout is painted.
  useEffect(() => {
    if (!ref.current || halfWidth === 0) return;
    const raf = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.scrollLeft = ((valueRef.current - min) / step) * TICK_WIDTH;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [halfWidth, min, step]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const ticks = Math.round(e.currentTarget.scrollLeft / TICK_WIDTH);
    const newValue = Math.max(min, Math.min(max, min + ticks * step));
    if (newValue !== value) onChange(newValue);
  };

  // Total content width. Tick 0 sits at left = halfWidth, tick N-1 at
  // left = halfWidth + (N-1)*TICK_WIDTH. Trailing halfWidth gives the
  // last tick room to scroll all the way to the center indicator.
  const contentWidth = halfWidth * 2 + Math.max(0, totalTicks - 1) * TICK_WIDTH;

  return (
    <div className={cn('flex flex-col items-center w-full select-none', className)}>
      <div className="font-heading text-7xl font-bold text-white tabular-nums leading-none">
        {formatValue ? formatValue(value) : value}
        {unit && (
          <span className="text-orange-400 text-2xl font-bold ml-2 align-baseline">
            {unit}
          </span>
        )}
      </div>

      <div className="relative w-full mt-12">
        {/* Center indicator */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[3px] h-14 rounded-full z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #fb923c, #ef4444)',
            boxShadow: '0 0 14px rgba(249,115,22,0.85)',
          }}
        />
        {/* Edge fades */}
        <div
          className="absolute inset-y-0 left-0 w-16 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, #08080f, transparent)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-16 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to left, #08080f, transparent)' }}
        />

        <div
          ref={ref}
          onScroll={onScroll}
          className="overflow-x-scroll no-scrollbar w-full"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
          }}
        >
          <div
            className="relative"
            style={{ width: contentWidth, height: 56 }}
          >
            {Array.from({ length: totalTicks }).map((_, i) => {
              const isMajor = i % majorEvery === 0;
              return (
                <div
                  key={i}
                  className="absolute bottom-0 flex items-end justify-center"
                  style={{
                    left: halfWidth + i * TICK_WIDTH - TICK_WIDTH / 2,
                    width: TICK_WIDTH,
                    height: 56,
                    scrollSnapAlign: 'center',
                  }}
                >
                  <div
                    className={cn(
                      'w-px rounded-full',
                      isMajor ? 'h-10 bg-white/35' : 'h-5 bg-white/15',
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
