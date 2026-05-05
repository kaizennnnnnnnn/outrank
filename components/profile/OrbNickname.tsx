'use client';

import { useState } from 'react';
import { UserProfile } from '@/types/user';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { sanitize } from '@/lib/security';

interface Props { user: UserProfile; }

/**
 * Lightweight mood model: derives from how recently the user logged
 * anything (lastActiveAt). Happy within 24h, drifting within 72h, sulking
 * beyond that. Computed client-side so it updates live.
 */
function moodFor(lastActiveMs: number | null): { label: string; face: string } {
  if (!lastActiveMs) return { label: 'Curious', face: '•ᴗ•' };
  const gapH = (Date.now() - lastActiveMs) / 3_600_000;
  if (gapH < 24)  return { label: 'Happy',    face: '◕ᴗ◕' };
  if (gapH < 72)  return { label: 'Drifting', face: '⩌_⩌' };
  return            { label: 'Sulking',  face: '•︵•' };
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={20}
            className="font-body"
            style={{
              width: 124,
              background: 'transparent',
              border: '1px solid var(--b-ink)',
              padding: '4px 8px',
              fontSize: 12,
              color: 'var(--b-ink)',
              outline: 'none',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button
            onClick={save}
            disabled={saving}
            className="spread"
            style={{
              fontSize: 9,
              color: 'var(--b-accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="spread"
            style={{
              fontSize: 9,
              color: 'var(--b-ink-40)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="font-display"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 14,
              color: 'var(--b-ink)',
            }}
            title="Rename your orb"
          >
            {currentName}
          </button>
          <span
            className="font-mono"
            title={`Mood: ${mood.label}`}
            style={{
              padding: '2px 6px',
              border: '1px solid var(--b-rule)',
              fontSize: 9,
              color: 'var(--b-ink-60)',
              letterSpacing: '0.04em',
            }}
          >
            {mood.face} {mood.label}
          </span>
        </>
      )}
    </div>
  );
}
