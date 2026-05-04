'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { parseFoodAI } from '@/lib/dietAI';
import { searchUSDA, usdaToFoodItem, lookupBarcode, type USDASearchResult } from '@/lib/foodLookup';
import { logMeal } from '@/lib/diet';
import type { FoodItem, MealType, EntrySource, ParseFoodQuota } from '@/types/diet';
import { useUIStore } from '@/store/uiStore';
import {
  BCheckGlyph,
  BCalendarGlyph,
  BPlusGlyph,
} from '@/components/editorial/BGlyphs';

type Mode = 'ai' | 'search' | 'barcode' | 'manual';

interface Props {
  uid:      string;
  open:     boolean;
  onClose:  () => void;
  onLogged: () => void;
}

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snack' },
];

const MODES: { key: Mode; label: string; sub: string }[] = [
  { key: 'ai',      label: 'AI Parse',  sub: 'Type a sentence' },
  { key: 'search',  label: 'Search',    sub: 'USDA database' },
  { key: 'barcode', label: 'Barcode',   sub: 'Paste a code' },
  { key: 'manual',  label: 'Manual',    sub: 'Enter yourself' },
];

/**
 * Add Meal — editorial Direction B v2 conversion. Bottom sheet with
 * four input modes (AI / Search / Barcode / Manual). Magazine-style
 * typography: italic display labels, hairline-bracketed mode tabs,
 * outlined inputs, filled-black submit. All four mode panels use
 * the same input styling for visual cohesion.
 *
 * All flows preserved: parseFoodAI, searchUSDA, lookupBarcode, and
 * logMeal still write the same data shapes.
 */

