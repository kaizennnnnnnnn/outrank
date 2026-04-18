'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/constants/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { TrophyIconFull } from '@/components/ui/AppIcons';
import { getCollection, orderBy as fbOrderBy, limit as fbLimit } from '@/lib/firestore';
import { QueryConstraint, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { MiniOrb } from '@/components/profile/MiniOrb';
import { UserProfile } from '@/types/user';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type View = 'global' | 'category';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'alltime', label: 'All Time' },
];

const rankColor: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-700',
};

function MedalIcon({ rank, className }: { rank: number; className?: string }) {
  // 1-3 get a medal wreath, others get nothing (number shown instead)
  if (rank > 3) return null;
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="14" r="6" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="14" r="6" />
      <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.12" />
      <path d="M15 2h-2l-1 4-1-4H9" />
    </svg>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [selectedCategory, setSelectedCategory] = useState('gym');

  // Global leaderboard: query users ordered by selected-period XP field
  const [globalEntries, setGlobalEntries] = useState<UserProfile[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  useEffect(() => {
    if (view !== 'global') return;
    setGlobalLoading(true);
    const field =
      period === 'weekly' ? 'weeklyXP' :
      period === 'monthly' ? 'monthlyXP' :
      'totalXP';
    const constraints: QueryConstraint[] = [
      fbOrderBy(field, 'desc'),
      fbLimit(100),
    ];
    // Hide banned + non-leaderboard-visible users where possible (falls back silently)
    getCollection<UserProfile>('users', constraints)
      .then((rows) => {
        const visible = rows.filter((u) => {
          const banned = (u as unknown as Record<string, boolean>).isBanned;
          if (banned) return false;
          const show = (u as unknown as Record<string, Record<string, Record<string, boolean>>>)
            .settings?.privacy?.showOnLeaderboards;
          return show !== false;
        });
        setGlobalEntries(visible);
      })
      .catch((err) => {
        console.error('global leaderboard load failed', err);
        setGlobalEntries([]);
      })
      .finally(() => setGlobalLoading(false));
  }, [view, period]);

  const { entries: catEntries, loading: catLoading } = useLeaderboard(
    view === 'category' ? selectedCategory : '__none__',
    period,
  );

  // Per-category entries are lightweight; pull each user's cosmetics on demand
  // so the row can render the same FramedAvatar + NamePlate + MiniOrb combo.
  interface CosmeticSnap {
    frame?: string; name?: string; tier?: number;
    baseColor?: string; pulseColor?: string; ringColor?: string;
  }
  const [cosmeticsById, setCosmeticsById] = useState<Record<string, CosmeticSnap>>({});
  useEffect(() => {
    if (view !== 'category') return;
    const need = catEntries.filter((e) => !cosmeticsById[e.userId]).map((e) => e.userId);
    if (need.length === 0) return;
    Promise.all(
      need.map((id) => getDoc(doc(db, `users/${id}`)).then((snap) => {
        if (!snap.exists()) return null;
        const d = snap.data() as Record<string, unknown>;
        return {
          id,
          snap: {
            frame: d.equippedFrame as string | undefined,
            name:  d.equippedNameEffect as string | undefined,
            tier: (d.orbTier as number) || 1,
            baseColor:  d.orbBaseColor as string | undefined,
            pulseColor: d.orbPulseColor as string | undefined,
            ringColor:  d.orbRingColor as string | undefined,
          } as CosmeticSnap,
        };
      })),
    ).then((rows) => {
      const next: Record<string, CosmeticSnap> = {};
      for (const r of rows) { if (r) next[r.id] = r.snap; }
      if (Object.keys(next).length) setCosmeticsById((prev) => ({ ...prev, ...next }));
    });
  }, [view, catEntries, cosmeticsById]);

  const activeField = period === 'weekly' ? 'weeklyXP' : period === 'monthly' ? 'monthlyXP' : 'totalXP';

  const topCategories = useMemo(() => CATEGORIES.slice(0, 30), []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Leaderboard</h1>
        <p className="text-sm text-slate-500">See who's outranking everyone this {period === 'alltime' ? 'era' : period.replace('ly', '')}.</p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('global')}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            view === 'global'
              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_6px_20px_-10px_rgba(239,68,68,0.8)]'
              : 'bg-[#10101a] border border-[#1e1e30] text-slate-400 hover:text-white'
          )}
        >
          Global
        </button>
        <button
          onClick={() => setView('category')}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
            view === 'category'
              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_6px_20px_-10px_rgba(239,68,68,0.8)]'
              : 'bg-[#10101a] border border-[#1e1e30] text-slate-400 hover:text-white'
          )}
        >
          Per Habit
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-[#10101a] rounded-xl p-1 border border-[#1e1e30] w-fit">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-all',
              period === p.value ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Category picker — only when in per-habit mode */}
      {view === 'category' && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {topCategories.map((cat) => {
            const selected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border whitespace-nowrap text-xs transition-all shrink-0',
                  selected
                    ? 'text-white'
                    : 'border-[#1e1e30] text-slate-500 hover:text-white hover:border-[#2d2d45]'
                )}
                style={selected ? {
                  borderColor: `${cat.color}80`,
                  background: `${cat.color}15`,
                } : undefined}
              >
                <CategoryIcon slug={cat.slug} icon={cat.icon} color={cat.color} size="sm" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {view === 'global' ? (
          globalLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : globalEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[#1e1e30]">
              {globalEntries.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.uid === user?.uid;
                const score = (entry as unknown as Record<string, number>)[activeField] || 0;
                const u = entry as unknown as Record<string, unknown>;
                return (
                  <Row
                    key={entry.uid}
                    index={i}
                    rank={rank}
                    isMe={isMe}
                    username={entry.username}
                    avatarUrl={entry.avatarUrl}
                    score={score}
                    frameId={u.equippedFrame as string | undefined}
                    nameEffectId={u.equippedNameEffect as string | undefined}
                    orbTier={(u.orbTier as number) || 1}
                    orbBaseColor={u.orbBaseColor as string | undefined}
                    orbPulseColor={u.orbPulseColor as string | undefined}
                    orbRingColor={u.orbRingColor as string | undefined}
                  />
                );
              })}
            </div>
          )
        ) : (
          catLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : catEntries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[#1e1e30]">
              {catEntries.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.userId === user?.uid;
                const c = cosmeticsById[entry.userId] || {};
                return (
                  <Row
                    key={entry.userId}
                    index={i}
                    rank={rank}
                    isMe={isMe}
                    username={entry.username}
                    avatarUrl={entry.avatarUrl}
                    score={entry.score}
                    delta={entry.delta}
                    frameId={c.frame}
                    nameEffectId={c.name}
                    orbTier={c.tier}
                    orbBaseColor={c.baseColor}
                    orbPulseColor={c.pulseColor}
                    orbRingColor={c.ringColor}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Row({
  index, rank, isMe, username, avatarUrl, score, delta,
  frameId, nameEffectId, orbTier, orbBaseColor, orbPulseColor, orbRingColor,
}: {
  index: number; rank: number; isMe: boolean; username: string; avatarUrl: string; score: number; delta?: number;
  frameId?: string; nameEffectId?: string;
  orbTier?: number; orbBaseColor?: string; orbPulseColor?: string; orbRingColor?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      className={cn('flex items-center gap-3 px-4 py-3', isMe && 'bg-red-500/5')}
    >
      <div className={cn('w-10 flex items-center justify-center gap-0.5', rankColor[rank] || 'text-slate-600')}>
        {rank <= 3 ? (
          <MedalIcon rank={rank} className={rankColor[rank]} />
        ) : (
          <span className="font-mono text-sm font-bold text-slate-600">#{rank}</span>
        )}
      </div>
      <Link href={`/profile/${username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
        <FramedAvatar src={avatarUrl} alt={username} size="sm" frameId={frameId} />
        <div className="min-w-0 flex items-center gap-1.5">
          <NamePlate
            name={username}
            effectId={nameEffectId}
            size="sm"
            className={cn('truncate', isMe && !nameEffectId && 'text-orange-400')}
          />
          {isMe && <span className="text-xs text-orange-500">(you)</span>}
          {orbTier !== undefined && (
            <MiniOrb
              tier={orbTier}
              baseColorId={orbBaseColor}
              pulseColorId={orbPulseColor}
              ringColorId={orbRingColor}
              size={18}
            />
          )}
        </div>
      </Link>
      <div className="text-right">
        <p className="font-mono text-sm font-bold text-white">{score.toLocaleString()}</p>
        {typeof delta === 'number' && delta !== 0 && (
          <p className={cn('text-[10px] font-mono', delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
            {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center">
      <div className="mb-3"><TrophyIconFull size={40} className="text-yellow-400 mx-auto" /></div>
      <p className="text-slate-500">No entries yet. Be the first!</p>
    </div>
  );
}
