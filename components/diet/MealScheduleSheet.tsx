'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, addDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { ScheduleEntry } from '@/types/schedule';
import { BCalendarGlyph, BPlusGlyph } from '@/components/editorial/BGlyphs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Meal scheduler — user-defined recurring daily reminders. Each row is
 * a {label, hour} pair; users add as many as they want ("Breakfast",
 * "Pre-gym snack", "Late dinner", etc.). The notifier pushes the
 * label as part of the copy.
 *
 * Storage reuses the existing scheduleEntries collection — one doc per
 * dayOfWeek per row (7 per enabled row). Save wipes all kind='meal'
 * entries first to avoid drift.
 *
 * Granularity is hour-only because the underlying notifier checks
 * (dayOfWeek, hour) pairs.
 */

interface Props {
  uid: string;
  open: boolean;
  onClose: () => void;
}

interface MealRow {
  // Stable React key so sorted reorders don't remount inputs mid-keystroke.
  id: string;
  label: string;
  hour: number;
}

type Snapshot = { label: string; hour: number }[];

const DEFAULT_SEED: { label: string; hour: number }[] = [
  { label: 'Breakfast', hour: 8 },
  { label: 'Lunch',     hour: 12 },
  { label: 'Dinner',    hour: 19 },
];

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

// Normalize rows for snapshot/dirty comparison: trim labels, drop empties,
// sort by (hour, label). Strips ids since they're session-local.
function normalize(rows: { label: string; hour: number }[]): Snapshot {
  return rows
    .map((r) => ({ label: r.label.trim(), hour: r.hour }))
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.hour - b.hour || a.label.localeCompare(b.label));
}

