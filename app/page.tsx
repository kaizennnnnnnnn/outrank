'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { FireIcon, SwordsCrossIcon, TrophyIconFull, FlagIcon, MedalIcon, ActivityIcon, RocketIcon, BoltFullIcon } from '@/components/ui/AppIcons';
import { CATEGORIES } from '@/constants/categories';
import { ReactNode } from 'react';

const features: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <FireIcon size={28} className="text-orange-400" />, title: 'Daily Streaks', desc: 'Build unbreakable habits with streak tracking that keeps you accountable.' },
  { icon: <SwordsCrossIcon size={28} className="text-red-400" />, title: '1v1 Duels', desc: 'Challenge friends to head-to-head competitions in any category.' },
  { icon: <TrophyIconFull size={28} className="text-yellow-400" />, title: 'Live Leaderboards', desc: 'Compete on weekly, monthly, and all-time rankings across 50+ categories.' },
  { icon: <FlagIcon size={28} className="text-red-400" />, title: 'Leagues', desc: 'Create private groups, set challenges, and crown weekly champions.' },
  { icon: <MedalIcon size={28} className="text-orange-400" />, title: 'Badges & XP', desc: 'Earn 40+ badges across 4 rarity tiers. Level up from Rookie to GOAT.' },
  { icon: <ActivityIcon size={28} className="text-emerald-400" />, title: 'Social Feed', desc: "See friends' progress in real-time. React, motivate, compete." },
];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

