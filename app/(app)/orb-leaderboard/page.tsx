'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { getDocument } from '@/lib/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOrbTier } from '@/constants/orbTiers';
import { UserProfile } from '@/types/user';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

interface OrbRanking {
  userId: string;
  username: string;
  avatarUrl: string;
  orbTier: number;
  orbEnergy: number;
  fragments: number;
  tierName: string;
  score: number;
}

const ROMANS = ['I', 'II', 'III'];

export default function OrbLeaderboardPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [rankings, setRankings] = useState<OrbRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchRankings() {
      const entries: OrbRanking[] = [];

      const ud = user as unknown as Record<string, unknown>;
      entries.push({
        userId: user!.uid,
        username: user!.username,
        avatarUrl: user!.avatarUrl || '',
        orbTier: (ud.orbTier as number) || 1,
        orbEnergy: (ud.orbEnergy as number) || 50,
        fragments: (ud.fragments as number) || 0,
        tierName: getOrbTier((ud.orbTier as number) || 1).name,
        score: ((ud.orbTier as number) || 1) * 100 + ((ud.orbEnergy as number) || 50),
      });

      for (const f of friends) {
        try {
          const profile = await getDocument<UserProfile>('users', f.id);
          if (profile) {
            const pd = profile as unknown as Record<string, unknown>;
            entries.push({
              userId: f.id,
              username: profile.username,
              avatarUrl: profile.avatarUrl || '',
              orbTier: (pd.orbTier as number) || 1,
              orbEnergy: (pd.orbEnergy as number) || 50,
              fragments: (pd.fragments as number) || 0,
              tierName: getOrbTier((pd.orbTier as number) || 1).name,
              score: ((pd.orbTier as number) || 1) * 100 + ((pd.orbEnergy as number) || 50),
            });
          }
        } catch { /* skip */ }
      }

      entries.sort((a, b) => b.score - a.score);
      setRankings(entries);
      setLoading(false);
    }

    fetchRankings();
  }, [user, friends]);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Orb Rankings" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Soul Orb · Friends-only
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Orb Rankings</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Compete for the strongest Soul Orb among friends.
          </p>

          {/* Prize banner */}
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              border: '1px solid var(--b-ink)',
              borderTop: '2px solid #fbbf24',
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: '#fbbf24' }}>
              Weekly Prize
            </div>
            <p
              className="font-body"
              style={{ fontSize: 12, color: 'var(--b-ink)', marginTop: 4, lineHeight: 1.5 }}
            >
              #1 gets <b>50 fragments</b> + exclusive badge. Top 3 get <b>25 fragments</b>.
            </p>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
              The Roll
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(rankings.length).padStart(2, '0')}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : rankings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500 }}
              >
                No rankings yet.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rankings.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.userId === user?.uid;
                const isPodium = rank <= 3;
                const tierConfig = getOrbTier(entry.orbTier);
                const rankLabel = isPodium ? ROMANS[rank - 1] : String(rank);
                return (
                  <li
                    key={entry.userId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--b-rule)',
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
                      }}
                    >
                      {rankLabel}
                    </div>
                    <Link
                      href={`/profile/${entry.username}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <Avatar src={entry.avatarUrl} alt={entry.username} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 14,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            lineHeight: 1.1,
                            color: isMe ? 'var(--b-accent)' : 'var(--b-ink)',
                          }}
                        >
                          {entry.username}
                          {isMe && (
                            <span
                              className="spread"
                              style={{ fontSize: 8, color: 'var(--b-accent)', marginLeft: 6 }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <div
                          className="font-body tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 1 }}
                        >
                          {entry.tierName} · {entry.orbEnergy}% energy · {entry.fragments} fragments
                        </div>
                      </div>
                    </Link>
                    <div
                      className="font-display tabular"
                      style={{
                        fontSize: 16,
                        fontStyle: 'italic',
                        fontWeight: 500,
                        color: tierConfig.colors.mid,
                      }}
                    >
                      T{entry.orbTier}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
