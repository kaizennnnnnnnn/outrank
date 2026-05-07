'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { CATEGORIES } from '@/constants/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { getCollection, orderBy as fbOrderBy, limit as fbLimit } from '@/lib/firestore';
import { QueryConstraint, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { UserProfile } from '@/types/user';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

type View = 'global' | 'friends' | 'category';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'alltime', label: 'All Time' },
];

const views: { value: View; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'friends', label: 'Friends' },
  { value: 'category', label: 'Per Habit' },
];

// Roman numerals for the top three — magazine convention.
const romans = ['I', 'II', 'III'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [view, setView] = useState<View>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [selectedCategory, setSelectedCategory] = useState('gym');

  const [globalEntries, setGlobalEntries] = useState<UserProfile[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  const [friendsEntries, setFriendsEntries] = useState<UserProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

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

  useEffect(() => {
    if (view !== 'friends' || !user?.uid) return;
    setFriendsLoading(true);
    const ids = [user.uid, ...friends.map((f) => f.id)];
    const field =
      period === 'weekly' ? 'weeklyXP' :
      period === 'monthly' ? 'monthlyXP' :
      'totalXP';
    Promise.all(
      ids.map((id) =>
        getDoc(doc(db, `users/${id}`)).then((snap) => {
          if (!snap.exists()) return null;
          return { uid: id, ...(snap.data() as Record<string, unknown>) } as unknown as UserProfile;
        }),
      ),
    )
      .then((rows) => {
        const visible = rows.filter((r): r is UserProfile => {
          if (!r) return false;
          const banned = (r as unknown as Record<string, boolean>).isBanned;
          return !banned;
        });
        visible.sort((a, b) => {
          const av = (a as unknown as Record<string, number>)[field] || 0;
          const bv = (b as unknown as Record<string, number>)[field] || 0;
          return bv - av;
        });
        setFriendsEntries(visible);
      })
      .catch((err) => {
        console.error('friends leaderboard load failed', err);
        setFriendsEntries([]);
      })
      .finally(() => setFriendsLoading(false));
  }, [view, period, user?.uid, friends]);

  const { entries: catEntries, loading: catLoading } = useLeaderboard(
    view === 'category' ? selectedCategory : '__none__',
    period,
  );

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

  const periodLabel =
    period === 'weekly' ? 'this week' :
    period === 'monthly' ? 'this month' :
    'of all time';

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Standings" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Standings
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Leaderboard</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 360, lineHeight: 1.5 }}
          >
            Who&rsquo;s outranking everyone {periodLabel}.
          </p>

          {/* View toggle — hairline tab grid */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            {views.map((v, i) => {
              const active = view === v.value;
              return (
                <button
                  key={v.value}
                  onClick={() => setView(v.value)}
                  className="font-body"
                  style={{
                    padding: '12px 0',
                    background: 'transparent',
                    border: 'none',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--b-rule)',
                    borderBottom: active ? '2px solid var(--b-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Period toggle — outlined chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {periods.map((p) => {
              const active = period === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className="font-body"
                  style={{
                    padding: '5px 10px',
                    background: active ? 'var(--b-ink)' : 'transparent',
                    color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                    border: '1px solid var(--b-ink)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Category picker — only when in per-habit mode */}
          {view === 'category' && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                paddingBottom: 4,
                marginTop: 12,
                scrollbarWidth: 'none',
              }}
            >
              {topCategories.map((cat) => {
                const selected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className="font-body"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: selected ? `${cat.color}15` : 'transparent',
                      border: selected ? `1px solid ${cat.color}80` : '1px solid var(--b-rule)',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 600,
                      color: selected ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    }}
                  >
                    <CategoryIcon slug={cat.slug} icon={cat.icon} color={cat.color} size="sm" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* The Roll — section header */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div
              className="font-display"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
            >
              The Roll
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {periods.find((p) => p.value === period)?.label.toUpperCase()}
            </div>
          </div>

          {/* Table */}
          <div>
            {view === 'global' ? (
              globalLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : globalEntries.length === 0 ? (
                <EmptyState />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {globalEntries.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.uid === user?.uid;
                    const score = (entry as unknown as Record<string, number>)[activeField] || 0;
                    const u = entry as unknown as Record<string, unknown>;
                    return (
                      <Row
                        key={entry.uid}
                        rank={rank}
                        isMe={isMe}
                        username={entry.username}
                        avatarUrl={entry.avatarUrl}
                        score={score}
                        frameId={u.equippedFrame as string | undefined}
                        nameEffectId={u.equippedNameEffect as string | undefined}
                      />
                    );
                  })}
                </ul>
              )
            ) : view === 'friends' ? (
              friendsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : friendsEntries.length === 0 ? (
                <FriendsEmpty />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {friendsEntries.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.uid === user?.uid;
                    const score = (entry as unknown as Record<string, number>)[activeField] || 0;
                    const u = entry as unknown as Record<string, unknown>;
                    return (
                      <Row
                        key={entry.uid}
                        rank={rank}
                        isMe={isMe}
                        username={entry.username}
                        avatarUrl={entry.avatarUrl}
                        score={score}
                        frameId={u.equippedFrame as string | undefined}
                        nameEffectId={u.equippedNameEffect as string | undefined}
                      />
                    );
                  })}
                </ul>
              )
            ) : (
              catLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : catEntries.length === 0 ? (
                <EmptyState />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {catEntries.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = entry.userId === user?.uid;
                    const c = cosmeticsById[entry.userId] || {};
                    return (
                      <Row
                        key={entry.userId}
                        rank={rank}
                        isMe={isMe}
                        username={entry.username}
                        avatarUrl={entry.avatarUrl}
                        score={entry.score}
                        delta={entry.delta}
                        frameId={c.frame}
                        nameEffectId={c.name}
                      />
                    );
                  })}
                </ul>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  rank, isMe, username, avatarUrl, score, delta,
  frameId, nameEffectId,
}: {
  rank: number; isMe: boolean; username: string; avatarUrl: string; score: number; delta?: number;
  frameId?: string; nameEffectId?: string;
}) {
  const rankLabel = rank <= 3 ? romans[rank - 1] : String(rank);
  const isPodium = rank <= 3;
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '38px 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--b-rule)',
        background: isMe ? 'var(--b-paper-2, transparent)' : 'transparent',
      }}
    >
      <div
        className="font-display tabular"
        style={{
          fontSize: isPodium ? 22 : 14,
          fontStyle: isPodium ? 'italic' : 'normal',
          fontWeight: 500,
          textAlign: 'right',
          color: isPodium ? 'var(--b-ink)' : 'var(--b-ink-40)',
          letterSpacing: isPodium ? 0 : '0.02em',
        }}
      >
        {rankLabel}
      </div>
      <Link
        href={`/profile/${username}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <FramedAvatar src={avatarUrl} alt={username} size="sm" frameId={frameId} />
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <NamePlate
            name={username}
            effectId={nameEffectId}
            size="sm"
            className={isMe && !nameEffectId ? 'truncate' : 'truncate'}
          />
          {isMe && (
            <span
              className="spread"
              style={{ fontSize: 8, color: 'var(--b-accent)' }}
            >
              You
            </span>
          )}
        </div>
      </Link>
      <div style={{ textAlign: 'right' }}>
        <div
          className="font-mono tabular"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {score.toLocaleString()}
        </div>
        {typeof delta === 'number' && delta !== 0 && (
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              color: delta > 0 ? '#34d399' : '#ef4444',
              marginTop: 1,
            }}
          >
            {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
          </div>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p
        className="font-display"
        style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
      >
        No entries yet.
      </p>
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
      >
        Be the first.
      </p>
    </div>
  );
}

function FriendsEmpty() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <p
        className="font-display"
        style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
      >
        Just you here.
      </p>
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto' }}
      >
        Add friends to race them across weekly, monthly, and all-time XP.
      </p>
      <Link
        href="/friends"
        className="font-body"
        style={{
          display: 'inline-block',
          marginTop: 16,
          padding: '8px 14px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--b-paper)',
          background: 'var(--b-ink)',
          textDecoration: 'none',
        }}
      >
        Find friends →
      </Link>
    </div>
  );
}
