'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Recap, RecapEntry } from '@/types/recap';
import { ProofImage, VerifiedBadge } from '@/components/social/ProofImage';
import { FeedComments } from '@/components/social/FeedComments';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatRelativeTime } from '@/lib/utils';
import { canEdit } from '@/lib/recap';

interface Props {
  recap: Recap;
  isOwner: boolean;
}

/**
 * Full story view of a published Recap. Header with day stats, then a
 * scroll-through of each entry (photo + note + meta), then the comments
 * thread at the bottom.
 *
 * Verification UI for friends (Confirm / Flag swipe) is stubbed — wire-up
 * lands with the verification ladder phase. Schema fields are already in
 * place on `RecapEntry.confirmedBy` / `flaggedBy`.
 */
export function RecapDetailView({ recap, isOwner }: Props) {
  const heroColor = recap.entries[0]?.categoryColor || '#f97316';
  const dateLabel = formatDateLong(recap.localDate);
  const editable = isOwner && canEdit(recap);

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
        </div>

        <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] divide-y divide-white/[0.04] overflow-hidden">
          {recap.entries.map((entry, i) => (
            <RecapEntryRow key={entry.logId} entry={entry} index={i} />
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

function RecapEntryRow({ entry, index }: { entry: RecapEntry; index: number }) {
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
          <p className="text-sm font-bold text-white truncate">{entry.categoryName}</p>
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
    </motion.div>
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
