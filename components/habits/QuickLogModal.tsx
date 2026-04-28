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
import { useHabits } from '@/hooks/useHabits';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { getRecapDropPoint } from '@/components/recap/RecapLogFlight';
import { SleepTimeEntry } from './SleepTimeEntry';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: UserHabit | null;
  userId: string;
}

export function QuickLogModal({ isOpen, onClose, habit, userId }: QuickLogModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const triggerRecapFlight = useUIStore((s) => s.triggerRecapFlight);
  const { user } = useAuth();
  const { habits: allHabits } = useHabits();
  const [value, setValue] = useState(1);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [logging, setLogging] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [burst, setBurst] = useState(0);
  const [levelUpAt, setLevelUpAt] = useState<number | null>(null);

  const config = habit ? getGoalConfig(habit.categorySlug) : null;

  // Daily-completion preview: will this log earn the all-habits-done bonus?
  // Bonus pays out once per calendar day, when this log fills the last slot
  // and the user hasn't already received today's bonus.
  const todayStr = new Date().toDateString();
  const loggedTodayCount = allHabits.filter((h) => {
    if (h.categorySlug === habit?.categorySlug) return true;
    return h.lastLogDate?.toDate?.()?.toDateString?.() === todayStr;
  }).length;
  const alreadyLoggedToday = habit?.lastLogDate?.toDate?.()?.toDateString?.() === todayStr;
  const lastBonus = (user as unknown as Record<string, { toDate?: () => Date } | undefined>)?.lastDailyBonusDate;
  const bonusAlreadyClaimedToday = lastBonus?.toDate?.()?.toDateString?.() === todayStr;
  const willCompleteAll =
    allHabits.length > 0
    && loggedTodayCount === allHabits.length
    && !alreadyLoggedToday
    && !bonusAlreadyClaimedToday;
  const remainingAfter = allHabits.length - loggedTodayCount;

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
      setBurst((n) => n + 1);
      haptic('success');
      if (result.leveledUp) {
        setLevelUpAt(result.newLevel);
        haptic('double');
      }

      setTimeout(() => {
        setShowXP(false);
        onClose();
        // Fly the logged habit into today's record. Fired as the modal
        // closes so the destination panel is actually visible behind
        // the flight. Source is viewport center; destination is the
        // RecapDraftPanel via [data-recap-drop], or bottom-center as a
        // fallback if the user is logging from a non-dashboard page.
        if (typeof window !== 'undefined') {
          const dest = getRecapDropPoint();
          triggerRecapFlight({
            fromX: window.innerWidth / 2,
            fromY: window.innerHeight / 2,
            toX: dest.x,
            toY: dest.y,
            categoryName: habit.categoryName,
            categoryIcon: habit.categoryIcon,
            categoryColor: habit.color,
            categorySlug: habit.categorySlug,
            value,
            unit: habit.unit || '',
          });
        }
        resetForm();
        const streakMsg = result.newStreak > 1 ? ` · ${result.newStreak}d streak` : '';
        const freezeMsg = result.freezeUsed ? ' · Streak freeze auto-applied' : '';
        const lvlMsg = result.leveledUp ? ` · Leveled up to ${result.newLevel}` : '';
        const bonusMsg = result.dailyBonusEarned
          ? ` · All habits done! +${result.bonusFragments} frags · +1 evolution`
          : '';
        addToast({ type: 'success', message: `Logged · +${result.xpEarned} XP${bonusMsg}${streakMsg}${freezeMsg}${lvlMsg}` });
      }, 1200);
    } catch (err) {
      console.error('Log failed:', err);
      haptic('error');
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
    <>
    <ParticleBurst trigger={burst} color="#f97316" count={60} />
    <AnimatePresence>
      {levelUpAt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onAnimationComplete={() => setTimeout(() => setLevelUpAt(null), 1500)}
          className="fixed inset-0 z-[260] flex items-center justify-center pointer-events-none"
        >
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">Level Up</p>
            <p className="font-heading text-6xl font-bold bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(249,115,22,0.6)]">
              {levelUpAt}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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

          {/* Value entry — sleep gets bed-time / wake-up pickers
              instead of the +/- stepper because that's how people
              actually think about a night of sleep. The computed
              hours feed the standard `value` state so the rest of
              the log flow (XP, leaderboards, recap) is unchanged. */}
          {habit.categorySlug === 'sleep' ? (
            <SleepTimeEntry onChange={setValue} />
          ) : (
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
          )}

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

          {/* Reward preview — always shown, upgrades when this log will cap the day */}
          <div
            className={`rounded-xl border p-3 transition-colors ${
              willCompleteAll
                ? 'border-pink-500/40 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/5 to-orange-500/10'
                : 'border-[#1e1e30] bg-[#0c0c16]'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${willCompleteAll ? 'text-pink-300' : 'text-slate-400'}`}>
              {willCompleteAll ? 'Daily quest complete!' : 'You will receive'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <RewardChip
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
                color="#f97316"
                label={`+${xpAmount} XP`}
                detail={value >= (habit.goal || 1) ? 'Goal met' : `${Math.round((value / (habit.goal || 1)) * 100)}% of goal`}
              />
              {proofFile && (
                <RewardChip
                  icon={<span>✓</span>}
                  color="#10b981"
                  label="Verified"
                  detail="+5 bonus XP applied"
                />
              )}
              {!proofFile && !willCompleteAll && (
                <RewardChip
                  icon={<span>📸</span>}
                  color="#64748b"
                  label="No proof"
                  detail="Add one for +5 XP"
                  dim
                />
              )}
              {willCompleteAll && (
                <>
                  <RewardChip
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>}
                    color="#fbbf24"
                    label="+30 Fragments"
                    detail="All habits complete bonus"
                  />
                  <RewardChip
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" /></svg>}
                    color="#ec4899"
                    label="+1 Evolution"
                    detail="Charge your orb's next rank"
                  />
                  <RewardChip
                    icon={<span>⚡</span>}
                    color="#f472b6"
                    label="+50 Bonus XP"
                    detail="Daily quest reward"
                  />
                </>
              )}
            </div>
            {!willCompleteAll && allHabits.length > 0 && !bonusAlreadyClaimedToday && (
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                {remainingAfter === 1
                  ? 'One more habit after this to unlock evolution + fragments!'
                  : `${remainingAfter - 1} habits left today to unlock evolution + fragments.`}
              </p>
            )}
            {bonusAlreadyClaimedToday && (
              <p className="text-[10px] text-emerald-400 mt-2 text-center">
                Daily quest already claimed — come back tomorrow for another evolution charge.
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full text-lg py-3"
            onClick={handleLog}
            loading={logging}
            disabled={showXP}
          >
            {willCompleteAll
              ? `Log +${xpAmount} XP · Claim daily quest`
              : proofFile ? `Log +${xpAmount} XP ✓ Verified` : `Log +${xpAmount} XP`}
          </Button>

          {!proofFile && (
            <p className="text-center text-[10px] text-slate-600">
              Logs without proof show ⚠️ on leaderboards
            </p>
          )}
        </div>
      )}
    </Modal>
    </>
  );
}

function RewardChip({ icon, color, label, detail, dim }: {
  icon: React.ReactNode;
  color: string;
  label: string;
  detail: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-2 border flex flex-col gap-0.5 ${dim ? 'opacity-60' : ''}`}
      style={{
        background: `linear-gradient(145deg, ${color}18, #0b0b14 80%)`,
        borderColor: `${color}35`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-[9px] text-slate-500 leading-tight">{detail}</p>
    </div>
  );
}
