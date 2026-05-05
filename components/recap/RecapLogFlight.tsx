'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import type { RecapFlight } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Overlay rendered once at the app-layout level. Subscribes to
 * `useUIStore.recapFlights` and animates each log into the recap draft
 * panel as a sequence styled to match the editorial Direction B v2
 * paper-and-ink language:
 *
 *   1. **Liftoff hairline** at the source point — single ink-stroke
 *      ring expanding once. No glow.
 *   2. **Card chip** flies on a curved arc from source → destination.
 *      The chip is a paper rectangle with a hairline border, an accent
 *      stripe on the left, the category glyph, and `+value unit / FILED`.
 *   3. **Splash** fires at the destination once the chip lands: a
 *      single hairline ring + four ink dots in cardinal directions.
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
  const bumpPanelPulse = useUIStore((s) => s.bumpPanelPulse);

  const arcLiftY = Math.min(flight.fromY, flight.toY) - 80;
  const arcMidX = (flight.fromX + flight.toX) / 2;

  const handleLanded = () => {
    setLanded(true);
    bumpPanelPulse(flight.categoryColor);
  };

  return (
    <>
      <FlightLiftoff flight={flight} />
      <FlightChip flight={flight} arcMidX={arcMidX} arcLiftY={arcLiftY} onLanded={handleLanded} />
      {landed && <FlightSplash flight={flight} onDone={onDone} />}
    </>
  );
}

/**
 * A single hairline ring expanding once. Reads as a stamp-press, not a
 * burst — fits the paper grammar.
 */
function FlightLiftoff({ flight }: { flight: RecapFlight }) {
  return (
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
        x: flight.fromX,
        y: flight.fromY,
      }}
      initial={{ scale: 0.6, opacity: 1 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    />
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
  // Subtle rotation lifecycle — slight tilt at liftoff (like a slip
  // of paper coming free), straightening mid-flight, snapping flat
  // at landing. Reads as a clipping being filed, not a digital chip.
  return (
    <motion.div
      className="absolute"
      style={{ left: 0, top: 0 }}
      initial={{
        x: flight.fromX,
        y: flight.fromY,
        scale: 1,
        opacity: 0,
        rotate: -6,
      }}
      animate={{
        x: [flight.fromX, arcMidX, flight.toX],
        y: [flight.fromY, arcLiftY, flight.toY],
        scale: [1, 0.92, 0.5],
        opacity: [0, 1, 1, 0.9],
        rotate: [-6, 2, 0],
      }}
      transition={{
        duration: CHIP_DURATION,
        times: [0, 0.4, 1],
        ease: [0.34, 1.0, 0.64, 1],
        opacity: { duration: CHIP_DURATION, times: [0, 0.15, 0.85, 1], ease: 'easeOut' },
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
            borderLeft: `3px solid ${flight.categoryColor}`,
            padding: '8px 12px',
            gap: 10,
            // Soft drop so the card reads as paper above other paper.
            // No colored glow; the shadow is pure ink.
            boxShadow: '0 6px 18px -8px rgba(0,0,0,0.45)',
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
          <div style={{ lineHeight: 1.1 }}>
            <div
              className="font-display tabular"
              style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500 }}
            >
              +{flight.value}
              <span
                className="font-body"
                style={{
                  fontSize: 10,
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
              style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 3 }}
            >
              Filed
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Landing mark — a wax-stamp impression. Two rings layered: an outer
 * thick category-colored ring that punches in from large→small (the
 * stamp settling onto paper), and a hairline inner ring that opens
 * from small→large (ink spreading into the paper grain). Plus four
 * cardinal ink dots for character.
 */
function FlightSplash({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const dots = [
    { dx: 0,   dy: -22 },
    { dx: 22,  dy: 0   },
    { dx: 0,   dy: 22  },
    { dx: -22, dy: 0   },
  ];

  return (
    <>
      {/* Outer ring — stamp settling: large → small + fade */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 28,
          height: 28,
          marginLeft: -14,
          marginTop: -14,
          border: `2px solid ${flight.categoryColor}`,
          x: flight.toX,
          y: flight.toY,
        }}
        initial={{ scale: 2.4, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 0.6] }}
        transition={{ duration: SPLASH_DURATION * 0.55, ease: [0.34, 1.4, 0.64, 1] }}
      />
      {/* Inner hairline — ink bleeding into paper: small → large + fade */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: 22,
          height: 22,
          marginLeft: -11,
          marginTop: -11,
          border: `1px solid ${flight.categoryColor}`,
          x: flight.toX,
          y: flight.toY,
        }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
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
            width: 3,
            height: 3,
            marginLeft: -1.5,
            marginTop: -1.5,
            background: flight.categoryColor,
            x: flight.toX,
            y: flight.toY,
          }}
          initial={{ x: flight.toX, y: flight.toY, opacity: 1, scale: 1 }}
          animate={{
            x: flight.toX + d.dx,
            y: flight.toY + d.dy,
            opacity: 0,
            scale: 0.6,
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
