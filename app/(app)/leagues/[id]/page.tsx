'use client';

import { use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDocument, useCollection } from '@/hooks/useFirestore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { orderBy } from '@/lib/firestore';
import { League, LeagueMember } from '@/types/league';
import { useUIStore } from '@/store/uiStore';
import { Masthead } from '@/components/editorial/Masthead';

const ROMANS = ['I', 'II', 'III'];

export default function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const { data: league, loading } = useDocument<League>('leagues', id);
  const { data: members, loading: membersLoading } = useCollection<LeagueMember>(
    `leagues/${id}/members`,
    [orderBy('totalXP', 'desc')],
    true
  );

  if (loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            League not found.
          </p>
        </div>
      </div>
    );
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/leagues/join/${league.inviteCode}`);
    addToast({ type: 'success', message: 'Invite link copied!' });
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Private League" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Private League
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>{league.name}</em>
            </h1>
            <Button size="sm" variant="secondary" onClick={copyInvite}>
              Share invite
            </Button>
          </div>
          <p
            className="font-body tabular"
            style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
          >
            {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
          </p>
          {league.description && (
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--b-ink-60)',
                marginTop: 8,
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              {league.description}
            </p>
          )}

          {league.pinnedMessage && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                border: '1px solid #fbbf24',
                borderLeft: '3px solid #fbbf24',
                background: 'rgba(251,191,36,0.04)',
              }}
            >
              <div className="spread" style={{ fontSize: 8, color: '#fbbf24', marginBottom: 4 }}>
                Pinned
              </div>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink)', lineHeight: 1.5 }}
              >
                {league.pinnedMessage}
              </p>
            </div>
          )}

          {/* Roster section */}
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
            <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
              The Roster
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(members.length).padStart(2, '0')}
            </div>
          </div>

          {membersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 500 }}
              >
                No members yet.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {members.map((member, i) => {
                const rank = i + 1;
                const isMe = member.userId === user?.uid;
                const isPodium = rank <= 3;
                const rankLabel = isPodium ? ROMANS[rank - 1] : String(rank);
                return (
                  <li
                    key={member.userId}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Avatar src={member.avatarUrl} alt={member.username || 'User'} size="sm" />
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
                          {member.username || member.userId}
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
                          className="font-mono"
                          style={{
                            fontSize: 9,
                            color: 'var(--b-ink-40)',
                            marginTop: 1,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </div>
                      </div>
                    </div>
                    <span
                      className="font-mono tabular"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {member.totalXP.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Invite code */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
            }}
          >
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
            >
              Invite code
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--b-ink)',
                padding: '8px 10px',
              }}
            >
              <code
                className="font-mono"
                style={{ flex: 1, fontSize: 13, color: 'var(--b-accent)', letterSpacing: '0.08em' }}
              >
                {league.inviteCode}
              </code>
              <Button size="sm" onClick={copyInvite}>Copy</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
