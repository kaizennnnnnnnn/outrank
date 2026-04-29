'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUserPacts } from '@/hooks/usePacts';
import { useLastFriendsLeagueSnapshot } from '@/hooks/useFriendsLeague';
import { useAuth } from '@/hooks/useAuth';

/**
 * Profile-page summary of the user's social-stakes status: active
 * pacts (count + the most-progressed one inline) and last week's
 * Friends League finish if any. Links into /pacts and /friends-league
 * for the full views.
 *
 * Renders nothing when the user has no pacts AND no league snapshot
 * yet — keeps the profile clean for users who haven't touched the
 * social mechanics.
 */
export function ProfileSocialBlock() {
  const { user } = useAuth();
  const { active, incoming } = useUserPacts();
  const { snapshot } = useLastFriendsLeagueSnapshot();

  if (!user) return null;

  const hasNothing = active.length === 0 && incoming.length === 0 && !snapshot;
  if (hasNothing) return null;

  // Find the most-progressed active pact for an inline preview.
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
      className="rounded-2xl bg-white/[0.015] border border-white/[0.04] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 pt-4 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">
          Social
        </p>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Active pacts row */}
        {active.length > 0 && (
          <Link
            href="/pacts"
            className="block rounded-xl border border-white/[0.04] hover:border-orange-500/30 transition-colors p-3"
            style={{
              background: featured ? `linear-gradient(135deg, ${featured.habitColor}10 0%, rgba(11,11,20,0.7) 70%)` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                  Active pacts
                </p>
                <p className="font-heading text-base font-bold text-white mt-0.5">
                  {active.length} running
                </p>
                {featured && (
                  <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                    <span style={{ color: featured.habitColor }} className="font-bold">{featured.habitName}</span>
                    <span className="text-slate-700 mx-1.5">·</span>
                    <span>{countMyDays(featured, user.uid)}/{featured.durationDays} days</span>
                    <span className="text-slate-700 mx-1.5">·</span>
                    <span>vs {partnerName(featured, user.uid)}</span>
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 flex-shrink-0">
                View →
              </span>
            </div>
          </Link>
        )}

        {/* Incoming pact invites */}
        {incoming.length > 0 && (
          <Link
            href="/pacts"
            className="block rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-3 hover:bg-amber-500/[0.08] transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Pending invite{incoming.length === 1 ? '' : 's'}
                </p>
                <p className="text-[12px] text-white mt-0.5">
                  {incoming.length} pact invite{incoming.length === 1 ? '' : 's'} waiting on your reply
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex-shrink-0">
                Open →
              </span>
            </div>
          </Link>
        )}

        {/* Last league finish */}
        {snapshot && (
          <Link
            href="/friends-league"
            className="block rounded-xl border border-white/[0.04] hover:border-violet-500/30 transition-colors p-3"
            style={{
              background: snapshot.myRank <= 3
                ? 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(11,11,20,0.7) 70%)'
                : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  Last week ({snapshot.weekKey})
                </p>
                <p className="font-heading text-base font-bold text-white mt-0.5">
                  {snapshot.myRank === 1 && '👑 '}
                  #{snapshot.myRank} of {snapshot.standings.length}
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  {snapshot.myScore.toLocaleString()} XP
                  {snapshot.myReward > 0 && (
                    <>
                      <span className="text-slate-700 mx-1.5">·</span>
                      <span className="text-emerald-400">+{snapshot.myReward} fragments</span>
                    </>
                  )}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 flex-shrink-0">
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
