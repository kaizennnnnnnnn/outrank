'use client';

import { useState } from 'react';
import { UserProfile } from '@/types/user';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { sanitize } from '@/lib/security';

interface Props { user: UserProfile; }

/**
 * Lightweight mood model: derives from how recently the user logged
 * anything (lastActiveAt). Happy within 24h, neutral within 72h, sulky
 * beyond that. Computed client-side so it updates live.
 */
function moodFor(lastActiveMs: number | null): { label: string; color: string; face: string } {
  if (!lastActiveMs) return { label: 'Curious', color: '#94a3b8', face: '•ᴗ•' };
  const gapH = (Date.now() - lastActiveMs) / 3_600_000;
  if (gapH < 24)  return { label: 'Happy',  color: '#f97316', face: '◕ᴗ◕' };
  if (gapH < 72)  return { label: 'Drifting', color: '#fbbf24', face: '⩌_⩌' };
  return { label: 'Sulking', color: '#64748b', face: '•︵•' };
}

export function OrbNickname({ user }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const userRaw = user as unknown as Record<string, unknown>;
  const currentName = (userRaw.orbName as string) || 'Orb';
  const lastActiveRaw = userRaw.lastActiveAt as { toDate?: () => Date } | undefined;
  const lastActive = lastActiveRaw?.toDate?.()?.getTime?.() ?? null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const mood = moodFor(lastActive);

  const save = async () => {
    const clean = sanitize(draft).slice(0, 20);
    if (!clean) return;
    setSaving(true);
    try {
      await updateDocument('users', user.uid, { orbName: clean });
      addToast({ type: 'success', message: `Orb renamed to ${clean}` });
      setEditing(false);
    } catch {
      addToast({ type: 'error', message: 'Could not rename' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 text-[11px]">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={20}
            className="w-28 bg-[#0b0b14] border border-orange-500/40 rounded px-2 py-1 text-xs text-white focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button onClick={save} disabled={saving} className="text-[10px] text-orange-400 hover:text-orange-300 font-bold">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-[10px] text-slate-500 hover:text-slate-300">Cancel</button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="font-heading font-semibold text-white hover:text-orange-400 transition-colors"
            title="Rename your orb"
          >
            {currentName}
          </button>
          <span
            className="px-1.5 py-0.5 rounded font-mono text-[10px] border"
            style={{ color: mood.color, background: `${mood.color}15`, borderColor: `${mood.color}45` }}
            title={`Mood: ${mood.label}`}
          >
            {mood.face} {mood.label}
          </span>
        </>
      )}
    </div>
  );
}
