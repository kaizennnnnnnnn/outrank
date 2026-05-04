'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCompetitions } from '@/hooks/useCompetitions';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { updateDocument, getDocument, getCollection } from '@/lib/firestore';
import { increment, arrayUnion, orderBy as fbOrderBy, limit as fbLimit } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { DuelResultModal } from '@/components/competition/DuelResultModal';
import { Competition, CompetitionStatus } from '@/types/competition';
import { CATEGORIES } from '@/constants/categories';
import { UserProfile } from '@/types/user';
import { Masthead } from '@/components/editorial/Masthead';
import { BTrophyGlyph } from '@/components/editorial/BGlyphs';
import { getDuelRewards } from '@/lib/duelRewards';
import { cn } from '@/lib/utils';

/**
 * Compete — editorial Direction B v2 conversion. The "Standings"
 * front page: featured active duel up top in the design's two-
 * avatar VS layout, then incoming challenges / ended duels / sent
 * challenges / additional active duels, then a Weekly Standings
 * preview pulled from the users collection by weeklyXP desc.
 *
 * All gameplay flows preserved: acceptDuel / declineDuel / claim
 * still write to /competitions and /users; DuelResultModal still
 * opens for ended duels needing reward claim.
 */

const TOP_N = 7;

function timeRemaining(ms: number): string {
  if (ms <= 0) return 'ended';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${String(d).padStart(2,'0')}d ${String(h % 24).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`;
}

export default function CompetePage() {
  const { user } = useAuth();
  const { competitions, loading } = useCompetitions();
  const addToast = useUIStore((s) => s.addToast);
  const [processing, setProcessing] = useState<string | null>(null);
  // Local status overrides — uses widened string type because the
  // decline action writes 'declined' which isn't in CompetitionStatus
  // but is valid runtime data (existing behavior preserved).
  const [localUpdates, setLocalUpdates] = useState<Record<string, string>>({});

  const comps: Competition[] = competitions.map((c) => ({
    ...c,
    status: (localUpdates[c.id || ''] ?? c.status) as CompetitionStatus,
  }));

  const now = Date.now();
  const hasEnded = (c: typeof comps[number]) => {
    const end = c.endDate?.toDate?.()?.getTime?.() ?? 0;
    return end > 0 && end <= now;
  };
  const hasClaimed = (c: typeof comps[number]) =>
    !!(c as unknown as { claimedBy?: string[] }).claimedBy?.includes(user?.uid || '');

  const endedUnclaimed = comps.filter((c) =>
    (c.status === 'active' && hasEnded(c) && !hasClaimed(c)) ||
    (c.status === 'completed' && !hasClaimed(c))
  );
  const activeComps = comps.filter((c) => c.status === 'active' && !hasEnded(c));
  const incomingChallenges = comps.filter(
    (c) => c.status === 'pending' && c.creatorId !== user?.uid
  );
  const sentChallenges = comps.filter(
    (c) => c.status === 'pending' && c.creatorId === user?.uid
  );

  // Featured duel = the most recent active duel (or null)
  const featuredDuel = activeComps[0] ?? null;
  const otherActive = activeComps.slice(1);

  const [resultDuel, setResultDuel] = useState<Competition | null>(null);
  const [opponentOrb, setOpponentOrb] = useState<{ tier?: number; baseColor?: string; pulseColor?: string; ringColor?: string } | null>(null);

  useEffect(() => {
    if (!resultDuel || !user) { setOpponentOrb(null); return; }
    const opp = resultDuel.participants.find((p) => p.userId !== user.uid);
    if (!opp) return;
    (async () => {
      try {
        const doc = await getDocument<Record<string, unknown>>('users', opp.userId);
        if (!doc) { setOpponentOrb({}); return; }
        setOpponentOrb({
          tier: (doc.orbTier as number) || 1,
          baseColor: (doc.orbBaseColor as string) || undefined,
          pulseColor: (doc.orbPulseColor as string) || undefined,
          ringColor: (doc.orbRingColor as string) || undefined,
        });
      } catch {
        setOpponentOrb({});
      }
    })();
  }, [resultDuel, user]);

  // Weekly standings — top N by weeklyXP. One read on mount.
  const [standings, setStandings] = useState<UserProfile[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCollection<UserProfile>('users', [
          fbOrderBy('weeklyXP', 'desc'),
          fbLimit(TOP_N),
        ]);
        if (cancelled) return;
        const visible = rows.filter((u) => {
          const banned = (u as unknown as Record<string, boolean>).isBanned;
          return !banned;
        });
        setStandings(visible);
      } catch {
        if (!cancelled) setStandings([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClaim = async (comp: Competition, r: { won: boolean; tie: boolean; xp: number; fragments: number }) => {
    if (!user || !comp.id) return;
    try {
      await updateDocument('competitions', comp.id, {
        status: 'completed',
        claimedBy: arrayUnion(user.uid),
      });
      const userUpdate: Record<string, ReturnType<typeof increment>> = {
        totalXP: increment(r.xp),
        weeklyXP: increment(r.xp),
        monthlyXP: increment(r.xp),
        fragments: increment(r.fragments),
        seasonPassXP: increment(r.xp),
      };
      if (r.won) userUpdate.duelWins = increment(1);
      await updateDocument('users', user.uid, userUpdate);
      addToast({ type: 'success', message: r.won ? `Victory! +${r.xp} XP, +${r.fragments} fragments` : `+${r.xp} XP, +${r.fragments} fragments` });
    } catch {
      addToast({ type: 'error', message: 'Could not claim — try again' });
    }
  };

  const acceptDuel = async (compId: string) => {
    setProcessing(compId);
    try {
      await updateDocument('competitions', compId, { status: 'active' });
      setLocalUpdates((prev) => ({ ...prev, [compId]: 'active' }));
      addToast({ type: 'success', message: 'Duel accepted. Game on.' });
    } catch {
      addToast({ type: 'error', message: 'Could not accept' });
    } finally {
      setProcessing(null);
    }
  };

  const declineDuel = async (compId: string) => {
    setProcessing(compId);
    try {
      await updateDocument('competitions', compId, { status: 'declined' });
      setLocalUpdates((prev) => ({ ...prev, [compId]: 'declined' }));
      addToast({ type: 'info', message: 'Challenge declined' });
    } catch {
      addToast({ type: 'error', message: 'Could not decline' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Standings" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Rivalries
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 14px' }}
          >
            You vs. <em style={{ fontStyle: 'italic', color: 'var(--b-accent)', fontWeight: 500 }}>them.</em>
          </h1>

          {/* Featured active duel */}
          {featuredDuel ? (
            <FeaturedDuel comp={featuredDuel} myUid={user?.uid ?? ''} />
          ) : (
            <div
              style={{
                borderTop: '2px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-ink)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              <p
                className="font-display"
                style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 500, marginBottom: 4 }}
              >
                No active duels.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
              >
                Challenge a friend from their profile or the leaderboard.
              </p>
            </div>
          )}

          {/* Incoming challenges */}
          {incomingChallenges.length > 0 && (
            <Section title="Incoming challenges" count={incomingChallenges.length}>
              {incomingChallenges.map((comp, i) => {
                const challenger = comp.participants.find((p) => p.userId === comp.creatorId);
                const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
                return (
                  <li
                    key={comp.id}
                    className="b-row"
                    style={{ display: 'grid', gridTemplateColumns: '24px 32px 1fr auto', gap: 10, alignItems: 'center' }}
                  >
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Avatar size="sm" src={challenger?.avatarUrl} />
                    <div style={{ minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 14, fontWeight: 500 }}>
                        <em style={{ fontStyle: 'italic' }}>{challenger?.username}</em>
                        <span style={{ color: 'var(--b-ink-60)', marginLeft: 6, fontStyle: 'normal' }}>
                          challenged you
                        </span>
                      </div>
                      <div
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}
                      >
                        {cat?.name ?? comp.title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => comp.id && acceptDuel(comp.id)}
                        disabled={processing === comp.id}
                        className="font-body"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          padding: '6px 10px',
                          background: 'var(--b-ink)',
                          color: 'var(--b-paper)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => comp.id && declineDuel(comp.id)}
                        disabled={processing === comp.id}
                        className="font-body"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          padding: '6px 10px',
                          background: 'transparent',
                          color: 'var(--b-ink-60)',
                          border: '1px solid var(--b-rule)',
                          cursor: 'pointer',
                        }}
                      >
                        PASS
                      </button>
                    </div>
                  </li>
                );
              })}
            </Section>
          )}

          {/* Ended — claim rewards */}
          {endedUnclaimed.length > 0 && user && (
            <Section title="Claim your rewards" count={endedUnclaimed.length} accent>
              {endedUnclaimed.map((comp, i) => {
                const opp = comp.participants.find((p) => p.userId !== user.uid);
                const me  = comp.participants.find((p) => p.userId === user.uid);
                const won = (me?.score ?? 0) > (opp?.score ?? 0);
                return (
                  <li
                    key={comp.id}
                    onClick={() => setResultDuel(comp as Competition)}
                    className="b-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px 28px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <BTrophyGlyph size={20} style={{ color: won ? 'var(--b-accent)' : 'var(--b-ink-60)' }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 14, fontWeight: 500 }}>
                        {won ? 'You won' : me?.score === opp?.score ? 'Tied' : 'Lost'} vs{' '}
                        <em style={{ fontStyle: 'italic' }}>{opp?.username}</em>
                      </div>
                      <div
                        className="font-body tabular"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1 }}
                      >
                        {me?.score ?? 0} — {opp?.score ?? 0}
                      </div>
                    </div>
                    <span
                      className="font-body"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--b-accent)',
                      }}
                    >
                      CLAIM →
                    </span>
                  </li>
                );
              })}
            </Section>
          )}

          {/* Other active duels (beyond the featured one) */}
          {otherActive.length > 0 && user && (
            <Section title="Other active" count={otherActive.length}>
              {otherActive.map((comp, i) => {
                const opp = comp.participants.find((p) => p.userId !== user.uid);
                const me  = comp.participants.find((p) => p.userId === user.uid);
                const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
                return (
                  <li key={comp.id} className="b-row">
                    <Link
                      href={`/compete/duel/${comp.id}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '24px 1fr auto',
                        gap: 10,
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="font-display" style={{ fontSize: 14, fontWeight: 500 }}>
                          vs <em style={{ fontStyle: 'italic' }}>{opp?.username}</em>
                          <span className="font-body" style={{ color: 'var(--b-ink-60)', fontSize: 11, marginLeft: 6 }}>
                            · {cat?.name ?? comp.title}
                          </span>
                        </div>
                        <div className="font-body tabular" style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1 }}>
                          {me?.score ?? 0} — {opp?.score ?? 0}
                        </div>
                      </div>
                      <span className="font-body" style={{ fontSize: 10, color: 'var(--b-ink-60)', letterSpacing: '0.08em' }}>
                        VIEW →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </Section>
          )}

          {/* Sent challenges — pending */}
          {sentChallenges.length > 0 && (
            <Section title="Waiting for response" count={sentChallenges.length} dim>
              {sentChallenges.map((comp, i) => {
                const opp = comp.participants.find((p) => p.userId !== user?.uid);
                const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
                return (
                  <li
                    key={comp.id}
                    className="b-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      opacity: 0.6,
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 14, fontWeight: 500 }}>
                        Sent to <em style={{ fontStyle: 'italic' }}>{opp?.username}</em>
                      </div>
                      <div
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}
                      >
                        {cat?.name ?? comp.title}
                      </div>
                    </div>
                    <span className="font-body" style={{ fontSize: 10, color: 'var(--b-ink-40)', letterSpacing: '0.1em' }}>
                      PENDING
                    </span>
                  </li>
                );
              })}
            </Section>
          )}

          {/* Weekly standings */}
          <Standings standings={standings} myUid={user?.uid} />
        </div>
      </div>

      {/* Duel result modal preserved */}
      {resultDuel && user && (
        <DuelResultModal
          isOpen={!!resultDuel}
          onClose={() => setResultDuel(null)}
          competition={resultDuel}
          currentUserId={user.uid}
          onClaim={(r) => handleClaim(resultDuel, r)}
          myOrb={{
            tier: (user as unknown as Record<string, number>).orbTier || 1,
            baseColor: (user as unknown as Record<string, string>).orbBaseColor,
            pulseColor: (user as unknown as Record<string, string>).orbPulseColor,
            ringColor: (user as unknown as Record<string, string>).orbRingColor,
          }}
          opponentOrb={opponentOrb || undefined}
        />
      )}

      {loading && (
        <div className="px-6 max-w-2xl mx-auto space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      )}
    </div>
  );
}

