'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, Timestamp,
} from 'firebase/firestore';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import { Masthead } from '@/components/editorial/Masthead';

interface ThreadSummary {
  threadId: string;
  otherUid: string;
  lastMessage?: string;
  lastAt?: Timestamp;
  lastSenderId?: string;
  participants: string[];
  username?: string;
  avatarUrl?: string;
  frame?: string;
  nameEffect?: string;
}

export default function MessagesIndex() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'messageThreads'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, async (snap) => {
      const rows: ThreadSummary[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const participants = (data.participants as string[]) || [];
        const otherUid = participants.find((p) => p !== user.uid) || '';
        return {
          threadId: d.id,
          otherUid,
          lastMessage: data.lastMessage as string | undefined,
          lastAt: data.lastAt as Timestamp | undefined,
          lastSenderId: data.lastSenderId as string | undefined,
          participants,
        };
      });
      for (const r of rows) {
        if (!r.otherUid) continue;
        try {
          const fsnap = await getDoc(doc(db, 'users', r.otherUid));
          if (fsnap.exists()) {
            const fd = fsnap.data() as Record<string, unknown>;
            r.username   = (fd.username as string) || 'Friend';
            r.avatarUrl  = fd.avatarUrl as string | undefined;
            r.frame      = fd.equippedFrame as string | undefined;
            r.nameEffect = fd.equippedNameEffect as string | undefined;
          }
        } catch { /* skip on failure */ }
      }
      setThreads(rows);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Direct" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Direct
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Messages</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Chat one-on-one with your friends.
          </p>

          {/* Quick picks */}
          {friends.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
              >
                Start a chat
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollbarWidth: 'none',
                }}
              >
                {friends.slice(0, 20).map((f) => (
                  <FriendQuickPick key={f.id} friendId={f.id} />
                ))}
              </div>
            </div>
          )}

          {/* Section header */}
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
            <div
              className="font-display"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
            >
              Open Threads
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
            >
              § {String(threads.length).padStart(2, '0')}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : threads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                No messages yet.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
              >
                Tap a friend above to say hi.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {threads.map((t) => (
                <li key={t.threadId}>
                  <Link
                    href={`/messages/${t.otherUid}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--b-rule)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <FramedAvatar src={t.avatarUrl} alt={t.username || 'Friend'} size="md" frameId={t.frame} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                        <NamePlate name={t.username || 'Friend'} effectId={t.nameEffect} size="sm" />
                        {t.lastAt?.toDate && (
                          <span
                            className="font-mono tabular"
                            style={{ fontSize: 9, color: 'var(--b-ink-40)' }}
                          >
                            {formatRelativeTime(t.lastAt.toDate())}
                          </span>
                        )}
                      </div>
                      <p
                        className="font-body"
                        style={{
                          fontSize: 12,
                          color: 'var(--b-ink-60)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.lastSenderId === user?.uid && (
                          <em style={{ color: 'var(--b-ink-40)', fontStyle: 'italic' }}>You: </em>
                        )}
                        {t.lastMessage || '…'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendQuickPick({ friendId }: { friendId: string }) {
  const [profile, setProfile] = useState<{ username?: string; avatarUrl?: string; frame?: string } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', friendId));
        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>;
          setProfile({
            username: d.username as string,
            avatarUrl: d.avatarUrl as string,
            frame: d.equippedFrame as string,
          });
        }
      } catch { /* ignore */ }
    })();
  }, [friendId]);
  return (
    <Link
      href={`/messages/${friendId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 6px',
        textDecoration: 'none',
        color: 'inherit',
        flexShrink: 0,
        width: 64,
        border: '1px solid var(--b-rule)',
      }}
    >
      <FramedAvatar src={profile?.avatarUrl} alt={profile?.username || ''} size="sm" frameId={profile?.frame} />
      <span
        className="font-body"
        style={{
          fontSize: 9,
          color: 'var(--b-ink-60)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}
      >
        {profile?.username || '…'}
      </span>
    </Link>
  );
}
