'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp } from 'firebase/firestore';
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
  originId: string;
  actorId?: string;
}

/**
 * Comment thread for a feed item. Stored as a subcollection at
 * `reactions/{originId}/comments/{commentId}` so all copies of the
 * same item (one per friend's feed) share the conversation.
 *
 * Open/close is managed by the parent (the editorial feed page), so
 * this component just renders the list + input when mounted. Uses
 * the editorial paper/ink palette.
 */
export function FeedComments({ originId, actorId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
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
        // Client timestamp on writes (see send) — comments appear in
        // the ordered query as soon as the optimistic write lands.
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
      // Client timestamp because serverTimestamp() leaves the field
      // null while pending, hiding the doc from the orderBy query
      // until the server round-trip completes.
      await addDoc(collection(db, `reactions/${originId}/comments`), {
        authorId: user.uid,
        authorUsername: user.username,
        authorAvatar: user.avatarUrl || '',
        text: clean,
        createdAt: Timestamp.now(),
      });
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {comments.length === 0 ? (
        <p
          className="font-body"
          style={{ fontSize: 11, color: 'var(--b-ink-40)', fontStyle: 'italic', margin: 0 }}
        >
          Be the first to comment.
        </p>
      ) : (
        comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 8 }}>
            <Avatar src={c.authorAvatar} alt={c.authorUsername} size="sm" />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                border: '1px solid var(--b-rule)',
                padding: '6px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  className="font-display"
                  style={{ fontSize: 12, fontStyle: 'italic', fontWeight: 500 }}
                >
                  {c.authorUsername}
                </span>
                <span
                  className="font-mono tabular"
                  style={{ fontSize: 9, color: 'var(--b-ink-40)' }}
                >
                  {c.createdAt?.toDate?.() ? formatRelativeTime(c.createdAt.toDate()) : ''}
                </span>
              </div>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink)', margin: '2px 0 0', lineHeight: 1.45, wordBreak: 'break-word' }}
              >
                {c.text}
              </p>
            </div>
          </div>
        ))
      )}

      {user && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
          <Avatar src={user.avatarUrl} alt={user.username} size="sm" />
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Say something..."
              maxLength={240}
              className="font-body"
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid var(--b-ink)',
                padding: '6px 10px',
                fontSize: 12,
                color: 'var(--b-ink)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--b-accent)',
                background: 'transparent',
                border: 'none',
                cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
                padding: '0 8px',
                opacity: sending || !text.trim() ? 0.4 : 1,
              }}
            >
              {sending ? '…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
