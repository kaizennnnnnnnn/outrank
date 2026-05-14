'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUIStore } from '@/store/uiStore';
import { MealType, ScheduleEntry } from '@/types/schedule';
import { BCheckGlyph, BCalendarGlyph } from '@/components/editorial/BGlyphs';

/**
 * Meal scheduler — sets recurring daily reminders for each meal type.
 * Reuses the scheduleEntries collection (one doc per dayOfWeek per
 * enabled mealType, so seven docs per enabled meal). The existing
 * scheduleNotifier Cloud Function fires the push at the local hour.
 *
 * Granularity is hour-only because the notifier only checks the
 * dayOfWeek + hour pair (sub-hour timing would be silently rounded).
 */

interface Props {
  uid: string;
  open: boolean;
  onClose: () => void;
}

const MEAL_TYPES: { key: MealType; label: string; defaultHour: number }[] = [
  { key: 'breakfast', label: 'Breakfast', defaultHour: 8 },
  { key: 'lunch',     label: 'Lunch',     defaultHour: 12 },
  { key: 'snack',     label: 'Snack',     defaultHour: 15 },
  { key: 'dinner',    label: 'Dinner',    defaultHour: 19 },
];

interface MealRowState {
  enabled: boolean;
  hour: number;
}

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

export function MealScheduleSheet({ uid, open, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [rows, setRows] = useState<Record<MealType, MealRowState>>({
    breakfast: { enabled: false, hour: 8 },
    lunch:     { enabled: false, hour: 12 },
    snack:     { enabled: false, hour: 15 },
    dinner:    { enabled: false, hour: 19 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // On open, pull the user's current meal-schedule entries and
  // collapse them down to one row per mealType (hour + enabled flag).
  // If the seven daily entries somehow disagree on hour, take the
  // most recent — but in practice they should all match because save
  // wipes + rewrites.
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
        const hoursByType: Partial<Record<MealType, number>> = {};
        snap.docs.forEach((d) => {
          const e = d.data() as ScheduleEntry;
          if (e.mealType) hoursByType[e.mealType] = e.hour;
        });
        if (cancelled) return;
        setRows({
          breakfast: { enabled: hoursByType.breakfast !== undefined, hour: hoursByType.breakfast ?? 8 },
          lunch:     { enabled: hoursByType.lunch     !== undefined, hour: hoursByType.lunch     ?? 12 },
          snack:     { enabled: hoursByType.snack     !== undefined, hour: hoursByType.snack     ?? 15 },
          dinner:    { enabled: hoursByType.dinner    !== undefined, hour: hoursByType.dinner    ?? 19 },
        });
      } catch (err) {
        console.error('load meal schedule failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, uid]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Wipe existing meal entries, then re-create from current rows.
      // Cheap (max 28 docs) and avoids drift.
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

      // Write fresh entries — 7 per enabled meal type, one per day.
      // Habit fields are filled with mealType-derived placeholders so
      // existing schedule UI doesn't crash on missing fields.
      for (const mt of MEAL_TYPES) {
        const row = rows[mt.key];
        if (!row.enabled) continue;
        for (let dow = 0; dow < 7; dow++) {
          await addDoc(collection(db, `scheduleEntries/${uid}/items`), {
            kind: 'meal',
            mealType: mt.key,
            habitSlug: `meal-${mt.key}`,
            habitName: mt.label,
            habitIcon: '',
            habitColor: '#f97316',
            dayOfWeek: dow,
            hour: row.hour,
            createdAt: Timestamp.now(),
          });
        }
      }

      const enabledCount = Object.values(rows).filter((r) => r.enabled).length;
      addToast({
        type: 'success',
        message: enabledCount === 0
          ? 'Meal reminders cleared.'
          : `${enabledCount} meal reminder${enabledCount === 1 ? '' : 's'} set.`,
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
                Pick which meals get a push at what time. Reminders fire every day at the local hour.
              </p>
            </div>

            <div style={{ padding: '14px 22px 22px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <p
                  className="font-body"
                  style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}
                >
                  Loading…
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {MEAL_TYPES.map((mt) => {
                    const row = rows[mt.key];
                    return (
                      <li
                        key={mt.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '14px 0',
                          borderBottom: '1px solid var(--b-rule)',
                        }}
                      >
                        <button
                          type="button"
                          aria-pressed={row.enabled}
                          onClick={() => setRows((cur) => ({
                            ...cur,
                            [mt.key]: { ...cur[mt.key], enabled: !cur[mt.key].enabled },
                          }))}
                          style={{
                            width: 22,
                            height: 22,
                            border: `1.5px solid ${row.enabled ? 'var(--b-accent)' : 'var(--b-ink-40)'}`,
                            background: row.enabled ? 'var(--b-accent)' : 'transparent',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          {row.enabled && <BCheckGlyph size={12} />}
                        </button>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 18,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            flex: 1,
                            opacity: row.enabled ? 1 : 0.55,
                          }}
                        >
                          {mt.label}
                        </div>
                        <select
                          value={row.hour}
                          onChange={(e) => setRows((cur) => ({
                            ...cur,
                            [mt.key]: { ...cur[mt.key], hour: parseInt(e.target.value, 10) },
                          }))}
                          disabled={!row.enabled}
                          className="font-mono tabular"
                          style={{
                            background: 'var(--b-paper)',
                            color: 'var(--b-ink)',
                            border: '1px solid var(--b-ink)',
                            padding: '6px 8px',
                            fontSize: 12,
                            opacity: row.enabled ? 1 : 0.45,
                            cursor: row.enabled ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {Array.from({ length: 24 }, (_, h) => (
                            <option key={h} value={h}>{formatHour(h)}</option>
                          ))}
                        </select>
                      </li>
                    );
                  })}
                </ul>
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
                Disable meals via the Pillar Reminders toggle in Settings.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
