'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, RecapFlight } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Overlay rendered once at the app-layout level. Subscribes to
 * `useUIStore.recapFlights` and animates each log into the recap draft
 * panel as a multi-stage sequence:
 *
 *   1. **Chip** flies on a curved arc from source → destination, scaling
 *      down and rotating slightly for character.
 *   2. **Trail** of staggered sparkle dots follows the chip's path,
 *      fading and shrinking — gives the flight a comet-like quality.
 *   3. **Splash** fires at the destination once the chip lands: an
 *      expanding glow ring + radial particle burst, confirming "filed."
 *
 * Each flight self-clears via `clearRecapFlight(id)` once the splash
 * exits. Z-index 220 puts it above the modal overlay (z-50) and below
 * the level-up overlay (z-260).
 */
export function RecapLogFlight() {
  const flights = useUIStore((s) => s.recapFlights);
  const clear = useUIStore((s) => s.clearRecapFlight);

  return (
    <div className="fixed inset-0 z-[220] pointer-events-none">
      <AnimatePresence>
        {flights.map((flight) => (
          <FlightSequence key={flight.id} flight={flight} onDone={() => clear(flight.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const CHIP_DURATION = 0.85;
const SPLASH_DURATION = 0.55;

function FlightSequence({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const [landed, setLanded] = useState(false);

  // A modest lift before the drop. The arc midpoint sits ~80px above the
  // higher of the two endpoints — visible enough to read as motion, not
  // so high it crosses the TopBar on small viewports.
  const arcLiftY = Math.min(flight.fromY, flight.toY) - 80;
  const arcMidX = (flight.fromX + flight.toX) / 2;

  return (
    <>
      <FlightTrail
        flight={flight}
        arcMidX={arcMidX}
        arcLiftY={arcLiftY}
      />
      <FlightChip
        flight={flight}
        arcMidX={arcMidX}
        arcLiftY={arcLiftY}
        onLanded={() => setLanded(true)}
      />
      {landed && <FlightSplash flight={flight} onDone={onDone} />}
    </>
  );
}

function FlightChip({
  flight,
  arcMidX,
  arcLiftY,
  onLanded,
}: {
  flight: RecapFlight;
  arcMidX: number;
  arcLiftY: number;
  onLanded: () => void;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: 0, top: 0 }}
      initial={{
        x: flight.fromX,
        y: flight.fromY,
        scale: 1,
        opacity: 0,
        rotate: -2,
      }}
      animate={{
        x: [flight.fromX, arcMidX, flight.toX],
        y: [flight.fromY, arcLiftY, flight.toY],
        scale: [1, 0.95, 0.55],
        opacity: [0, 1, 1, 0.85],
        rotate: [-2, 4, -1],
      }}
      transition={{
        duration: CHIP_DURATION,
        times: [0, 0.4, 1],
        ease: [0.34, 1.2, 0.64, 1],
        opacity: { duration: CHIP_DURATION, times: [0, 0.15, 0.85, 1], ease: 'easeOut' },
      }}
      onAnimationComplete={onLanded}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-md relative"
          style={{
            background: `linear-gradient(135deg, ${flight.categoryColor}55, #10101aee 75%)`,
            border: `1px solid ${flight.categoryColor}88`,
            boxShadow:
              `0 0 32px -2px ${flight.categoryColor}cc,` +
              `0 0 64px -8px ${flight.categoryColor}88,` +
              `0 8px 24px -8px #000,` +
              `inset 0 1px 0 ${flight.categoryColor}66`,
          }}
        >
          {/* Inner sheen — gives the chip a glassy, premium feel */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
            style={{
              background: `linear-gradient(160deg, ${flight.categoryColor}22 0%, transparent 50%)`,
            }}
          />
          <CategoryIcon
            slug={flight.categorySlug}
            name={flight.categoryName}
            icon={flight.categoryIcon}
            color={flight.categoryColor}
            size="sm"
          />
          <div className="leading-none relative">
            <p
              className="font-mono text-sm font-bold"
              style={{
                color: flight.categoryColor,
                textShadow: `0 0 10px ${flight.categoryColor}99`,
              }}
            >
              +{flight.value}
              <span className="text-slate-200 font-normal ml-1 text-[11px]">{flight.unit}</span>
            </p>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-0.5">
              filed
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Three sparkle dots that follow the chip's path with staggered delays.
 * The trail fades faster than the chip, so by the time the chip lands
 * the trail has already dissipated — no clutter at the destination.
 */
function FlightTrail({
  flight,
  arcMidX,
  arcLiftY,
}: {
  flight: RecapFlight;
  arcMidX: number;
  arcLiftY: number;
}) {
  const sparkles = [
    { delay: 0.06, size: 6 },
    { delay: 0.14, size: 5 },
    { delay: 0.22, size: 4 },
    { delay: 0.30, size: 3 },
  ];
  return (
    <>
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: s.size,
            height: s.size,
            background: flight.categoryColor,
            boxShadow: `0 0 ${s.size * 2}px ${flight.categoryColor}`,
          }}
          initial={{
            x: flight.fromX,
            y: flight.fromY,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            x: [flight.fromX, arcMidX, flight.toX],
            y: [flight.fromY, arcLiftY, flight.toY],
            opacity: [0, 1, 0],
            scale: [0.8, 1, 0],
          }}
          transition={{
            duration: CHIP_DURATION,
            delay: s.delay,
            times: [0, 0.4, 0.85],
            ease: [0.34, 1.2, 0.64, 1],
          }}
        />
      ))}
    </>
  );
}

/**
 * Landing burst at the destination. Fires once the chip's arc completes.
 * Two layers: an expanding glow ring + 8 radial particles that fly out
 * and fade. Calls `onDone` when its own animation finishes — that's the
 * signal to clear the flight from the store.
 */
function FlightSplash({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 + (i % 2 ? 0.18 : 0);
    const dist = 28 + (i % 3) * 8;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4 - (i % 3) };
  });

  return (
    <>
      {/* Expanding glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          border: `1.5px solid ${flight.categoryColor}`,
          boxShadow: `0 0 24px ${flight.categoryColor}, inset 0 0 12px ${flight.categoryColor}66`,
          x: flight.toX,
          y: flight.toY,
        }}
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: SPLASH_DURATION, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={onDone}
      />
      {/* Radial particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            background: flight.categoryColor,
            boxShadow: `0 0 ${p.size * 3}px ${flight.categoryColor}`,
            x: flight.toX,
            y: flight.toY,
          }}
          initial={{ x: flight.toX, y: flight.toY, opacity: 1, scale: 1 }}
          animate={{
            x: flight.toX + p.dx,
            y: flight.toY + p.dy,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ duration: SPLASH_DURATION, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </>
  );
}

/**
 * Helper for callers — finds the recap-drop target's center, falling back
 * to bottom-center of viewport if the panel isn't on the page (e.g. user
 * is on /habits or /feed when they log).
 */
export function getRecapDropPoint(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const target = document.querySelector('[data-recap-drop]');
  if (target) {
    const r = (target as HTMLElement).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight - 96 };
}
