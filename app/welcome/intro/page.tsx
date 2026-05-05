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

interface IntroPage {
  eyebrow: string;
  title: ReactNode;
  body: string;
  visual: ReactNode;
}

const PAGES: IntroPage[] = [
  {
    eyebrow: 'Page One',
    title: (
      <>
        Build the version of you that{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>doesn&rsquo;t quit</em>.
      </>
    ),
    body: 'Outrank turns daily habits into a game. Every log earns XP, every streak proves your edge.',
    visual: <PhoenixMascot size={150} />,
  },
  {
    eyebrow: 'Page Two',
    title: (
      <>
        Five pillars.{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>One streak.</em>
      </>
    ),
    body: 'Gym, steps, water, sleep, and phone-free time — your foundation, tracked and visible.',
    visual: <PillarsGrid />,
  },
  {
    eyebrow: 'Page Three',
    title: (
      <>
        Compete with friends.{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>Outrank everyone.</em>
      </>
    ),
    body: 'Pacts, leagues, duels, and live leaderboards. Your growth has an audience now.',
    visual: <CompeteVisual />,
  },
  {
    eyebrow: 'Page Four',
    title: (
      <>
        Your{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>Soul Orb</em>{' '}
        evolves with you.
      </>
    ),
    body: 'Every habit logged feeds your orb. Watch it awaken, ascend, and become unmistakably yours.',
    visual: (
      <div className="animate-soul-orb-breathe">
        <SoulOrb
          tier={MAX_ORB_TIER}
          intensity={100}
          size={260}
          interactive={false}
          hideLabel
          baseColorId="prismatic"
          pulseColorId="pulse_quasar"
          ringColorId="ring_cosmic"
        />
      </div>
    ),
  },
  {
    eyebrow: 'Page Five',
    title: (
      <>
        Endless{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>customization</em>.
      </>
    ),
    body: 'Mix bases, pulses, and rings. Hundreds of combinations. Ascend to unlock the rainbow tier.',
    visual: <OrbCustomizationShowcase />,
  },
];

function PillarsGrid() {
  const items: { label: string; color: string; icon: ReactNode }[] = [
    { label: 'Gym',    color: '#ef4444', icon: <FireIcon size={26} /> },
    { label: 'Steps',  color: '#22c55e', icon: <BoltFullIcon size={26} /> },
    { label: 'Water',  color: '#3b82f6', icon: <WaterIcon size={26} /> },
    { label: 'Sleep',  color: '#8b5cf6', icon: <SleepIcon size={26} /> },
    { label: 'Focus',  color: '#f59e0b', icon: <ScreenIcon size={26} /> },
    { label: 'Streak', color: 'var(--b-accent)', icon: <FireIcon size={26} /> },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        width: 260,
      }}
    >
      {items.map((p) => (
        <div
          key={p.label}
          style={{
            aspectRatio: '1',
            border: '1px solid var(--b-rule)',
            borderTop: `2px solid ${p.color}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: p.color, display: 'inline-flex' }}>{p.icon}</span>
          <span
            className="spread"
            style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CompeteVisual() {
  const cards = [
    {
      label: 'Duels',
      color: '#ef4444',
      icon: <SwordsCrossIcon size={26} />,
      style: { left: 8, top: 24, transform: 'rotate(-6deg)', zIndex: 1 },
    },
    {
      label: 'Leagues',
      color: 'var(--b-accent)',
      icon: <TrophyIconFull size={28} />,
      style: { left: '50%', top: 0, transform: 'translateX(-50%)', zIndex: 2, borderTopWidth: 3 },
    },
    {
      label: 'Ranks',
      color: '#22c55e',
      icon: <BoltFullIcon size={26} />,
      style: { right: 8, top: 24, transform: 'rotate(6deg)', zIndex: 1 },
    },
  ];
  return (
    <div style={{ position: 'relative', width: 260, height: 180 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            position: 'absolute',
            width: 80,
            height: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'var(--b-paper)',
            border: '1px solid var(--b-rule)',
            borderTop: `2px solid ${c.color}`,
            ...c.style,
          }}
        >
          <span style={{ color: c.color, display: 'inline-flex' }}>{c.icon}</span>
          <span
            className="spread"
            style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
          >
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const SHOWCASE_BASES = ['phoenix', 'nebula', 'celestial', 'aurora', 'bloodmoon', 'galactic'];
const SHOWCASE_PULSES = ['pulse_eternal', 'pulse_cosmic', 'pulse_nova', 'pulse_quasar', 'pulse_stargaze', 'pulse_eternal'];
const SHOWCASE_RINGS = ['ring_supernova', 'ring_phoenix', 'ring_candy', 'ring_aurora', 'ring_sunset'];

type ShowcasePhase = 'cycling' | 'transitioning' | 'rainbow';

function OrbCustomizationShowcase() {
  const [config, setConfig] = useState({
    base: SHOWCASE_BASES[0],
    pulse: SHOWCASE_PULSES[0],
    ring: SHOWCASE_RINGS[0],
  });
  const [phase, setPhase] = useState<ShowcasePhase>('cycling');

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timeouts.push(setTimeout(fn, ms));

    let t = 0;
    SHOWCASE_BASES.forEach((b) => {
      at(t, () => setConfig((c) => ({ ...c, base: b })));
      t += 320;
    });
    t += 180;
    SHOWCASE_PULSES.forEach((p) => {
      at(t, () => setConfig((c) => ({ ...c, pulse: p })));
      t += 200;
    });
    t += 180;
    SHOWCASE_RINGS.forEach((r) => {
      at(t, () => setConfig((c) => ({ ...c, ring: r })));
      t += 320;
    });
    t += 180;
    at(t, () => setPhase('transitioning'));
    at(t + 700, () =>
      setConfig({ base: 'rainbow', pulse: 'pulse_rainbow', ring: 'ring_rainbow' }),
    );
    at(t + 1400, () => setPhase('rainbow'));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      {phase === 'transitioning' && (
        <div
          className="absolute inset-0 m-auto w-[200px] h-[200px] rounded-full pointer-events-none animate-orb-flash"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.95), rgba(168,85,247,0.55) 40%, transparent 75%)',
          }}
        />
      )}
      <div
        className={cn(
          phase === 'transitioning' && 'animate-orb-spin-transition',
          phase !== 'transitioning' && 'animate-soul-orb-breathe',
        )}
      >
        <SoulOrb
          tier={MAX_ORB_TIER}
          intensity={100}
          size={240}
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
  const stepLabel = `${String(page + 1).padStart(2, '0')} / ${String(PAGES.length).padStart(2, '0')}`;
  const progress = ((page + 1) / PAGES.length) * 100;

  const next = () => {
    if (isLast) router.push('/onboard');
    else setPage((p) => p + 1);
  };

  const skip = () => router.push('/onboard');

  return (
    <div
      className="dir-b min-h-screen flex flex-col"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      {/* Editorial header — back arrow + progress + skip */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 22px 14px',
          borderBottom: '1px solid var(--b-rule)',
        }}
      >
        <button
          onClick={() => (page === 0 ? router.push('/welcome') : setPage((p) => p - 1))}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--b-ink-60)',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="font-mono tabular"
            style={{
              fontSize: 9,
              color: 'var(--b-ink-60)',
              letterSpacing: '0.14em',
              flexShrink: 0,
            }}
          >
            {stepLabel}
          </div>
          <div
            style={{
              flex: 1,
              height: 2,
              background: 'var(--b-rule)',
              position: 'relative',
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--b-accent)',
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        <button
          onClick={skip}
          className="font-body"
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--b-ink-60)',
            padding: '4px 8px',
            flexShrink: 0,
          }}
        >
          Skip
        </button>
      </header>

      {/* Page content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 22px',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 32,
                minHeight: 200,
              }}
            >
              {PAGES[page].visual}
            </div>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
            >
              {PAGES[page].eyebrow}
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.05,
                margin: '6px 0 0',
                maxWidth: 440,
                color: 'var(--b-ink)',
              }}
            >
              {PAGES[page].title}
            </h2>
            <p
              className="font-body"
              style={{
                fontSize: 13,
                color: 'var(--b-ink-60)',
                marginTop: 14,
                maxWidth: 360,
                lineHeight: 1.6,
              }}
            >
              {PAGES[page].body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — dots + CTA */}
      <div
        style={{
          padding: '14px 22px 32px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {PAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Go to page ${i + 1}`}
              style={{
                height: 2,
                width: i === page ? 24 : 8,
                background: i === page ? 'var(--b-accent)' : 'var(--b-rule)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 250ms',
              }}
            />
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={next}
          className="font-body"
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            border: '1px solid var(--b-ink)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {isLast ? "Let's go →" : 'Continue →'}
        </motion.button>
      </div>
    </div>
  );
}
