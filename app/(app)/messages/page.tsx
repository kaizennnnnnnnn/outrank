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
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { UsersFullIcon } from '@/components/ui/AppIcons';
import { formatRelativeTime } from '@/lib/utils';

interface ThreadSummary {
  threadId: string;
  otherUid: string;
  lastMessage?: string;
  lastAt?: Timestamp;
  lastSenderId?: string;
  participants: string[];
  // Lazily loaded friend profile
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
    // Subscribe to threads that contain me
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
      // Hydrate friend profiles — sequential is fine at small N
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
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(236,72,153,0.22), transparent 55%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(236,72,153,0.25)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-pink-300">Direct</p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-0.5">Messages</h1>
        <p className="text-[11px] text-slate-500 mt-1">Chat one-on-one with your friends.</p>
      </div>

      {/* Start a new thread — friend picker */}
      {friends.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Start a chat
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {friends.slice(0, 20).map((f) => (
              <FriendQuickPick key={f.id} friendId={f.id} />
            ))}
          </div>
        </div>
      )}

      {/* Existing threads */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<UsersFullIcon size={40} className="text-pink-400" />}
          title="No messages yet"
          description="Tap a friend above to say hi."
        />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.threadId}
              href={`/messages/${t.otherUid}`}
              className="flex items-center gap-3 rounded-xl p-3 border border-[#1e1e30] bg-[#10101a] hover:bg-[#1a1a2a] transition-colors"
            >
              <FramedAvatar src={t.avatarUrl} alt={t.username || 'Friend'} size="md" frameId={t.frame} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <NamePlate name={t.username || 'Friend'} effectId={t.nameEffect} size="sm" />
                  {t.lastAt?.toDate && (
                    <span className="text-[10px] text-slate-600 font-mono">
                      {formatRelativeTime(t.lastAt.toDate())}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {t.lastSenderId === user?.uid && 'You: '}
                  {t.lastMessage || '…'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
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
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-[#10101a] border border-[#1e1e30] hover:border-pink-500/40 transition-colors shrink-0 w-16"
    >
      <FramedAvatar src={profile?.avatarUrl} alt={profile?.username || ''} size="sm" frameId={profile?.frame} />
      <span className="text-[10px] text-slate-400 truncate max-w-full">
        {profile?.username || '…'}
      </span>
    </Link>
  );
}