// Deterministic ember seed list — using a literal array keeps server and
// client HTML byte-identical (no hydration mismatch), which a Math.random
// call at module scope would break.
const EMBERS: { left: number; size: number; color: string; dur: number; delay: number; drift: number }[] = [
  { left: 6,  size: 3, color: '#ef4444', dur: 9,  delay: 0,   drift: 30 },
  { left: 14, size: 2, color: '#fbbf24', dur: 11, delay: 2.4, drift: -20 },
  { left: 22, size: 4, color: '#f97316', dur: 8,  delay: 1.1, drift: 40 },
  { left: 31, size: 2, color: '#fde68a', dur: 12, delay: 3.8, drift: -30 },
  { left: 40, size: 3, color: '#ef4444', dur: 10, delay: 0.8, drift: 25 },
  { left: 49, size: 2, color: '#fbbf24', dur: 13, delay: 4.2, drift: -15 },
  { left: 58, size: 4, color: '#f97316', dur: 9,  delay: 2.0, drift: 35 },
  { left: 67, size: 3, color: '#ef4444', dur: 11, delay: 1.6, drift: -25 },
  { left: 76, size: 2, color: '#fde68a', dur: 8,  delay: 3.0, drift: 30 },
  { left: 84, size: 3, color: '#fbbf24', dur: 12, delay: 0.4, drift: -40 },
  { left: 92, size: 2, color: '#f97316', dur: 10, delay: 2.8, drift: 20 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080f]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08080f]/80 backdrop-blur-xl border-b border-[#1e1e30]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 px-4 overflow-hidden">
        {/* Aurora background — layered blurred radial gradients slowly drifting */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-60 blur-3xl animate-landing-aurora"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.38), transparent 65%)' }}
          />
          <div
            className="absolute top-10 -right-32 w-[520px] h-[520px] rounded-full opacity-55 blur-3xl animate-landing-aurora-alt"
            style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.32), transparent 65%)' }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[680px] h-[400px] rounded-full opacity-45 blur-3xl"
            style={{ background: 'radial-gradient(ellipse, rgba(220,38,38,0.22), transparent 70%)' }}
          />
          {/* Fine grid overlay for depth */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse 60% 80% at 50% 40%, #000 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 40%, #000 30%, transparent 80%)',
            }}
          />
        </div>

        {/* Ember particles rising */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {EMBERS.map((e, i) => (
            <span
              key={i}
              className="absolute bottom-[-10px] rounded-full animate-landing-ember"
              style={{
                left: `${e.left}%`,
                width: e.size,
                height: e.size,
                background: e.color,
                boxShadow: `0 0 ${e.size * 3}px ${e.color}`,
                // @ts-expect-error - custom CSS var
                '--dur': `${e.dur}s`,
                '--drift': `${e.drift}px`,
                animationDelay: `${e.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm mb-6 animate-landing-pill"
              style={{
                background:
                  'linear-gradient(90deg, rgba(220,38,38,0.20), rgba(249,115,22,0.14))',
                border: '1px solid rgba(239,68,68,0.40)',
                color: '#fdba74',
                backdropFilter: 'blur(6px)',
              }}
            >
              <RocketIcon size={14} className="text-orange-400" />
              <span className="font-semibold tracking-wide">Self-improvement just got competitive</span>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.04] mb-6">
              Stop Improving
              <br />
              <span
                className="relative inline-block text-transparent bg-clip-text animate-landing-shimmer"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #fb923c 0%, #ef4444 25%, #fbbf24 50%, #ef4444 75%, #fb923c 100%)',
                  filter: 'drop-shadow(0 6px 24px rgba(239,68,68,0.35))',
                }}
              >
                Alone
                <span
                  className="absolute -inset-x-4 -inset-y-2 -z-10 blur-2xl opacity-70"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(239,68,68,0.45), transparent 70%)',
                  }}
                  aria-hidden
                />
              </span>
            </h1>

            <p className="text-base sm:text-xl text-slate-300/90 max-w-2xl mx-auto mb-8">
              Track habits, compete with friends, and climb the leaderboards across fitness, finance, mindset,
              career, and more. Your growth has an audience now.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto animate-landing-cta">
                  Start Competing
                  <span className="ml-1.5 transition-transform group-hover:translate-x-0.5">→</span>
                </Button>
              </Link>
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Social proof / trust strip */}
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-1.5">
                  {['#f97316', '#ef4444', '#fbbf24', '#ec4899'].map((c, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border border-[#08080f]"
                      style={{ background: `linear-gradient(135deg, ${c}, #7f1d1d)` }}
                    />
                  ))}
                </span>
                <span>
                  <span className="text-orange-400 font-bold">2,100+</span> members competing this week
                </span>
              </div>
              <span className="hidden sm:inline text-slate-700">·</span>
              <div className="flex items-center gap-1">
                <span className="text-amber-400" aria-hidden>★★★★★</span>
                <span>4.9 from early testers</span>
              </div>
            </div>
          </motion.div>

          {/* Category marquee — infinite dual-row scroll */}
          <div className="mt-14 relative">
            <div
              className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, #08080f, transparent)' }}
            />
            <div
              className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(-90deg, #08080f, transparent)' }}
            />

            <div className="overflow-hidden py-1">
              <div className="flex gap-3 animate-landing-marquee w-max">
                {[...CATEGORIES.slice(0, 12), ...CATEGORIES.slice(0, 12)].map((cat, i) => (
                  <div key={`row1-${i}`} className="shrink-0" title={cat.name}>
                    <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} />
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden py-1 mt-2">
              <div className="flex gap-3 animate-landing-marquee-reverse w-max">
                {[...CATEGORIES.slice(12, 24), ...CATEGORIES.slice(12, 24)].map((cat, i) => (
                  <div key={`row2-${i}`} className="shrink-0" title={cat.name}>
                    <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-[#1e1e30]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
              Built for Competition
            </h2>
            <p className="text-slate-500 text-lg">
              Every feature is designed to make self-improvement addictive.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 glow-hover transition-all"
              >
                <div className="mb-3">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 border-t border-[#1e1e30]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '52', label: 'Categories' },
              { value: '40+', label: 'Badges' },
              { value: '100', label: 'Levels' },
              { value: '∞', label: 'Competition' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="font-heading text-3xl sm:text-4xl font-bold text-orange-400 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-[#1e1e30]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Outrank?
            </h2>
            <p className="text-slate-400 mb-8">
              Join the movement. Your friends are already improving &mdash; don&apos;t fall behind.
            </p>
            <Link href="/auth/register">
              <Button size="lg">
                Create Free Account
                <BoltFullIcon size={16} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#1e1e30]">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-600">
          <Logo size="sm" />
          <p>&copy; 2026 Outrank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
