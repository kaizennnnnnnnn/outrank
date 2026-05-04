'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/types/user';
import { updateDocument } from '@/lib/firestore';
import { increment } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { LEVEL_CAP, PRESTIGE_XP_BONUS } from '@/constants/seasons';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';

interface Props { user: UserProfile; }

export function PrestigeCard({ user }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [burst, setBurst] = useState(0);
  const [prestiging, setPrestiging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const userRaw = user as unknown as Record<string, unknown>;
  const prestige = (userRaw.prestige as number) || 0;
  const atCap = (user.level || 1) >= LEVEL_CAP;

  if (!atCap && prestige === 0) return null;

  const bonusPercent = (prestige * PRESTIGE_XP_BONUS * 100).toFixed(0);
  const nextBonusPercent = ((prestige + 1) * PRESTIGE_XP_BONUS * 100).toFixed(0);

  const doPrestige = async () => {
    if (!atCap || prestiging) return;
    setPrestiging(true);
    haptic('success');
    setBurst((n) => n + 1);
    try {
      await updateDocument('users', user.uid, {
        prestige: increment(1),
        totalXP: 0,
        level: 1,
        weeklyXP: 0,
        monthlyXP: 0,
      });
      addToast({ type: 'success', message: 'Prestige! +1% XP forever.' });
    } catch {
      addToast({ type: 'error', message: 'Prestige failed' });
    } finally {
      setPrestiging(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <ParticleBurst trigger={burst} color="#ec4899" count={120} />
      <div
        style={{
          padding: '14px 0',
          borderTop: '2px solid #ec4899',
          borderBottom: '1px solid var(--b-rule)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ec4899',
            flexShrink: 0,
          }}
        >
          <span
            className="font-display tabular"
            style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#ec4899' }}
          >
            {prestige || 0}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="spread"
            style={{ fontSize: 9, color: '#f472b6' }}
          >
            Prestige {prestige > 0 && `· ${prestige}`}
          </div>
          <div
            className="font-display"
            style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, marginTop: 2, lineHeight: 1.1 }}
          >
            {atCap ? 'Level cap reached' : `+${bonusPercent}% XP forever`}
          </div>
          <div
            className="font-body"
            style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4, lineHeight: 1.4 }}
          >
            {atCap
              ? 'Reset to level 1 and earn a permanent +1% XP multiplier.'
              : 'Thanks to your past ascensions.'}
          </div>
        </div>
        {atCap && (
          <button
            onClick={() => setShowConfirm(true)}
            className="font-body"
            style={{
              padding: '8px 14px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--b-paper)',
              background: '#ec4899',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Ascend
          </button>
        )}
      </div>

      <PrestigeConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doPrestige}
        loading={prestiging}
        currentPrestige={prestige}
        currentBonus={bonusPercent}
        nextBonus={nextBonusPercent}
      />
    </>
  );
}

interface PrestigeConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  currentPrestige: number;
  currentBonus: string;
  nextBonus: string;
}

function PrestigeConfirmModal({ isOpen, onClose, onConfirm, loading, currentPrestige, currentBonus, nextBonus }: PrestigeConfirmProps) {
  const summary: { label: string; detail: string }[] = [
    { label: `+${nextBonus}% XP forever`,        detail: 'Permanent multiplier on every XP gain' },
    { label: `Prestige ${currentPrestige + 1}`,   detail: 'Rank badge displayed on your profile' },
    { label: 'Level resets to 1',                 detail: 'Climb again, stronger this time' },
    { label: 'All cosmetics kept',                detail: 'Your orb, frames, titles carry over' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="dir-b"
            style={{
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              maxWidth: 460,
              width: '100%',
              border: '1px solid var(--b-ink)',
              borderTop: '4px solid #ec4899',
            }}
          >
            <div style={{ padding: '24px 24px 12px', textAlign: 'center' }}>
              <div className="spread" style={{ fontSize: 9, color: '#ec4899' }}>
                Prestige Ritual
              </div>
              <h2
                className="font-display"
                style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginTop: 6, lineHeight: 1.1 }}
              >
                Reset for a permanent edge?
              </h2>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 8, lineHeight: 1.5, maxWidth: 320, marginInline: 'auto' }}
              >
                You&rsquo;ve hit the level cap. Burn your progress to gain a <b style={{ color: '#ec4899' }}>permanent +1% XP multiplier</b> — and start the climb again.
              </p>
            </div>

            {/* Before → After */}
            <div
              style={{
                margin: '12px 24px',
                padding: '14px 20px',
                border: '1px solid var(--b-ink)',
                borderTop: '2px solid var(--b-ink)',
                borderBottom: '2px solid var(--b-ink)',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)', marginBottom: 4 }}>Current</div>
                <div
                  className="font-display tabular"
                  style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}
                >
                  +{currentBonus}%
                </div>
                <div
                  className="font-body"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2 }}
                >
                  XP bonus
                </div>
              </div>
              <span
                className="font-mono"
                style={{ fontSize: 18, color: '#ec4899' }}
              >
                →
              </span>
              <div style={{ textAlign: 'center' }}>
                <div className="spread" style={{ fontSize: 8, color: '#ec4899', marginBottom: 4 }}>After</div>
                <div
                  className="font-display tabular"
                  style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, color: '#ec4899' }}
                >
                  +{nextBonus}%
                </div>
                <div
                  className="font-body"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 2 }}
                >
                  XP bonus
                </div>
              </div>
            </div>

            <div style={{ padding: '4px 24px 8px' }}>
              <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
                What happens
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {summary.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: '8px 10px',
                      border: '1px solid var(--b-rule)',
                    }}
                  >
                    <div
                      className="font-display"
                      style={{ fontSize: 12, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.2 }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="font-body"
                      style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, lineHeight: 1.4 }}
                    >
                      {s.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 24px 24px', display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                disabled={loading}
                className="font-body"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--b-ink-60)',
                  border: '1px solid var(--b-ink)',
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                Not yet
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="font-body"
                style={{
                  flex: 1.5,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  background: '#ec4899',
                  color: '#fff',
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Ascending…' : 'Prestige now'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
