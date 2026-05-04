'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { CATEGORIES, CATEGORY_SECTIONS, getGoalConfig, type CategorySection } from '@/constants/categories';
import { Modal } from '@/components/ui/Modal';
import { CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { setDocument, Timestamp, removeDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Masthead } from '@/components/editorial/Masthead';
import {
  BGymGlyph,
  BRunGlyph,
  BShowerGlyph,
  BBookGlyph,
  BMeditationGlyph,
  BFocusGlyph,
  BWaterGlyph,
  BSleepGlyph,
  BStepsGlyph,
  BCodeGlyph,
  BSunGlyph,
  BFlameGlyph,
  BPlusGlyph,
} from '@/components/editorial/BGlyphs';
import { collection, query, where, getDocs, Timestamp as FsTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Habits — editorial Direction B v2 conversion.
 *
 * "Daily Practice" front page: a 4-week sparkline of total log
 * activity at the top, then a numbered list of habits grouped by
 * category section (Body / Mind / Career / etc.). Tapping a habit
 * routes to the existing /habits/[slug] detail screen. The "+ ADD"
 * link in the masthead row opens the existing browser modal so the
 * add/remove flow is unchanged.
 *
 * The sparkline is one cheap query: 28 days of /logs/{uid}/habitLogs
 * filtered by createdAt, bucketed client-side by toDateString. Cost
 * is one read per day's log on first load — typically 30-300 docs.
 */

// Slug → bespoke glyph. Anything not in the table falls back to a
// small flame mark, which reads as a generic "habit" symbol in the
// design's editorial vocabulary.
type GlyphCmp = React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;

const SLUG_GLYPH: Record<string, GlyphCmp> = {
  gym: BGymGlyph, yoga: BGymGlyph, stretch: BGymGlyph,
  running: BRunGlyph, swimming: BRunGlyph, cycling: BRunGlyph, outside: BRunGlyph,
  'cold-shower': BShowerGlyph, skincare: BShowerGlyph,
  books: BBookGlyph, pages: BBookGlyph, language: BBookGlyph, courses: BBookGlyph,
  podcasts: BBookGlyph, vocabulary: BBookGlyph, flashcards: BBookGlyph, chess: BBookGlyph,
  meditation: BMeditationGlyph, journaling: BMeditationGlyph, gratitude: BMeditationGlyph,
  'deep-work': BFocusGlyph, 'screen-time': BFocusGlyph, 'no-social': BFocusGlyph,
  projects: BFocusGlyph, networking: BFocusGlyph, outreach: BFocusGlyph, clients: BFocusGlyph,
  water: BWaterGlyph,
  sleep: BSleepGlyph, supplements: BSleepGlyph, 'no-caffeine': BSleepGlyph,
  'alcohol-free': BSleepGlyph, 'junk-free': BSleepGlyph,
  steps: BStepsGlyph,
  coding: BCodeGlyph, commits: BCodeGlyph, designs: BCodeGlyph, drawings: BCodeGlyph,
  photos: BCodeGlyph, music: BCodeGlyph, videos: BCodeGlyph, writing: BCodeGlyph,
  guitar: BCodeGlyph,
  'early-wake': BSunGlyph, 'meal-prep': BSunGlyph,
};

function glyphFor(slug: string): GlyphCmp {
  return SLUG_GLYPH[slug] ?? BFlameGlyph;
}

// Word-form count, 1-99. Falls through to numeric for higher.
function countWord(n: number): string {
  if (n <= 0) return 'zero';
  const ones = ['','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? tens[t] : `${tens[t]}-${ones[o]}`;
  }
  return String(n);
}

export default function HabitsPage() {
  const { user } = useAuth();
  const { habits, loading } = useHabits();
  const addToast = useUIStore((s) => s.addToast);
  const [showBrowser, setShowBrowser] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Sparkline source: counts of habit logs per day for the last 28 days.
  const [perDay, setPerDay] = useState<number[]>(Array(28).fill(0));
  const [totalLogs28, setTotalLogs28] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 27); // 28-day window inclusive of today
    (async () => {
      try {
        const q = query(
          collection(db, `logs/${user.uid}/habitLogs`),
          where('createdAt', '>=', FsTimestamp.fromDate(since)),
        );
        const snap = await getDocs(q);
        const buckets = new Array(28).fill(0) as number[];
        snap.forEach((d) => {
          const data = d.data() as { createdAt?: { toDate: () => Date } };
          const ts = data.createdAt?.toDate?.();
          if (!ts) return;
          const dayDiff = Math.floor((ts.getTime() - since.getTime()) / 86400000);
          if (dayDiff >= 0 && dayDiff < 28) buckets[dayDiff] += 1;
        });
        if (cancelled) return;
        setPerDay(buckets);
        setTotalLogs28(snap.size);
      } catch {
        /* sparkline is non-fatal — leave defaults */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const subscribedSlugs = useMemo(() => habits.map((h) => h.categorySlug), [habits]);

  // Group habits by their category's section (Body / Mind / Career / etc.).
  const grouped = useMemo(() => {
    const bySection = new Map<CategorySection, typeof habits>();
    habits.forEach((h) => {
      const cat = CATEGORIES.find((c) => c.slug === h.categorySlug);
      const section = (cat?.section as CategorySection) ?? 'Lifestyle';
      const arr = bySection.get(section) ?? [];
      arr.push(h);
      bySection.set(section, arr);
    });
    return Array.from(bySection.entries())
      .sort(([a], [b]) => CATEGORY_SECTIONS.indexOf(a) - CATEGORY_SECTIONS.indexOf(b));
  }, [habits]);

  const todayStr = new Date().toDateString();
  const isLoggedToday = (lastLogDate: { toDate?: () => Date } | null | undefined) =>
    lastLogDate?.toDate?.()?.toDateString?.() === todayStr;

  const addHabit = async (slug: string) => {
    if (!user) return;
    const cat = CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return;
    setAdding(slug);
    try {
      await setDocument(`habits/${user.uid}/userHabits`, slug, {
        categoryId: slug,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categorySlug: cat.slug,
        goal: getGoalConfig(slug).defaultGoal,
        goalPeriod: 'daily',
        isPublic: true,
        currentStreak: 0,
        longestStreak: 0,
        totalLogs: 0,
        lastLogDate: null,
        createdAt: Timestamp.now(),
        color: cat.color,
        unit: cat.unit,
      });
      addToast({ type: 'success', message: `${cat.name} added` });
    } catch {
      addToast({ type: 'error', message: 'Failed to add habit' });
    } finally {
      setAdding(null);
    }
  };

  const removeHabit = async (slug: string) => {
    if (!user) return;
    try {
      await removeDocument(`habits/${user.uid}/userHabits`, slug);
      addToast({ type: 'info', message: 'Habit removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove habit' });
    }
  };

  const habitCount = habits.length;
  const sparkMax = Math.max(1, ...perDay);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Daily Practice" />

        <div style={{ padding: '0 22px' }}>
          {/* Eyebrow + headline */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Your Roster
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 12px' }}
            >
              <em style={{ fontStyle: 'italic' }}>{countWord(habitCount).replace(/^./, (c) => c.toUpperCase())}</em> habit{habitCount === 1 ? '' : 's'}
            </h1>
            <button
              onClick={() => setShowBrowser(true)}
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--b-accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <BPlusGlyph size={11} /> ADD
            </button>
          </div>

          {/* 28-day activity sparkline */}
          <div
            style={{
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-ink)',
              padding: '14px 0',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 3,
                height: 42,
              }}
            >
              {perDay.map((v, i) => {
                const isToday = i === perDay.length - 1;
                const recent = i >= perDay.length - 4;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(4, (v / sparkMax) * 100)}%`,
                      background: isToday
                        ? 'var(--b-accent)'
                        : recent
                        ? 'var(--b-ink)'
                        : 'var(--b-ink-40)',
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                fontSize: 9,
                color: 'var(--b-ink-60)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              <span>4 weeks ago</span>
              <span className="tabular">{totalLogs28} logs</span>
              <span style={{ color: 'var(--b-accent)', fontWeight: 600 }}>today</span>
            </div>
          </div>

          {/* Empty state */}
          {!loading && habits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 8 }}
              >
                A blank ledger.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', marginBottom: 16 }}
              >
                Pick from 52 categories to start tracking.
              </p>
              <button
                onClick={() => setShowBrowser(true)}
                className="font-body"
                style={{
                  height: 44,
                  padding: '0 20px',
                  border: '1px solid var(--b-ink)',
                  background: 'var(--b-ink)',
                  color: 'var(--b-paper)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                BROWSE CATEGORIES →
              </button>
            </div>
          )}

          {/* Sections */}
          {grouped.map(([section, items], si) => (
            <div key={section} style={{ marginBottom: 18 }}>
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
                  {section}
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  § {String(si + 1).padStart(2, '0')}
                </span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((h) => {
                  const Glyph = glyphFor(h.categorySlug);
                  const done = isLoggedToday(h.lastLogDate);
                  const broken = h.currentStreak === 0;
                  const status = broken
                    ? 'BROKEN'
                    : `${h.currentStreak}-DAY STREAK`;
                  const value = done
                    ? 'logged'
                    : h.goal
                    ? `0 / ${h.goal}${h.unit ? ' ' + h.unit : ''}`
                    : '—';
                  return (
                    <li
                      key={h.categorySlug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                      }}
                    >
                      <Link
                        href={`/habits/${h.categorySlug}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <Glyph size={26} style={{ color: 'var(--b-ink)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="font-display"
                            style={{ fontSize: 17, fontWeight: 500 }}
                          >
                            {h.categoryName}
                          </div>
                          <div
                            className="font-body"
                            style={{
                              fontSize: 10,
                              color: broken ? 'var(--b-accent)' : 'var(--b-ink-60)',
                              fontWeight: broken ? 700 : 400,
                              letterSpacing: '0.06em',
                              marginTop: 1,
                            }}
                          >
                            {status}
                          </div>
                        </div>
                        <span
                          className="font-mono tabular"
                          style={{
                            fontSize: 11,
                            color: 'var(--b-ink)',
                            fontWeight: 600,
                          }}
                        >
                          {value}
                        </span>
                      </Link>
                      {editMode && (
                        <button
                          onClick={() => removeHabit(h.categorySlug)}
                          aria-label="Remove habit"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--b-ink-60)',
                            fontSize: 18,
                            lineHeight: 1,
                            cursor: 'pointer',
                            padding: '0 4px',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Edit mode toggle — small, low-key */}
          {!loading && habits.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                onClick={() => setEditMode((e) => !e)}
                className="font-body"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--b-ink-60)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {editMode ? 'Done editing' : 'Manage roster'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Browser Modal — preserved as-is */}
      <Modal isOpen={showBrowser} onClose={() => setShowBrowser(false)} title="Browse Categories" size="lg">
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {CATEGORY_SECTIONS.map((section) => (
            <div key={section}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{section}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.filter((c) => c.section === section).map((cat) => {
                  const isSubscribed = subscribedSlugs.includes(cat.slug);
                  const Glyph = glyphFor(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => !isSubscribed && addHabit(cat.slug)}
                      disabled={isSubscribed || adding === cat.slug}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                        isSubscribed
                          ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                          : 'border-[#1e1e30] bg-[#10101a] hover:border-red-500/30 hover:bg-red-500/5'
                      )}
                    >
                      <Glyph size={20} style={{ color: '#fff', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{cat.name}</p>
                        <p className="text-[10px] text-slate-600">{cat.unit}</p>
                      </div>
                      {isSubscribed && <CheckCircleFullIcon size={14} className="text-emerald-400" />}
                      {adding === cat.slug && <span className="text-xs text-slate-500">...</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
