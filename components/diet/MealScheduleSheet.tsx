'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, addDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { ScheduleEntry } from '@/types/schedule';
import { BCalendarGlyph, BPlusGlyph } from '@/components/editorial/BGlyphs';

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
  label: string;
  hour: number;
}

const DEFAULT_ROWS: MealRow[] = [
  { label: 'Breakfast', hour: 8 },
  { label: 'Lunch',     hour: 12 },
  { label: 'Dinner',    hour: 19 },
];

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

export function MealScheduleSheet({ uid, open, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [rows, setRows] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        const seen = new Map<string, MealRow>();
        snap.docs.forEach((d) => {
          const e = d.data() as ScheduleEntry;
          const label = (e.mealLabel?.trim())
            || (e.mealType ? e.mealType.charAt(0).toUpperCase() + e.mealType.slice(1) : 'Meal');
          const key = `${label}|${e.hour}`;
          if (!seen.has(key)) seen.set(key, { label, hour: e.hour });
        });
        if (cancelled) return;
        const loaded = Array.from(seen.values());
        // First-time users get sensible defaults so they can save and go.
        setRows(loaded.length > 0 ? loaded : DEFAULT_ROWS);
      } catch (err) {
        console.error('load meal schedule failed', err);
        if (!cancelled) setRows(DEFAULT_ROWS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, uid]);

  const updateRow = (idx: number, patch: Partial<MealRow>) => {
    setRows((cur) => cur.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const removeRow = (idx: number) => {
    setRows((cur) => cur.filter((_, i) => i !== idx));
  };
  const addRow = () => {
    // Default new row sits 1-2h after the latest, so reminders space
    // out instead of stacking on the same hour by default.
    const maxHour = rows.reduce((m, r) => Math.max(m, r.hour), 6);
    const nextHour = Math.min(23, maxHour + 2);
    setRows((cur) => [...cur, { label: '', hour: nextHour }]);
  };

  const onSave = async () => {
    if (saving) return;
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

  return (
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
                  {rows.length === 0 && (
                    <li>
                      <p
                        className="font-body"
                        style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}
                      >
                        No reminders yet. Add one below.
                      </p>
                    </li>
                  )}
                  {rows.map((r, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--b-rule)',
                      }}
                    >
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) => updateRow(idx, { label: e.target.value })}
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
                        onChange={(e) => updateRow(idx, { hour: parseInt(e.target.value, 10) })}
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
                        onClick={() => removeRow(idx)}
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
                disabled={saving || loading}
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
                  cursor: saving || loading ? 'not-allowed' : 'pointer',
                  opacity: saving || loading ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <BCalendarGlyph size={14} />
                {saving ? 'Saving…' : 'Save schedule'}
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
  );
}
