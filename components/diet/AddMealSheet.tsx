'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { parseFoodAI } from '@/lib/dietAI';
import { searchUSDA, usdaToFoodItem, lookupBarcode, type USDASearchResult } from '@/lib/foodLookup';
import { logMeal } from '@/lib/diet';
import type { FoodItem, MealType, EntrySource, ParseFoodQuota } from '@/types/diet';
import { useUIStore } from '@/store/uiStore';
import { CheckCircleFullIcon, SparklesIcon, SearchIcon, PlusCircleIcon } from '@/components/ui/AppIcons';

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

const MODES: { key: Mode; label: string; sub: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'ai',      label: 'AI parse',  sub: 'Type a sentence',     Icon: SparklesIcon },
  { key: 'search',  label: 'Search',    sub: 'USDA database',       Icon: SearchIcon },
  { key: 'barcode', label: 'Barcode',   sub: 'Scan or paste code',  Icon: SearchIcon },
  { key: 'manual',  label: 'Manual',    sub: 'Enter yourself',      Icon: PlusCircleIcon },
];

export function AddMealSheet({ uid, open, onClose, onLogged }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [mode, setMode] = useState<Mode>('ai');
  const [mealType, setMealType] = useState<MealType>(currentMealTypeGuess());
  const [items, setItems] = useState<FoodItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when the sheet closes so re-opening starts fresh.
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
            className="fixed inset-x-0 bottom-0 z-50 bg-[#10101a] border-t border-white/10 rounded-t-3xl max-h-[90vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            <div className="px-5 pb-3 flex items-center justify-between">
              <h2 className="font-heading font-bold text-xl text-white">Log a meal</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">×</button>
            </div>

            {/* Meal type */}
            <div className="px-5 flex gap-1.5 overflow-x-auto pb-3 no-scrollbar">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setMealType(t.key)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors',
                    mealType === t.key
                      ? 'bg-orange-500/15 border-orange-400 text-orange-300'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Mode picker */}
            <div className="px-5 grid grid-cols-4 gap-1.5">
              {MODES.map((m) => {
                const active = mode === m.key;
                const Icon = m.Icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={cn(
                      'rounded-xl border px-2 py-2 flex flex-col items-center gap-1 transition-all',
                      active
                        ? 'bg-orange-500/10 border-orange-400/60'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/15',
                    )}
                  >
                    <Icon size={16} className={active ? 'text-orange-300' : 'text-slate-400'} />
                    <span className={cn('text-[10px] font-bold', active ? 'text-white' : 'text-slate-300')}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active mode panel */}
            <div className="flex-1 overflow-y-auto px-5 mt-4">
              {mode === 'ai'      && <AIPanel onItems={(arr) => setItems((prev) => [...prev, ...arr])} />}
              {mode === 'search'  && <SearchPanel onItem={(it) => setItems((prev) => [...prev, it])} />}
              {mode === 'barcode' && <BarcodePanel onItem={(it) => setItems((prev) => [...prev, it])} />}
              {mode === 'manual'  && <ManualPanel onItem={(it) => setItems((prev) => [...prev, it])} />}

              {/* Pending items list */}
              {items.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">In this meal</p>
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{it.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {it.qty} {it.unit} · {it.kcal} kcal · P {it.protein || 0}g · C {it.carbs || 0}g · F {it.fat || 0}g
                        </p>
                      </div>
                      <button
                        onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-500 hover:text-red-400 text-lg leading-none"
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.07] p-4 bg-[#0d0d15]/95">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
                <span className="font-mono tabular-nums text-white font-bold">{totalKcal} kcal</span>
              </div>
              <button
                onClick={onSave}
                disabled={items.length === 0 || submitting}
                className={cn(
                  'w-full py-3.5 rounded-full font-bold text-base text-white shadow-lg transition-all',
                  items.length === 0 || submitting
                    ? 'opacity-40 cursor-not-allowed'
                    : 'shadow-red-600/30 hover:brightness-110',
                )}
                style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
              >
                {submitting ? 'Saving…' : 'LOG MEAL'}
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
      <p className="text-[12px] text-slate-400 leading-relaxed mb-3">
        Type what you ate in plain English. Examples: <span className="text-slate-300">&quot;3 eggs and toast&quot;</span>,{' '}
        <span className="text-slate-300">&quot;chicken caesar salad&quot;</span>,{' '}
        <span className="text-slate-300">&quot;200g grilled chicken, 150g rice, broccoli&quot;</span>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you eat?"
        rows={3}
        className="w-full bg-[#0a0a12] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors resize-none"
      />
      <button
        onClick={submit}
        disabled={!text.trim() || loading}
        className={cn(
          'w-full mt-2 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all flex items-center justify-center gap-2',
          !text.trim() || loading
            ? 'bg-white/[0.05] text-slate-500'
            : 'bg-orange-500/15 border border-orange-400/40 hover:bg-orange-500/25',
        )}
      >
        <SparklesIcon size={14} />
        {loading ? 'Parsing…' : 'Parse with AI'}
      </button>
      {quota && (
        <p className="text-[10.5px] text-slate-500 text-center mt-2">
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

  // Debounce search to avoid hammering USDA on each keystroke.
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
      <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/30 p-4">
        <p className="text-[13px] text-amber-200 leading-relaxed">
          USDA search needs a free API key (sign up at <span className="text-amber-300">fdc.nal.usda.gov</span>).
          For now, use AI parse, barcode, or manual entry.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search foods (e.g. &quot;chicken breast&quot;)"
        className="w-full bg-[#0a0a12] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors"
      />
      <div className="mt-3 space-y-1.5 max-h-[40vh] overflow-y-auto">
        {loading && <p className="text-[12px] text-slate-500 text-center py-2">Searching…</p>}
        {!loading && q.trim() && results.length === 0 && (
          <p className="text-[12px] text-slate-500 text-center py-2">No matches.</p>
        )}
        {results.map((r) => (
          <button
            key={r.fdcId}
            onClick={() => onItem(usdaToFoodItem(r))}
            className="w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 hover:border-orange-400/40 transition-colors"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-white text-sm flex-1 truncate">{r.name}</span>
              <span className="text-[12px] font-mono tabular-nums text-orange-300">{Math.round(r.kcalPerServing)} kcal</span>
            </div>
            {r.brand && <p className="text-[11px] text-slate-500 truncate">{r.brand}</p>}
          </button>
        ))}
      </div>
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
      <p className="text-[12px] text-slate-400 leading-relaxed mb-3">
        Type or paste a UPC/EAN barcode. Camera scanning coming later — for now use the digits printed below the barcode.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="0049000028911"
        inputMode="numeric"
        className="w-full bg-[#0a0a12] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[14px] outline-none transition-colors font-mono"
      />
      <button
        onClick={submit}
        disabled={!code.trim() || loading}
        className={cn(
          'w-full mt-2 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all',
          !code.trim() || loading
            ? 'bg-white/[0.05] text-slate-500'
            : 'bg-orange-500/15 border border-orange-400/40 hover:bg-orange-500/25',
        )}
      >
        {loading ? 'Looking up…' : 'Look up'}
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
    <div className="space-y-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What is it? (e.g. homemade chili)"
        className="w-full bg-[#0a0a12] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-2.5 text-white text-[14px] outline-none"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <input value={qty}  onChange={(e) => setQty(e.target.value)}  placeholder="Qty"  inputMode="decimal" className={inputCls} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (cup, g, slice)"  className={inputCls} />
      </div>
      <input value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" inputMode="numeric" className={inputCls} />
      <div className="grid grid-cols-3 gap-2.5">
        <input value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein g" inputMode="decimal" className={inputCls} />
        <input value={carbs}   onChange={(e) => setCarbs(e.target.value)}   placeholder="Carbs g"   inputMode="decimal" className={inputCls} />
        <input value={fat}     onChange={(e) => setFat(e.target.value)}     placeholder="Fat g"     inputMode="decimal" className={inputCls} />
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className={cn(
          'w-full mt-1 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all flex items-center justify-center gap-2',
          !canSubmit
            ? 'bg-white/[0.05] text-slate-500'
            : 'bg-orange-500/15 border border-orange-400/40 hover:bg-orange-500/25',
        )}
      >
        <CheckCircleFullIcon size={14} /> Add item
      </button>
    </div>
  );
}

const inputCls = 'w-full bg-[#0a0a12] border border-white/10 focus:border-orange-400 rounded-xl px-3 py-2.5 text-white text-[13px] outline-none';

// ─── Helpers ─────────────────────────────────────────────────────────

function currentMealTypeGuess(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
