'use client';

import { useState } from 'react';
import { UserProfile } from '@/types/user';
import { UserHabit } from '@/types/habit';
import { getUnlockedTitles, TITLES, TITLE_RARITY_COLOR, Title, TitleContext } from '@/constants/titles';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface Props {
  user: UserProfile;
  habits: UserHabit[];
}

export function TitlesVault({ user, habits }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [open, setOpen] = useState(false);

  const userRaw = user as unknown as Record<string, unknown>;
  const ctx: TitleContext = {
    totalXP: user.totalXP || 0,
    level: user.level || 1,
    longestStreak: Math.max(...habits.map((h) => h.longestStreak), 0),
    totalLogs: habits.reduce((s, h) => s + h.totalLogs, 0),
    friendCount: user.friendCount || 0,
    duelWins: (userRaw.duelWins as number) || 0,
    badgeCount: (userRaw.badgeCount as number) || 0,
    morningLogs: (userRaw.morningLogs as number) || 0,
    nightLogs: (userRaw.nightLogs as number) || 0,
    perfectDays: (userRaw.perfectDays as number) || 0,
    orbTier: (userRaw.orbTier as number) || 1,
    prestige: (userRaw.prestige as number) || 0,
  };

  const unlocked = getUnlockedTitles(ctx);
  const equippedId = (userRaw.equippedTitleId as string) || 'rookie';

  const equip = async (t: Title) => {
    try {
      await updateDocument('users', user.uid, { equippedTitleId: t.id, currentTitle: t.name });
      addToast({ type: 'success', message: `Title equipped: ${t.name}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to equip title' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          {unlocked.length} of {TITLES.length} unlocked
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-orange-400 hover:text-orange-300"
        >
          {open ? 'Hide locked' : 'Show locked'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(open ? TITLES : unlocked).map((t) => {
          const isUnlocked = unlocked.some((u) => u.id === t.id);
          const isEquipped = equippedId === t.id;
          const color = TITLE_RARITY_COLOR[t.rarity];
          return (
            <button
              key={t.id}
              onClick={() => isUnlocked && equip(t)}
              disabled={!isUnlocked || isEquipped}
              className={cn(
                'text-left rounded-xl p-2.5 border transition-all',
                !isUnlocked && 'opacity-40 grayscale',
                isEquipped && 'ring-1 ring-orange-500/60'
              )}
              style={{
                background: `linear-gradient(145deg, ${color}14, #0b0b14 70%)`,
                borderColor: isEquipped ? '#f97316aa' : `${color}33`,
              }}
            >
              <p className="text-xs font-bold text-white truncate">{t.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{t.description}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color, background: `${color}1a`, border: `1px solid ${color}55` }}
                >
                  {t.rarity}
                </span>
                {isEquipped && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400">
                    Equipped
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
