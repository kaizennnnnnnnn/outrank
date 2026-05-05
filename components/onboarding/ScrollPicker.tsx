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
      <div
        className="font-display tabular"
        style={{
          fontSize: 72,
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 0.95,
          color: 'var(--b-ink)',
        }}
      >
        {formatValue ? formatValue(value) : value}
        {unit && (
          <span
            className="font-body"
            style={{
              fontSize: 18,
              fontStyle: 'normal',
              fontWeight: 700,
              color: 'var(--b-accent)',
              marginLeft: 8,
              letterSpacing: '0.04em',
              textTransform: 'lowercase',
              verticalAlign: 'baseline',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      <div className="relative w-full" style={{ marginTop: 36 }}>
        {/* Center indicator — single ink line, no glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 2,
            height: 56,
            background: 'var(--b-accent)',
            zIndex: 10,
          }}
        />
        {/* Edge fades — paper-color gradient so ticks fade into the page */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            bottom: 0,
            left: 0,
            width: 64,
            background: 'linear-gradient(to right, var(--b-paper), transparent)',
            zIndex: 10,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            bottom: 0,
            right: 0,
            width: 64,
            background: 'linear-gradient(to left, var(--b-paper), transparent)',
            zIndex: 10,
          }}
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
                    style={{
                      width: 1,
                      height: isMajor ? 36 : 18,
                      background: isMajor ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
                    }}
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
