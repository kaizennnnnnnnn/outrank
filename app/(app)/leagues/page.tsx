'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { createDocument, setDocument, Timestamp } from '@/lib/firestore';
import { sanitize } from '@/lib/security';
import { generateInviteCode } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { League } from '@/types/league';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

export default function LeaguesPage() {
  const { user } = useAuth();
  const { data: leagues, loading } = useCollection<League>('leagues', [], !!user);
  const addToast = useUIStore((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const inviteCode = generateInviteCode();
      const leagueId = await createDocument('leagues', {
        name: sanitize(name),
        description: sanitize(description),
        creatorId: user.uid,
        inviteCode,
        isPrivate: true,
        memberCount: 1,
        avatarUrl: '',
        pinnedMessage: '',
      });

      await setDocument(`leagues/${leagueId}/members`, user.uid, {
        userId: user.uid,
        role: 'admin',
        joinedAt: Timestamp.now(),
        totalXP: 0,
      });

      setShowCreate(false);
      setName('');
      setDescription('');
      addToast({ type: 'success', message: `League created! Invite code: ${inviteCode}` });
    } catch {
      addToast({ type: 'error', message: 'Failed to create league' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Private Leagues" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Private Leagues
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Leagues</em>
            </h1>
            <button
              onClick={() => setShowCreate(true)}
              className="font-body"
              style={{
                fontSize: 10,
                padding: '6px 12px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              + Create
            </button>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Create or join private competition groups.
          </p>

          {/* Section divider */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 12,
              borderTop: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
              The Roster
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(leagues.length).padStart(2, '0')}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : leagues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                No leagues yet.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto' }}
              >
                Create a league and invite friends to compete as a group.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="font-body"
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  padding: '8px 14px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--b-paper)',
                  background: 'var(--b-ink)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Create league →
              </button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {leagues.map((league, i) => (
                <li key={league.id}>
                  <Link
                    href={`/leagues/${league.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '14px 0',
                      borderBottom: '1px solid var(--b-rule)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      className="font-mono tabular"
                      style={{
                        fontSize: 11,
                        color: 'var(--b-ink-40)',
                        textAlign: 'right',
                        paddingTop: 4,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-display"
                        style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
                      >
                        {league.name}
                      </div>
                      <div
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.04em' }}
                      >
                        {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
                      </div>
                      {league.description && (
                        <p
                          className="font-body"
                          style={{
                            fontSize: 12,
                            color: 'var(--b-ink-60)',
                            marginTop: 6,
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {league.description}
                        </p>
                      )}
                    </div>
                    <span
                      className="font-body"
                      style={{
                        fontSize: 10,
                        color: 'var(--b-ink-60)',
                        letterSpacing: '0.08em',
                        paddingTop: 4,
                      }}
                    >
                      ENTER →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create League Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create League">
        <div className="space-y-4">
          <Input
            label="League Name"
            placeholder="My Squad"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label
              className="block font-body"
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--b-ink)', marginBottom: 6 }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full font-body"
              style={{
                background: 'transparent',
                border: '1px solid var(--b-ink)',
                padding: '8px 10px',
                fontSize: 13,
                color: 'var(--b-ink)',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              placeholder="What's this league about?"
            />
          </div>
          <Button className="w-full" onClick={handleCreate} loading={creating} disabled={!name.trim()}>
            Create League
          </Button>
        </div>
      </Modal>
    </div>
  );
}
