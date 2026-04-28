'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

interface Props {
  /** Active when > 0; component idles otherwise. */
  seconds: number;
  /** Called when the timer naturally reaches 0 OR is dismissed. */
  onDone: () => void;
  /** Color tint for the progress ring; defaults to red (gym pillar). */
  color?: string;
}

/**
 * Floating rest-timer panel. Pinned to the bottom of the active workout
 * page when the user finishes a set. Shows mm:ss countdown, a +30s /
 * -15s pair, and a Skip button.
 *
 * Counts down via setInterval; on completion fires a haptic + the
 * `onDone` callback so the parent can clear the active timer slot. The
 * effect resets cleanly when `seconds` changes (e.g., a new set just
 * completed before the previous timer expired).
 */
export function RestTimer({ seconds, onDone, color = '#ef4444' }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [originalSec, setOriginalSec] = useState(seconds);
  const onDoneRef = useRef(onDone);
  // Keep the latest callback in a ref so the interval body always sees
  // the current handler without re-creating the interval on each prop
  // change. Sync via effect — assigning during render trips
  // react-hooks/refs.
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Reset whenever a new rest period starts. Treats `seconds` as a
  // "fresh start" signal — same number === same timer for steady-state.
  useEffect(() => {
    setRemaining(seconds);
    setOriginalSec(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          haptic('double');
          onDoneRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (seconds <= 0 || remaining <= 0) return null;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = originalSec > 0 ? Math.max(0, Math.min(1, remaining / originalSec)) : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="resttimer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-6 z-40 pointer-events-auto"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md"
          style={{
            background: `linear-gradient(135deg, ${color}22, #10101aee 75%)`,
            border: `1px solid ${color}77`,
            boxShadow: `0 0 32px -4px ${color}99, 0 8px 24px -8px #000`,
          }}
        >
          {/* Circular progress + countdown */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1e30" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${pct * 100.5} 100.5`}
                style={{
                  filter: `drop-shadow(0 0 4px ${color})`,
                  transition: 'stroke-dasharray 0.4s linear',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-sm font-bold text-white tabular-nums">
                {mm}:{String(ss).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Rest
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRemaining((r) => Math.max(1, r - 15))}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0b0b14] border border-[#1e1e30] text-slate-300 hover:border-slate-500"
              >
                −15s
              </button>
              <button
                onClick={() => setRemaining((r) => r + 30)}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0b0b14] border border-[#1e1e30] text-slate-300 hover:border-slate-500"
              >
                +30s
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setRemaining(0);
              onDoneRef.current();
            }}
            className="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md flex-shrink-0 transition-colors"
            style={{
              background: `${color}22`,
              border: `1px solid ${color}55`,
              color,
            }}
          >
            Skip
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
