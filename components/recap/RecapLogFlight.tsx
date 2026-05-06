'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import type { RecapFlight } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Overlay rendered once at the app-layout level. Subscribes to
 * `useUIStore.recapFlights` and animates each log into the recap
 * draft panel as a paper-slip-being-tossed-onto-the-desk sequence,
 * styled to match the editorial Direction B v2 paper-and-ink language.
 *
 * Sequence:
 *   1. **Liftoff** — single hairline ring expanding once, plus a
 *      brief category-color flash at the source point.
 *   2. **Trail** — three faint hairline dashes following the arc,
 *      fading sequentially. Like a stenographer's pen tracking the
 *      slip's path across the page.
 *   3. **Card** — paper card with a hairline ink border, accent stripe
 *      on the left, glyph + value + "FILED" stamp. Tilts heavily on
 *      liftoff (-14deg), straightens mid-arc (8deg), then snaps flat
 *      at landing. Lands with a small overshoot bounce.
 *   4. **Splash** — wax-stamp impression at destination: outer thick
 *      category-colored ring punching in + inner hairline ring
 *      bleeding out + four cardinal ink dots radiating.
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

const CHIP_DURATION = 0.95;
const SPLASH_DURATION = 0.6;

function FlightSequence({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const [landed, setLanded] = useState(false);
  const bumpPanelPulse = useUIStore((s) => s.bumpPanelPulse);

  const arcLiftY = Math.min(flight.fromY, flight.toY) - 90;
  const arcMidX = (flight.fromX + flight.toX) / 2;

  const handleLanded = () => {
    setLanded(true);
    bumpPanelPulse(flight.categoryColor);
  };

  return (
    <>
      <FlightLiftoff flight={flight} />
      <FlightTrail flight={flight} arcMidX={arcMidX} arcLiftY={arcLiftY} />
      <FlightChip flight={flight} arcMidX={arcMidX} arcLiftY={arcLiftY} onLanded={handleLanded} />
      {landed && <FlightSplash flight={flight} onDone={onDone} />}
    </>
  );
}

/**
 * Hairline ring + accent flash at the source. Reads as the slip
 * coming free of the surface.
 */
function FlightLiftoff({ flight }: { flight: RecapFlight }) {
  return (
    <>
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 28,
          height: 28,
          marginLeft: -14,
          marginTop: -14,
          border: `1px solid ${flight.categoryColor}`,
          x: flight.fromX,
          y: flight.fromY,
        }}
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Tight category-color core flash */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 14,
          height: 14,
          marginLeft: -7,
          marginTop: -7,
          background: flight.categoryColor,
          x: flight.fromX,
          y: flight.fromY,
          opacity: 0.9,
        }}
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      />
    </>
  );
}

