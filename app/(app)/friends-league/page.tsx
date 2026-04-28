'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFriendsLeague, useLastFriendsLeagueSnapshot } from '@/hooks/useFriendsLeague';
import { LeagueRow } from '@/components/friendsLeague/LeagueRow';
import { LastWeekBanner } from '@/components/friendsLeague/LastWeekBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityIcon } from '@/components/ui/AppIcons';
import { isoWeekRange, formatIsoDate } from '@/lib/friendsLeague';

export default function FriendsLeaguePage() {
  const { user } = useAuth();
  const { entries, myRank, myScore, loading, weekKey } = useFriendsLeague();
  const { snapshot } = useLastFriendsLeagueSnapshot();

  const range = isoWeekRange();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(168,85,247,0.18), transparent 55%),' +
            'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(249,115,22,0.10), transparent 60%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(168,85,247,0.25)',
          boxShadow: '0 0 30px -14px rgba(168,85,247,0.4), inset 0 1px 0 rgba(168,85,247,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400">
              Friends League
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1 leading-none">
              {weekKey}
            </h1>
            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-md">
              You + your friends, ranked by this week&rsquo;s XP. Top 3 split fragments when the week
              settles Sunday → Monday.
            </p>
            <p className="text-[10px] font-mono text-slate-600 mt-2">
              {formatIsoDate(range.start)} → {formatIsoDate(range.end)} (UTC)
            </p>
          </div>
          {!loading && myRank > 0 && (
            <div className="text-right shrink-0">
              <p className="font-heading text-3xl font-bold leading-none">
                <span
                  className={
                    myRank <= 3
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300'
                      : 'text-white'
                  }
                >
                  #{myRank}
                </span>
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">
                {myScore.toLocaleString()} XP
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Last week's settlement, if any */}
      {snapshot && <LastWeekBanner snapshot={snapshot} />}

      {/* This week's live standings */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : entries.length <= 1 ? (
        <EmptyState
          icon={<ActivityIcon size={40} className="text-violet-400" />}
          title="Your league is just you"
          description="Add at least 2 friends to compete. Top 3 split fragments at week end."
          action={
            <Link href="/friends" className="text-orange-400 hover:underline text-sm">
              Find friends →
            </Link>
          }
        />
      ) : (
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">
              This week
            </p>
            <span className="text-[10px] font-mono text-slate-500 ml-1">
              · {entries.length} member{entries.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
            {entries.map((entry) => (
              <LeagueRow
                key={entry.userId}
                entry={entry}
                isMe={entry.userId === user?.uid}
                showRewardPreview={entries.length >= 3}
              />
            ))}
          </div>
          <p className="text-[10px] font-mono text-slate-600 mt-3 text-center">
            Settles Monday 00:00 UTC. Standings refresh as your friends log.
          </p>
        </section>
      )}
    </div>
  );
}
