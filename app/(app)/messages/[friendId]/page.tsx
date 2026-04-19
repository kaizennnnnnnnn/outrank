'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  collection, doc, onSnapshot, orderBy, query, addDoc, setDoc, getDoc,
  serverTimestamp, limit, Timestamp,
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

  // Load the friend profile once
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

  // Subscribe to the thread's messages
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

  // Autoscroll to newest on new messages
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
      // Ensure thread metadata doc exists (setDoc+merge — create or update).
      // Write messages first so the message count doesn't lag behind lastAt
      // if the thread write fails but the message write succeeds.
      await addDoc(collection(db, `messages/${threadId}/items`), {
        senderId: user.uid,
        content: text,
        createdAt: serverTimestamp(),
        participants: [user.uid, friend.uid],
      });
      await setDoc(
        doc(db, `messageThreads/${threadId}`),
        {
          participants: [user.uid, friend.uid],
          lastMessage: text.slice(0, 140),
          lastAt: serverTimestamp(),
          lastSenderId: user.uid,
        },
        { merge: true },
      );
      setDraft('');
    } catch (err) {
      // Surface the failure — previously swallowed, which is why "click
      // send and nothing happens" was the user-visible symptom.
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
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border mb-3 shrink-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(236,72,153,0.18), transparent 55%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(236,72,153,0.25)',
        }}
      >
        <div className="flex items-center gap-3 p-4">
          <Link href="/friends" className="p-1.5 rounded-lg hover:bg-[#1e1e30] transition-colors" aria-label="Back">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          {friend ? (
            <Link href={`/profile/${friend.username}`} className="flex items-center gap-3 min-w-0 flex-1">
              <FramedAvatar src={friend.avatarUrl} alt={friend.username} size="md" frameId={friend.equippedFrame} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink-300">Messaging</p>
                <span className="min-w-0 truncate">
                  <NamePlate name={friend.username} effectId={friend.equippedNameEffect} size="md" />
                </span>
              </div>
            </Link>
          ) : (
            <Skeleton className="h-10 w-48 rounded" />
          )}
        </div>
      </div>

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 px-1 pb-2"
      >
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn('h-10 rounded-xl', i % 2 === 0 ? 'w-2/3' : 'w-1/2 ml-auto')} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heading text-lg text-white">Say hi 👋</p>
            <p className="text-xs text-slate-500 mt-1">
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
                  <p className="text-center text-[10px] text-slate-600 font-mono py-2">
                    {formatRelativeTime(m.createdAt.toDate())}
                  </p>
                )}
                <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      mine
                        ? 'bg-gradient-to-br from-red-600 to-orange-500 text-white rounded-br-sm'
                        : 'bg-[#18182a] text-slate-200 rounded-bl-sm border border-[#2d2d45]',
                    )}
                    style={
                      mine
                        ? { boxShadow: '0 6px 20px -10px rgba(239,68,68,0.6)' }
                        : undefined
                    }
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
        className="shrink-0 rounded-2xl border p-2 flex items-end gap-2"
        style={{
          background: 'linear-gradient(145deg, #10101a, #0b0b14)',
          borderColor: '#1e1e30',
        }}
      >
        <textarea
          rows={1}
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder:text-slate-600 min-h-[36px] max-h-32 p-2 font-body"
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
      <p className="text-[10px] text-slate-600 text-center mt-1">
        {draft.length}/{MAX_LEN}
      </p>
    </div>
  );
}
