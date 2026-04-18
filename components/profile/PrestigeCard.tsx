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

  // Still show a permanent banner for prestiged users even when below cap
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
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(236,72,153,0.18) 0%, #10101a 50%, #0b0b14 100%)',
          border: '1px solid rgba(236,72,153,0.4)',
          boxShadow: '0 0 22px -8px rgba(236,72,153,0.5)',
        }}
      >
        <div className="relative flex items-center gap-3">
          <PrestigeCrest count={prestige} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">
              Prestige {prestige > 0 && `· ${prestige}`}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {atCap ? 'Level cap reached' : `+${bonusPercent}% XP forever`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {atCap
                ? 'Reset to level 1 and earn a permanent +1% XP multiplier.'
                : 'Thanks to your past ascensions.'}
            </p>
          </div>
          {atCap && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-[0.15em] text-white transition-transform hover:scale-[1.03] active:scale-[0.97] animate-frame-pulse"
              style={{
                background: 'linear-gradient(90deg, #db2777 0%, #e11d48 40%, #ea580c 100%)',
                boxShadow: '0 0 22px -6px rgba(236,72,153,0.85)',
              }}
            >
              Ascend
            </button>
          )}
        </div>
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

function PrestigeCrest({ count }: { count: number }) {
  return (
    <div className="relative w-14 h-14">
      <svg width={56} height={56} viewBox="0 0 56 56">
        <defs>
          <radialGradient id="prestige-g">
            <stop offset="0" stopColor="#fde047" />
            <stop offset="0.4" stopColor="#ec4899" />
            <stop offset="1" stopColor="#831843" />
          </radialGradient>
        </defs>
        <polygon
          points="28 2 54 20 44 52 12 52 2 20"
          fill="url(#prestige-g)"
          stroke="#f9a8d4"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 0 10px rgba(236,72,153,0.6))' }}
        />
        <text x="28" y="35" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#fff"
          style={{ textShadow: '0 0 6px rgba(0,0,0,0.7)' }}>
          {count || 0}
        </text>
      </svg>
    </div>
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
  const summary: { label: string; detail: string; color: string; keep?: boolean }[] = [
    { label: `+${nextBonus}% XP forever`,        detail: 'Permanent multiplier on every XP gain',  color: '#f472b6' },
    { label: `Prestige ${currentPrestige + 1}`,   detail: 'Rank badge displayed on your profile',   color: '#fde047' },
    { label: 'Level resets to 1',                 detail: 'Climb again, stronger this time',        color: '#fb7185' },
    { label: 'All cosmetics kept',                detail: 'Your orb, frames, titles carry over',    color: '#22d3ee', keep: true },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(236,72,153,0.22), transparent 55%), linear-gradient(180deg, #0f0b18 0%, #07070c 100%)',
              border: '1px solid rgba(236,72,153,0.4)',
              boxShadow: '0 20px 80px -20px rgba(236,72,153,0.55), inset 0 1px 0 rgba(236,72,153,0.2)',
            }}
          >
            <div
              className="h-0.5 w-full"
              style={{ background: 'linear-gradient(90deg, transparent, #ec4899 50%, transparent)' }}
            />

            <div className="p-6 pt-7 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-pink-300/90">
                Prestige Ritual
              </p>
              <h2 className="font-heading text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-fuchsia-200 to-orange-300">
                Reset for a permanent edge?
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[320px] mx-auto">
                You&rsquo;ve hit the level cap. Burn your progress to gain a <b className="text-pink-300">permanent +1% XP multiplier</b> — and start the climb again.
              </p>
            </div>

            {/* Before → After */}
            <div className="mx-6 mb-4 p-4 rounded-2xl bg-[#08080f] border border-[#1e1e30] flex items-center justify-around">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">Current</div>
                <p className="font-heading text-2xl font-bold text-white">+{currentBonus}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">XP bonus</p>
              </div>
              <div className="flex flex-col items-center text-slate-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-pink-400">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-widest text-pink-400 mt-1">Prestige</span>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-pink-300 mb-1">After</div>
                <p className="font-heading text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-fuchsia-200 to-orange-300">+{nextBonus}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">XP bonus</p>
              </div>
            </div>

            <div className="px-6 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">What happens</p>
              <div className="grid grid-cols-2 gap-2">
                {summary.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-2.5 border flex flex-col gap-0.5"
                    style={{
                      background: `linear-gradient(145deg, ${s.color}18, #0b0b14 70%)`,
                      borderColor: `${s.color}40`,
                    }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-4 flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1e1e30] hover:bg-[#2a2a40] text-sm font-medium text-slate-300 transition-colors disabled:opacity-60"
              >
                Not yet
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-[1.5] px-4 py-3 rounded-xl text-sm font-heading font-bold uppercase tracking-[0.15em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait animate-frame-pulse"
                style={{
                  background: 'linear-gradient(90deg, #db2777 0%, #e11d48 40%, #ea580c 100%)',
                  boxShadow: '0 0 30px -8px rgba(236,72,153,0.9)',
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
