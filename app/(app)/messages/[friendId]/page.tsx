'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection, doc, onSnapshot, orderBy, query, addDoc, setDoc, getDoc,
  limit, Timestamp,
} from 'firebase/firestore';
import { threadIdFor } from '@/lib/messaging';
import { sanitize } from '@/lib/security';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime, cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt?: Timestamp;
  participants: [string, string];
}

interface FriendProfile {
  uid: string;
  username: string;
  avatarUrl?: string;
  equippedFrame?: string;
  equippedNameEffect?: string;
}

const MAX_LEN = 500;

export default function DirectMessageThread({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = use(params);
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadId = user ? threadIdFor(user.uid, friendId) : null;

  useEffect(() => {
    if (!friendId) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', friendId));
      if (snap.exists()) {
        const d = snap.data() as Record<string, unknown>;
        setFriend({
          uid: friendId,
          username: (d.username as string) || 'Friend',
          avatarUrl: d.avatarUrl as string | undefined,
          equippedFrame: d.equippedFrame as string | undefined,
          equippedNameEffect: d.equippedNameEffect as string | undefined,
        });
      }
    })();
  }, [friendId]);

  useEffect(() => {
    if (!threadId) return;
    const q = query(
      collection(db, `messages/${threadId}/items`),
      orderBy('createdAt', 'asc'),
      limit(200),
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));
      setMessages(arr);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [threadId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    if (!user) {
      addToast({ type: 'error', message: 'Not signed in' });
      return;
    }
    if (!threadId || !friend) {
      addToast({ type: 'error', message: 'Could not load friend — refresh the page.' });
      return;
    }
    const text = sanitize(draft).slice(0, MAX_LEN).trim();
    if (!text) return;

    setSending(true);
    try {
      // Client timestamp because serverTimestamp() leaves the field null
      // while pending, hiding the doc from the orderBy('createdAt') query
      // until the server round-trip completes.
      const now = Timestamp.now();
      await addDoc(collection(db, `messages/${threadId}/items`), {
        senderId: user.uid,
        content: text,
        createdAt: now,
        participants: [user.uid, friend.uid],
      });
      await setDoc(
        doc(db, `messageThreads/${threadId}`),
        {
          participants: [user.uid, friend.uid],
          lastMessage: text.slice(0, 140),
          lastAt: now,
          lastSenderId: user.uid,
        },
        { merge: true },
      );
      setDraft('');
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error('Message send failed:', err);
      const isPermission =
        rawMsg.toLowerCase().includes('permission') ||
        rawMsg.toLowerCase().includes('insufficient');
      addToast({
        type: 'error',
        message: isPermission
          ? 'Messaging blocked by server rules. Admin must deploy the latest firestore.rules.'
          : `Couldn't send: ${rawMsg.slice(0, 120)}`,
      });
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!user) return null;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div
        className="max-w-2xl mx-auto"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 8rem)',
          padding: '14px 22px 22px',
        }}
      >
        {/* Header */}
        <div
          style={{
            paddingBottom: 12,
            borderBottom: '1px solid var(--b-ink)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/messages"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--b-ink-60)',
                textDecoration: 'none',
                padding: 4,
              }}
              aria-label="Back"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            {friend ? (
              <Link
                href={`/profile/${friend.username}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <FramedAvatar src={friend.avatarUrl} alt={friend.username} size="md" frameId={friend.equippedFrame} />
                <div style={{ minWidth: 0 }}>
                  <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                    Messaging
                  </div>
                  <div
                    className="font-display"
                    style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1, marginTop: 2 }}
                  >
                    <NamePlate name={friend.username} effectId={friend.equippedNameEffect} size="md" />
                  </div>
                </div>
              </Link>
            ) : (
              <Skeleton className="h-10 w-48" />
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className={cn('h-10', i % 2 === 0 ? 'w-2/3' : 'w-1/2 ml-auto')}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500 }}
              >
                Say hi.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 4 }}
              >
                Messages are between just the two of you.
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const mine = m.senderId === user.uid;
              const prev = messages[i - 1];
              const showTime = !prev || !m.createdAt || !prev.createdAt
                || (m.createdAt.toMillis() - prev.createdAt.toMillis() > 5 * 60 * 1000);
              return (
                <div key={m.id}>
                  {showTime && m.createdAt?.toDate && (
                    <div
                      className="font-mono tabular"
                      style={{
                        textAlign: 'center',
                        fontSize: 9,
                        color: 'var(--b-ink-40)',
                        padding: '6px 0',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {formatRelativeTime(m.createdAt.toDate())}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      className="font-body"
                      style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        fontSize: 13,
                        lineHeight: 1.5,
                        // Mine: filled-ink card, paper text. Theirs: paper-
                        // tint card with a clearly-visible ink-15 hairline.
                        // Earlier attempt used `transparent` + var(--b-rule)
                        // (12%) which read as invisible on dark mode — the
                        // message text floated in the void with no bubble
                        // shape, making messages look like they hadn't
                        // arrived at all.
                        background: mine ? 'var(--b-ink)' : 'var(--b-paper-2)',
                        color: mine ? 'var(--b-paper)' : 'var(--b-ink)',
                        border: mine ? '1px solid var(--b-ink)' : '1px solid var(--b-ink-15)',
                        borderLeft: mine
                          ? '1px solid var(--b-ink)'
                          : '3px solid var(--b-accent)',
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            padding: 8,
            border: '1px solid var(--b-ink)',
          }}
        >
          <textarea
            rows={1}
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={onKeyDown}
            className="font-body"
            style={{
              flex: 1,
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--b-ink)',
              minHeight: 36,
              maxHeight: 128,
              padding: 4,
              border: 'none',
              fontFamily: 'inherit',
            }}
          />
          <Button
            size="sm"
            onClick={send}
            loading={sending}
            disabled={!draft.trim()}
          >
            Send
          </Button>
        </div>
        <div
          className="font-mono tabular"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-40)',
            textAlign: 'center',
            marginTop: 6,
          }}
        >
          {draft.length}/{MAX_LEN}
        </div>
      </div>
    </div>
  );
}
