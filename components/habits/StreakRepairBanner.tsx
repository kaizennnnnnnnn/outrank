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
 * Shows at most three habits with active repair offers — anything
 * more would dominate the dashboard. Each row: icon, name, the
 * broken streak length, the fragment cost, and a Repair button. Tap
 * Repair → ConfirmDialog → fragment spend → currentStreak restored
 * to previousStreak + 1.
 *
 * Banner self-hides when the offer expires (48h window) or after
 * repair, since the underlying habit fields get cleared.
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
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#dc2626', boxShadow: '0 0 6px #dc2626' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
            Streak Repair
          </p>
          <span className="text-[10px] font-mono text-slate-500 ml-1">
            · {repairables.length} broken
          </span>
        </div>
        <AnimatePresence initial={false}>
          <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
            {repairables.map((habit) => (
              <RepairRow
                key={habit.categorySlug}
                habit={habit}
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
  onRepair,
}: {
  habit: UserHabit;
  onRepair: () => void;
}) {
  const cost = streakRepairCost(habit.previousStreak || 0);
  const hoursLeft = repairHoursLeft(habit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <CategoryIcon
        slug={habit.categorySlug}
        name={habit.categoryName}
        icon={habit.categoryIcon}
        color={habit.color}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{habit.categoryName}</p>
        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
          <span className="text-red-300">Was {habit.previousStreak}d</span>
          <span className="text-slate-700 mx-1.5">·</span>
          <span style={{ color: habit.color }} className="font-bold">−{cost} frags</span>
          <span className="text-slate-700 mx-1.5">·</span>
          <span className="text-amber-300">{hoursLeft}h left</span>
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onRepair}>
        Repair
      </Button>
    </motion.div>
  );
}
