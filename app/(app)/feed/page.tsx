'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createDocument } from '@/lib/firestore';
import { FeedItem, ReactionEmoji } from '@/types/feed';
import { useUIStore } from '@/store/uiStore';
import { FeedComments } from '@/components/social/FeedComments';
import { Masthead } from '@/components/editorial/Masthead';
import {
  BHeartGlyph,
  BCommentGlyph,
  BCheerGlyph,
  BTrophyGlyph,
  BFlameGlyph,
  BCheckGlyph,
} from '@/components/editorial/BGlyphs';
import Link from 'next/link';

/**
 * Feed — editorial Direction B v2. "Dispatches" front page: filter
 * tabs at top, "Today" + "Earlier" sections, with a lead-dispatch
 * card at the top of Today (richer treatment) and compact rows for
 * everything else.
 *
 * Reactions live in `/reactions/{originId}` — same shared doc the
 * recap detail view writes to. Five reactions (Hyped / Beast /
 * Respect / Fast / With you) are each represented by an editorial
 * glyph + label (no emoji rendering). Comments expand inline below
 * the lead card; compact rows just show counts.
 */

const REACTIONS: { kind: ReactionEmoji; label: string; Glyph: React.ComponentType<{ size?: number }>; color: string }[] = [
  { kind: '🔥', label: 'Hyped',   Glyph: BFlameGlyph,  color: '#f97316' },
  { kind: '💪', label: 'Beast',   Glyph: BTrophyGlyph, color: '#ef4444' },
  { kind: '👏', label: 'Respect', Glyph: BCheerGlyph,  color: '#fbbf24' },
  { kind: '⚡', label: 'Fast',    Glyph: BCheckGlyph,  color: '#a855f7' },
  { kind: '🤝', label: 'With',    Glyph: BHeartGlyph,  color: '#22d3ee' },
];

interface ActorCosm {
  frame?: string;
  name?: string;
  tier?: number;
  baseColor?: string;
  pulseColor?: string;
  ringColor?: string;
  avatarUrl?: string;
}

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'friends', label: 'Friends' },
  { key: 'mine',    label: 'You' },
] as const;
type Filter = typeof FILTERS[number]['key'];

