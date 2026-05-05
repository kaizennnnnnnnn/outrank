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

/**
 * Pinned-quest banner. Lives between sections without claiming card
 * status — visual signal is the colored left edge bar in the
 * challenge category color, no rounded frame, no glow.
 *
 * Editorial Direction B v2: spread eyebrow in accent ink, italic
 * display headline, hairline rule under the eyebrow.
 */
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
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 10,
          padding: '0 4px',
        }}
      >
        <p
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-accent)' }}
        >
          Daily Challenge
        </p>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 8px 12px 16px',
          background: 'var(--b-paper)',
          borderTop: '1px solid var(--b-rule)',
          borderBottom: '1px solid var(--b-rule)',
          borderLeft: `3px solid ${cat.color}`,
        }}
      >
        <CategoryIcon slug={cat.slug} name={cat.name} icon={cat.icon} color={cat.color} size="md" />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="font-display"
            style={{
              fontSize: 15,
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'var(--b-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {challenge.text}
          </p>
          <div
            className="font-body tabular"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
              fontSize: 11,
              color: 'var(--b-ink-60)',
            }}
          >
            <span>{cat.name}</span>
            <span style={{ color: 'var(--b-ink-40)' }}>·</span>
            <span>{challenge.value} {cat.unit}</span>
            <span style={{ color: 'var(--b-ink-40)' }}>·</span>
            <span
              style={{
                color: 'var(--b-accent)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
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
