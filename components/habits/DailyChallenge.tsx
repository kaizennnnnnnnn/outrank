'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/constants/categories';
import { useAuth } from '@/hooks/useAuth';
import { createDocument, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

const DAILY_CHALLENGES = [
  { category: 'gym', value: 1, text: 'Hit the gym today', bonus: 25 },
  { category: 'running', value: 3, text: 'Run at least 3km', bonus: 25 },
  { category: 'meditation', value: 15, text: 'Meditate for 15 minutes', bonus: 25 },
  { category: 'water', value: 3, text: 'Drink at least 3 liters of water', bonus: 25 },
  { category: 'books', value: 1, text: 'Read for 30 minutes', bonus: 25 },
  { category: 'cold-shower', value: 1, text: 'Take a cold shower', bonus: 25 },
  { category: 'journaling', value: 1, text: 'Write a journal entry', bonus: 25 },
  { category: 'coding', value: 3, text: 'Solve 3 coding problems', bonus: 25 },
  { category: 'deep-work', value: 2, text: 'Do 2 hours of deep work', bonus: 25 },
  { category: 'gratitude', value: 1, text: 'Write 3 things you are grateful for', bonus: 25 },
  { category: 'yoga', value: 20, text: 'Do 20 minutes of yoga', bonus: 25 },
  { category: 'early-wake', value: 1, text: 'Wake up before 6 AM', bonus: 25 },
  { category: 'no-social', value: 1, text: 'Stay off social media today', bonus: 25 },
  { category: 'stretch', value: 15, text: 'Stretch for 15 minutes', bonus: 25 },
];

function getTodaysChallenge() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

export function DailyChallenge() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [completing, setCompleting] = useState(false);
  const challenge = getTodaysChallenge();
  const cat = CATEGORIES.find((c) => c.slug === challenge.category);

  const handleComplete = async () => {
    if (!user || !cat) return;
    setCompleting(true);
    try {
      await createDocument(`logs/${user.uid}/habitLogs`, {
        habitId: challenge.category,
        categoryId: challenge.category,
        categorySlug: challenge.category,
        value: challenge.value,
        note: `Daily challenge: ${challenge.text}`,
        proofImageUrl: '',
        loggedAt: Timestamp.now(),
        xpEarned: challenge.bonus,
      });
      addToast({ type: 'success', message: `Daily challenge complete! +${challenge.bonus} XP ⚡` });
    } catch {
      addToast({ type: 'error', message: 'Failed to complete challenge' });
    } finally {
      setCompleting(false);
    }
  };

  if (!cat) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-600/5 to-[#10101a] p-4"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Daily Challenge</span>
        <span className="text-xs text-slate-600">&bull; +{challenge.bonus} bonus XP</span>
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
