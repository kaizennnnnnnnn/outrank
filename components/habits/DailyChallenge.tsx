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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-600/5 to-[#10101a] p-4"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Daily Challenge</span>
        <span className="text-xs text-slate-600">&bull; +{challenge.bonusXP} bonus XP</span>
      </div>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={cat.icon} color={cat.color} size="md" slug={cat.slug} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{challenge.text}</p>
          <p className="text-xs text-slate-500">{cat.name} &bull; {challenge.value} {cat.unit}</p>
        </div>
        <Button size="sm" onClick={handleComplete} loading={completing}>
          Complete
        </Button>
      </div>
    </motion.div>
  );
}
