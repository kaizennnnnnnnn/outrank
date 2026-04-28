'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, RecapFlight } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

/**
 * Overlay rendered once at the app-layout level. Subscribes to
 * `useUIStore.recapFlights` and animates each flight from its source
 * (modal/log button center) to its destination (the RecapDraftPanel,
 * marked with `data-recap-drop`).
 *
 * Animation: arc from source to destination, scaling 1 → 0.55, opacity
 * fading from 1 → 1 → 0.85 → 0 across ~750ms. The arc is approximated
 * via a Y waypoint that pulls the icon up before letting it drop into
 * place, giving a more "filed away" feel than a straight line.
 *
 * Each flight self-clears via `clearRecapFlight(id)` once its exit
 * animation completes.
 */
export function RecapLogFlight() {
  const flights = useUIStore((s) => s.recapFlights);
  const clear = useUIStore((s) => s.clearRecapFlight);

  return (
    <div className="fixed inset-0 z-[180] pointer-events-none">
      <AnimatePresence>
        {flights.map((flight) => (
          <FlightGhost key={flight.id} flight={flight} onDone={() => clear(flight.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FlightGhost({ flight, onDone }: { flight: RecapFlight; onDone: () => void }) {
  const arcLiftY = Math.min(flight.fromY, flight.toY) - 40;

  return (
    <motion.div
      className="absolute"
      style={{ left: 0, top: 0 }}
      initial={{
        x: flight.fromX,
        y: flight.fromY,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        x: [flight.fromX, (flight.fromX + flight.toX) / 2, flight.toX],
        y: [flight.fromY, arcLiftY, flight.toY],
        scale: [1, 0.85, 0.55],
        opacity: [1, 1, 0.85],
      }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{
        duration: 0.75,
        times: [0, 0.45, 1],
        ease: [0.4, 0.0, 0.2, 1],
      }}
      onAnimationComplete={onDone}
    >
      {/* Center the ghost on the (x, y) coords */}
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-md"
          style={{
            background: `linear-gradient(135deg, ${flight.categoryColor}33, #10101aee 75%)`,
            border: `1px solid ${flight.categoryColor}55`,
            boxShadow: `0 0 24px -4px ${flight.categoryColor}aa, 0 8px 24px -8px #000`,
          }}
        >
          <CategoryIcon
            slug={flight.categorySlug}
            name={flight.categoryName}
            icon={flight.categoryIcon}
            color={flight.categoryColor}
            size="sm"
          />
          <div className="leading-none">
            <p className="font-mono text-sm font-bold" style={{ color: flight.categoryColor }}>
              +{flight.value}
              <span className="text-slate-300 font-normal ml-1 text-[11px]">{flight.unit}</span>
            </p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">
              filed
            </p>
          </div>
        </div>
      </div>
    </motion.div>
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
