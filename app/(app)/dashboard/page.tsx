'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { DailyChallenge } from '@/components/habits/DailyChallenge';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { HabitCard } from '@/components/habits/HabitCard';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { StreakFire } from '@/components/habits/StreakFire';
import { getLeague } from '@/constants/seasons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { UserHabit } from '@/types/habit';
import { RecapDraftPanel } from '@/components/recap/RecapDraftPanel';
import { PillarPlaceholderRow } from '@/components/habits/PillarPlaceholderRow';
import { WaterPillarRow } from '@/components/habits/WaterPillarRow';
import { GymPillarRow } from '@/components/habits/GymPillarRow';
import { StreakRepairBanner } from '@/components/habits/StreakRepairBanner';
import { PILLARS, isPillarSlug } from '@/constants/pillars';
import { FoodIcon } from '@/components/ui/CategoryIcons';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const router = useRouter();

  const [logModal, setLogModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);

  // Safety net: if Firebase user exists but no Firestore profile after 3s,
  // the user likely signed in before profile creation was fixed — redirect to onboarding
  useEffect(() => {
    if (firebaseUser && !user) {
      const timeout = setTimeout(() => {
        router.push('/onboarding');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [firebaseUser, user, router]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const level = getLevelForXP(user.totalXP);
  const xpProgress = getXPProgress(user.totalXP);

  // Split user's habits into the 5 pillars vs personal/custom. Pillars
  // are the only ones whose logs go on a friend's recap; customs are
  // private-only.
  const pillarHabitsBySlug = new Map<string, UserHabit>();
  const personalHabits: UserHabit[] = [];
  for (const h of habits) {
    if (isPillarSlug(h.categorySlug)) pillarHabitsBySlug.set(h.categorySlug, h);
    else personalHabits.push(h);
  }
  const todayStr = new Date().toDateString();
  const pillarsLoggedToday = PILLARS.reduce((acc, p) => {
    const h = pillarHabitsBySlug.get(p.slug);
    return acc + (h?.lastLogDate?.toDate?.()?.toDateString?.() === todayStr ? 1 : 0);
  }, 0);

  const openLogModal = (habit: UserHabit) => {
    setSelectedHabit(habit);
    setLogModal(true);
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Page atmosphere — soft warm radial gradient anchored to the hero
          that bleeds down the page. Replaces the previous "stack of
          identical bordered cards" look with one continuous canvas. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[480px] pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.12), transparent 65%),' +
            'radial-gradient(ellipse 60% 50% at 100% 30%, rgba(236,72,153,0.06), transparent 65%)',
        }}
      />

      {/* The page is intentionally one flow: a single anchored hero card,
          then sections that breathe on the canvas with consistent rhythm.
          No outer borders on Weekly Overview, Daily Challenge, or the
          habits list — they read as flowing content, not stacked cards. */}
      <div className="space-y-9">
        {/* HERO — the only fully-framed card. Anchors identity (orb / league
            / level / streak / XP). */}
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            background:
              'radial-gradient(ellipse 120% 100% at 100% 0%, rgba(249,115,22,0.18), transparent 55%),' +
              'radial-gradient(ellipse 100% 100% at 0% 100%, rgba(220,38,38,0.12), transparent 60%),' +
              'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
            borderColor: 'rgba(249,115,22,0.22)',
            boxShadow: '0 0 40px -14px rgba(249,115,22,0.4), inset 0 1px 0 rgba(249,115,22,0.1)',
          }}
        >
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-wider leading-none">
                  <span className="text-white">Out</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300">rank</span>
                </h1>
                {/* League + level pill row */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {(() => {
                    const lg = getLeague(user.weeklyXP || 0);
                    return (
                      <Link
                        href="/profile"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border"
                        style={{
                          background: `linear-gradient(135deg, ${lg.color}28, #10101a 80%)`,
                          borderColor: `${lg.color}55`,
                          boxShadow: `0 0 10px -2px ${lg.color}55`,
                        }}
                        title={`${lg.name} league · tap for details`}
                      >
                        <span
                          className="w-2.5 h-3 inline-block"
                          style={{
                            clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                            background: lg.color,
                          }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: lg.color }}>
                          {lg.name}
                        </span>
                      </Link>
                    );
                  })()}
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-orange-400 border border-orange-500/35 bg-orange-500/10 px-2 py-0.5 rounded-lg">
                    Lv. {level.level} · {level.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StreakFire streak={Math.max(...habits.map(h => h.currentStreak), 0)} size={50} />
                <Link href="/profile">
                  <SoulOrb intensity={Math.min(Math.round(
                    Math.min(user.totalXP / 500, 40) + Math.min(habits.reduce((s, h) => s + h.currentStreak, 0) / 10, 30) +
                    Math.min(habits.reduce((s, h) => s + h.totalLogs, 0) / 20, 20) + Math.min(level.level / 10, 10)
                  ), 100)} tier={MAX_ORB_TIER} size={88} hideLabel
                    baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
                    pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
                    ringColorId={(user as unknown as Record<string, string>).orbRingColor}
                  />
                </Link>
              </div>
            </div>

            {/* XP bar — inline in the banner so there's no separate pill below */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Progress to Level {level.level + 1}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()} XP
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#0d0d15] rounded-full overflow-hidden border border-[#1e1e30]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
                    boxShadow: '0 0 12px rgba(249,115,22,0.6)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* DAILY CHALLENGE — pinned-quest banner */}
        <DailyChallenge />

        {/* STREAK REPAIR — banner only renders if any habit has an
            active repair offer (broken streak ≥ 3, within 48h window).
            Self-hides after repair or expiry. */}
        <StreakRepairBanner />

        {/* DIET QUICK-LINK — diet tracker is its own first-class feature
            (not a pillar). Surfacing it here on the dashboard so it's
            discoverable on mobile, where MobileNav is too tight to add
            another tab. */}
        <Link
          href="/diet"
          className="block group rounded-2xl border overflow-hidden relative transition-transform active:scale-[0.99]"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 100% 50%, rgba(34,197,94,0.15), transparent 60%),' +
              'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(16,185,129,0.04) 50%, #10101a 100%)',
            borderColor: 'rgba(34,197,94,0.30)',
            boxShadow: '0 0 24px -10px rgba(34,197,94,0.5)',
          }}
        >
          <div className="relative p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                boxShadow: '0 4px 14px -4px rgba(34,197,94,0.7)',
              }}
            >
              <FoodIcon size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-emerald-300 mb-0.5">
                New
              </p>
              <p className="font-heading font-bold text-white text-base leading-tight">
                Track your diet
              </p>
              <p className="text-[12px] text-slate-300/80 mt-0.5 leading-relaxed">
                Type what you ate · AI counts the calories.
              </p>
            </div>
            <span className="text-emerald-300 text-2xl font-bold group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </div>
        </Link>

        {/* TODAY'S PILLARS — fixed five-row list. Each pillar is either
            an active HabitCard (logs flow into the published recap) or a
            placeholder row inviting setup. Always five rows, always in
            canonical order. */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
                Today&rsquo;s Pillars
              </p>
              {!habitsLoading && (
                <span className="text-[10px] font-mono text-slate-500 ml-1">
                  · {pillarsLoggedToday}/{PILLARS.length}
                </span>
              )}
            </div>
            <Link href="/habits">
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          </div>

          {habitsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
              {PILLARS.map((pillar) => {
                const habit = pillarHabitsBySlug.get(pillar.slug);
                if (!habit) {
                  return <PillarPlaceholderRow key={pillar.slug} pillar={pillar} />;
                }
                const isLoggedToday = habit.lastLogDate
                  ? new Date(habit.lastLogDate.toDate()).toDateString() === todayStr
                  : false;
                // Pillar-specific row variants. Water needs near-zero
                // friction logging (you sip throughout the day) so it
                // gets inline +0.25/+0.5/+1 chips instead of a modal.
                // Gym is a full training experience — tap routes into
                // the /gym surface (program picker / today's workout).
                if (pillar.slug === 'water') {
                  return (
                    <WaterPillarRow
                      key={pillar.slug}
                      habit={habit}
                      isLoggedToday={isLoggedToday}
                    />
                  );
                }
                if (pillar.slug === 'gym') {
                  return (
                    <GymPillarRow
                      key={pillar.slug}
                      habit={habit}
                      isLoggedToday={isLoggedToday}
                    />
                  );
                }
                return (
                  <HabitCard
                    key={pillar.slug}
                    habit={habit}
                    isLoggedToday={isLoggedToday}
                    onLog={() => openLogModal(habit)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* PERSONAL HABITS — non-pillar customs. Logs are private (don't
            appear on a friend's recap). Section is hidden if the user
            has no customs. */}
        {!habitsLoading && personalHabits.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#64748b', boxShadow: '0 0 6px #64748b' }}
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                  Personal Habits
                </p>
                <span className="text-[10px] font-mono text-slate-600 ml-1">
                  · private — won&rsquo;t appear in your record
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
              {personalHabits.map((habit) => {
                const isLoggedToday = habit.lastLogDate
                  ? new Date(habit.lastLogDate.toDate()).toDateString() === todayStr
                  : false;
                return (
                  <HabitCard
                    key={habit.categorySlug}
                    habit={habit}
                    isLoggedToday={isLoggedToday}
                    onLog={() => openLogModal(habit)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* TODAY'S RECORD — closing CTA. After logging, this is where the
            user submits their day. Replaces the per-log feed spam with
            one curated recap fan-out. */}
        <RecapDraftPanel />
      </div>

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={logModal}
        onClose={() => setLogModal(false)}
        habit={selectedHabit}
        userId={user.uid}
      />
    </div>
  );
}
