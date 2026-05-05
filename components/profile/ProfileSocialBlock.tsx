'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUserPacts } from '@/hooks/usePacts';
import { useLastFriendsLeagueSnapshot } from '@/hooks/useFriendsLeague';
import { useAuth } from '@/hooks/useAuth';

/**
 * Editorial Direction B v2 social block. Three optional rows: active
 * pacts, incoming pact invites, and the last friends-league finish.
 * Hairline rules between rows; accent left stripe on items that need
 * the user's attention (incoming invites).
 *
 * Renders nothing when the user has no pacts AND no league snapshot
 * — keeps the profile clean for users who haven't touched the social
 * mechanics.
 */
export function ProfileSocialBlock() {
  const { user } = useAuth();
  const { active, incoming } = useUserPacts();
  const { snapshot } = useLastFriendsLeagueSnapshot();

  if (!user) return null;

  const hasNothing = active.length === 0 && incoming.length === 0 && !snapshot;
  if (hasNothing) return null;

  const featured = active.length > 0
    ? active.reduce((best, p) => {
        const myCount = countMyDays(p, user.uid);
        const bestCount = countMyDays(best, user.uid);
        return myCount > bestCount ? p : best;
      }, active[0])
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderTop: '1px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-rule)',
        padding: '14px 0',
      }}
    >
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
        Social
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
        {/* Active pacts row */}
        {active.length > 0 && (
          <Link
            href="/pacts"
            style={{
              display: 'block',
              padding: '10px 0',
              borderTop: '1px solid var(--b-rule)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
                  Active pacts
                </div>
                <p
                  className="font-display"
                  style={{
                    fontSize: 18,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    margin: '2px 0 0',
                    color: 'var(--b-ink)',
                  }}
                >
                  {active.length} running
                </p>
                {featured && (
                  <p
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--b-ink-60)',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span style={{ color: featured.habitColor, fontWeight: 700 }}>
                      {featured.habitName}
                    </span>
                    <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                    <span>{countMyDays(featured, user.uid)}/{featured.durationDays} days</span>
                    <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                    <span>vs {partnerName(featured, user.uid)}</span>
                  </p>
                )}
              </div>
              <span className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', flexShrink: 0 }}>
                View →
              </span>
            </div>
          </Link>
        )}

        {/* Incoming pact invites */}
        {incoming.length > 0 && (
          <Link
            href="/pacts"
            style={{
              display: 'block',
              padding: '10px 12px',
              borderTop: '1px solid var(--b-rule)',
              borderLeft: '2px solid var(--b-accent)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
                  Pending invite{incoming.length === 1 ? '' : 's'}
                </div>
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink)', marginTop: 2 }}
                >
                  {incoming.length} pact invite{incoming.length === 1 ? '' : 's'} waiting on your reply
                </p>
              </div>
              <span className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', flexShrink: 0 }}>
                Open →
              </span>
            </div>
          </Link>
        )}

        {/* Last league finish */}
        {snapshot && (
          <Link
            href="/friends-league"
            style={{
              display: 'block',
              padding: '10px 0',
              borderTop: '1px solid var(--b-rule)',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                  Last week ({snapshot.weekKey})
                </div>
                <p
                  className="font-display tabular"
                  style={{
                    fontSize: 18,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    margin: '2px 0 0',
                    color: 'var(--b-ink)',
                  }}
                >
                  {snapshot.myRank === 1 && '★ '}
                  #{snapshot.myRank} of {snapshot.standings.length}
                </p>
                <p
                  className="font-mono tabular"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
                >
                  {snapshot.myScore.toLocaleString()} XP
                  {snapshot.myReward > 0 && (
                    <>
                      <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
                      <span style={{ color: 'var(--b-accent)' }}>+{snapshot.myReward} fragments</span>
                    </>
                  )}
                </p>
              </div>
              <span className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', flexShrink: 0 }}>
                View →
              </span>
            </div>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function countMyDays(pact: import('@/types/pact').Pact, uid: string): number {
  let n = 0;
  for (const date in pact.dayStatus) {
    if (pact.dayStatus[date]?.[uid] === 'logged') n += 1;
  }
  return n;
}

function partnerName(pact: import('@/types/pact').Pact, uid: string): string {
  const partnerId = pact.participants.find((p) => p !== uid) || pact.participants[1];
  return pact.participantsMeta[partnerId]?.username || 'Friend';
}
