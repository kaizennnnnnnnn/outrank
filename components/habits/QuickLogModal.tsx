'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProofUploader } from './ProofUploader';
import { UserHabit } from '@/types/habit';
import { uploadProofImage } from '@/lib/storage';
import { logHabit } from '@/lib/logHabit';
import { validateLogValue, sanitizeNote } from '@/lib/security';
import { getGoalConfig } from '@/constants/categories';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { getRecapDropPoint } from '@/components/recap/RecapLogFlight';
import { SleepTimeEntry } from './SleepTimeEntry';
import { BCheckGlyph, BCameraGlyph, BFlameGlyph } from '@/components/editorial/BGlyphs';

/**
 * Quick log — editorial Direction B v2 conversion. Same flow as
 * before (value stepper / sleep time picker / proof + note / submit
 * → logHabit) but typeset like a periodical's clipping form.
 *
 * No emoji (📸 ✓ ⚠️ replaced with BCameraGlyph / BCheckGlyph /
 * accent text). Reward preview is a hairline-bracketed strip rather
 * than a gradient card. Daily-quest "perfect day" framing preserved
 * with accent color when this log will close out the day.
 *
 * Modal still uses the legacy <Modal> wrapper so transitions /
 * dismiss-on-backdrop / accessibility behavior is unchanged.
 */

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
          ? ' · Perfect day! +1 orb evolution charge'
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
      <ParticleBurst trigger={burst} color="#dc2626" count={60} />
      <AnimatePresence>
        {levelUpAt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onAnimationComplete={() => setTimeout(() => setLevelUpAt(null), 1500)}
            className="fixed inset-0 z-[260] flex items-center justify-center pointer-events-none"
          >
            <div style={{ textAlign: 'center' }}>
              <div className="spread" style={{ fontSize: 11, color: 'var(--b-accent)', marginBottom: 4 }}>
                Level Up
              </div>
              <div
                className="font-display tabular"
                style={{
                  fontSize: 72,
                  fontWeight: 500,
                  fontStyle: 'italic',
                  color: 'var(--b-ink)',
                  textShadow: '0 0 30px var(--b-accent)',
                }}
              >
                {levelUpAt}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isOpen} onClose={onClose} title={habit?.categoryName ? `Log ${habit.categoryName}` : ''}>
        {habit && config && (
          <div className="dir-b" style={{ position: 'relative', color: 'var(--b-ink)' }}>
            {/* XP overlay (mid-flight celebration) */}
            <AnimatePresence>
              {showXP && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5, y: -50 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div className="spread" style={{ fontSize: 10, color: 'var(--b-accent)' }}>
                      Logged
                    </div>
                    <div
                      className="font-display tabular"
                      style={{
                        fontSize: 48,
                        fontWeight: 500,
                        fontStyle: 'italic',
                        color: 'var(--b-ink)',
                        marginTop: 4,
                      }}
                    >
                      +{xpAmount} XP
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header strip */}
            <div
              style={{
                borderTop: '1px solid var(--b-rule)',
                borderBottom: '1px solid var(--b-rule)',
                padding: '8px 0',
                marginBottom: 18,
              }}
            >
              <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                The Clipping
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 22,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: 'var(--b-ink)',
                  marginTop: 2,
                }}
              >
                {habit.categoryName}
              </div>
            </div>

            {/* Value entry */}
            {habit.categorySlug === 'sleep' ? (
              <SleepTimeEntry onChange={setValue} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <button
                  onClick={() => setValue(Math.max(config.min, value - config.step))}
                  className="font-display"
                  style={{
                    width: 48,
                    height: 48,
                    border: '1px solid var(--b-ink)',
                    background: 'transparent',
                    color: 'var(--b-ink)',
                    fontSize: 22,
                    cursor: 'pointer',
                  }}
                >
                  −
                </button>
                <div style={{ textAlign: 'center', minWidth: 96 }}>
                  <div
                    className="font-display tabular"
                    style={{ fontSize: 56, fontWeight: 500, color: 'var(--b-ink)', lineHeight: 1 }}
                  >
                    {value.toLocaleString()}
                  </div>
                  <div
                    className="spread"
                    style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 4 }}
                  >
                    {config.dailyLabel}
                  </div>
                </div>
                <button
                  onClick={() => setValue(Math.min(config.max, value + config.step))}
                  className="font-display"
                  style={{
                    width: 48,
                    height: 48,
                    border: '1px solid var(--b-ink)',
                    background: 'transparent',
                    color: 'var(--b-ink)',
                    fontSize: 22,
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>
              </div>
            )}

            {/* Goal progress */}
            {habit.goal > 0 && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <span style={{ color: 'var(--b-ink-60)' }}>
                    Goal: {habit.goal} {config.dailyLabel}
                  </span>
                  {value >= habit.goal ? (
                    <span style={{ color: 'var(--b-accent)', fontWeight: 600 }}>
                      Goal met · +{proofFile ? 15 : 10} XP
                    </span>
                  ) : (
                    <span style={{ color: 'var(--b-ink-60)' }}>
                      {Math.round((value / habit.goal) * 100)}% ·{' '}
                      {Math.max(1, Math.round((value / habit.goal) * (proofFile ? 15 : 10)))} XP
                    </span>
                  )}
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 2,
                    background: 'var(--b-rule)',
                    marginTop: 6,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min((value / habit.goal) * 100, 100)}%`,
                      background: value >= habit.goal ? 'var(--b-accent)' : 'var(--b-ink)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Proof upload */}
            <div
              style={{
                marginTop: 18,
                padding: '10px 0',
                borderTop: '1px solid var(--b-rule)',
                borderBottom: '1px solid var(--b-rule)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--b-ink)',
                  }}
                >
                  <BCameraGlyph size={14} />
                  <span
                    className="spread"
                    style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                  >
                    Add proof
                  </span>
                </div>
                {proofFile ? (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--b-accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <BCheckGlyph size={11} /> VERIFIED · +5 XP
                  </span>
                ) : (
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
                  >
                    +5 XP
                  </span>
                )}
              </div>
              <ProofUploader file={proofFile} onFileChange={setProofFile} />
            </div>

            {/* Note */}
            <div style={{ marginTop: 12 }}>
              <Input
                placeholder="Add a note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
              />
            </div>

            {/* Reward preview */}
            <div
              style={{
                marginTop: 16,
                padding: '10px 0',
                borderTop: willCompleteAll ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderBottom: '1px solid var(--b-rule)',
              }}
            >
              <div className="spread" style={{ fontSize: 9, color: willCompleteAll ? 'var(--b-accent)' : 'var(--b-ink-60)' }}>
                {willCompleteAll ? 'Daily quest complete' : 'You will receive'}
              </div>
              <div
                className="font-mono tabular"
                style={{ fontSize: 14, color: 'var(--b-ink)', marginTop: 4, fontWeight: 600 }}
              >
                +{xpAmount} XP
                {proofFile && <span style={{ color: 'var(--b-ink-60)', fontWeight: 400, marginLeft: 8 }}>· verified</span>}
                {willCompleteAll && (
                  <span
                    className="font-mono"
                    style={{
                      color: 'var(--b-accent)',
                      fontWeight: 700,
                      marginLeft: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <BFlameGlyph size={12} /> +1 evolution
                  </span>
                )}
              </div>
              {!willCompleteAll && allHabits.length > 0 && !bonusAlreadyClaimedToday && (
                <p
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 4 }}
                >
                  {remainingAfter === 1
                    ? 'One more habit to fill today — unlocks an orb evolution charge.'
                    : `${remainingAfter - 1} habits left to unlock the orb evolution charge.`}
                </p>
              )}
              {bonusAlreadyClaimedToday && (
                <p
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 4 }}
                >
                  Daily quest already claimed — come back tomorrow.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleLog}
              disabled={logging || showXP}
              className="font-body"
              style={{
                width: '100%',
                height: 50,
                marginTop: 16,
                border: '1px solid var(--b-ink)',
                background: logging || showXP ? 'var(--b-paper-2)' : 'var(--b-ink)',
                color: logging || showXP ? 'var(--b-ink-40)' : 'var(--b-paper)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.06em',
                cursor: logging || showXP ? 'not-allowed' : 'pointer',
              }}
            >
              {logging
                ? 'LOGGING…'
                : willCompleteAll
                ? `LOG +${xpAmount} XP · CLAIM DAILY QUEST →`
                : proofFile
                ? `LOG +${xpAmount} XP · VERIFIED →`
                : `LOG +${xpAmount} XP →`}
            </button>

            {!proofFile && (
              <p
                className="font-body"
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  color: 'var(--b-ink-40)',
                  marginTop: 6,
                }}
              >
                Logs without proof show as unverified on leaderboards.
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
