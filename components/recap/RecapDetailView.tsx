'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Recap, RecapEntry } from '@/types/recap';
import { ProofImage, VerifiedBadge } from '@/components/social/ProofImage';
import { FeedComments } from '@/components/social/FeedComments';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
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

interface Props {
  recap: Recap;
  isOwner: boolean;
}

/**
 * Full story view of a published Recap. Header with day stats, then a
 * scroll-through of each entry (photo + note + meta + per-entry
 * verification controls), then the comments thread at the bottom.
 *
 * Verification: friends can Confirm or Flag any entry. State lives in
 * `/reactions/{recapOriginId}_{logId}` — same collection comments and
 * the standard reactions use, so no new rules. Confirms upgrade the
 * entry toward tier-2 in the verification ladder; flags raise it for
 * review (UI surfaces only — moderation pipeline is later).
 */
export function RecapDetailView({ recap, isOwner }: Props) {
  const { user } = useAuth();
  const heroColor = recap.entries[0]?.categoryColor || '#f97316';
  const dateLabel = formatDateLong(recap.localDate);
  const editable = isOwner && canEdit(recap);

  // Bulk-load verifications once when the recap renders. Optimistic
  // updates after that — taps hit the local map, then write through.
  const [verifications, setVerifications] = useState<Record<string, EntryVerification>>({});

  useEffect(() => {
    let cancelled = false;
    getEntryVerifications(recap)
      .then((map) => {
        if (!cancelled) setVerifications(map);
      })
      .catch(() => { /* non-fatal — UI just won't show counts */ });
    return () => { cancelled = true; };
  }, [recap]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header card — only frame on the page, anchors identity for the day */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background: `radial-gradient(ellipse 100% 80% at 100% 0%, ${heroColor}22, transparent 55%),` +
            `linear-gradient(160deg, #10101a 0%, #0b0b14 100%)`,
          borderColor: `${heroColor}33`,
          boxShadow: `inset 0 1px 0 ${heroColor}25, 0 0 30px -14px ${heroColor}55`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
              Daily Record
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1">
              <Link href={`/profile/${recap.username}`} className="hover:text-orange-400 transition-colors">
                {recap.username}
              </Link>
              <span className="text-slate-500 font-normal text-base ml-2">· {dateLabel}</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
              {recap.publishedAt ? `Published ${formatRelativeTime(recap.publishedAt.toDate())}` : 'Draft'}
              {recap.lastEditedAt && ` · edited ${formatRelativeTime(recap.lastEditedAt.toDate())}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-3xl font-bold leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
                +{recap.totalXP}
              </span>
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">XP</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 text-[11px] font-mono text-slate-500">
          <span>
            <span className="text-slate-300 font-bold">{recap.logCount}</span> log{recap.logCount === 1 ? '' : 's'}
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-slate-300 font-bold">{recap.proofCount}</span> photo{recap.proofCount === 1 ? '' : 's'}
          </span>
          {editable && (
            <span className="ml-auto text-[10px] uppercase tracking-widest text-emerald-400">
              You can still edit
            </span>
          )}
        </div>
      </div>

      {/* Story — entries flow on the page, no per-entry frames */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
            The Day
          </p>
          {!isOwner && (
            <span className="text-[10px] font-mono text-slate-600 ml-1">
              · tap an entry to confirm or flag
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
          {recap.entries.map((entry, i) => (
            <RecapEntryRow
              key={entry.logId}
              entry={entry}
              index={i}
              isOwner={isOwner}
              currentUid={user?.uid}
              recapOriginId={recap.originId}
              verification={verifications[entry.logId] || { confirm: [], flag: [] }}
              onVerificationChange={(logId, next) =>
                setVerifications((m) => ({ ...m, [logId]: next }))
              }
            />
          ))}
        </div>
      </section>

      {/* Comments — same infra as feed comments, threaded by originId */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">
            Discussion
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] p-4">
          <FeedComments originId={recap.originId} actorId={recap.userId} />
        </div>
      </section>
    </div>
  );
}

interface RowProps {
  entry: RecapEntry;
  index: number;
  isOwner: boolean;
  currentUid?: string;
  recapOriginId: string;
  verification: EntryVerification;
  onVerificationChange: (logId: string, next: EntryVerification) => void;
}

function RecapEntryRow({
  entry,
  index,
  isOwner,
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

  // Tier 2 = "verified by friend" — at least one non-owner has confirmed.
  // Self-confirms (owner confirming their own entry) don't count.
  const friendConfirms = verification.confirm.filter((u) => u !== entry.logId && u !== currentUid);
  const hasFriendConfirm = verification.confirm.some((u) => u !== currentUid);

  const handleVerify = async (kind: 'confirm' | 'flag') => {
    if (!currentUid || isOwner) return;
    const isOn = kind === 'confirm' ? myConfirm : myFlag;

    // Optimistic update so the tap feels immediate.
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
      // Revert on failure
      onVerificationChange(entry.logId, verification);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <CategoryIcon
          slug={entry.habitSlug}
          name={entry.categoryName}
          icon={entry.categoryIcon}
          color={entry.categoryColor}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{entry.categoryName}</p>
            {hasFriendConfirm && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded inline-flex items-center gap-1"
                style={{
                  color: '#34d399',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                }}
                title={`Verified by ${friendConfirms.length || confirmCount} ${(friendConfirms.length || confirmCount) === 1 ? 'friend' : 'friends'}`}
              >
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </span>
            )}
            {flagCount > 0 && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
                style={{
                  color: '#fbbf24',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                }}
                title={`Flagged by ${flagCount} ${flagCount === 1 ? 'friend' : 'friends'}`}
              >
                ⚠ Flagged · {flagCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
            <span style={{ color: entry.categoryColor }} className="font-bold">
              {entry.value}{entry.unit}
            </span>
            <span className="text-slate-700">·</span>
            <span>+{entry.xpEarned} XP</span>
            <span className="text-slate-700">·</span>
            <span>{entry.loggedAt?.toDate ? timeOfDay(entry.loggedAt.toDate()) : ''}</span>
          </div>
        </div>
        {entry.verified && <VerifiedBadge />}
      </div>

      {entry.note && (
        <p className="text-[13px] text-slate-300 leading-snug pl-12">
          &ldquo;{entry.note}&rdquo;
        </p>
      )}

      {entry.proofImageUrl && (
        <div className="pl-12">
          <ProofImage src={entry.proofImageUrl} alt={`${entry.categoryName} proof`} />
        </div>
      )}

      {/* Friend-only verification controls. Owner sees the counts only. */}
      {!isOwner && currentUid && (
        <div className="pl-12 flex items-center gap-2 pt-1">
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
      {isOwner && (confirmCount > 0 || flagCount > 0) && (
        <div className="pl-12 flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1">
          {confirmCount > 0 && (
            <span className="text-emerald-400">
              ✓ {confirmCount} confirm{confirmCount === 1 ? '' : 's'}
            </span>
          )}
          {flagCount > 0 && (
            <span className="text-amber-400">
              ⚠ {flagCount} flag{flagCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </motion.div>
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
  const color = kind === 'confirm' ? '#22c55e' : '#f59e0b';
  const label = kind === 'confirm' ? 'Confirm' : 'Flag';
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border"
      style={{
        borderColor: active ? color : '#1e1e30',
        background: active ? `${color}22` : '#0b0b14',
        color: active ? color : '#94a3b8',
        boxShadow: active ? `0 0 10px -2px ${color}66, inset 0 1px 0 ${color}22` : undefined,
      }}
    >
      {kind === 'confirm' ? (
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="text-[11px] leading-none">⚠</span>
      )}
      <span className="font-bold">{label}</span>
      {count > 0 && (
        <span className="font-mono text-[10px]" style={{ color: active ? color : '#64748b' }}>
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
