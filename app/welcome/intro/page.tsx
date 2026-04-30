'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { FireIcon, SwordsCrossIcon, TrophyIconFull, BoltFullIcon } from '@/components/ui/AppIcons';
import { WaterIcon, SleepIcon, ScreenIcon } from '@/components/ui/CategoryIcons';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';

/**
 * Five-page swipeable intro shown after "Get Started." Tells the
 * Outrank pitch in ~40 seconds, then hands off to the funnel proper
 * at /onboard. Pages aren't a full step in the onboarding sense — no
 * answers are captured here — so this isn't part of the wizard shell.
 */

interface IntroPage {
  title: ReactNode;
  body: string;
  visual: ReactNode;
}

const PAGES: IntroPage[] = [
  {
    title: <>Build the version of you<br/>that <span className="text-orange-400">doesn&apos;t quit</span>.</>,
    body: 'Outrank turns daily habits into a game. Every log earns XP, every streak proves your edge.',
    visual: <PhoenixMascot size={150} />,
  },
  {
    title: <>Five pillars.<br/><span className="text-orange-400">One streak.</span></>,
    body: 'Gym, steps, water, sleep, and phone-free time — your foundation, tracked and visible.',
    visual: (
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {[
          { label: 'Gym',    color: '#ef4444', icon: <FireIcon size={28} className="text-red-300" /> },
          { label: 'Steps',  color: '#22c55e', icon: <BoltFullIcon size={28} className="text-emerald-300" /> },
          { label: 'Water',  color: '#3b82f6', icon: <WaterIcon  size={28} className="text-blue-300" /> },
          { label: 'Sleep',  color: '#8b5cf6', icon: <SleepIcon  size={28} className="text-violet-300" /> },
          { label: 'Focus',  color: '#f59e0b', icon: <ScreenIcon size={28} className="text-amber-300" /> },
          { label: 'Streak', color: '#fb923c', icon: <FireIcon   size={28}  className="text-orange-300" /> },
        ].map((p) => (
          <div
            key={p.label}
            className="aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1.5"
            style={{
              background: `linear-gradient(135deg, ${p.color}1a, #0c0c14)`,
              borderColor: `${p.color}40`,
            }}
          >
            <div>{p.icon}</div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{p.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: <>Compete with friends.<br/><span className="text-orange-400">Outrank everyone.</span></>,
    body: 'Pacts, leagues, duels, and live leaderboards. Your growth has an audience now.',
    visual: (
      <div className="relative w-[260px] h-[180px]">
        {/* Stacked rank badges */}
        <div
          className="absolute left-2 top-6 w-20 h-24 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 -rotate-6"
          style={{ background: 'linear-gradient(135deg, #ef444433, #0c0c14)' }}
        >
          <SwordsCrossIcon size={28} className="text-red-400" />
          <span className="text-[10px] font-bold uppercase text-slate-300">Duels</span>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-28 rounded-2xl border border-orange-500/40 flex flex-col items-center justify-center gap-2 z-10"
          style={{ background: 'linear-gradient(135deg, #f9731644, #0c0c14)', boxShadow: '0 8px 32px -8px rgba(249,115,22,0.5)' }}
        >
          <TrophyIconFull size={32} className="text-yellow-400" />
          <span className="text-[10px] font-bold uppercase text-orange-300">Leagues</span>
        </div>
        <div
          className="absolute right-2 top-6 w-20 h-24 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 rotate-6"
          style={{ background: 'linear-gradient(135deg, #22c55e33, #0c0c14)' }}
        >
          <BoltFullIcon size={28} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase text-slate-300">Ranks</span>
        </div>
      </div>
    ),
  },
  {
    title: <>Your <span className="text-orange-400">Soul Orb</span><br/>evolves with you.</>,
    body: 'Every habit logged feeds your orb. Watch it awaken, ascend, and become unmistakably yours.',
    visual: (
      <div className="relative flex items-center justify-center">
        {/* Real fully-evolved canvas Soul Orb at max tier with the
            colorful Prismatic + Plasma + Supernova combo —
            pink/purple/teal body, plasma pulse, orange ring burst. */}
        <SoulOrb
          tier={MAX_ORB_TIER}
          intensity={1}
          size={220}
          interactive={false}
          hideLabel
          baseColorId="prismatic"
          pulseColorId="plasma"
          ringColorId="ring_supernova"
        />
      </div>
    ),
  },
  {
    title: <>Endless<br/><span className="text-orange-400">customization</span>.</>,
    body: 'Mix bases, pulses, and rings. Hundreds of combinations. Ascend to unlock the rainbow tier.',
    visual: <OrbCustomizationShowcase />,
  },
];

// ─── Orb customization auto-showcase ─────────────────────────────────────────
//
// Cycles the orb through several base colors, then aggressively cycles
// through pulse colors, then rings, then transitions into a full-rainbow
// spinning finale. Demonstrates the customizability without making the
// user click through every combo manually.
//
// Timing is chosen so the whole sequence runs ~10s — long enough for the
// user to notice each phase but short enough that they don't get bored
// before tapping CONTINUE.

const SHOWCASE_BASES = ['phoenix', 'nebula', 'celestial', 'aurora', 'bloodmoon', 'galactic'];
const SHOWCASE_PULSES = ['pulse_eternal', 'pulse_cosmic', 'pulse_nova', 'pulse_quasar', 'pulse_stargaze', 'pulse_eternal'];
const SHOWCASE_RINGS = ['ring_supernova', 'ring_cosmic', 'ring_celestial', 'ring_void', 'ring_eternal'];

function OrbCustomizationShowcase() {
  const [config, setConfig] = useState({
    base: SHOWCASE_BASES[0],
    pulse: SHOWCASE_PULSES[0],
    ring: SHOWCASE_RINGS[0],
  });
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timeouts.push(setTimeout(fn, ms));

    let t = 0;
    // Phase 1 — cycle bases (650ms each)
    SHOWCASE_BASES.forEach((b) => {
      at(t, () => setConfig((c) => ({ ...c, base: b })));
      t += 650;
    });

    // Brief pause holding the last base
    t += 300;

    // Phase 2 — cycle pulses fast & aggressive (350ms each)
    SHOWCASE_PULSES.forEach((p) => {
      at(t, () => setConfig((c) => ({ ...c, pulse: p })));
      t += 350;
    });

    // Brief pause
    t += 300;

    // Phase 3 — cycle rings (650ms each)
    SHOWCASE_RINGS.forEach((r) => {
      at(t, () => setConfig((c) => ({ ...c, ring: r })));
      t += 650;
    });

    // Brief pause before finale
    t += 300;

    // Phase 4 — rainbow + spin
    at(t, () => {
      setConfig({ base: 'rainbow', pulse: 'pulse_rainbow', ring: 'ring_rainbow' });
      setSpinning(true);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <div className={cn(spinning && 'animate-orb-spin')}>
        <SoulOrb
          tier={MAX_ORB_TIER}
          intensity={1}
          size={200}
          interactive={false}
          hideLabel
          baseColorId={config.base}
          pulseColorId={config.pulse}
          ringColorId={config.ring}
        />
      </div>
    </div>
  );
}

export default function IntroCarouselPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;

  const next = () => {
    if (isLast) {
      // Phase 2 lands at /onboard/intro (the mascot's first question).
      // For now just send to the placeholder /onboard which we'll wire
      // in the next phase.
      router.push('/onboard');
    } else {
      setPage((p) => p + 1);
    }
  };

  const skip = () => router.push('/onboard');

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col relative overflow-hidden">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.40), transparent 65%)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.40), transparent 65%)' }}
        />
      </div>

      {/* Header — back arrow + skip */}
      <header className="relative flex items-center justify-between px-5 pt-6 pb-2">
        <button
          onClick={() => (page === 0 ? router.push('/welcome') : setPage((p) => p - 1))}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={skip}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors uppercase tracking-wider"
        >
          Skip
        </button>
      </header>

      {/* Page content with swipe/fade */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className="flex items-center justify-center mb-10 min-h-[200px]">
              {PAGES[page].visual}
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight max-w-md">
              {PAGES[page].title}
            </h2>
            <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
              {PAGES[page].body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — dots + CTA */}
      <div className="relative px-6 pb-10 space-y-5 max-w-md w-full mx-auto">
        {/* Dot indicator */}
        <div className="flex items-center justify-center gap-2">
          {PAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === page ? 'w-8 bg-orange-400' : 'w-1.5 bg-white/15 hover:bg-white/25',
              )}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>

        {/* Primary CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={next}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all"
          style={{
            background: 'linear-gradient(90deg, #dc2626, #f97316)',
          }}
        >
          {isLast ? "LET'S GO" : 'CONTINUE'}
        </motion.button>
      </div>
    </div>
  );
}
