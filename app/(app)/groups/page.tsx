'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, getDocs, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Masthead } from '@/components/editorial/Masthead';

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount?: number;
}

const BUILTIN_GROUPS: Group[] = [
  { id: 'early-risers',  name: 'Early Risers',  description: 'Log before 7 AM.',            color: '#f59e0b' },
  { id: 'runners',       name: 'Runners',       description: 'Chase the kilometers.',       color: '#f97316' },
  { id: 'no-fap',        name: 'No-Fap',        description: 'Discipline over impulse.',    color: '#a855f7' },
  { id: 'cold-plunge',   name: 'Cold Plunge',   description: 'Cold showers. No excuses.',   color: '#06b6d4' },
  { id: 'coders',        name: 'Coders',        description: 'Ship commits daily.',         color: '#3b82f6' },
  { id: 'readers',       name: 'Readers',       description: 'Pages or nothing.',           color: '#ec4899' },
  { id: 'meditators',    name: 'Meditators',    description: 'Stillness, tracked.',         color: '#22c55e' },
  { id: 'gym-rats',      name: 'Gym Rats',      description: 'Iron is earned.',             color: '#ef4444' },
  { id: 'savers',        name: 'Savers',        description: 'Watch the balance grow.',     color: '#10b981' },
];

export default function GroupsPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [myMemberships, setMyMemberships] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const unsubs = BUILTIN_GROUPS.map((g) =>
      onSnapshot(doc(db, `groups/${g.id}/members/${user.uid}`), (snap) => {
        setMyMemberships((prev) => {
          if (snap.exists()) return prev.includes(g.id) ? prev : [...prev, g.id];
          return prev.filter((id) => id !== g.id);
        });
      })
    );
    setLoading(false);
    return () => { unsubs.forEach((u) => u()); };
  }, [user]);

  useEffect(() => {
    (async () => {
      const c: Record<string, number> = {};
      for (const g of BUILTIN_GROUPS) {
        try {
          const snap = await getDocs(query(collection(db, `groups/${g.id}/members`)));
          c[g.id] = snap.size;
        } catch { c[g.id] = 0; }
      }
      setCounts(c);
    })();
  }, []);

  const join = async (g: Group) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `groups/${g.id}/members/${user.uid}`), {
        username: user.username,
        avatarUrl: user.avatarUrl || '',
        joinedAt: Timestamp.now(),
      });
      await setDoc(doc(db, `groups/${g.id}`), {
        name: g.name, description: g.description, color: g.color, isBuiltin: true,
      }, { merge: true } as { merge?: boolean });
      addToast({ type: 'success', message: `Joined ${g.name}` });
    } catch {
      addToast({ type: 'error', message: 'Could not join group' });
    }
  };

  const leave = async (g: Group) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `groups/${g.id}/members/${user.uid}`));
      addToast({ type: 'info', message: `Left ${g.name}` });
    } catch {
      addToast({ type: 'error', message: 'Could not leave group' });
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Communities" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Communities
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Groups</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Self-join communities. See who shares your grind.
          </p>

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
              § {String(BUILTIN_GROUPS.length).padStart(2, '0')}
            </div>
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {loading
              ? [1, 2, 3, 4].map((i) => (
                  <li key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--b-rule)' }}>
                    <Skeleton className="h-12" />
                  </li>
                ))
              : BUILTIN_GROUPS.map((g, i) => {
                  const joined = myMemberships.includes(g.id);
                  const count = counts[g.id] ?? 0;
                  return (
                    <li
                      key={g.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '14px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        borderLeft: joined ? `3px solid ${g.color}` : 'none',
                        paddingLeft: joined ? 8 : 0,
                      }}
                    >
                      <div
                        className="font-mono tabular"
                        style={{
                          fontSize: 11,
                          color: 'var(--b-ink-40)',
                          textAlign: 'right',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="font-display"
                          style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1, color: g.color }}
                        >
                          {g.name}
                        </div>
                        <div
                          className="font-body"
                          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2, lineHeight: 1.4 }}
                        >
                          {g.description}
                        </div>
                        <div
                          className="font-mono tabular"
                          style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 4, letterSpacing: '0.04em' }}
                        >
                          {count} {count === 1 ? 'member' : 'members'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={joined ? 'secondary' : 'primary'}
                        onClick={() => joined ? leave(g) : join(g)}
                      >
                        {joined ? 'Leave' : 'Join'}
                      </Button>
                    </li>
                  );
                })}
          </ul>
        </div>
      </div>
    </div>
  );
}
