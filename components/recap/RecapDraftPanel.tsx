'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTodaysDraft, useYesterdaysRecap } from '@/hooks/useRecap';
import { countPillarsLogged, getPublishReward } from '@/constants/publishReward';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { publishRecap, canEdit, canPublishYesterday } from '@/lib/recap';
import { Recap } from '@/types/recap';
import { formatRelativeTime } from '@/lib/utils';
import { BFlameGlyph, BCheckGlyph } from '@/components/editorial/BGlyphs';

/**
 * Today's Record — editorial Direction B v2 conversion.
 *
 * Three states preserved from the legacy panel:
 *   1. Empty draft (no logs yet)
 *   2. Draft in progress (logs exist, not yet published)
 *   3. Already published (visible to friends)
 *
 * Above all states: if yesterday's recap is still unpublished and
 * inside the retro window, render a one-tap retro banner.
 *
 * No emoji — gift + flame replaced with BCheck and BFlame glyphs.
 * No gradients — typography + hairline rules carry the hierarchy.
 * panelPulse re-trigger preserved (the dashboard recap-flight lands
 * here and the glow flash fires keyed on panelPulse.id).
 */

export function RecapDraftPanel() {
  const { user } = useAuth();
  const { recap: today, loading: todayLoading } = useTodaysDraft();
  const { recap: yesterday } = useYesterdaysRecap();
  const addToast = useUIStore((s) => s.addToast);
  const panelPulse = useUIStore((s) => s.panelPulse);
  const [publishing, setPublishing] = useState(false);

  if (!user || todayLoading) return null;

  const handlePublish = async (recap: Recap) => {
    if (!user) return;
    setPublishing(true);
    try {
      const pillars = countPillarsLogged(recap.entries);
      const reward = getPublishReward(pillars);
      await publishRecap(user.uid, recap.localDate);
      const msg = reward.xp > 0
        ? `Day published · +${reward.xp} XP · +${reward.fragments} frags`
        : 'Day published — friends can see it now';
      addToast({ type: 'success', message: msg });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not publish';
      addToast({ type: 'error', message: msg });
    } finally {
      setPublishing(false);
    }
  };

  const showRetro = canPublishYesterday(yesterday);

  return (
    <div className="relative" data-recap-drop>
      {/* Border-glow flash when a recap-flight lands here. Same
          mechanic as before; the visual is just thinner. */}
      <AnimatePresence>
        {panelPulse && (
          <motion.div
            key={panelPulse.id}
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, times: [0, 0.25, 1], ease: 'easeOut' }}
            style={{
              boxShadow:
                `0 0 0 1px ${panelPulse.color}99, 0 0 22px 2px ${panelPulse.color}66`,
            }}
          />
        )}
      </AnimatePresence>

      {showRetro && yesterday && (
        <YesterdayRetroBanner
          recap={yesterday}
          onPublish={() => handlePublish(yesterday)}
          publishing={publishing}
        />
      )}

      {!today ? (
        <EmptyDraft />
      ) : today.status === 'draft' ? (
        <DraftState recap={today} onPublish={() => handlePublish(today)} publishing={publishing} />
      ) : (
        <PublishedState recap={today} />
      )}
    </div>
  );
}

// ─── Empty draft ─────────────────────────────────────────────────────

function EmptyDraft() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--b-rule)',
        borderBottom: '1px solid var(--b-rule)',
        padding: '14px 0',
      }}
    >
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
        Today&rsquo;s Record
      </div>
      <p
        className="font-display"
        style={{
          fontSize: 18,
          fontStyle: 'italic',
          fontWeight: 500,
          margin: '4px 0 6px',
          color: 'var(--b-ink)',
        }}
      >
        A blank ledger.
      </p>
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, margin: 0 }}
      >
        Log a habit to start today&rsquo;s record. Submit when you&rsquo;re done — friends only see your day, not every log.
      </p>
    </div>
  );
}

// ─── Draft state ─────────────────────────────────────────────────────

