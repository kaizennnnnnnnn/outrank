'use client';

import { useState } from 'react';
import { UserProfile } from '@/types/user';
import { UserHabit } from '@/types/habit';
import { getUnlockedTitles, TITLES, TITLE_RARITY_COLOR, Title, TitleContext } from '@/constants/titles';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';

interface Props {
  user: UserProfile;
  habits: UserHabit[];
}

/**
 * Editorial Direction B v2 titles vault. Hairline grid of title tiles;
 * locked tiles dim, equipped tile gets an accent left stripe and the
 * rarity label keeps its color (rarity is a meaningful signal).
 */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p
          className="font-mono"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', letterSpacing: '0.06em' }}
        >
          {unlocked.length} OF {TITLES.length} UNLOCKED
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="spread"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 9,
            color: 'var(--b-accent)',
            fontWeight: 700,
          }}
        >
          {open ? 'Hide locked' : 'Show locked'}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
          gap: 8,
        }}
      >
        {(open ? TITLES : unlocked).map((t) => {
          const isUnlocked = unlocked.some((u) => u.id === t.id);
          const isEquipped = equippedId === t.id;
          const color = TITLE_RARITY_COLOR[t.rarity];
          return (
            <button
              key={t.id}
              onClick={() => isUnlocked && equip(t)}
              disabled={!isUnlocked || isEquipped}
              className="font-body"
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                background: 'transparent',
                border: '1px solid var(--b-rule)',
                borderLeft: isEquipped ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
                cursor: !isUnlocked || isEquipped ? 'default' : 'pointer',
                opacity: !isUnlocked ? 0.45 : 1,
                color: 'var(--b-ink)',
              }}
            >
              <p
                className="font-display"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.name}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-60)',
                  margin: '2px 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span
                  className="spread"
                  style={{
                    fontSize: 8,
                    padding: '1px 5px',
                    border: `1px solid ${color}`,
                    color,
                  }}
                >
                  {t.rarity}
                </span>
                {isEquipped && (
                  <span
                    className="spread"
                    style={{ fontSize: 8, color: 'var(--b-accent)' }}
                  >
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
