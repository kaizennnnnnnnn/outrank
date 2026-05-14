'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
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

// Single canonical reaction. Keyed by '🔥' so legacy reaction docs
// (which used five different emoji buckets) still register under the
// heart UI; the count helper below sums across every legacy key so
// nothing already given is "lost."
const HEART_KIND: ReactionEmoji = '🔥';
const LEGACY_REACTION_KINDS: ReactionEmoji[] = ['🔥', '💪', '👏', '⚡', '🤝'];

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
    case 'duel_win':
    case 'duel_ended':       return BTrophyGlyph;
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

/**
 * Letter-grade for a published recap. Driven by distinct pillars
 * logged (the headline metric) plus a small bonus for proof
 * coverage. Pure: same input -> same grade. Returns letter + tone
 * colour for the badge render.
 */
function gradeRecap(item: FeedItem): { letter: string; tone: string; tier: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' } | null {
  if (item.type !== 'recap') return null;
  const pl = (item as unknown as { pillarsLogged?: number }).pillarsLogged ?? 0;
  const proof = (item as unknown as { proofCount?: number }).proofCount ?? 0;
  const logCount = (item as unknown as { logCount?: number }).logCount ?? 0;
  const proofRate = logCount > 0 ? proof / logCount : 0;
  if (pl >= 5 && proofRate >= 0.5) return { letter: 'A+', tier: 'A+', tone: 'var(--b-accent)' };
  if (pl >= 5)                     return { letter: 'A',  tier: 'A',  tone: 'var(--b-accent)' };
  if (pl >= 4)                     return { letter: 'B',  tier: 'B',  tone: 'var(--b-ink)' };
  if (pl >= 3)                     return { letter: 'C',  tier: 'C',  tone: 'var(--b-ink)' };
  if (pl >= 2)                     return { letter: 'D',  tier: 'D',  tone: 'var(--b-ink-60)' };
  return { letter: 'F', tier: 'F', tone: 'var(--b-ink-60)' };
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
    : item.type === 'duel_ended'
    ? 'DUEL ENDED'
    : 'DISPATCH';
  const originId = (item as unknown as { originId?: string }).originId;
  const commentCount = (item as unknown as { commentCount?: number }).commentCount ?? 0;
  const recapDate = (item as unknown as { recapDate?: string }).recapDate;
  const detailHref = item.type === 'recap' && recapDate ? `/recap/${item.actorId}/${recapDate}` : null;
  const proofCount = (item as unknown as { proofCount?: number }).proofCount ?? 0;
  const heroProofUrl = (item as unknown as { heroProofUrl?: string }).heroProofUrl;
  const grade = gradeRecap(item);

  return (
    <article
      style={{
        borderTop: '1px solid var(--b-ink)',
        padding: '14px 0',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/profile/${item.actorUsername}`} aria-label={`Open ${item.actorUsername}'s profile`}>
          <FramedAvatar
            src={cosm.avatarUrl ?? item.actorAvatar}
            alt={item.actorUsername}
            size="md"
            frameId={cosm.frame}
          />
        </Link>
        <div style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
          <Link
            href={`/profile/${item.actorUsername}`}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}
          >
            <NamePlate name={item.actorUsername} effectId={cosm.name} size="sm" />
            <span
              className="font-body"
              style={{ color: 'var(--b-ink-60)', fontStyle: 'normal', fontSize: 10 }}
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
        {grade && <RecapGradeBadge grade={grade} />}
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

      {/* View day — distinctive metallic-shine button, recap items only */}
      {detailHref && (
        <div style={{ marginTop: 14 }}>
          <Link
            href={detailHref}
            className="font-body"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: '1px solid var(--b-accent)',
              borderLeft: '3px solid var(--b-accent)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'transparent',
            }}
          >
            <span className="metallic-shine">
              View the day{proofCount > 0 ? ` · ${proofCount} photo${proofCount === 1 ? '' : 's'}` : ''} →
            </span>
          </Link>
        </div>
      )}

      {/* Heart-only reaction + comment toggle */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: 'var(--b-ink-60)',
          fontFamily: 'var(--font-inter)',
        }}
      >
        <HeartReact reactions={reactions} currentUid={currentUid} onReact={onReact} />
        <button
          onClick={onToggleComments}
          className="font-body"
          style={{
            background: commentsOpen ? 'var(--b-ink)' : 'transparent',
            border: '1px solid var(--b-ink)',
            cursor: 'pointer',
            padding: '8px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            fontWeight: 600,
            color: commentsOpen ? 'var(--b-paper)' : 'var(--b-ink)',
            letterSpacing: '0.04em',
          }}
        >
          <BCommentGlyph size={15} />
          <span className="tabular" style={{ fontWeight: 700 }}>{commentCount}</span>
          <span
            className="spread"
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              color: commentsOpen ? 'var(--b-paper)' : 'var(--b-ink-60)',
            }}
          >
            {commentsOpen ? 'Hide' : 'Comment'}
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

/**
 * Single heart reaction button. Writes to the canonical HEART_KIND
 * bucket; the count sums across every legacy bucket so reactions
 * given before the simplification still show up.
 */
