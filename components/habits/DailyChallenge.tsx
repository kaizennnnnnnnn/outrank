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
  if (completed) return null;

  return (
    // Pinned-quest banner: lives between sections without claiming card status.
    // Visual signal is the colored left edge bar + a faint horizontal tint —
    // no rounded frame, no border, no glow. Sits on the page like a Linear
    // inbox item, distinct because of color not because of enclosure.
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
          Daily Challenge
        </p>
      </div>

      <div
        className="relative flex items-center gap-3 py-2.5 pl-4 pr-2"
        style={{
          background: `linear-gradient(90deg, ${cat.color}14 0%, transparent 70%)`,
          borderLeft: `2px solid ${cat.color}`,
        }}
      >
        <CategoryIcon slug={cat.slug} name={cat.name} icon={cat.icon} color={cat.color} size="md" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight truncate">{challenge.text}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
            <span>{cat.name}</span>
            <span className="text-slate-700">·</span>
            <span>{challenge.value} {cat.unit}</span>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-0.5 text-orange-400 font-mono font-bold">
              <svg width={9} height={9} viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              +{challenge.bonusXP} XP
            </span>
          </div>
        </div>

        <Button size="sm" onClick={handleComplete} loading={completing}>
          Complete
        </Button>
      </div>
    </motion.section>
  );
}
