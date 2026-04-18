'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount?: number;
}

// Seeded built-in groups — pre-written so every user sees the same set even
// before any custom groups are created by users.
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

  // Subscribe to my memberships via a collection-group-ish approach:
  // iterate through BUILTIN_GROUPS and check member docs.
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

  // Also fetch member counts (non-realtime, one-shot)
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
      // Ensure the parent group document exists (it's ok to set repeatedly)
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Groups</h1>
        <p className="text-sm text-slate-500">Self-join communities. See who shares your grind.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : BUILTIN_GROUPS.map((g) => {
              const joined = myMemberships.includes(g.id);
              const count = counts[g.id] ?? 0;
              return (
                <div
                  key={g.id}
                  className={cn('relative overflow-hidden rounded-2xl p-4 transition-all')}
                  style={{
                    background: `linear-gradient(145deg, ${g.color}14, #0b0b14 55%)`,
                    border: `1px solid ${joined ? g.color + '80' : g.color + '30'}`,
                    boxShadow: joined ? `0 0 18px -6px ${g.color}80` : undefined,
                  }}
                >
                  <div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-[0.12] blur-3xl pointer-events-none"
                    style={{ background: g.color }}
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white">{g.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{g.description}</p>
                      <p className="text-[10px] text-slate-600 mt-2">
                        {count} {count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={joined ? 'secondary' : 'primary'}
                      onClick={() => joined ? leave(g) : join(g)}
                    >
                      {joined ? 'Leave' : 'Join'}
                    </Button>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
