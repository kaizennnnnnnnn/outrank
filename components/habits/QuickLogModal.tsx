'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProofUploader } from './ProofUploader';
import { UserHabit } from '@/types/habit';
import { uploadProofImage } from '@/lib/storage';
import { logHabit } from '@/lib/logHabit';
import { validateLogValue, sanitizeNote } from '@/lib/security';
import { getGoalConfig } from '@/constants/categories';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: UserHabit | null;
  userId: string;
}

export function QuickLogModal({ isOpen, onClose, habit, userId }: QuickLogModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { user } = useAuth();
  const [value, setValue] = useState(1);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [logging, setLogging] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const config = habit ? getGoalConfig(habit.categorySlug) : null;

  const resetForm = () => {
    setValue(habit?.goal || 1);
    setNote('');
    setProofFile(null);
    setShowXP(false);
    setEarnedXP(0);
  };

  const handleLog = async () => {
    if (!habit || !user) return;
    if (!validateLogValue(value)) {
      addToast({ type: 'error', message: 'Invalid value' });
      return;
    }

    setLogging(true);
    try {
      let proofUrl = '';
      const tempLogId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      if (proofFile) {
        proofUrl = await uploadProofImage(userId, tempLogId, proofFile);
      }

      // Use the full logHabit function that handles XP, streaks, leaderboards
      const result = await logHabit({
        userId,
        habitSlug: habit.categorySlug,
        categoryId: habit.categoryId,
        value,
        note: sanitizeNote(note),
        proofImageUrl: proofUrl,
        username: user.username,
        avatarUrl: user.avatarUrl || '',
      });

      setEarnedXP(result.xpEarned);
      setShowXP(true);
      setTimeout(() => {
        setShowXP(false);
        onClose();
        resetForm();
        const streakMsg = result.newStreak > 1 ? ` | ${result.newStreak}d streak!` : '';
        addToast({ type: 'success', message: `${habit.categoryIcon} Logged! +${result.xpEarned} XP${streakMsg}` });
      }, 1200);
    } catch (err) {
      console.error('Log failed:', err);
      addToast({ type: 'error', message: 'Failed to log. Try again.' });
    } finally {
      setLogging(false);
    }
  };

  // Set initial value only when a different habit is opened
  const [lastHabitSlug, setLastHabitSlug] = useState('');
  if (habit && habit.categorySlug !== lastHabitSlug) {
    setLastHabitSlug(habit.categorySlug);
    setValue(habit.goal);
  }

  const xpAmount = earnedXP || Math.max(1, Math.round(
    (Math.min(value / (habit?.goal || 1), 1)) * (proofFile ? 15 : 10)
  ));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log ${habit?.categoryName || ''}`}>
      {habit && config && (
        <div className="space-y-5 relative">
          {/* XP Animation Overlay */}
          <AnimatePresence>
            {showXP && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5, y: -50 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    className="flex justify-center mb-2"
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-heading text-2xl font-bold text-orange-400"
                  >
                    +{xpAmount} XP
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Icon */}
          <div className="flex items-center justify-center">
            <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="lg" slug={habit.categorySlug} />
          </div>

          {/* Value Stepper */}
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setValue(Math.max(config.min, value - config.step))}
              className="w-14 h-14 rounded-2xl bg-[#18182a] border border-[#2d2d45] text-white text-2xl flex items-center justify-center hover:bg-[#1e1e30] transition-colors"
            >
              -
            </motion.button>
            <div className="text-center min-w-[80px]">
              <span className="font-mono text-5xl font-bold text-white">{value.toLocaleString()}</span>
              <p className="text-xs text-slate-500 mt-1">{config.dailyLabel}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setValue(Math.min(config.max, value + config.step))}
              className="w-14 h-14 rounded-2xl bg-[#18182a] border border-[#2d2d45] text-white text-2xl flex items-center justify-center hover:bg-[#1e1e30] transition-colors"
            >
              +
            </motion.button>
          </div>

          {/* Goal progress indicator */}
          {habit.goal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Goal: {habit.goal} {config.dailyLabel}</span>
                {value >= habit.goal ? (
                  <span className="text-emerald-400 font-medium">Goal met — Full XP (+{proofFile ? 15 : 10})</span>
                ) : (
                  <span className="text-orange-400">
                    {Math.round((value / habit.goal) * 100)}% of goal — {Math.max(1, Math.round((value / habit.goal) * (proofFile ? 15 : 10)))} XP
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-[#18182a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((value / habit.goal) * 100, 100)}%`,
                    background: value >= habit.goal
                      ? 'linear-gradient(to right, #10b981, #34d399)'
                      : 'linear-gradient(to right, #f97316, #fb923c)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Proof Upload — PROMINENT */}
          <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c16] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📸</span>
                <span className="text-xs font-medium text-white">Add proof photo</span>
              </div>
              {proofFile ? (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  ✓ Verified (+5 bonus XP)
                </span>
              ) : (
                <span className="text-xs text-slate-600">+5 bonus XP</span>
              )}
            </div>
            <ProofUploader file={proofFile} onFileChange={setProofFile} />
          </div>

          {/* Note */}
          <Input
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
          />

          {/* Submit */}
          <Button
            className="w-full text-lg py-3"
            onClick={handleLog}
            loading={logging}
            disabled={showXP}
          >
            {proofFile ? `Log +${xpAmount} XP ✓ Verified` : `Log +${xpAmount} XP`}
          </Button>

          {!proofFile && (
            <p className="text-center text-[10px] text-slate-600">
              Logs without proof show ⚠️ on leaderboards
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
