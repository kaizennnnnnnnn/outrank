'use client';

import { useState } from 'react';
import { UserProfile } from '@/types/user';
import { updateDocument } from '@/lib/firestore';
import { increment } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { LEVEL_CAP, PRESTIGE_XP_BONUS } from '@/constants/seasons';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';

interface Props { user: UserProfile; }

export function PrestigeCard({ user }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [burst, setBurst] = useState(0);
  const [prestiging, setPrestiging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const userRaw = user as unknown as Record<string, unknown>;
  const prestige = (userRaw.prestige as number) || 0;
  const atCap = (user.level || 1) >= LEVEL_CAP;

  // Still show a permanent banner for prestiged users even when below cap
  if (!atCap && prestige === 0) return null;

  const bonusPercent = (prestige * PRESTIGE_XP_BONUS * 100).toFixed(0);

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
      setConfirming(false);
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
            <div>
              {confirming ? (
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={doPrestige} loading={prestiging}>
                    Confirm
                  </Button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    cancel
                  </button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
                  Ascend
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
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