function DraftState({
  recap,
  onPublish,
  publishing,
}: {
  recap: Recap;
  onPublish: () => void;
  publishing: boolean;
}) {
  const proofThumbs = recap.entries.filter((e) => !!e.proofImageUrl).slice(0, 4);
  const pillars = countPillarsLogged(recap.entries);
  const upcoming = pillars > 0 ? getPublishReward(pillars) : null;
  const fullPayout = getPublishReward(5);

  return (
    <div
      style={{
        borderTop: '2px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-ink)',
        padding: '14px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          Today&rsquo;s Record
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-40)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Draft · Private
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <span
          className="font-display tabular"
          style={{ fontSize: 42, fontWeight: 500, lineHeight: 1, color: 'var(--b-ink)' }}
        >
          +{recap.totalXP}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
        >
          XP · {recap.logCount} log{recap.logCount === 1 ? '' : 's'}
          {recap.proofCount > 0 && ` · ${recap.proofCount} photo${recap.proofCount === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Category chips — minimal, inline */}
      {recap.entries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {recap.entries.slice(0, 4).map((e) => (
            <span
              key={e.logId}
              className="font-body tabular"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                border: '1px solid var(--b-rule)',
                color: 'var(--b-ink)',
                letterSpacing: '0.04em',
              }}
            >
              <span
                className="font-display"
                style={{ fontStyle: 'italic', fontWeight: 500, color: e.categoryColor }}
              >
                {e.categoryName}
              </span>
              {' '}
              <span style={{ color: 'var(--b-ink-60)' }}>{e.value}{e.unit}</span>
            </span>
          ))}
          {recap.entries.length > 4 && (
            <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
              +{recap.entries.length - 4} more
            </span>
          )}
        </div>
      )}

      {proofThumbs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {proofThumbs.map((e) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={e.logId}
              src={e.proofImageUrl}
              alt=""
              style={{
                width: 44,
                height: 44,
                objectFit: 'cover',
                border: '1px solid var(--b-rule)',
              }}
            />
          ))}
        </div>
      )}

      {upcoming && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 0',
            borderTop: '1px solid var(--b-rule)',
            borderBottom: '1px solid var(--b-rule)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
              Publish reward
            </div>
            <div
              className="font-mono tabular"
              style={{ fontSize: 12, color: 'var(--b-ink)', marginTop: 2 }}
            >
              +{upcoming.xp} XP · +{upcoming.fragments} frags
            </div>
          </div>
          <div
            className="font-body"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              textAlign: 'right',
              maxWidth: 160,
            }}
          >
            {pillars}/5 pillars{' '}
            {pillars < 5 && (
              <>
                ·{' '}
                <span style={{ color: 'var(--b-ink)' }}>
                  log {5 - pillars} more for +{fullPayout.xp - upcoming.xp} XP
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onPublish}
        disabled={publishing || recap.logCount === 0}
        className="font-body"
        style={{
          width: '100%',
          marginTop: 12,
          height: 46,
          border: '1px solid var(--b-ink)',
          background: recap.logCount === 0 || publishing ? 'var(--b-paper-2)' : 'var(--b-ink)',
          color: recap.logCount === 0 || publishing ? 'var(--b-ink-40)' : 'var(--b-paper)',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.08em',
          cursor: recap.logCount === 0 || publishing ? 'not-allowed' : 'pointer',
        }}
      >
        {publishing ? 'PUBLISHING…' : "SUBMIT TODAY'S RECORD →"}
      </button>
      <p
        className="font-body"
        style={{
          fontSize: 10,
          color: 'var(--b-ink-40)',
          textAlign: 'center',
          marginTop: 6,
          letterSpacing: '0.04em',
        }}
      >
        Friends will see one curated post — not every log.
      </p>
    </div>
  );
}

// ─── Published state ─────────────────────────────────────────────────

function PublishedState({ recap }: { recap: Recap }) {
  const { user } = useAuth();
  const [editView] = useState(() => {
    const ed = canEdit(recap);
    const hoursLeft = recap.publishedAt
      ? Math.max(0, Math.ceil((recap.publishedAt.toDate().getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)))
      : 0;
    return { editable: ed, editHoursLeft: hoursLeft };
  });
  const editable = editView.editable;
  const editHoursLeft = editView.editHoursLeft;

  const userAny = user as unknown as Record<string, number> | null;
  const recapStreak = userAny?.recapStreak || 0;

  return (
    <div
      style={{
        borderTop: '1px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-ink)',
        padding: '14px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div
          className="spread"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 9,
            color: 'var(--b-accent)',
          }}
        >
          <BCheckGlyph size={12} />
          Published
          {recap.publishedAt && (
            <span
              className="font-mono"
              style={{
                color: 'var(--b-ink-40)',
                fontSize: 9,
                marginLeft: 4,
                letterSpacing: 'normal',
                textTransform: 'none',
                fontWeight: 400,
              }}
            >
              · {formatRelativeTime(recap.publishedAt.toDate())}
            </span>
          )}
        </div>
        {editable && editHoursLeft > 0 && (
          <span
            className="font-mono"
            style={{ fontSize: 9, color: 'var(--b-ink-40)', letterSpacing: '0.06em' }}
          >
            EDITABLE FOR {editHoursLeft}H
          </span>
        )}
      </div>

      <p
        className="font-body"
        style={{ fontSize: 13, color: 'var(--b-ink)', margin: '8px 0' }}
      >
        {recap.logCount} log{recap.logCount === 1 ? '' : 's'} · +{recap.totalXP} XP · visible to friends
      </p>

      {recap.publishReward && (recap.publishReward.xp > 0 || recap.publishReward.fragments > 0) && (
        <div
          style={{
            padding: '8px 0',
            borderTop: '1px solid var(--b-rule)',
            borderBottom: '1px solid var(--b-rule)',
            marginBottom: 10,
          }}
        >
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
            Publish reward
          </div>
          <div
            className="font-mono tabular"
            style={{ fontSize: 12, color: 'var(--b-ink)', marginTop: 2 }}
          >
            +{recap.publishReward.xp} XP · +{recap.publishReward.fragments} frags
          </div>
          <div className="font-body" style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}>
            {recap.publishReward.pillarsLogged}/5 pillars submitted
          </div>
        </div>
      )}

      {recapStreak > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            marginBottom: 10,
          }}
        >
          <BFlameGlyph size={14} style={{ color: 'var(--b-accent)' }} />
          <div className="font-body" style={{ fontSize: 11, color: 'var(--b-ink)' }}>
            <em className="font-display" style={{ fontStyle: 'italic', fontWeight: 500 }}>
              {recapStreak}-day
            </em>{' '}
            publishing streak — don&rsquo;t miss tomorrow.
          </div>
        </div>
      )}

      <Link
        href={`/recap/${recap.userId}/${recap.localDate}`}
        className="font-body"
        style={{
          display: 'block',
          width: '100%',
          height: 40,
          border: '1px solid var(--b-ink)',
          background: 'transparent',
          color: 'var(--b-ink)',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.08em',
          textAlign: 'center',
          lineHeight: '40px',
          textDecoration: 'none',
        }}
      >
        VIEW RECORD →
      </Link>
    </div>
  );
}

// ─── Yesterday retro banner ─────────────────────────────────────────

function YesterdayRetroBanner({
  recap,
  onPublish,
  publishing,
}: {
  recap: Recap;
  onPublish: () => void;
  publishing: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: 12,
        padding: '10px 0 10px 12px',
        borderLeft: '2px solid var(--b-accent)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          Yesterday&rsquo;s record is unpublished
        </div>
        <p
          className="font-body"
          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2, lineHeight: 1.5 }}
        >
          {recap.logCount} log{recap.logCount === 1 ? '' : 's'} · +{recap.totalXP} XP — publish before midnight to count.
        </p>
      </div>
      <button
        onClick={onPublish}
        disabled={publishing}
        className="font-body"
        style={{
          height: 32,
          padding: '0 12px',
          border: '1px solid var(--b-ink)',
          background: 'transparent',
          color: 'var(--b-ink)',
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.08em',
          cursor: publishing ? 'not-allowed' : 'pointer',
          opacity: publishing ? 0.5 : 1,
        }}
      >
        {publishing ? '…' : 'PUBLISH'}
      </button>
    </div>
  );
}