// ─── Featured duel hero ─────────────────────────────────────────────

function FeaturedDuel({ comp, myUid }: { comp: Competition; myUid: string }) {
  const me  = comp.participants.find((p) => p.userId === myUid);
  const opp = comp.participants.find((p) => p.userId !== myUid);
  const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
  const endMs = comp.endDate?.toDate?.()?.getTime?.() ?? 0;
  const remaining = endMs - Date.now();
  const myScore  = me?.score ?? 0;
  const oppScore = opp?.score ?? 0;
  const winning  = myScore > oppScore;
  // Stake = the win-payout for this duel's duration (shared math used
  // by the result modal). Reads to the user as "what's on the line."
  const winRewards = getDuelRewards('win', comp.durationDays);

  return (
    <Link
      href={comp.id ? `/compete/duel/${comp.id}` : '#'}
      style={{
        display: 'block',
        borderTop: '2px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-ink)',
        padding: '14px 0',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          className="spread"
          style={{ fontSize: 9, fontWeight: 700, color: 'var(--b-accent)' }}
        >
          Active duel
        </span>
        <span
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
        >
          {timeRemaining(remaining)}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <PlayerColumn
          username={me?.username ?? 'you'}
          avatarUrl={me?.avatarUrl}
          score={myScore}
          isWinning={winning && myScore !== oppScore}
        />
        <span
          className="font-display"
          style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--b-ink-60)' }}
        >
          vs.
        </span>
        <PlayerColumn
          username={opp?.username ?? 'them'}
          avatarUrl={opp?.avatarUrl}
          score={oppScore}
          isWinning={!winning && myScore !== oppScore}
        />
      </div>

      <div
        className="font-body"
        style={{
          marginTop: 10,
          fontSize: 11,
          color: 'var(--b-ink-60)',
          textAlign: 'center',
        }}
      >
        <span className="spread" style={{ fontSize: 9, color: 'var(--b-ink)' }}>
          {(cat?.name ?? comp.title).toUpperCase()}
        </span>
        {' · stake '}
        <b style={{ color: 'var(--b-ink)' }}>
          {winRewards.xp} XP + {winRewards.fragments} fragments
        </b>
      </div>
    </Link>
  );
}

function PlayerColumn({
  username,
  avatarUrl,
  score,
  isWinning,
}: {
  username:  string;
  avatarUrl?: string;
  score:     number;
  isWinning: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Avatar size="md" src={avatarUrl} />
      <div
        className="font-display"
        style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}
      >
        {username}
      </div>
      <div
        className="font-display tabular"
        style={{
          fontSize: 36,
          fontWeight: 500,
          lineHeight: 1,
          color: isWinning ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────

function Section({
  title,
  count,
  accent,
  dim,
  children,
}: {
  title:    string;
  count:    number;
  accent?:  boolean;
  dim?:     boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--b-ink)',
          paddingBottom: 4,
          opacity: dim ? 0.85 : 1,
        }}
      >
        <span
          className="font-display"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            fontWeight: 500,
            color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
          }}
        >
          {title}
        </span>
        <span
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
        >
          {String(count).padStart(2, '0')}
        </span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ul>
    </section>
  );
}