/**
 * Three faint hairline dashes that follow the chip's arc with
 * staggered delays — fade out as the chip passes each. The trail
 * leaves a clear paper-trail signature without competing with the
 * chip itself.
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
  const dashes = [
    { delay: 0.08, len: 12 },
    { delay: 0.18, len: 10 },
    { delay: 0.28, len: 8 },
    { delay: 0.38, len: 6 },
  ];
  return (
    <>
      {dashes.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: d.len,
            height: 1,
            background: flight.categoryColor,
          }}
          initial={{
            x: flight.fromX,
            y: flight.fromY,
            opacity: 0,
          }}
          animate={{
            x: [flight.fromX, arcMidX, flight.toX],
            y: [flight.fromY, arcLiftY, flight.toY],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: CHIP_DURATION * 0.85,
            delay: d.delay,
            times: [0, 0.4, 0.85],
            ease: [0.34, 1.0, 0.64, 1],
          }}
        />
      ))}
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
  // Paper-toss motion: heavy tilt on liftoff (-14deg, like the slip
  // is breaking free), straightens mid-arc (8deg, near horizontal),
  // settles flat at landing. A small overshoot at the end (scale 0.55
  // → 0.5) reads as the slip thwacking onto the desk.
  return (
    <motion.div
      className="absolute"
      style={{ left: 0, top: 0 }}
      initial={{
        x: flight.fromX,
        y: flight.fromY,
        scale: 1.05,
        opacity: 0,
        rotate: -14,
      }}
      animate={{
        x: [flight.fromX, arcMidX, flight.toX, flight.toX],
        y: [flight.fromY, arcLiftY, flight.toY, flight.toY],
        scale: [1.05, 0.95, 0.55, 0.5],
        opacity: [0, 1, 1, 0.92],
        rotate: [-14, 8, 1, 0],
      }}
      transition={{
        duration: CHIP_DURATION,
        times: [0, 0.42, 0.92, 1],
        ease: [0.34, 1.0, 0.64, 1],
        opacity: { duration: CHIP_DURATION, times: [0, 0.15, 0.88, 1], ease: 'easeOut' },
      }}
      onAnimationComplete={onLanded}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div
          className="dir-b inline-flex items-center"
          style={{
            background: 'var(--b-paper)',
            color: 'var(--b-ink)',
            border: '1px solid var(--b-ink)',
            borderLeft: `4px solid ${flight.categoryColor}`,
            padding: '10px 14px',
            gap: 12,
            // Two-layer shadow: a tight ink drop + a softer wider one
            // so the slip reads as paper sitting above paper, with a
            // crisper edge than a single soft shadow gives you.
            boxShadow:
              '0 2px 0 -1px rgba(0,0,0,0.18),' +
              '0 10px 24px -10px rgba(0,0,0,0.55)',
          }}
        >
          <span style={{ color: flight.categoryColor, display: 'inline-flex' }}>
            <CategoryIcon
              slug={flight.categorySlug}
              name={flight.categoryName}
              icon={flight.categoryIcon}
              color={flight.categoryColor}
              size="sm"
            />
          </span>
          <div style={{ lineHeight: 1.05 }}>
            <div
              className="font-display tabular"
              style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 500 }}
            >
              +{flight.value}
              <span
                className="font-body"
                style={{
                  fontSize: 11,
                  fontStyle: 'normal',
                  fontWeight: 400,
                  color: 'var(--b-ink-60)',
                  marginLeft: 4,
                  textTransform: 'lowercase',
                  letterSpacing: '0.02em',
                }}
              >
                {flight.unit}
              </span>
            </div>
            <div
              className="spread"
              style={{ fontSize: 8.5, color: flight.categoryColor, marginTop: 4 }}
            >
              FILED · §
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Wax-stamp impression at the destination. Outer thick category-color
 * ring punches in (large→small + opacity in/out) — the stamp settling.
 * Inner hairline ring opens out — ink bleeding into paper. Four
 * cardinal dots radiate as character marks.
 */
function FlightSplash({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const dots = [
    { dx: 0,   dy: -24 },
    { dx: 24,  dy: 0   },
    { dx: 0,   dy: 24  },
    { dx: -24, dy: 0   },
  ];

  return (
    <>
      {/* Outer thick stamp — large, settles down */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 30,
          height: 30,
          marginLeft: -15,
          marginTop: -15,
          border: `2.5px solid ${flight.categoryColor}`,
          x: flight.toX,
          y: flight.toY,
        }}
        initial={{ scale: 2.6, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 0.7] }}
        transition={{ duration: SPLASH_DURATION * 0.5, ease: [0.34, 1.4, 0.64, 1] }}
      />
      {/* Inner hairline — ink bleeding into paper, opens out */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 24,
          height: 24,
          marginLeft: -12,
          marginTop: -12,
          border: `1px solid ${flight.categoryColor}`,
          x: flight.toX,
          y: flight.toY,
        }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: SPLASH_DURATION, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={onDone}
      />
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: 4,
            height: 4,
            marginLeft: -2,
            marginTop: -2,
            background: flight.categoryColor,
            x: flight.toX,
            y: flight.toY,
          }}
          initial={{ x: flight.toX, y: flight.toY, opacity: 1, scale: 1 }}
          animate={{
            x: flight.toX + d.dx,
            y: flight.toY + d.dy,
            opacity: 0,
            scale: 0.5,
          }}
          transition={{ duration: SPLASH_DURATION, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </>
  );
}

/**
 * Helper for callers — finds the recap-drop target's center, falling back
 * to bottom-center of viewport if the panel isn't on the page.
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
