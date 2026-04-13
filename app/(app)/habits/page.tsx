'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { CATEGORIES, CATEGORY_SECTIONS, getGoalConfig } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { setDocument, Timestamp, removeDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { TargetFullIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

export default function HabitsPage() {
  const { user } = useAuth();
  const { habits, loading } = useHabits();
  const addToast = useUIStore((s) => s.addToast);
  const [showBrowser, setShowBrowser] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const subscribedSlugs = habits.map((h) => h.categorySlug);

  const addHabit = async (slug: string) => {
    if (!user) return;
    const cat = CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return;

    setAdding(slug);
    try {
      await setDocument(`habits/${user.uid}/userHabits`, slug, {
        categoryId: slug,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categorySlug: cat.slug,
        goal: getGoalConfig(slug).defaultGoal,
        goalPeriod: 'daily',
        isPublic: true,
        currentStreak: 0,
        longestStreak: 0,
        totalLogs: 0,
        lastLogDate: null,
        createdAt: Timestamp.now(),
        color: cat.color,
        unit: cat.unit,
      });
      addToast({ type: 'success', message: `${cat.icon} ${cat.name} added!` });
    } catch {
      addToast({ type: 'error', message: 'Failed to add habit' });
    } finally {
      setAdding(null);
    }
  };

  const removeHabit = async (slug: string) => {
    if (!user) return;
    try {
      await removeDocument(`habits/${user.uid}/userHabits`, slug);
      addToast({ type: 'info', message: 'Habit removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove habit' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">My Habits</h1>
          <p className="text-sm text-slate-500">{habits.length} habits tracked</p>
        </div>
        <Button onClick={() => setShowBrowser(true)}>+ Add Habit</Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-20">
          <div className="flex justify-center"><TargetFullIcon size={48} className="text-cyan-400 mb-4" /></div>
          <h2 className="text-xl font-bold text-white mb-2">No habits yet</h2>
          <p className="text-slate-500 mb-6">Choose from 52 categories to start tracking.</p>
          <Button onClick={() => setShowBrowser(true)}>Browse Categories</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {habits.map((habit) => (
            <motion.div
              key={habit.categorySlug}
              whileHover={{ scale: 1.02 }}
              className="bg-[#10101a] border border-[#1e1e30] rounded-2xl p-4 space-y-3 glow-hover transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="md" slug={habit.categorySlug} />
                  <div>
                    <Link href={`/habits/${habit.categorySlug}`}>
                      <p className="text-sm font-bold text-white hover:text-cyan-400">{habit.categoryName}</p>
                    </Link>
                    <p className="text-xs text-slate-500">
                      Goal: {habit.goal} {habit.unit}/{habit.goalPeriod}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeHabit(habit.categorySlug)}
                  className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-orange-400 animate-flame">🔥</span>
                  <span className="font-mono text-orange-400">{habit.currentStreak}d streak</span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">{habit.totalLogs} total logs</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">Best: {habit.longestStreak}d</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Category Browser Modal */}
      <Modal isOpen={showBrowser} onClose={() => setShowBrowser(false)} title="Browse Categories" size="lg">
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {CATEGORY_SECTIONS.map((section) => (
            <div key={section}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.filter((c) => c.section === section).map((cat) => {
                  const isSubscribed = subscribedSlugs.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => !isSubscribed && addHabit(cat.slug)}
                      disabled={isSubscribed || adding === cat.slug}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                        isSubscribed
                          ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                          : 'border-[#1e1e30] bg-[#10101a] hover:border-blue-500/30 hover:bg-blue-500/5'
                      )}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} size="sm" slug={cat.slug} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{cat.name}</p>
                        <p className="text-[10px] text-slate-600">{cat.unit}</p>
                      </div>
                      {isSubscribed && <span className="text-emerald-400 text-xs">✓</span>}
                      {adding === cat.slug && <span className="text-xs text-slate-500">...</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