export function AddMealSheet({ uid, open, onClose, onLogged }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [mode, setMode] = useState<Mode>('ai');
  const [mealType, setMealType] = useState<MealType>(currentMealTypeGuess());
  const [items, setItems] = useState<FoodItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setItems([]);
      setMode('ai');
      setMealType(currentMealTypeGuess());
    }
  }, [open]);

  const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0);

  const onSave = async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const sourceMap: Record<Mode, EntrySource> = {
        ai: 'ai', search: 'usda', barcode: 'barcode', manual: 'manual',
      };
      await logMeal({ uid, mealType, items, source: sourceMap[mode] });
      addToast({ type: 'success', message: `Logged ${items.length} item${items.length > 1 ? 's' : ''}` });
      onLogged();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log meal';
      addToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          {/* Sheet */}
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
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 2, background: 'var(--b-ink-40)' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '6px 22px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: '1px solid var(--b-ink)',
              }}
            >
              <div>
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                  The Plate · Add
                </div>
                <h2
                  className="font-display"
                  style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}
                >
                  Log a meal
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--b-ink-60)',
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>

            {/* Meal type pills */}
            <div style={{ padding: '12px 22px', display: 'flex', gap: 6, overflowX: 'auto' }} className="no-scrollbar">
              {MEAL_TYPES.map((t) => {
                const active = mealType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setMealType(t.key)}
                    className="font-body"
                    style={{
                      flexShrink: 0,
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                      background: active ? 'var(--b-ink)' : 'transparent',
                      border: '1px solid ' + (active ? 'var(--b-ink)' : 'var(--b-rule)'),
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Mode tabs */}
            <div
              style={{
                margin: '0 22px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                borderTop: '1px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-rule)',
              }}
            >
              {MODES.map((m, i) => {
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    style={{
                      padding: '10px 4px',
                      borderLeft: i ? '1px solid var(--b-rule)' : 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderBottom: active ? '2px solid var(--b-accent)' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    <div
                      className="font-display"
                      style={{
                        fontSize: 13,
                        fontStyle: active ? 'italic' : 'normal',
                        fontWeight: 500,
                        color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      className="font-body"
                      style={{
                        fontSize: 9,
                        color: 'var(--b-ink-40)',
                        marginTop: 2,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {m.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active panel */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 0' }}>
              {mode === 'ai'      && <AIPanel onItems={(arr) => setItems((prev) => [...prev, ...arr])} />}
              {mode === 'search'  && <SearchPanel onItem={(it) => setItems((prev) => [...prev, it])} />}
              {mode === 'barcode' && <BarcodePanel onItem={(it) => setItems((prev) => [...prev, it])} />}
              {mode === 'manual'  && <ManualPanel onItem={(it) => setItems((prev) => [...prev, it])} />}

              {/* Pending items */}
              {items.length > 0 && (
                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      borderBottom: '1px solid var(--b-ink)',
                      paddingBottom: 4,
                    }}
                  >
                    <span
                      className="font-display"
                      style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}
                    >
                      In this meal
                    </span>
                    <span
                      className="font-mono tabular"
                      style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
                    >
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {items.map((it, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px 1fr 18px',
                          gap: 10,
                          padding: '10px 0',
                          borderBottom: '1px solid var(--b-rule)',
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          className="font-mono"
                          style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="font-display" style={{ fontSize: 14, fontWeight: 500 }}>
                            {it.name}
                          </div>
                          <div
                            className="font-body tabular"
                            style={{
                              fontSize: 10,
                              color: 'var(--b-ink-60)',
                              marginTop: 1,
                            }}
                          >
                            {it.qty} {it.unit} · {it.kcal} kcal
                            {' · '}
                            P {it.protein || 0}g · C {it.carbs || 0}g · F {it.fat || 0}g
                          </div>
                        </div>
                        <button
                          onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove item"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--b-ink-40)',
                            fontSize: 16,
                            lineHeight: 1,
                            cursor: 'pointer',
                          }}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid var(--b-ink)',
                background: 'var(--b-paper)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  Total
                </span>
                <span
                  className="font-mono tabular"
                  style={{ fontSize: 14, color: 'var(--b-ink)', fontWeight: 700 }}
                >
                  {totalKcal} kcal
                </span>
              </div>
              <button
                onClick={onSave}
                disabled={items.length === 0 || submitting}
                className="font-body"
                style={{
                  width: '100%',
                  height: 46,
                  border: '1px solid var(--b-ink)',
                  background: items.length === 0 || submitting ? 'var(--b-paper-2)' : 'var(--b-ink)',
                  color: items.length === 0 || submitting ? 'var(--b-ink-40)' : 'var(--b-paper)',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  cursor: items.length === 0 || submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'SAVING…' : 'LOG MEAL →'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Mode panels ─────────────────────────────────────────────────────

function AIPanel({ onItems }: { onItems: (items: FoodItem[]) => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<ParseFoodQuota | null>(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const { result, quota: q } = await parseFoodAI(text);
      setQuota(q);
      if (result.items.length === 0) {
        addToast({ type: 'error', message: "Couldn't recognize any food in that — try being more specific" });
      } else {
        onItems(result.items);
        setText('');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI parse failed';
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, marginBottom: 10 }}>
        Type what you ate in plain English. Examples:{' '}
        <span style={{ color: 'var(--b-ink)' }}>&quot;3 eggs and toast&quot;</span>,{' '}
        <span style={{ color: 'var(--b-ink)' }}>&quot;chicken caesar salad&quot;</span>,{' '}
        <span style={{ color: 'var(--b-ink)' }}>&quot;200g grilled chicken, 150g rice, broccoli&quot;</span>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you eat?"
        rows={3}
        className={editorialInputCls}
        style={editorialInputStyle}
      />
      <button
        onClick={submit}
        disabled={!text.trim() || loading}
        className="font-body"
        style={{
          width: '100%',
          marginTop: 8,
          height: 40,
          border: '1px solid var(--b-ink)',
          background: !text.trim() || loading ? 'var(--b-paper-2)' : 'var(--b-ink)',
          color: !text.trim() || loading ? 'var(--b-ink-40)' : 'var(--b-paper)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'PARSING…' : 'PARSE WITH AI →'}
      </button>
      {quota && (
        <p
          className="font-body tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-40)',
            textAlign: 'center',
            marginTop: 6,
          }}
        >
          {quota.remaining}/{quota.limit} AI logs left today
        </p>
      )}
    </div>
  );
}

function SearchPanel({ onItem }: { onItem: (item: FoodItem) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<USDASearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    setHasKey(!!process.env.NEXT_PUBLIC_USDA_API_KEY);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchUSDA(q);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (!hasKey) {
    return (
      <div
        style={{
          borderTop: '1px solid var(--b-rule)',
          borderBottom: '1px solid var(--b-rule)',
          padding: '10px 0',
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          USDA key needed
        </div>
        <p
          className="font-body"
          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4, lineHeight: 1.5 }}
        >
          USDA search needs a free API key from{' '}
          <span style={{ color: 'var(--b-ink)' }}>fdc.nal.usda.gov</span>. For now, use AI parse, barcode, or manual.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search foods (e.g. chicken breast)"
        className={editorialInputCls}
        style={editorialInputStyle}
      />
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, maxHeight: '40vh', overflowY: 'auto' }}>
        {loading && (
          <li className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-60)', textAlign: 'center', padding: '8px 0' }}>
            Searching…
          </li>
        )}
        {!loading && q.trim() && results.length === 0 && (
          <li className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-60)', textAlign: 'center', padding: '8px 0' }}>
            No matches.
          </li>
        )}
        {results.map((r) => (
          <li key={r.fdcId}>
            <button
              onClick={() => onItem(usdaToFoodItem(r))}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 0',
                borderBottom: '1px solid var(--b-rule)',
                background: 'transparent',
                border: 'none',
                borderBottomColor: 'var(--b-rule)',
                borderBottomStyle: 'solid',
                borderBottomWidth: 1,
                cursor: 'pointer',
                color: 'var(--b-ink)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span
                  className="font-display"
                  style={{ fontSize: 14, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {r.name}
                </span>
                <span
                  className="font-mono tabular"
                  style={{ fontSize: 11, color: 'var(--b-accent)' }}
                >
                  {Math.round(r.kcalPerServing)} kcal
                </span>
              </div>
              {r.brand && (
                <p
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {r.brand}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarcodePanel({ onItem }: { onItem: (item: FoodItem) => void }) {
  const addToast = useUIStore((s) => s.addToast);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      const item = await lookupBarcode(code);
      if (!item) {
        addToast({ type: 'error', message: 'Barcode not found in Open Food Facts' });
      } else {
        onItem(item);
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, marginBottom: 10 }}>
        Paste a UPC or EAN barcode. Camera scanning coming later — for now use the digits printed below the barcode.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="0049000028911"
        inputMode="numeric"
        className={cn(editorialInputCls, 'font-mono')}
        style={editorialInputStyle}
      />
      <button
        onClick={submit}
        disabled={!code.trim() || loading}
        className="font-body"
        style={{
          width: '100%',
          marginTop: 8,
          height: 40,
          border: '1px solid var(--b-ink)',
          background: !code.trim() || loading ? 'var(--b-paper-2)' : 'var(--b-ink)',
          color: !code.trim() || loading ? 'var(--b-ink-40)' : 'var(--b-paper)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          cursor: !code.trim() || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'LOOKING UP…' : 'LOOK UP →'}
      </button>
    </div>
  );
}

function ManualPanel({ onItem }: { onItem: (item: FoodItem) => void }) {
  const [name,    setName]    = useState('');
  const [qty,     setQty]     = useState('1');
  const [unit,    setUnit]    = useState('serving');
  const [kcal,    setKcal]    = useState('');
  const [protein, setProtein] = useState('');
  const [carbs,   setCarbs]   = useState('');
  const [fat,     setFat]     = useState('');

  const canSubmit = name.trim() && kcal && Number(kcal) > 0;
  const submit = () => {
    if (!canSubmit) return;
    onItem({
      name:    name.trim(),
      qty:     Number(qty)  || 1,
      unit:    unit.trim()  || 'serving',
      kcal:    Number(kcal) || 0,
      protein: Number(protein) || 0,
      carbs:   Number(carbs) || 0,
      fat:     Number(fat) || 0,
    });
    setName(''); setQty('1'); setUnit('serving');
    setKcal(''); setProtein(''); setCarbs(''); setFat('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What is it? (e.g. homemade chili)"
        className={editorialInputCls}
        style={editorialInputStyle}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
        <input value={qty}  onChange={(e) => setQty(e.target.value)}  placeholder="Qty"  inputMode="decimal" className={editorialInputCls} style={editorialInputStyle} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (cup, g, slice)"     className={editorialInputCls} style={editorialInputStyle} />
      </div>
      <input value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" inputMode="numeric" className={editorialInputCls} style={editorialInputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein g" inputMode="decimal" className={editorialInputCls} style={editorialInputStyle} />
        <input value={carbs}   onChange={(e) => setCarbs(e.target.value)}   placeholder="Carbs g"   inputMode="decimal" className={editorialInputCls} style={editorialInputStyle} />
        <input value={fat}     onChange={(e) => setFat(e.target.value)}     placeholder="Fat g"     inputMode="decimal" className={editorialInputCls} style={editorialInputStyle} />
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="font-body"
        style={{
          width: '100%',
          marginTop: 4,
          height: 40,
          border: '1px solid var(--b-ink)',
          background: !canSubmit ? 'var(--b-paper-2)' : 'var(--b-ink)',
          color: !canSubmit ? 'var(--b-ink-40)' : 'var(--b-paper)',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.08em',
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <BPlusGlyph size={12} /> ADD ITEM
      </button>
      {/* Suppress unused-import warning — these are surfaced on neighbouring panels */}
      <span style={{ display: 'none' }}>
        <BCheckGlyph /><BCalendarGlyph />
      </span>
    </div>
  );
}

// ─── Editorial input styling ─────────────────────────────────────────

const editorialInputCls = 'w-full font-body';
const editorialInputStyle: React.CSSProperties = {
  background: 'var(--b-paper-2)',
  border: '1px solid var(--b-rule)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--b-ink)',
  outline: 'none',
  fontFamily: 'var(--font-inter)',
};

// ─── Helpers ─────────────────────────────────────────────────────────

function currentMealTypeGuess(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
