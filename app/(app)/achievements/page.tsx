'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { Skeleton } from '@/components/ui/Skeleton';
import { BADGES, getBadgeById } from '@/constants/badges';
import { Badge, EarnedBadge, BadgeRarity, RARITY_COLORS } from '@/types/badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

const RARITY_ORDER: BadgeRarity[] = ['legendary', 'epic', 'rare', 'common'];
const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/**
 * Achievement gallery — every badge in the catalog grouped by rarity,
 * with earned vs locked clearly distinguished. Tap a badge to surface
 * its detail (description + condition + earned-date if applicable) at
 * the top of the grid.
 *
 * The catalog grew significantly with the recap / pact / league /
 * verifier / streak badges — this dedicated page makes browsing what's
 * possible feel less like an afterthought on the profile and more
 * like the progression layer it's meant to be.
 */
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(245,158,11,0.18), transparent 55%),' +
            'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(168,85,247,0.10), transparent 60%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(245,158,11,0.22)',
          boxShadow: '0 0 30px -14px rgba(245,158,11,0.4), inset 0 1px 0 rgba(245,158,11,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Progression
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1 leading-none">
              Achievements
            </h1>
            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-md">
              Tap a badge to see how to earn it. Every milestone — first record,
              30-day pact, league win — leaves a mark here.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-3xl font-bold text-white leading-none">
              {earnedCount}
              <span className="text-slate-500 text-base ml-1.5">/{BADGES.length}</span>
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">
              earned
            </p>
            {totalXPFromBadges > 0 && (
              <p className="text-[10px] font-mono text-amber-300 mt-1">
                +{totalXPFromBadges.toLocaleString()} XP
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Selected badge detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border p-4"
            style={{
              background: `linear-gradient(135deg, ${RARITY_COLORS[selected.rarity]}14 0%, rgba(11,11,20,0.7) 70%)`,
              borderColor: `${RARITY_COLORS[selected.rarity]}55`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `${RARITY_COLORS[selected.rarity]}18`,
                  border: `1px solid ${RARITY_COLORS[selected.rarity]}55`,
                  boxShadow: earnedMap.has(selected.id)
                    ? `0 0 20px -4px ${RARITY_COLORS[selected.rarity]}99`
                    : undefined,
                  opacity: earnedMap.has(selected.id) ? 1 : 0.55,
                  filter: earnedMap.has(selected.id) ? undefined : 'grayscale(0.6)',
                }}
              >
                <span className="text-3xl">{selected.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-lg font-bold text-white">{selected.name}</p>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{
                      color: RARITY_COLORS[selected.rarity],
                      background: `${RARITY_COLORS[selected.rarity]}18`,
                      border: `1px solid ${RARITY_COLORS[selected.rarity]}55`,
                    }}
                  >
                    {RARITY_LABEL[selected.rarity]}
                  </span>
                  <span className="text-[10px] font-mono text-amber-300">
                    +{selected.xpReward} XP
                  </span>
                </div>
                <p className="text-[13px] text-slate-300 mt-1.5 leading-relaxed">
                  {selected.description}
                </p>
                {selectedEarnedAt?.toDate ? (
                  <p className="text-[10px] font-mono text-emerald-300 mt-2">
                    ✓ Earned {formatRelativeTime(selectedEarnedAt.toDate())}
                  </p>
                ) : (
                  <p className="text-[10px] font-mono text-slate-500 mt-2">
                    Not yet earned
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate-500 hover:text-white text-lg w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                aria-label="Close detail"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped grids */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        RARITY_ORDER.map((rarity) => {
          const list = grouped[rarity];
          if (!list.length) return null;
          const earnedInTier = list.filter((b) => earnedMap.has(b.id)).length;
          const color = RARITY_COLORS[rarity];
          return (
            <section key={rarity}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color }}>
                  {RARITY_LABEL[rarity]}
                </p>
                <span className="text-[10px] font-mono text-slate-500 ml-1">
                  · {earnedInTier}/{list.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {list.map((badge) => {
                  const earned = earnedMap.has(badge.id);
                  const isSelected = selectedId === badge.id;
                  return (
                    <motion.button
                      key={badge.id}
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ y: -1 }}
                      onClick={() => setSelectedId(isSelected ? null : badge.id)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl p-3 border transition-all',
                        earned ? '' : 'opacity-45',
                      )}
                      style={{
                        background: earned
                          ? `linear-gradient(135deg, ${color}10 0%, rgba(11,11,20,0.7) 70%)`
                          : 'rgba(255,255,255,0.02)',
                        borderColor: isSelected
                          ? color
                          : earned
                            ? `${color}55`
                            : 'rgba(255,255,255,0.04)',
                        boxShadow: isSelected
                          ? `0 0 12px ${color}88`
                          : earned && rarity === 'legendary'
                            ? `0 0 10px ${color}33`
                            : undefined,
                        filter: earned ? undefined : 'grayscale(0.5)',
                      }}
                      title={badge.name}
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <span className="text-[9px] text-center text-slate-300 mt-1.5 leading-tight line-clamp-2">
                        {badge.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
