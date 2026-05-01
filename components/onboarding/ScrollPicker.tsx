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
 * Horizontal ruler-style number picker. The user scrolls the ticks
 * left/right to change the value; the center indicator marks the
 * current selection.
 *
 * Spacer widths live in React state (not imperative DOM .style.width)
 * because React re-applies the JSX `style` prop on every re-render —
 * any imperative DOM mutation gets wiped, leaving spacers at 0px and
 * truncating the scrollable range to ~the middle of the rail. Using
 * state means the width survives every re-render.
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

  // Always read the latest value via ref so the resize observer's
  // closure doesn't snap scroll back to a stale value when the user
  // has already moved on.
  const valueRef = useRef(value);
  valueRef.current = value;

  // Measure the container and keep half-width in state. The
  // ResizeObserver fires on the container itself, not on user scroll,
  // so this only updates on real layout changes (mount, rotation).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHalfWidth(el.clientWidth / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Once spacers are sized (halfWidth > 0), seed the scroll position
  // to match the current value. Re-runs only when half-width itself
  // changes (mount + resize), so the user's drag isn't fought.
  useEffect(() => {
    if (!ref.current || halfWidth === 0) return;
    // requestAnimationFrame defers to after the paint that applies
    // the new spacer widths — otherwise scrollLeft is set against
    // the old layout.
    const raf = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.scrollLeft = ((valueRef.current - min) / step) * TICK_WIDTH;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [halfWidth, min, step]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const ticks = Math.round(container.scrollLeft / TICK_WIDTH);
    const newValue = Math.max(min, Math.min(max, min + ticks * step));
    if (newValue !== value) onChange(newValue);
  };

  return (
    <div className={cn('flex flex-col items-center w-full select-none', className)}>
      {/* Big value + unit */}
      <div className="font-heading text-7xl font-bold text-white tabular-nums leading-none">
        {formatValue ? formatValue(value) : value}
        {unit && (
          <span className="text-orange-400 text-2xl font-bold ml-2 align-baseline">
            {unit}
          </span>
        )}
      </div>

      {/* Picker rail */}
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
          <div className="flex items-end h-14">
            <div style={{ width: halfWidth, flexShrink: 0 }} aria-hidden />
            {Array.from({ length: totalTicks }).map((_, i) => {
              const isMajor = i % majorEvery === 0;
              return (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-end justify-center"
                  style={{ width: TICK_WIDTH, scrollSnapAlign: 'center' }}
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
            <div style={{ width: halfWidth, flexShrink: 0 }} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
