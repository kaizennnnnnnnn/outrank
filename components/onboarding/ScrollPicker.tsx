'use client';

import { useEffect, useRef } from 'react';
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
  /** Width of the value display in font size units. */
  className?: string;
}

/**
 * Horizontal ruler-style number picker. The user scrolls the ticks
 * left/right to change the value; the center indicator marks the
 * current selection. Used by the onboarding height/weight/age steps.
 *
 * Implementation notes:
 *   - The viewport's left/right padding equals half the visible width
 *     so the first/last ticks can sit at the center indicator without
 *     awkward overscroll.
 *   - scroll-snap-type: x mandatory snaps each tick to the center.
 *   - Initial scroll is set imperatively on mount; we don't track it
 *     in state since it'd cause a re-render loop with onScroll.
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
  const totalTicks = Math.floor((max - min) / step) + 1;

  // Set padding to exactly half the container width and seed the
  // initial scroll position. Doing both in JS (rather than CSS calc)
  // because CSS percentage padding resolves against the parent's
  // width — when the rail sits inside a px-6 page wrapper, half-of-
  // parent ≠ half-of-container, so the last few ticks become
  // unreachable. Using the actual clientWidth fixes that.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setPadding = () => {
      const halfWidth = el.clientWidth / 2;
      el.style.paddingLeft = `${halfWidth}px`;
      el.style.paddingRight = `${halfWidth}px`;
    };
    setPadding();
    // Seed scroll to the current value AFTER padding is applied so the
    // computed scroll position matches the new content layout.
    el.scrollLeft = ((value - min) / step) * TICK_WIDTH;

    // Resize observer keeps the padding correct on rotation / window
    // resize. Layout shifts also re-snap to the current value so the
    // selection survives the resize.
    const ro = new ResizeObserver(() => {
      setPadding();
      el.scrollLeft = ((value - min) / step) * TICK_WIDTH;
    });
    ro.observe(el);
    return () => ro.disconnect();
    // We deliberately omit `value` from deps so external value changes
    // don't snap the scroll mid-drag. Initial mount + resize only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, step]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const ticks = Math.round(container.scrollLeft / TICK_WIDTH);
    const newValue = Math.max(min, Math.min(max, min + ticks * step));
    if (newValue !== value) {
      onChange(newValue);
    }
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
        {/* Center indicator — bright orange tick at the picker midpoint */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[3px] h-14 rounded-full z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #fb923c, #ef4444)',
            boxShadow: '0 0 14px rgba(249,115,22,0.85)',
          }}
        />

        {/* Soft fades at left/right edges so ticks gently dim toward
            the screen sides instead of being visually cut off. */}
        <div
          className="absolute inset-y-0 left-0 w-16 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to right, #08080f, transparent)',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-16 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to left, #08080f, transparent)',
          }}
        />

        <div
          ref={ref}
          onScroll={onScroll}
          className="overflow-x-scroll no-scrollbar w-full"
          style={{
            scrollSnapType: 'x mandatory',
            // paddingLeft/Right are set imperatively on mount + on
            // resize so they match half the container's actual width
            // (CSS calc(50%) resolves against the parent, which gives
            // wrong values when the rail sits inside a padded page).
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x',
          }}
        >
          <div className="flex items-end h-14">
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
          </div>
        </div>
      </div>
    </div>
  );
}