function HeartReact({
  reactions, currentUid, onReact,
}: {
  reactions: Record<string, string[]>;
  currentUid?: string;
  onReact: (kind: ReactionEmoji) => void;
}) {
  const heartList = reactions[HEART_KIND] ?? [];
  const active = !!currentUid && heartList.includes(currentUid);
  // Sum across all legacy reaction kinds so an old fire/clap/etc still
  // counts toward the total displayed next to the heart.
  const totalCount = LEGACY_REACTION_KINDS.reduce(
    (n, k) => n + (reactions[k]?.length || 0),
    0,
  );
  return (
    <button
      onClick={() => onReact(HEART_KIND)}
      className="font-body"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: active ? 'var(--b-accent)' : 'transparent',
        border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
        textTransform: 'uppercase',
      }}
    >
      <BHeartGlyph size={12} />
      {totalCount > 0 && (
        <span className="font-mono tabular" style={{ fontSize: 10 }}>
          {totalCount}
        </span>
      )}
    </button>
  );
}

// ─── Compact dispatch row ───────────────────────────────────────────

function CompactDispatch({
  item, cosm, reactions, currentUid, onReact, commentsOpen, onToggleComments,
}: { item: FeedItem; cosm: ActorCosm } & DispatchActionProps) {
  const Glyph = glyphForType(item);
  const grade = gradeRecap(item);
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
          gridTemplateColumns: '20px 38px 1fr auto',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ color: 'var(--b-ink)', marginTop: 1 }}>
          <Glyph size={18} />
        </span>
        <Link href={`/profile/${item.actorUsername}`} aria-label={`Open ${item.actorUsername}'s profile`}>
          <FramedAvatar
            src={cosm.avatarUrl ?? item.actorAvatar}
            alt={item.actorUsername}
            size="sm"
            frameId={cosm.frame}
          />
        </Link>
        <div
          className="font-body"
          style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--b-ink)' }}
        >
          <Link
            href={`/profile/${item.actorUsername}`}
            style={{ textDecoration: 'none' }}
          >
            <NamePlate name={item.actorUsername} effectId={cosm.name} size="sm" />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 2 }}>
          {grade && (
            <span
              className="font-display tabular"
              aria-label={`Recap grade ${grade.letter}`}
              style={{
                fontSize: 12,
                fontStyle: 'italic',
                fontWeight: 600,
                color: grade.tone,
                border: `1px solid ${grade.tone}`,
                padding: '0 5px',
                lineHeight: 1.3,
              }}
            >
              {grade.letter}
            </span>
          )}
          <span
            className="font-mono tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
          >
            {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
          </span>
        </div>
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
              gap: 6,
              padding: '6px 10px',
              border: '1px solid var(--b-accent)',
              borderLeft: '3px solid var(--b-accent)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'transparent',
            }}
          >
            <span className="metallic-shine">
              View the day{proofCount > 0 ? ` · ${proofCount} photo${proofCount === 1 ? '' : 's'}` : ''} →
            </span>
          </Link>
        </div>
      )}

      {/* Action bar — heart + comment */}
      <div
        style={{
          marginTop: 8,
          paddingLeft: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--b-ink-60)',
          fontFamily: 'var(--font-inter)',
        }}
      >
        <HeartReact reactions={reactions} currentUid={currentUid} onReact={onReact} />
        <span style={{ flex: 1 }} />
        <button
          onClick={onToggleComments}
          className="font-body"
          style={{
            background: commentsOpen ? 'var(--b-ink)' : 'transparent',
            border: '1px solid var(--b-rule)',
            cursor: 'pointer',
            padding: '5px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: commentsOpen ? 'var(--b-paper)' : 'var(--b-ink)',
          }}
        >
          <BCommentGlyph size={13} />
          <span className="tabular" style={{ fontWeight: 600 }}>{commentCount}</span>
          <span
            className="spread"
            style={{ fontSize: 8, letterSpacing: '0.16em', color: commentsOpen ? 'var(--b-paper)' : 'var(--b-ink-60)' }}
          >
            {commentsOpen ? 'Hide' : 'Reply'}
          </span>
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

/**
 * Big italic Fraunces letter grade for the lead recap card. Sits in
 * the top-right of the header. Hairline-rimmed square in the
 * grade's tone colour.
 */
function RecapGradeBadge({
  grade,
}: {
  grade: { letter: string; tone: string; tier: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' };
}) {
  const isTopGrade = grade.tier === 'A+' || grade.tier === 'A';
  return (
    <div
      aria-label={`Recap grade ${grade.letter}`}
      style={{
        flexShrink: 0,
        width: 56,
        height: 56,
        border: `1px solid ${grade.tone}`,
        borderTop: `2px solid ${grade.tone}`,
        background: 'var(--b-paper)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: isTopGrade ? `0 0 0 1px ${grade.tone}33` : undefined,
      }}
    >
      <span
        className="spread"
        style={{
          fontSize: 7,
          color: grade.tone,
          letterSpacing: '0.18em',
          marginBottom: 1,
        }}
      >
        Grade
      </span>
      <span
        className="font-display tabular"
        style={{
          fontSize: grade.letter.length === 2 ? 24 : 30,
          fontStyle: 'italic',
          fontWeight: 600,
          lineHeight: 1,
          color: grade.tone,
        }}
      >
        {grade.letter}
      </span>
    </div>
  );
}

// Suppress unused-import noise — the cosm record is used inside both
// row components but TS can mis-flag it.
void doc; void getDoc; void db;
