'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Called whenever the computed hours change. Caller stores this as
   *  the `value` for the standard log flow. */
  onChange: (hours: number) => void;
  initialBed?: string;  // "HH:MM"
  initialWake?: string; // "HH:MM"
}

/**
 * Bed-time / wake-time picker for the sleep pillar. Replaces the +/-
 * value stepper in QuickLogModal — the natural way to log sleep is
 * "I slept from X to Y," not "8 hours." Computes duration honoring
 * over-midnight wraps (e.g. 23:00 → 07:00 = 8h).
 *
 * The computed hours flow back to the parent via onChange so the
 * existing log path still writes a numeric value to the log doc.
 */
export function SleepTimeEntry({ onChange, initialBed = '23:00', initialWake = '07:00' }: Props) {
  const [bed, setBed] = useState(initialBed);
  const [wake, setWake] = useState(initialWake);

  const hours = computeHours(bed, wake);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  useEffect(() => {
    onChange(Number(hours.toFixed(2)));
  }, [hours, onChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <TimeField label="Bedtime" value={bed} onChange={setBed} />
        <TimeField label="Wake up" value={wake} onChange={setWake} />
      </div>
      <div className="text-center">
        <p className="font-mono text-4xl font-bold text-white">
          {wholeHours}
          <span className="text-slate-500 text-2xl mx-1">h</span>
          {String(minutes).padStart(2, '0')}
          <span className="text-slate-500 text-2xl ml-1">m</span>
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">slept</p>
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0c0c16] border border-[#1e1e30] rounded-xl px-3 py-2.5 font-mono text-lg text-white focus:outline-none focus:border-violet-400/60"
      />
    </label>
  );
}

/**
 * Hours between bedtime and wake-up. Treats wake-up as next-day if it
 * lands earlier than (or equal to) bedtime — the typical case.
 */
function computeHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  const bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  return Math.max(0, (wakeMin - bedMin) / 60);
}
