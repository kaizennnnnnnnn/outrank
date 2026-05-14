'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFriends } from '@/hooks/useFriends';
import { useCompetitions } from '@/hooks/useCompetitions';
import { getDocument } from '@/lib/firestore';
import { UserProfile, DuelRecordEntry } from '@/types/user';
import { Competition } from '@/types/competition';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';

/**
 * Horizontal rail of the viewer's most-active friends, surfaced on the
 * dashboard so friends stop being siloed in `/friends`. Each tile
 * shows the friend's avatar (with equipped frame), name, weekly-XP
 * delta vs the viewer, head-to-head duel record, and a "live duel"
 * indicator if the pair are currently dueling. Tap → friend profile.
 *
 * Costs: useFriends() is already subscribed elsewhere on the page;
 * each friend adds one users/{friendId} read on mount. Capped at 5
 * tiles, sorted by friend.weeklyXP descending (most-competitive surface
 * first). useCompetitions() is also reused if mounted already.
 */

interface FriendCosmetics {
  equippedFrame?: string;
  equippedNameEffect?: string;
}

interface ResolvedFriendTile {
  friendId: string;
  profile: (UserProfile & FriendCosmetics) | null;
}

interface FriendPresenceRailProps {
  viewerId: string;
  viewerWeeklyXP: number;
  /** Viewer's denormalized record vs each friend, from their own user
   *  doc. Used to badge tiles with the head-to-head tally. */
  viewerDuelRecord?: Record<string, DuelRecordEntry>;
}

const MAX_TILES = 5;
const TILE_WIDTH = 124;

export function FriendPresenceRail({ viewerId, viewerWeeklyXP, viewerDuelRecord }: FriendPresenceRailProps) {
  const { friends, loading } = useFriends();
  const { competitions } = useCompetitions();
  const [tiles, setTiles] = useState<ResolvedFriendTile[]>([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (friends.length === 0) { setTiles([]); setResolved(true); return; }
    let cancelled = false;
    (async () => {
      const profiles = await Promise.all(
        friends.map((f) => getDocument<UserProfile & FriendCosmetics>('users', f.id)),
      );
      if (cancelled) return;
      const merged: ResolvedFriendTile[] = friends.map((f, i) => ({ friendId: f.id, profile: profiles[i] }));
      merged.sort((a, b) => (b.profile?.weeklyXP || 0) - (a.profile?.weeklyXP || 0));
      setTiles(merged.slice(0, MAX_TILES));
      setResolved(true);
    })();
    return () => { cancelled = true; };
  }, [friends, loading]);

  const sectionStyle: React.CSSProperties = { marginTop: 18 };
  const headerRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  };

  if (loading || !resolved) {
    return (
      <section style={sectionStyle}>
        <Header />
        <Rail>
          {[0, 1, 2].map((i) => <SkeletonTile key={i} />)}
        </Rail>
      </section>
    );
  }

  if (tiles.length === 0) {
    return (
      <section style={sectionStyle}>
        <Header />
        <Link
          href="/friends"
          className="font-body"
          style={{
            display: 'block',
            padding: '14px 12px',
            border: '1px dashed var(--b-rule)',
            textAlign: 'center',
            color: 'var(--b-ink-60)',
            textDecoration: 'none',
            fontSize: 12,
          }}
        >
          Add friends to compete with — they&rsquo;ll show up here.
        </Link>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={headerRow}>
        <span
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.18em' }}
        >
          Friend Pulse
        </span>
        <Link
          href="/friends"
          className="font-body"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-60)',
            letterSpacing: '0.16em',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          All →
        </Link>
      </div>
      <Rail>
        {tiles.map((t) => (
          <FriendTile
            key={t.friendId}
            tile={t}
            viewerWeeklyXP={viewerWeeklyXP}
            record={viewerDuelRecord?.[t.friendId]}
            activeDuel={competitions.find(
              (c) => c.status === 'active'
                && c.participants.some((p) => p.userId === viewerId)
                && c.participants.some((p) => p.userId === t.friendId),
            ) || null}
          />
        ))}
      </Rail>
    </section>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <span
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.18em' }}
      >
        Friend Pulse
      </span>
    </div>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: 4,
        marginInline: -2,
        paddingInline: 2,
        // Hide scrollbar on WebKit while preserving scrollability — the
        // horizontal nudge is enough affordance for the user to discover
        // there's more, and a visible bar adds visual noise on mobile.
        scrollbarWidth: 'thin',
      }}
    >
      {children}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div
      style={{
        width: TILE_WIDTH,
        flexShrink: 0,
        border: '1px solid var(--b-rule)',
        padding: 10,
        height: 132,
        background: 'var(--b-paper)',
        opacity: 0.6,
      }}
    />
  );
}

function FriendTile({
  tile,
  viewerWeeklyXP,
  record,
  activeDuel,
}: {
  tile: ResolvedFriendTile;
  viewerWeeklyXP: number;
  record?: DuelRecordEntry;
  activeDuel: Competition | null;
}) {
  const profile = tile.profile;
  if (!profile) return null;
  const friendWeekly = profile.weeklyXP || 0;
  const delta = friendWeekly - viewerWeeklyXP;
  const deltaLabel =
    delta > 0 ? `+${delta.toLocaleString()}`
    : delta < 0 ? `${delta.toLocaleString()}`
    : `±0`;
  const deltaColor =
    delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : 'var(--b-ink-60)';

  const totalDuels = record
    ? (record.wins || 0) + (record.losses || 0) + (record.ties || 0)
    : 0;

  return (
    <Link
      href={`/profile/${profile.username}`}
      style={{
        width: TILE_WIDTH,
        flexShrink: 0,
        border: '1px solid var(--b-ink)',
        padding: 10,
        background: 'var(--b-paper)',
        color: 'var(--b-ink)',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
      }}
    >
      {/* Active-duel chip — pinned top-right when present */}
      {activeDuel && (
        <span
          aria-label="Active duel between you"
          title="Active duel"
          style={{
            position: 'absolute',
            top: -1,
            right: -1,
            padding: '2px 4px',
            background: 'var(--b-accent)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 8,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            fontFamily: 'var(--font-inter)',
          }}
        >
          <SwordsCrossIcon size={9} /> LIVE
        </span>
      )}

      <FramedAvatar
        src={profile.avatarUrl}
        alt={profile.username}
        size="md"
        frameId={profile.equippedFrame}
      />
      <span style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <NamePlate
          name={profile.username}
          effectId={profile.equippedNameEffect}
          size="sm"
        />
      </span>

      <div
        className="font-mono tabular"
        style={{ fontSize: 10, color: deltaColor, letterSpacing: '0.04em' }}
      >
        {deltaLabel} <span style={{ color: 'var(--b-ink-40)' }}>wk</span>
      </div>

      {totalDuels > 0 && record && (
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.06em' }}
        >
          <span style={{ color: '#34d399' }}>{record.wins || 0}W</span>
          <span style={{ color: 'var(--b-ink-40)' }}>/</span>
          <span style={{ color: '#f87171' }}>{record.losses || 0}L</span>
          {(record.ties || 0) > 0 && (
            <>
              <span style={{ color: 'var(--b-ink-40)' }}>/</span>
              <span style={{ color: '#fbbf24' }}>{record.ties}T</span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}