export function MealScheduleSheet({ uid, open, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [rows, setRows] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  // Snapshot of what's persisted in Firestore. null while loading.
  // For first-time users this is []; their defaults render as dirty so
  // the first Save actually writes the seed.
  const [initialSnapshot, setInitialSnapshot] = useState<Snapshot | null>(null);

  // Load existing meal entries → collapse to unique (label, hour) pairs.
  // Each saved row writes 7 docs (one per dayOfWeek), so we read any
  // doc and pull the (label, hour) without worrying about duplicates.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, `scheduleEntries/${uid}/items`),
            where('kind', '==', 'meal'),
          ),
        );
        const seen = new Map<string, { label: string; hour: number }>();
        snap.docs.forEach((d) => {
          const e = d.data() as ScheduleEntry;
          const label = (e.mealLabel?.trim())
            || (e.mealType ? e.mealType.charAt(0).toUpperCase() + e.mealType.slice(1) : 'Meal');
          const key = `${label}|${e.hour}`;
          if (!seen.has(key)) seen.set(key, { label, hour: e.hour });
        });
        if (cancelled) return;
        const loaded = Array.from(seen.values());
        const seed = loaded.length > 0 ? loaded : DEFAULT_SEED;
        setRows(seed.map((r) => ({ id: makeId(), ...r })));
        setInitialSnapshot(normalize(loaded));
      } catch (err) {
        console.error('load meal schedule failed', err);
        if (!cancelled) {
          setRows(DEFAULT_SEED.map((r) => ({ id: makeId(), ...r })));
          setInitialSnapshot([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, uid]);

  const updateRow = (id: string, patch: Partial<Omit<MealRow, 'id'>>) => {
    setRows((cur) => cur.map((r) => r.id === id ? { ...r, ...patch } : r));
  };
  const removeRow = (id: string) => {
    setRows((cur) => cur.filter((r) => r.id !== id));
  };
  const addRow = () => {
    // Default new row sits 1-2h after the latest, so reminders space
    // out instead of stacking on the same hour by default.
    const maxHour = rows.reduce((m, r) => Math.max(m, r.hour), 6);
    const nextHour = Math.min(23, maxHour + 2);
    setRows((cur) => [...cur, { id: makeId(), label: '', hour: nextHour }]);
  };

  // Render order: sorted by hour, so adding/editing reorders visually.
  // Stable id keys mean inputs keep focus across re-sorts.
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.hour - b.hour),
    [rows],
  );

  // Save only enables when current rows differ from what's saved.
  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false;
    return JSON.stringify(normalize(rows)) !== JSON.stringify(initialSnapshot);
  }, [rows, initialSnapshot]);

  const pendingRemoval = confirmingRemoveId
    ? rows.find((r) => r.id === confirmingRemoveId) ?? null
    : null;

  const onSave = async () => {
    if (saving || !isDirty) return;
    const cleaned = rows
      .map((r) => ({ label: r.label.trim(), hour: r.hour }))
      .filter((r) => r.label.length > 0);
    setSaving(true);
    try {
      // Wipe existing meal entries, then re-create from current rows.
      // Cheap (max 7 × N docs, N typically <10) and avoids drift.
      const existing = await getDocs(
        query(
          collection(db, `scheduleEntries/${uid}/items`),
          where('kind', '==', 'meal'),
        ),
      );
      const wipe = writeBatch(db);
      for (const d of existing.docs) {
        wipe.delete(doc(db, `scheduleEntries/${uid}/items`, d.id));
      }
      await wipe.commit();

      // Write fresh entries — 7 per row, one per day. Habit fields stay
      // filled with row-derived placeholders so the legacy schedule UI
      // doesn't crash on missing fields if it ever lists meal entries.
      for (const r of cleaned) {
        for (let dow = 0; dow < 7; dow++) {
          await addDoc(collection(db, `scheduleEntries/${uid}/items`), {
            kind: 'meal',
            mealLabel: r.label,
            habitSlug: `meal-${r.label.toLowerCase().replace(/\s+/g, '-')}`,
            habitName: r.label,
            habitIcon: '',
            habitColor: '#f97316',
            dayOfWeek: dow,
            hour: r.hour,
            createdAt: Timestamp.now(),
          });
        }
      }

      // Sync snapshot so a re-open without remount re-disables Save.
      setInitialSnapshot(normalize(cleaned));
      addToast({
        type: 'success',
        message: cleaned.length === 0
          ? 'Meal reminders cleared.'
          : `${cleaned.length} meal reminder${cleaned.length === 1 ? '' : 's'} set.`,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save schedule';
      addToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = saving || loading || !isDirty;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="dir-b fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col"
              style={{
                background: 'var(--b-paper)',
                borderTop: '1px solid var(--b-ink)',
                color: 'var(--b-ink)',
              }}
            >
              <div style={{ padding: '20px 22px 6px' }}>
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                  Daily reminders
                </div>
                <h2
                  className="font-display"
                  style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginTop: 2, lineHeight: 1 }}
                >
                  Meal schedule
                </h2>
                <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 6 }}>
                  Add a row for each meal or snack you want a daily push for. Name it whatever — "Pre-gym snack", "Late dinner", anything.
                </p>
              </div>

              <div style={{ padding: '14px 22px 6px', overflowY: 'auto', flex: 1 }}>
                {loading ? (
                  <p
                    className="font-body"
                    style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}
                  >
                    Loading…
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {sortedRows.length === 0 && (
                      <li>
                        <p
                          className="font-body"
                          style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}
                        >
                          No reminders yet. Add one below.
                        </p>
                      </li>
                    )}
                    {sortedRows.map((r, idx) => (
                      <li
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 0',
                          borderBottom: '1px solid var(--b-rule)',
                        }}
                      >
                        <span
                          className="font-mono tabular"
                          style={{
                            width: 20,
                            color: 'var(--b-ink-40)',
                            fontSize: 11,
                            flexShrink: 0,
                            textAlign: 'right',
                          }}
                        >
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={r.label}
                          onChange={(e) => updateRow(r.id, { label: e.target.value })}
                          placeholder="e.g. Lunch"
                          maxLength={32}
                          className="font-body"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: 'var(--b-paper)',
                            color: 'var(--b-ink)',
                            border: '1px solid var(--b-ink)',
                            padding: '8px 10px',
                            fontSize: 13,
                          }}
                        />
                        <select
                          value={r.hour}
                          onChange={(e) => updateRow(r.id, { hour: parseInt(e.target.value, 10) })}
                          className="font-mono tabular"
                          style={{
                            background: 'var(--b-paper)',
                            color: 'var(--b-ink)',
                            border: '1px solid var(--b-ink)',
                            padding: '8px 8px',
                            fontSize: 12,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>{formatHour(h)}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setConfirmingRemoveId(r.id)}
                          aria-label="Remove reminder"
                          style={{
                            width: 28,
                            height: 28,
                            border: '1px solid var(--b-ink-40)',
                            background: 'transparent',
                            color: 'var(--b-ink-60)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            fontSize: 14,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {!loading && (
                  <button
                    type="button"
                    onClick={addRow}
                    className="font-body"
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      color: 'var(--b-ink)',
                      border: '1px dashed var(--b-ink-40)',
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <BPlusGlyph size={12} /> Add reminder
                  </button>
                )}
              </div>

              <div style={{ padding: '14px 22px 22px', borderTop: '1px solid var(--b-rule)' }}>
                <button
                  onClick={onSave}
                  disabled={saveDisabled}
                  className="font-body"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--b-ink)',
                    color: 'var(--b-paper)',
                    border: '1px solid var(--b-ink)',
                    fontSize: 12,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    cursor: saveDisabled ? 'not-allowed' : 'pointer',
                    opacity: saveDisabled ? 0.4 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <BCalendarGlyph size={14} />
                  {saving ? 'Saving…' : isDirty ? 'Save schedule' : 'No changes'}
                </button>
                <p
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}
                >
                  Toggle off in Settings → Pillar Reminders if you want a break.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmingRemoveId !== null}
        onClose={() => setConfirmingRemoveId(null)}
        onConfirm={() => {
          if (confirmingRemoveId) removeRow(confirmingRemoveId);
          setConfirmingRemoveId(null);
        }}
        title="Remove this reminder?"
        description={
          pendingRemoval
            ? `"${pendingRemoval.label.trim() || 'Untitled'}" at ${formatHour(pendingRemoval.hour)} will be deleted when you save.`
            : ''
        }
        confirmText="Remove"
        variant="danger"
      />
    </>
  );
}
