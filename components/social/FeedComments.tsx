'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import { sanitize } from '@/lib/security';
import { haptic } from '@/lib/haptics';

interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAt: Timestamp | null;
}

interface Props {
  originId: string;   // shared feed-item id (matches reactions/{originId})
  actorId: string;    // who posted the original feed item
}

/**
 * Comment thread attached to a feed item. Stored as a subcollection at
 * `reactions/{originId}/comments/{commentId}` so all copies of the feed
 * item share the same conversation.
 */
export function FeedComments({ originId, actorId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!originId) return;
    const q = query(
      collection(db, `reactions/${originId}/comments`),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: Comment[] = snap.docs.map((d) => ({
        id: d.id,
        authorId: d.data().authorId,
        authorUsername: d.data().authorUsername,
        authorAvatar: d.data().authorAvatar,
        text: d.data().text,
        createdAt: d.data().createdAt,
      }));
      setComments(rows);
    });
    return unsub;
  }, [originId]);

  const send = async () => {
    if (!user || !originId) return;
    const clean = sanitize(text).slice(0, 240).trim();
    if (!clean) return;
    setSending(true);
    haptic('tap');
    try {
      await addDoc(collection(db, `reactions/${originId}/comments`), {
        authorId: user.uid,
        authorUsername: user.username,
        authorAvatar: user.avatarUrl || '',
        text: clean,
        createdAt: serverTimestamp(),
      });
      // Notify the original poster (unless it's us)
      if (actorId && actorId !== user.uid) {
        try {
          await addDoc(collection(db, `notifications/${actorId}/items`), {
            type: 'comment',
            message: `${user.username} commented: "${clean.slice(0, 60)}${clean.length > 60 ? '…' : ''}"`,
            isRead: false,
            relatedId: originId,
            actorId: user.uid,
            actorAvatar: user.avatarUrl || '',
            createdAt: Timestamp.now(),
          });
        } catch { /* silent */ }
      }
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-slate-500 hover:text-orange-400 transition-colors"
      >
        {comments.length > 0
          ? `${open ? 'Hide' : 'Show'} ${comments.length} comment${comments.length === 1 ? '' : 's'}`
          : open ? 'Close' : 'Add a comment'}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.authorAvatar} alt={c.authorUsername} size="sm" />
              <div className="flex-1 min-w-0 bg-[#0b0b14] border border-[#1e1e30] rounded-xl px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate">{c.authorUsername}</p>
                  <p className="text-[9px] text-slate-600">
                    {c.createdAt?.toDate?.() ? formatRelativeTime(c.createdAt.toDate()) : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-300 break-words">{c.text}</p>
              </div>
            </div>
          ))}

          {user && (
            <div className="flex gap-2 items-start">
              <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
              <div className="flex-1 flex gap-1.5">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Say something..."
                  maxLength={240}
                  className="flex-1 bg-[#0b0b14] border border-[#1e1e30] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/40"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 disabled:opacity-40 px-2"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
