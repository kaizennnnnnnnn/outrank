'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { Skeleton } from '@/components/ui/Skeleton';
import { BADGES, getBadgeById } from '@/constants/badges';
import { Badge, EarnedBadge, BadgeRarity, RARITY_COLORS } from '@/types/badge';
import { formatRelativeTime } from '@/lib/utils';
import { Masthead } from '@/components/editorial/Masthead';

const RARITY_ORDER: BadgeRarity[] = ['legendary', 'epic', 'rare', 'common'];
const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const { data: earnedRows, loading } = useCollection<EarnedBadge & { id: string }>(
    `userBadges/${user?.uid}/earned`,
    [],
    !!user?.uid,
  );

  const earnedMap = useMemo(() => {
    const m = new Map<string, EarnedBadge>();
    for (const row of earnedRows) m.set(row.badgeId, row);
    return m;
  }, [earnedRows]);

  const earnedCount = earnedMap.size;
  const totalXPFromBadges = useMemo(() => {
    let total = 0;
    for (const row of earnedRows) {
      const b = getBadgeById(row.badgeId);
      if (b) total += b.xpReward;
    }
    return total;
  }, [earnedRows]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getBadgeById(selectedId) : null;
  const selectedEarnedAt = selectedId ? earnedMap.get(selectedId)?.earnedAt : null;

  const grouped = useMemo(() => {
    const map: Record<BadgeRarity, Badge[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };
    for (const b of BADGES) {
      if (map[b.rarity]) map[b.rarity].push(b);
    }
    return map;
  }, []);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Achievements" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Progression
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Achievements</em>
            </h1>
            <div style={{ textAlign: 'right' }}>
              <div
                className="font-display tabular"
                style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}
              >
                {earnedCount}
                <span style={{ color: 'var(--b-ink-60)', fontSize: 14 }}>/{BADGES.length}</span>
              </div>
              <div
                className="spread"
                style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
              >
                Earned
              </div>
              {totalXPFromBadges > 0 && (
                <div
                  className="font-mono tabular"
                  style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 2 }}
                >
                  +{totalXPFromBadges.toLocaleString()} XP
                </div>
              )}
            </div>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 420, lineHeight: 1.5 }}
          >
            Tap a badge to see how to earn it. Every milestone — first record, 30-day pact, league win — leaves a mark here.
          </p>

          {/* Selected badge detail */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  marginTop: 14,
                  padding: '14px 16px',
                  border: `1px solid ${RARITY_COLORS[selected.rarity]}`,
                  borderLeft: `3px solid ${RARITY_COLORS[selected.rarity]}`,
                  background: `${RARITY_COLORS[selected.rarity]}0a`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <div
                        className="font-display"
                        style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
                      >
                        {selected.name}
                      </div>
                      <span
                        className="spread"
                        style={{
                          fontSize: 8,
                          color: RARITY_COLORS[selected.rarity],
                          padding: '1px 6px',
                          border: `1px solid ${RARITY_COLORS[selected.rarity]}80`,
                        }}
                      >
                        {RARITY_LABEL[selected.rarity]}
                      </span>
                      <span
                        className="font-mono tabular"
                        style={{ fontSize: 10, color: 'var(--b-accent)' }}
                      >
                        +{selected.xpReward} XP
                      </span>
                    </div>
                    <p
                      className="font-body"
                      style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 6, lineHeight: 1.5 }}
                    >
                      {selected.description}
                    </p>
                    {selectedEarnedAt?.toDate ? (
                      <p
                        className="font-mono tabular"
                        style={{ fontSize: 9, color: '#34d399', marginTop: 8, letterSpacing: '0.04em' }}
                      >
                        ✓ Earned {formatRelativeTime(selectedEarnedAt.toDate())}
                      </p>
                    ) : (
                      <p
                        className="font-mono"
                        style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 8, fontStyle: 'italic' }}
                      >
                        Not yet earned
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{
                      width: 24,
                      height: 24,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--b-ink-60)',
                      cursor: 'pointer',
                      fontSize: 16,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                    aria-label="Close detail"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tier sections */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            RARITY_ORDER.map((rarity) => {
              const list = grouped[rarity];
              if (!list.length) return null;
              const earnedInTier = list.filter((b) => earnedMap.has(b.id)).length;
              const color = RARITY_COLORS[rarity];
              return (
                <section key={rarity} style={{ marginTop: 22 }}>
                  <div
                    style={{
                      paddingTop: 12,
                      borderTop: '1px solid var(--b-ink)',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      className="font-display"
                      style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, color }}
                    >
                      {RARITY_LABEL[rarity]}
                    </div>
                    <div
                      className="font-mono tabular"
                      style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
                    >
                      § {earnedInTier} / {list.length}
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {list.map((badge, i) => {
                      const earned = earnedMap.has(badge.id);
                      const isSelected = selectedId === badge.id;
                      return (
                        <li key={badge.id}>
                          <button
                            onClick={() => setSelectedId(isSelected ? null : badge.id)}
                            style={{
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: '32px 1fr auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: '10px 8px',
                              borderBottom: '1px solid var(--b-rule)',
                              borderLeft: earned ? `3px solid ${color}` : '3px solid transparent',
                              background: isSelected ? `${color}08` : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'var(--b-ink)',
                              opacity: earned ? 1 : 0.5,
                            }}
                          >
                            <div
                              className="font-mono tabular"
                              style={{
                                fontSize: 10,
                                color: 'var(--b-ink-40)',
                                textAlign: 'right',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                className="font-display"
                                style={{
                                  fontSize: 13,
                                  fontStyle: 'italic',
                                  fontWeight: 500,
                                  lineHeight: 1.15,
                                  color: earned ? 'var(--b-ink)' : 'var(--b-ink-60)',
                                }}
                              >
                                {badge.name}
                              </div>
                              <div
                                className="font-body"
                                style={{
                                  fontSize: 10,
                                  color: 'var(--b-ink-60)',
                                  marginTop: 1,
                                  lineHeight: 1.35,
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {badge.description}
                              </div>
                            </div>
                            <span
                              className="font-mono tabular"
                              style={{
                                fontSize: 9,
                                color: earned ? 'var(--b-accent)' : 'var(--b-ink-40)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {earned ? '+' : ''}{badge.xpReward} XP
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
