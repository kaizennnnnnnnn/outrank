'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Recap, RecapEntry } from '@/types/recap';
import { ProofImage, VerifiedBadge } from '@/components/social/ProofImage';
import { FeedComments } from '@/components/social/FeedComments';
import { getCategoryIconComponent } from '@/components/ui/CategoryIcons';
import { Masthead } from '@/components/editorial/Masthead';
import { formatRelativeTime } from '@/lib/utils';
import {
  canEdit,
  getEntryVerifications,
  addEntryVerification,
  removeEntryVerification,
  EntryVerification,
} from '@/lib/recap';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { haptic } from '@/lib/haptics';
import { RecapEditEntryModal } from './RecapEditEntryModal';

interface Props {
  recap: Recap;
  isOwner: boolean;
}

/**
 * Full story view of a published Recap — editorial Direction B v2.
 * Header reads as a periodical entry: spread eyebrow "Daily Record",
 * italic display headline with username, mono date, big italic +XP
 * pulled to the right, hairline-bracketed stat strip below. Each entry
 * is a numbered editorial row with the proof image full-bleed and the
 * verification chips quietly below. Comments at the bottom inside a
 * blockquote-style frame.
 */
export function RecapDetailView({ recap, isOwner }: Props) {
  const { user } = useAuth();
  const dateLabel = formatDateLong(recap.localDate);
  const editable = isOwner && canEdit(recap);

  const [editHoursLeft] = useState(() => {
    if (!editable || !recap.publishedAt) return 0;
    return Math.max(
      0,
      Math.ceil(
        (recap.publishedAt.toDate().getTime() + 24 * 60 * 60 * 1000 - Date.now()) /
          (60 * 60 * 1000),
      ),
    );
  });

  const [editingEntry, setEditingEntry] = useState<RecapEntry | null>(null);

  const [verifications, setVerifications] = useState<Record<string, EntryVerification>>({});

  useEffect(() => {
    let cancelled = false;
    getEntryVerifications(recap)
      .then((map) => {
        if (!cancelled) setVerifications(map);
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [recap]);

  const entries = useMemo(() => recap.entries, [recap.entries]);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Day" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Daily Record
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                className="font-display"
                style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.05, margin: '2px 0 4px' }}
              >
                <Link
                  href={`/profile/${recap.username}`}
                  style={{ color: 'var(--b-ink)', textDecoration: 'none' }}
                >
                  <em style={{ fontStyle: 'italic' }}>{recap.username}</em>
                </Link>
              </h1>
              <div
                className="font-body tabular"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', letterSpacing: '0.02em' }}
              >
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {dateLabel}
                </span>
                {recap.publishedAt && (
                  <span style={{ color: 'var(--b-ink-40)', marginLeft: 6 }}>
                    · published {formatRelativeTime(recap.publishedAt.toDate())}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="font-display tabular"
                style={{ fontSize: 38, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, color: 'var(--b-accent)' }}
              >
                +{recap.totalXP}
              </div>
              <div
                className="spread"
                style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
              >
                XP earned
              </div>
            </div>
          </div>

          {/* Stat strip — counts of logs, photos, pillars */}
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <StatCell label="Logs" value={String(recap.logCount)} />
            <StatCell label="Photos" value={String(recap.proofCount)} border />
            <StatCell
              label="Pillars"
              value={`${recap.publishReward?.pillarsLogged ?? '—'} / 5`}
              border
            />
          </div>

          {/* Publish reward chip + edit window */}
          {(recap.publishReward || (editable && editHoursLeft > 0)) && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              {recap.publishReward && recap.publishReward.xp > 0 && (
                <span
                  className="spread"
                  style={{
                    fontSize: 9,
                    color: '#34d399',
                    padding: '3px 8px',
                    border: '1px solid #34d39980',
                  }}
                  title={`Earned at publish for ${recap.publishReward.pillarsLogged}/5 pillars`}
                >
                  +{recap.publishReward.xp} XP · +{recap.publishReward.fragments} frags
                </span>
              )}
              {editable && editHoursLeft > 0 && (
                <span
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-accent)' }}
                >
                  Editable for {editHoursLeft}h
                </span>
              )}
            </div>
          )}

          {/* Entries — numbered editorial rows */}
          <section style={{ marginTop: 24 }}>
            <div
              style={{
                paddingTop: 12,
                borderTop: '1px solid var(--b-ink)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
                The Day
              </div>
              <div
                className="font-mono tabular"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
              >
                § {String(entries.length).padStart(2, '0')}
              </div>
            </div>

            {!isOwner && (
              <p
                className="font-body"
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-40)',
                  marginBottom: 8,
                  fontStyle: 'italic',
                }}
              >
                Tap an entry to confirm or flag it.
              </p>
            )}

            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {entries.map((entry, i) => (
                <RecapEntryRow
                  key={entry.logId}
                  entry={entry}
                  index={i}
                  isOwner={isOwner}
                  canEdit={editable}
                  onEdit={() => setEditingEntry(entry)}
                  currentUid={user?.uid}
                  recapOriginId={recap.originId}
                  verification={verifications[entry.logId] || { confirm: [], flag: [] }}
                  onVerificationChange={(logId, next) =>
                    setVerifications((m) => ({ ...m, [logId]: next }))
                  }
                />
              ))}
            </ul>
          </section>

          {/* Comments */}
          <section style={{ marginTop: 24 }}>
            <div
              style={{
                paddingTop: 12,
                borderTop: '1px solid var(--b-ink)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
                Discussion
              </div>
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
              >
                Open thread
              </div>
            </div>
            <FeedComments originId={recap.originId} actorId={recap.userId} />
          </section>

          {/* Back to feed */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link
              href="/feed"
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                textDecoration: 'none',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ← Back to dispatches
            </Link>
          </div>
        </div>
      </div>

      <RecapEditEntryModal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        recapDateKey={recap.localDate}
        entry={editingEntry}
      />
    </div>
  );
}

function StatCell({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 0',
        textAlign: 'center',
        borderLeft: border ? '1px solid var(--b-rule)' : 'none',
      }}
    >
      <div
        className="font-display tabular"
        style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        className="spread"
        style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}

interface RowProps {
  entry: RecapEntry;
  index: number;
  isOwner: boolean;
  canEdit: boolean;
  onEdit: () => void;
  currentUid?: string;
  recapOriginId: string;
  verification: EntryVerification;
  onVerificationChange: (logId: string, next: EntryVerification) => void;
}

function RecapEntryRow({
  entry,
  index,
  isOwner,
  canEdit,
  onEdit,
  currentUid,
  recapOriginId,
  verification,
  onVerificationChange,
}: RowProps) {
  const addToast = useUIStore((s) => s.addToast);

  const myConfirm = currentUid ? verification.confirm.includes(currentUid) : false;
  const myFlag = currentUid ? verification.flag.includes(currentUid) : false;
  const confirmCount = verification.confirm.length;
  const flagCount = verification.flag.length;
  const hasFriendConfirm = verification.confirm.some((u) => u !== currentUid);
  const friendConfirmCount = verification.confirm.filter((u) => u !== currentUid).length;

  const handleVerify = async (kind: 'confirm' | 'flag') => {
    if (!currentUid || isOwner) return;
    const isOn = kind === 'confirm' ? myConfirm : myFlag;

    const next: EntryVerification = {
      confirm:
        kind === 'confirm'
          ? isOn
            ? verification.confirm.filter((u) => u !== currentUid)
            : [...verification.confirm, currentUid]
          : verification.confirm,
      flag:
        kind === 'flag'
          ? isOn
            ? verification.flag.filter((u) => u !== currentUid)
            : [...verification.flag, currentUid]
          : verification.flag,
    };
    onVerificationChange(entry.logId, next);

    try {
      if (isOn) {
        await removeEntryVerification(recapOriginId, entry.logId, currentUid, kind);
      } else {
        await addEntryVerification(recapOriginId, entry.logId, currentUid, kind);
        haptic(kind === 'confirm' ? 'success' : 'tap');
      }
    } catch {
      addToast({ type: 'error', message: 'Could not save' });
      onVerificationChange(entry.logId, verification);
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      style={{
        padding: '14px 0',
        borderBottom: '1px solid var(--b-rule)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '24px 32px 1fr auto', gap: 10, alignItems: 'flex-start' }}>
        <span
          className="font-mono tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-40)',
            textAlign: 'right',
            paddingTop: 4,
            letterSpacing: '0.04em',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {(() => {
          const Glyph = getCategoryIconComponent(entry.habitSlug);
          return (
            <span
              style={{
                color: entry.categoryColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                flexShrink: 0,
              }}
            >
              <Glyph size={22} />
            </span>
          );
        })()}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <div
              className="font-display"
              style={{ fontSize: 15, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
            >
              {entry.categoryName}
            </div>
            {hasFriendConfirm && (
              <span
                className="spread"
                style={{
                  fontSize: 8,
                  color: '#34d399',
                  padding: '1px 5px',
                  border: '1px solid #34d39980',
                }}
                title={`Verified by ${friendConfirmCount || confirmCount} friend${(friendConfirmCount || confirmCount) === 1 ? '' : 's'}`}
              >
                ✓ Verified
              </span>
            )}
            {flagCount > 0 && (
              <span
                className="spread"
                style={{
                  fontSize: 8,
                  color: '#fbbf24',
                  padding: '1px 5px',
                  border: '1px solid #fbbf2480',
                }}
                title={`Flagged by ${flagCount}`}
              >
                ⚠ {flagCount}
              </span>
            )}
            {entry.verified && <VerifiedBadge />}
          </div>
          <div
            className="font-mono tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2, letterSpacing: '0.04em' }}
          >
            <span style={{ color: entry.categoryColor, fontWeight: 600 }}>
              {entry.value}{entry.unit}
            </span>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            +{entry.xpEarned} XP
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            {entry.loggedAt?.toDate ? timeOfDay(entry.loggedAt.toDate()) : ''}
          </div>
        </div>
      </div>

      {entry.note && (
        <p
          className="font-display"
          style={{
            margin: '10px 0 0 66px',
            fontSize: 13,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.5,
            color: 'var(--b-ink)',
          }}
        >
          &ldquo;{entry.note}&rdquo;
        </p>
      )}

      {entry.proofImageUrl && (
        <div style={{ marginTop: 10, marginLeft: 66, border: '1px solid var(--b-rule)' }}>
          <ProofImage src={entry.proofImageUrl} alt={`${entry.categoryName} proof`} />
        </div>
      )}

      {/* Friend-only verification controls */}
      {!isOwner && currentUid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 66 }}>
          <VerifyChip
            kind="confirm"
            active={myConfirm}
            count={confirmCount}
            onClick={() => handleVerify('confirm')}
          />
          <VerifyChip
            kind="flag"
            active={myFlag}
            count={flagCount}
            onClick={() => handleVerify('flag')}
          />
        </div>
      )}

      {/* Owner verification counts + edit */}
      {isOwner && (confirmCount > 0 || flagCount > 0 || canEdit) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 8,
            marginLeft: 66,
          }}
          className="font-mono tabular"
        >
          {confirmCount > 0 && (
            <span style={{ fontSize: 10, color: '#34d399' }}>
              ✓ {confirmCount} confirm{confirmCount === 1 ? '' : 's'}
            </span>
          )}
          {flagCount > 0 && (
            <span style={{ fontSize: 10, color: '#fbbf24' }}>
              ⚠ {flagCount} flag{flagCount === 1 ? '' : 's'}
            </span>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="font-body"
              style={{
                marginLeft: 'auto',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--b-accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Edit ↗
            </button>
          )}
        </div>
      )}
    </motion.li>
  );
}

function VerifyChip({
  kind,
  active,
  count,
  onClick,
}: {
  kind: 'confirm' | 'flag';
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const color = kind === 'confirm' ? '#22c55e' : '#fbbf24';
  const label = kind === 'confirm' ? 'Confirm' : 'Flag';
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="font-body"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: active ? `${color}14` : 'transparent',
        border: active ? `1px solid ${color}` : '1px solid var(--b-rule)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: active ? color : 'var(--b-ink-60)',
      }}
    >
      {kind === 'confirm' ? (
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span style={{ fontSize: 11, lineHeight: 1 }}>⚠</span>
      )}
      <span>{label}</span>
      {count > 0 && (
        <span
          className="font-mono tabular"
          style={{ fontSize: 9, color: active ? color : 'var(--b-ink-40)', marginLeft: 2 }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

function formatDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeOfDay(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
