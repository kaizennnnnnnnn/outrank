'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/constants/categories';
import { getTodaysChallenge } from '@/constants/progression';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { logHabit } from '@/lib/logHabit';
import { useUIStore } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export function DailyChallenge() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const addToast = useUIStore((s) => s.addToast);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Check if already completed today (localStorage)
  useEffect(() => {
    const key = `dc_${new Date().toDateString()}`;
    if (localStorage.getItem(key) === 'done') {
      setCompleted(true);
    }
  }, []);

  const userHabitSlugs = habits.map((h) => h.categorySlug);
  const challenge = getTodaysChallenge(userHabitSlugs);
  const cat = challenge ? CATEGORIES.find((c) => c.slug === challenge.category) : null;

  const handleComplete = async () => {
    if (!user || !challenge || !cat) return;
    setCompleting(true);
    try {
      const result = await logHabit({
        userId: user.uid,
        habitSlug: challenge.category,
        categoryId: challenge.category,
        value: challenge.value,
        note: `Daily challenge: ${challenge.text}`,
        proofImageUrl: '',
        username: user.username,
        avatarUrl: user.avatarUrl || '',
      });

      // Mark as completed in localStorage
      const key = `dc_${new Date().toDateString()}`;
      localStorage.setItem(key, 'done');
      setCompleted(true);

      addToast({ type: 'success', message: `Daily challenge complete! +${result.xpEarned} XP` });
    } catch {
      addToast({ type: 'error', message: 'Failed to complete challenge' });
    } finally {
      setCompleting(false);
    }
  };

  if (!cat || !challenge) return null;
  if (completed) return null; // Hide after completion

  return (
    // Daily challenge keeps a faint colored hairline (so it reads as
    // its own pinned-quest item) but the heavy border + glow are gone.
    // It already carries category color through its internal layout.
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${cat.color}1a 0%, rgba(249,115,22,0.05) 40%, rgba(16,16,26,0.5) 90%)`,
        borderTop: `1px solid ${cat.color}30`,
        borderBottom: `1px solid ${cat.color}18`,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.12] blur-3xl pointer-events-none"
        style={{ background: cat.color }}
      />

      <div className="relative flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
          />
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.15em]">
            Daily Challenge
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span className="text-[10px] font-mono font-bold text-orange-400">+{challenge.bonusXP} XP</span>
        </span>
      </div>

      <div className="relative flex items-center gap-3">
        <CategoryIcon slug={cat.slug} name={cat.name} icon={cat.icon} color={cat.color} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{challenge.text}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {cat.name} &middot; {challenge.value} {cat.unit}
          </p>
        </div>
        <Button size="sm" onClick={handleComplete} loading={completing}>
          Complete
        </Button>
      </div>
    </motion.div>
  );
}
