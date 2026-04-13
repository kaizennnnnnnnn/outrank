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
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/10 border border-red-600/20 text-orange-400 text-sm mb-6">
              <RocketIcon size={16} className="text-orange-400" />
              <span>Self-improvement just got competitive</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Stop Improving{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                Alone
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Track habits, compete with friends, and climb the leaderboards across fitness, finance, mindset, career, and more. Your growth has an audience now.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg">
                  Start Competing
                  <span>→</span>
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </motion.div>

          {/* Floating category icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mt-16 max-w-lg mx-auto"
          >
            {CATEGORIES.slice(0, 16).map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                whileHover={{ scale: 1.12 }}
                className="cursor-default"
                title={cat.name}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} />
              </motion.div>
            ))}
          </motion.div>
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