export default function FeedPage() {
  const { user } = useAuth();
  const { items, loading } = useFeed();
  const addToast = useUIStore((s) => s.addToast);
  const [filter, setFilter] = useState<Filter>('all');
  const [actorCosm, setActorCosm] = useState<Record<string, ActorCosm>>({});
  const [sharedReactions, setSharedReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  // Fetch poster cosmetics once per actor for richer naming/avatar.
  useEffect(() => {
    const need = Array.from(new Set(items.map((i) => i.actorId))).filter((id) => !actorCosm[id]);
    if (need.length === 0) return;
    Promise.all(
      need.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, `users/${id}`));
          if (!snap.exists()) return null;
          const d = snap.data() as Record<string, unknown>;
          return {
            id,
            cosm: {
              frame: d.equippedFrame as string | undefined,
              name:  d.equippedNameEffect as string | undefined,
              tier:  (d.orbTier as number) || 1,
              baseColor:  d.orbBaseColor as string | undefined,
              pulseColor: d.orbPulseColor as string | undefined,
              ringColor:  d.orbRingColor as string | undefined,
              avatarUrl:  d.avatarUrl as string | undefined,
            } as ActorCosm,
          };
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      const next: Record<string, ActorCosm> = {};
      for (const r of rows) { if (r) next[r.id] = r.cosm; }
      if (Object.keys(next).length) setActorCosm((prev) => ({ ...prev, ...next }));
    });
  }, [items, actorCosm]);

  // Pull shared reactions for items with originId — recap items share
  // the /reactions/{originId} doc with the recap detail view, so a
  // friend's confirm/like is reflected on both surfaces.
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, Record<string, string[]>> = {};
      for (const item of items) {
        const originId = (item as unknown as { originId?: string }).originId;
        if (!originId || sharedReactions[originId]) continue;
        try {
          const snap = await getDoc(doc(db, `reactions/${originId}`));
          if (snap.exists()) {
            next[originId] = (snap.data().reactions || {}) as Record<string, string[]>;
          } else {
            next[originId] = {};
          }
        } catch { /* skip */ }
      }
      if (!cancelled && Object.keys(next).length) {
        setSharedReactions((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => { cancelled = true; };
  }, [items, sharedReactions]);

  const handleReact = async (item: FeedItem, kind: ReactionEmoji) => {
    if (!user) return;
    const originId = (item as unknown as { originId?: string }).originId;
    const optimisticKey = originId ?? item.id;
    if (!optimisticKey) return;

    const current = sharedReactions[optimisticKey]?.[kind] ?? [];
    const reacted = current.includes(user.uid);

    // Optimistic local toggle so the tap feels instant.
    setSharedReactions((prev) => {
      const docMap = { ...(prev[optimisticKey] ?? {}) };
      const list = new Set(docMap[kind] ?? []);
      if (reacted) list.delete(user.uid);
      else list.add(user.uid);
      docMap[kind] = Array.from(list);
      return { ...prev, [optimisticKey]: docMap };
    });

    try {
      if (originId) {
        const ref = doc(db, `reactions/${originId}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { reactions: { [kind]: [user.uid] } });
        } else {
          await updateDoc(ref, {
            [`reactions.${kind}`]: reacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
          });
        }
      } else if (item.id) {
        const ref = doc(db, `feed/${user.uid}/items/${item.id}`);
        await updateDoc(ref, {
          [`reactions.${kind}`]: reacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
        });
      }

      // Notify the actor (skip self-reactions).
      if (!reacted && item.actorId && item.actorId !== user.uid) {
        try {
          await createDocument(`notifications/${item.actorId}/items`, {
            type: 'friend_logged',
            message: `${user.username} reacted to your dispatch`,
            isRead: false,
            relatedId: '',
            actorId: user.uid,
            actorAvatar: user.avatarUrl || '',
            createdAt: Timestamp.now(),
          });
        } catch { /* silent — non-fatal */ }
      }
    } catch (err) {
      console.error('Reaction failed:', err);
      addToast({ type: 'error', message: 'Failed to react' });
      // Roll back the optimistic toggle.
      setSharedReactions((prev) => {
        const docMap = { ...(prev[optimisticKey] ?? {}) };
        const list = new Set(docMap[kind] ?? []);
        if (reacted) list.add(user.uid);
        else list.delete(user.uid);
        docMap[kind] = Array.from(list);
        return { ...prev, [optimisticKey]: docMap };
      });
    }
  };

  const reactionsFor = (item: FeedItem): Record<string, string[]> => {
    const originId = (item as unknown as { originId?: string }).originId;
    if (originId && sharedReactions[originId]) return sharedReactions[originId];
    return (item.reactions ?? {}) as Record<string, string[]>;
  };

  const toggleComments = (id: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter + drop legacy 'log' items
  const visible = useMemo(() => items
    .filter((i) => i.type !== 'log')
    .filter((i) => {
      if (filter === 'friends') return i.actorId !== user?.uid;
      if (filter === 'mine')    return i.actorId === user?.uid;
      return true;
    }), [items, filter, user]);

  // Bucket by today vs earlier
  const todayStr = new Date().toDateString();
  const todays   = visible.filter((i) => i.createdAt?.toDate?.()?.toDateString?.() === todayStr);
  const earlier  = visible.filter((i) => i.createdAt?.toDate?.()?.toDateString?.() !== todayStr);

  // The "lead" dispatch — first today item gets richer treatment.
  const lead = todays[0] ?? null;
  const todayRest = todays.slice(1);

  const dateShort = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Dispatches" />

        <div style={{ padding: '0 22px' }}>
          {/* Eyebrow + headline */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Dispatches
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            From your <em style={{ fontStyle: 'italic' }}>circle.</em>
          </h1>
          <div
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            <span className="tabular">{String(todays.length).padStart(2, '0')}</span> new today ·{' '}
            <span style={{ color: 'var(--b-ink)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>

          {/* Filter strip */}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 4,
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
              padding: '8px 0',
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: '4px 10px',
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    borderBottom: `1.5px solid ${active ? 'var(--b-accent)' : 'transparent'}`,
                    marginBottom: -1,
                    background: 'transparent',
                    border: 'none',
                    borderBottomWidth: 1.5,
                    borderBottomStyle: 'solid',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            <span style={{ padding: '4px 0', color: 'var(--b-ink-40)' }}>↻</span>
          </div>

          {/* Loading + empty states */}
          {loading && (
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded" />)}
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 8 }}
              >
                A quiet edition.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto' }}
              >
                {filter === 'mine'
                  ? 'Log a habit and it will appear here.'
                  : 'Add friends to see their progress.'}
              </p>
              <Link
                href="/friends"
                className="font-body"
                style={{
                  display: 'inline-block',
                  marginTop: 16,
                  fontSize: 11,
                  color: 'var(--b-accent)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                FIND FRIENDS →
              </Link>
            </div>
          )}

          {/* Today section */}
          {!loading && todays.length > 0 && (
            <>
              <SectionLabel left="Today" right={dateShort} />

              {lead && (
                <LeadDispatch
                  item={lead}
                  cosm={actorCosm[lead.actorId] || {}}
                  reactions={reactionsFor(lead)}
                  currentUid={user?.uid}
                  onReact={(kind) => handleReact(lead, kind)}
                  commentsOpen={lead.id ? openComments.has(lead.id) : false}
                  onToggleComments={() => lead.id && toggleComments(lead.id)}
                />
              )}

              {todayRest.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', borderTop: '1px solid var(--b-ink)' }}>
                  {todayRest.map((item) => (
                    <CompactDispatch
                      key={item.id}
                      item={item}
                      cosm={actorCosm[item.actorId] || {}}
                      reactions={reactionsFor(item)}
                      currentUid={user?.uid}
                      onReact={(kind) => handleReact(item, kind)}
                      commentsOpen={item.id ? openComments.has(item.id) : false}
                      onToggleComments={() => item.id && toggleComments(item.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Earlier section */}
          {!loading && earlier.length > 0 && (
            <>
              <SectionLabel left="Earlier" right="EARLIER" />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', borderTop: '1px solid var(--b-ink)' }}>
                {earlier.map((item) => (
                  <CompactDispatch
                    key={item.id}
                    item={item}
                    cosm={actorCosm[item.actorId] || {}}
                    reactions={reactionsFor(item)}
                    currentUid={user?.uid}
                    onReact={(kind) => handleReact(item, kind)}
                    commentsOpen={item.id ? openComments.has(item.id) : false}
                    onToggleComments={() => item.id && toggleComments(item.id)}
                  />
                ))}
              </ul>
            </>
          )}

          {!loading && visible.length > 0 && (
            <p
              className="font-body"
              style={{
                marginTop: 14,
                fontSize: 10,
                color: 'var(--b-ink-40)',
                textAlign: 'center',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              End of dispatches — see you tomorrow
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────────────

function SectionLabel({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        marginTop: 22,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <div className="font-display" style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500 }}>
        {left}
      </div>
      <div
        className="font-mono"
        style={{ fontSize: 10, color: 'var(--b-ink-40)', letterSpacing: '0.04em' }}
      >
        {right}
      </div>
    </div>
  );
}

// ─── Dispatch helpers ───────────────────────────────────────────────

function actionText(item: FeedItem): React.ReactNode {
  // Branch on type to produce a magazine-style action sentence.
  switch (item.type) {
    case 'recap': {
      const r = item as unknown as { pillarsLogged?: number; streakDays?: number };
      const n = r.pillarsLogged ?? 0;
      return n >= 5
        ? <>cleared all <em style={{ fontStyle: 'italic' }}>five pillars</em> today.</>
        : <>logged <em style={{ fontStyle: 'italic' }}>{n} of 5</em> pillars.</>;
    }
    case 'levelup':
      return <>leveled up — now at <em style={{ fontStyle: 'italic' }}>{(item as unknown as { newLevel?: number }).newLevel ?? '?'}</em>.</>;
    case 'badge':
      return <>unlocked the <em style={{ fontStyle: 'italic' }}>{(item as unknown as { badgeName?: string }).badgeName ?? 'a'}</em> badge.</>;
    case 'streak_milestone':
      return <>extended a streak to <em style={{ fontStyle: 'italic' }}>{(item as unknown as { streakDays?: number }).streakDays ?? '?'} days</em>.</>;
    case 'duel_win':
      return <>won a <em style={{ fontStyle: 'italic' }}>{(item as unknown as { categoryName?: string }).categoryName ?? 'duel'}</em>.</>;
    default:
      return <>{(item as unknown as { message?: string }).message ?? 'made a move.'}</>;
  }
}

function glyphForType(item: FeedItem): React.ComponentType<{ size?: number; style?: React.CSSProperties }> {
  switch (item.type) {
    case 'levelup': return BCheerGlyph;
    case 'badge':
    case 'duel_win':         return BTrophyGlyph;
    case 'streak_milestone': return BFlameGlyph;
    case 'recap':            return BCheckGlyph;
    default:        return BFlameGlyph;
  }
}

// ─── Lead dispatch ──────────────────────────────────────────────────

interface DispatchActionProps {
  reactions: Record<string, string[]>;
  currentUid?: string;
  onReact: (kind: ReactionEmoji) => void;
  commentsOpen: boolean;
  onToggleComments: () => void;
}

function LeadDispatch({
  item, cosm, reactions, currentUid, onReact, commentsOpen, onToggleComments,
}: { item: FeedItem; cosm: ActorCosm } & DispatchActionProps) {
  const totalR = Object.values(reactions).reduce((n, arr) => n + (arr?.length || 0), 0);
  const eyebrow = item.type === 'levelup'
    ? `LEVEL UP · LVL ${(item as unknown as { newLevel?: number }).newLevel ?? '?'}`
    : item.type === 'badge'
    ? 'BADGE UNLOCKED'
    : item.type === 'duel_win'
    ? 'DUEL WON'
    : 'DISPATCH';
  const originId = (item as unknown as { originId?: string }).originId;
  const commentCount = (item as unknown as { commentCount?: number }).commentCount ?? 0;
  const recapDate = (item as unknown as { recapDate?: string }).recapDate;
  const detailHref = item.type === 'recap' && recapDate ? `/recap/${item.actorId}/${recapDate}` : null;
  const proofCount = (item as unknown as { proofCount?: number }).proofCount ?? 0;
  const heroProofUrl = (item as unknown as { heroProofUrl?: string }).heroProofUrl;

  return (
    <article
      style={{
        borderTop: '1px solid var(--b-ink)',
        padding: '14px 0',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href={`/profile/${item.actorUsername}`}>
          <Avatar size="sm" src={cosm.avatarUrl ?? item.actorAvatar} />
        </Link>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <Link
            href={`/profile/${item.actorUsername}`}
            className="font-display"
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--b-ink)', textDecoration: 'none' }}
          >
            <em style={{ fontStyle: 'italic' }}>{item.actorUsername}</em>
            <span
              className="font-body"
              style={{ color: 'var(--b-ink-60)', fontStyle: 'normal', marginLeft: 6, fontSize: 10 }}
            >
              {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
            </span>
          </Link>
          <div
            className="spread"
            style={{ fontSize: 8.5, color: 'var(--b-accent)', marginTop: 2 }}
          >
            {eyebrow}
          </div>
        </div>
      </header>
      <h2
        className="font-display"
        style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.15, margin: '12px 0 6px' }}
      >
        {actionText(item)}
      </h2>
      {(item as unknown as { quote?: string }).quote && (
        <p
          className="font-body"
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--b-ink-60)',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{(item as unknown as { quote: string }).quote}&rdquo;
        </p>
      )}

      {/* Hero proof image — full-bleed if the recap has one */}
      {detailHref && heroProofUrl && (
        <Link href={detailHref} style={{ display: 'block', margin: '12px 0', border: '1px solid var(--b-rule)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroProofUrl}
            alt=""
            loading="lazy"
            style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'cover' }}
          />
        </Link>
      )}

      {/* View day link — recap items only */}
      {detailHref && (
        <Link
          href={detailHref}
          className="font-body"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--b-accent)',
            textDecoration: 'none',
          }}
        >
          View the day{proofCount > 0 ? ` · ${proofCount} photo${proofCount === 1 ? '' : 's'}` : ''} →
        </Link>
      )}

      {/* Reaction strip — five glyph buttons */}
      <ReactionStrip
        reactions={reactions}
        currentUid={currentUid}
        onReact={onReact}
      />

      {/* Counts + comment toggle */}
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: 'var(--b-ink-60)',
          fontFamily: 'var(--font-inter)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <BHeartGlyph size={13} />
          <span className="tabular">{totalR}</span>
        </span>
        <button
          onClick={onToggleComments}
          className="font-body"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: commentsOpen ? 'var(--b-accent)' : 'var(--b-ink-60)',
          }}
        >
          <BCommentGlyph size={13} />
          <span className="tabular">{commentCount}</span>
          <span style={{ marginLeft: 2, fontSize: 10, letterSpacing: '0.04em' }}>
            {commentsOpen ? 'hide' : 'comment'}
          </span>
        </button>
      </div>

      {/* Inline comments — only when toggled open and we have an originId */}
      {commentsOpen && originId && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--b-rule)' }}>
          <FeedComments originId={originId} actorId={item.actorId} />
        </div>
      )}
    </article>
  );
}

function ReactionStrip({
  reactions, currentUid, onReact,
}: {
  reactions: Record<string, string[]>;
  currentUid?: string;
  onReact: (kind: ReactionEmoji) => void;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      {REACTIONS.map(({ kind, label, Glyph, color }) => {
        const list = reactions[kind] ?? [];
        const active = !!currentUid && list.includes(currentUid);
        const count = list.length;
        return (
          <button
            key={kind}
            onClick={() => onReact(kind)}
            title={label}
            className="font-body"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              background: active ? `${color}14` : 'transparent',
              border: active ? `1px solid ${color}` : '1px solid var(--b-rule)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: active ? color : 'var(--b-ink-60)',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color, display: 'inline-flex' }}>
              <Glyph size={12} />
            </span>
            <span>{label}</span>
            {count > 0 && (
              <span
                className="font-mono tabular"
                style={{ fontSize: 9, color: active ? color : 'var(--b-ink-40)', marginLeft: 2 }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Compact dispatch row ───────────────────────────────────────────

function CompactDispatch({
  item, cosm, reactions, currentUid, onReact, commentsOpen, onToggleComments,
}: { item: FeedItem; cosm: ActorCosm } & DispatchActionProps) {
  const Glyph = glyphForType(item);
  const meta  = item.type === 'levelup'
    ? `Lv. ${(item as unknown as { newLevel?: number }).newLevel ?? '?'}`
    : item.type === 'duel_win'
    ? `+${(item as unknown as { xpEarned?: number }).xpEarned ?? 0} XP`
    : item.type === 'badge'
    ? 'NEW'
    : '';
  const totalR = Object.values(reactions).reduce((n, arr) => n + (arr?.length || 0), 0);
  const originId = (item as unknown as { originId?: string }).originId;
  const commentCount = (item as unknown as { commentCount?: number }).commentCount ?? 0;
  const recapDate = (item as unknown as { recapDate?: string }).recapDate;
  const detailHref = item.type === 'recap' && recapDate ? `/recap/${item.actorId}/${recapDate}` : null;
  const proofCount = (item as unknown as { proofCount?: number }).proofCount ?? 0;

  return (
    <li className="b-row">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 24px 1fr auto',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ color: 'var(--b-ink)', marginTop: 1 }}>
          <Glyph size={18} />
        </span>
        <Link href={`/profile/${item.actorUsername}`}>
          <Avatar size="sm" src={cosm.avatarUrl ?? item.actorAvatar} />
        </Link>
        <div
          className="font-body"
          style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--b-ink)' }}
        >
          <Link
            href={`/profile/${item.actorUsername}`}
            className="font-display"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--b-ink)',
              textDecoration: 'none',
            }}
          >
            {item.actorUsername}
          </Link>{' '}
          {actionText(item)}
          {meta && (
            <div
              className="font-mono"
              style={{
                fontSize: 9.5,
                color: 'var(--b-ink-40)',
                marginTop: 3,
                letterSpacing: '0.04em',
              }}
            >
              {meta}
            </div>
          )}
        </div>
        <span
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 2 }}
        >
          {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
        </span>
      </div>

      {/* View day link — recap items only */}
      {detailHref && (
        <div style={{ marginTop: 6, paddingLeft: 30 }}>
          <Link
            href={detailHref}
            className="font-body"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--b-accent)',
              textDecoration: 'none',
            }}
          >
            View the day{proofCount > 0 ? ` · ${proofCount} photo${proofCount === 1 ? '' : 's'}` : ''} →
          </Link>
        </div>
      )}

      {/* Action bar — react / comment */}
      <div
        style={{
          marginTop: 8,
          paddingLeft: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          color: 'var(--b-ink-60)',
          fontFamily: 'var(--font-inter)',
        }}
      >
        <CompactReact reactions={reactions} currentUid={currentUid} onReact={onReact} />
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          <BHeartGlyph size={11} />
          <span className="tabular">{totalR}</span>
        </span>
        <button
          onClick={onToggleComments}
          className="font-body"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: commentsOpen ? 'var(--b-accent)' : 'var(--b-ink-60)',
          }}
        >
          <BCommentGlyph size={11} />
          <span className="tabular">{commentCount}</span>
        </button>
      </div>

      {commentsOpen && originId && (
        <div style={{ marginTop: 10, paddingLeft: 30 }}>
          <FeedComments originId={originId} actorId={item.actorId} />
        </div>
      )}
    </li>
  );
}

function CompactReact({
  reactions, currentUid, onReact,
}: {
  reactions: Record<string, string[]>;
  currentUid?: string;
  onReact: (kind: ReactionEmoji) => void;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      {REACTIONS.map(({ kind, label, Glyph, color }) => {
        const list = reactions[kind] ?? [];
        const active = !!currentUid && list.includes(currentUid);
        return (
          <button
            key={kind}
            onClick={() => onReact(kind)}
            title={label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 5px',
              background: active ? `${color}14` : 'transparent',
              border: active ? `1px solid ${color}` : '1px solid var(--b-rule)',
              cursor: 'pointer',
              color: active ? color : 'var(--b-ink-60)',
            }}
          >
            <Glyph size={11} />
          </button>
        );
      })}
    </div>
  );
}

// Suppress unused-import noise — the cosm record is used inside both
// row components but TS can mis-flag it.
void doc; void getDoc; void db;
