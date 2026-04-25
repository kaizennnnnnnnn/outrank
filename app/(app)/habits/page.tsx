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
import { getMaxHabits, getNextSlotUnlock } from '@/constants/progression';
import { getLevelForXP } from '@/constants/levels';
import { setDocument, Timestamp, removeDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { TargetFullIcon, CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { StreakFlame } from '@/components/habits/StreakFlame';
import Link from 'next/link';

export default function HabitsPage() {
  const { user } = useAuth();
  const { habits, loading } = useHabits();
  const addToast = useUIStore((s) => s.addToast);
  const [showBrowser, setShowBrowser] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  // Edit mode toggles the persistent remove buttons on every habit card.
  // Without this, the only way to drop a habit on mobile was the hover X,
  // which is invisible on touch devices.
  const [editMode, setEditMode] = useState(false);

  const subscribedSlugs = habits.map((h) => h.categorySlug);
  const level = user ? getLevelForXP(user.totalXP) : { level: 1 };
  const maxHabits = getMaxHabits(level.level);
  const nextUnlock = getNextSlotUnlock(level.level);
  const slotsUsed = habits.length;
  const slotsFull = slotsUsed >= maxHabits;

  const addHabit = async (slug: string) => {
    if (!user) return;
    if (slotsFull) {
      addToast({ type: 'error', message: `All ${maxHabits} habit slots used. Level up to unlock more!` });
      return;
    }
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
      addToast({ type: 'success', message: `${cat.name} added!` });
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white font-heading">My Habits</h1>
          <p className="text-sm text-slate-500">
            {slotsUsed}/{maxHabits} slots used
            {nextUnlock && (
              <span className="text-orange-400 ml-1">
                &bull; +{nextUnlock.slots - maxHabits} at Lv.{nextUnlock.level}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {habits.length > 0 && (
            <Button
              variant={editMode ? 'primary' : 'secondary'}
              onClick={() => setEditMode((e) => !e)}
            >
              {editMode ? 'Done' : 'Edit'}
            </Button>
          )}
          <Button onClick={() => setShowBrowser(true)} disabled={slotsFull}>
            {slotsFull ? 'Slots Full' : '+ Add'}
          </Button>
        </div>
      </div>
      {editMode && (
        <div
          className="rounded-xl border px-3 py-2 text-[11px] text-orange-200/90"
          style={{
            background: 'linear-gradient(145deg, rgba(249,115,22,0.12), #0b0b14 70%)',
            borderColor: 'rgba(249,115,22,0.35)',
          }}
        >
          Tap × on any habit to remove it. Slots free up instantly — use <b>+ Add</b> to pick a new one.
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-20">
          <div className="flex justify-center"><TargetFullIcon size={48} className="text-orange-400 mb-4" /></div>
          <h2 className="text-xl font-bold text-white mb-2">No habits yet</h2>
          <p className="text-slate-500 mb-6">Choose from 52 categories to start tracking.</p>
          <Button onClick={() => setShowBrowser(true)}>Browse Categories</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {habits.map((habit) => (
            <motion.div
              key={habit.categorySlug}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-2xl p-5 transition-all"
              style={{
                background: `linear-gradient(145deg, ${habit.color}08 0%, #10101a 40%, #0b0b14 100%)`,
                border: `1px solid ${habit.color}22`,
                boxShadow: `0 1px 0 0 ${habit.color}10 inset, 0 8px 24px -12px ${habit.color}18`,
              }}
            >
              {/* Accent glow */}
              <div
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.07] blur-3xl pointer-events-none transition-opacity group-hover:opacity-[0.14]"
                style={{ background: habit.color }}
              />

              {/* Remove button. Edit mode = always visible (mobile can't
                  hover); idle mode = ghost-on-hover so it doesn't clutter
                  the card. Edit-mode treatment uses the same warm
                  red-orange gradient as the rest of the app's primary
                  CTAs and a trash glyph instead of a bare X — fits the
                  fire/phoenix palette and reads as "delete," not as a
                  generic close. The faint warm halo behind it draws the
                  eye without the harsh pulse the previous version used. */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeHabit(habit.categorySlug);
                }}
                className={cn(
                  'absolute top-3 right-3 z-10 rounded-full flex items-center justify-center transition-all overflow-visible',
                  editMode
                    ? 'w-9 h-9 text-white shadow-[0_4px_14px_-2px_rgba(239,68,68,0.55)] hover:shadow-[0_6px_22px_-2px_rgba(249,115,22,0.7)] active:scale-95'
                    : 'w-7 h-7 text-slate-700 hover:text-orange-400 hover:bg-orange-500/10 opacity-0 group-hover:opacity-100',
                )}
                style={editMode ? {
                  background: 'linear-gradient(145deg, #f97316 0%, #dc2626 60%, #7f1d1d 100%)',
                  border: '1px solid rgba(254, 215, 170, 0.4)',
                } : undefined}
                aria-label="Remove habit"
              >
                {editMode && (
                  <span
                    aria-hidden
                    className="absolute -inset-1.5 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(249,115,22,0.45), transparent 70%)',
                      filter: 'blur(4px)',
                      animation: 'frame-pulse 2.4s ease-in-out infinite',
                    }}
                  />
                )}
                {editMode ? (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                ) : (
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                )}
              </button>

              {editMode ? (
                // In edit mode, suppress navigation — tapping a card should
                // not route away while the user is managing the roster.
                <div className="relative flex items-start gap-4 opacity-75">
                  <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="lg" slug={habit.categorySlug} />
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-base font-bold text-white truncate">
                      {habit.categoryName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-400">{habit.goal}</span>
                      <span className="mx-1">{habit.unit}</span>
                      <span className="text-slate-600">/ {habit.goalPeriod}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <Link href={`/habits/${habit.categorySlug}`} className="relative flex items-start gap-4">
                  <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="lg" slug={habit.categorySlug} />
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-base font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                      {habit.categoryName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-400">{habit.goal}</span>
                      <span className="mx-1">{habit.unit}</span>
                      <span className="text-slate-600">/ {habit.goalPeriod}</span>
                    </p>
                  </div>
                </Link>
              )}

              {/* Stats — pill-style badges */}
              <div className="relative flex items-center gap-2 mt-4 flex-wrap">
                {habit.currentStreak > 0 ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <StreakFlame streak={habit.currentStreak} size="sm" />
                  </div>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-[#0b0b14] border border-[#1e1e30] text-[10px] font-mono text-slate-600">
                    No streak
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-[#0b0b14] border border-[#1e1e30] text-[10px] font-mono text-slate-400">
                  <span className="text-slate-500">Logs</span>{' '}
                  <span className="text-white">{habit.totalLogs}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#0b0b14] border border-[#1e1e30] text-[10px] font-mono text-slate-400">
                  <span className="text-slate-500">Best</span>{' '}
                  <span className="text-white">{habit.longestStreak}d</span>
                </span>
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
                          : 'border-[#1e1e30] bg-[#10101a] hover:border-red-500/30 hover:bg-red-500/5'
                      )}
                    >
                      <CategoryIcon icon={cat.icon} color={cat.color} size="sm" slug={cat.slug} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{cat.name}</p>
                        <p className="text-[10px] text-slate-600">{cat.unit}</p>
                      </div>
                      {isSubscribed && <CheckCircleFullIcon size={14} className="text-emerald-400" />}
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
