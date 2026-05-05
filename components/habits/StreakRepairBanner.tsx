'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useUIStore } from '@/store/uiStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Button } from '@/components/ui/Button';
import { UserHabit } from '@/types/habit';
import {
  canRepairStreak,
  streakRepairCost,
  repairStreak,
  repairHoursLeft,
} from '@/lib/streakRepair';

/**
 * Dashboard banner offering streak repair on broken pillars/habits.
 *
 * Editorial Direction B v2: paper background, hairline border, ink
 * eyebrow, italic display name. The accent left stripe signals "needs
 * attention" without leaning on red glow.
 */
export function StreakRepairBanner() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const addToast = useUIStore((s) => s.addToast);

  const repairables = habits.filter(canRepairStreak).slice(0, 3);
  const [confirming, setConfirming] = useState<UserHabit | null>(null);
  const [repairing, setRepairing] = useState(false);

  if (!user || repairables.length === 0) return null;

  const handleRepair = async () => {
    if (!confirming || !user) return;
    setRepairing(true);
    try {
      const result = await repairStreak(user.uid, confirming.categorySlug);
      addToast({
        type: 'success',
        message: `${confirming.categoryName} streak restored — ${result.restoredTo}d, −${result.cost} fragments`,
      });
      setConfirming(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Repair failed';
      addToast({ type: 'error', message: msg });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
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
            Streak Repair
          </p>
          <span
            className="font-body tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
          >
            · {repairables.length} broken
          </span>
        </div>
        <AnimatePresence initial={false}>
          <div
            style={{
              border: '1px solid var(--b-rule)',
              borderLeft: '3px solid var(--b-accent)',
              background: 'var(--b-paper)',
              overflow: 'hidden',
            }}
          >
            {repairables.map((habit, idx) => (
              <RepairRow
                key={habit.categorySlug}
                habit={habit}
                isFirst={idx === 0}
                onRepair={() => setConfirming(habit)}
              />
            ))}
          </div>
        </AnimatePresence>
      </motion.section>

      <ConfirmDialog
        isOpen={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={handleRepair}
        title="Repair streak?"
        description={
          confirming
            ? `Restore ${confirming.categoryName} streak from 1 day back to ${(confirming.previousStreak || 0) + 1} days. Costs ${streakRepairCost(confirming.previousStreak || 0)} fragments. The repair window closes ${repairHoursLeft(confirming)}h from now — once it's gone, the streak's gone.`
            : ''
        }
        confirmText="Repair"
        loading={repairing}
      />
    </>
  );
}

function RepairRow({
  habit,
  isFirst,
  onRepair,
}: {
  habit: UserHabit;
  isFirst: boolean;
  onRepair: () => void;
}) {
  const cost = streakRepairCost(habit.previousStreak || 0);
  const hoursLeft = repairHoursLeft(habit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderTop: isFirst ? 'none' : '1px solid var(--b-rule)',
      }}
    >
      <CategoryIcon
        slug={habit.categorySlug}
        name={habit.categoryName}
        icon={habit.categoryIcon}
        color={habit.color}
        size="md"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="font-display"
          style={{
            fontSize: 14,
            fontStyle: 'italic',
            fontWeight: 600,
            color: 'var(--b-ink)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {habit.categoryName}
        </p>
        <p
          className="font-body tabular"
          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
        >
          <span style={{ color: 'var(--b-accent)' }}>Was {habit.previousStreak}d</span>
          <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
          <span style={{ color: habit.color, fontWeight: 600 }}>−{cost} frags</span>
          <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--b-ink-60)' }}>{hoursLeft}h left</span>
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onRepair}>
        Repair
      </Button>
    </motion.div>
  );
}