// ─── Standings ──────────────────────────────────────────────────────

function Standings({
  standings,
  myUid,
}: {
  standings: UserProfile[] | null;
  myUid?:    string;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          className="font-display"
          style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
        >
          Weekly standings
        </span>
        <Link
          href="/leaderboard"
          className="font-body"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-60)',
            letterSpacing: '0.08em',
            textDecoration: 'none',
          }}
        >
          ALL · LEAGUE →
        </Link>
      </div>
      <div style={{ marginTop: 8, borderTop: '1px solid var(--b-ink)' }}>
        {standings === null ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Skeleton className="h-6 w-full rounded" />
          </div>
        ) : standings.length === 0 ? (
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', padding: '12px 0', textAlign: 'center' }}
          >
            No standings yet.
          </p>
        ) : (
          standings.map((p, i) => {
            const isMe = p.uid === myUid;
            return (
              <div
                key={p.uid}
                className={cn('b-row')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 32px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  background: isMe ? 'rgba(220,38,38,0.05)' : 'transparent',
                  marginInline: isMe ? -8 : 0,
                  paddingInline: isMe ? 8 : 0,
                }}
              >
                <span
                  className="font-mono tabular"
                  style={{
                    fontSize: 11,
                    color: i < 3 ? 'var(--b-ink)' : 'var(--b-ink-40)',
                    fontWeight: 700,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Avatar size="sm" src={p.avatarUrl} />
                <div className="font-display" style={{ fontSize: 13, fontWeight: 500 }}>
                  {p.username}
                  {isMe && (
                    <em
                      className="font-display"
                      style={{ color: 'var(--b-accent)', fontStyle: 'italic', fontWeight: 400, marginLeft: 4 }}
                    >
                      — you
                    </em>
                  )}
                </div>
                <span
                  className="font-mono tabular"
                  style={{ fontSize: 12, color: 'var(--b-ink)' }}
                >
                  {(p.weeklyXP ?? 0).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
