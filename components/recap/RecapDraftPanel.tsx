'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useTodaysDraft, useYesterdaysRecap } from '@/hooks/useRecap';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { publishRecap, canEdit, canPublishYesterday } from '@/lib/recap';
import { Recap } from '@/types/recap';
import { formatRelativeTime } from '@/lib/utils';

/**
 * The "submit my day" widget on the dashboard. Three states:
 *   1. No draft yet — encouragement: "Log your first habit to start today's record."
 *   2. Draft in progress — preview of today + big "Submit Today's Record" button.
 *   3. Already published — published-state pill, link to detail, edit-window
 *      countdown.
 *
 * Above all that: if yesterday's draft is still unpublished and inside the
 * retro window, render a one-tap "Publish yesterday's record" banner.
 */
export function RecapDraftPanel() {
  const { user } = useAuth();
  const { recap: today, loading: todayLoading } = useTodaysDraft();
  const { recap: yesterday } = useYesterdaysRecap();
  const addToast = useUIStore((s) => s.addToast);
  const [publishing, setPublishing] = useState(false);

  if (!user || todayLoading) return null;

  const handlePublish = async (recap: Recap) => {
    if (!user) return;
    setPublishing(true);
    try {
      await publishRecap(user.uid, recap.localDate);
      addToast({ type: 'success', message: 'Day published — friends can see it now' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not publish';
      addToast({ type: 'error', message: msg });
    } finally {
      setPublishing(false);
    }
  };

  const showRetro = canPublishYesterday(yesterday);

  return (
    <div className="space-y-3">
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

function EmptyDraft() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 text-center"
      style={{
        background: 'linear-gradient(160deg, rgba(16,16,26,0.6), rgba(11,11,20,0.4))',
        border: '1px dashed rgba(249,115,22,0.18)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400/70">
        Today&rsquo;s Record
      </p>
      <p className="text-sm text-slate-400 mt-1.5">
        Log a habit to start today&rsquo;s record. Submit when you&rsquo;re done — friends only see your day, not every log.
      </p>
    </div>
  );
}

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(249,115,22,0.12), transparent 55%),' +
          'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
        borderColor: 'rgba(249,115,22,0.22)',
        boxShadow: '0 0 28px -16px rgba(249,115,22,0.4), inset 0 1px 0 rgba(249,115,22,0.08)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
              Today&rsquo;s Record
            </p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 border border-slate-700 bg-[#0b0b14] px-1.5 py-0.5 rounded">
            Draft · private
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="font-heading text-3xl font-bold leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              +{recap.totalXP}
            </span>
            <span className="text-slate-500 text-sm font-mono ml-1.5">XP</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {recap.logCount} log{recap.logCount === 1 ? '' : 's'}
            {recap.proofCount > 0 && ` · ${recap.proofCount} photo${recap.proofCount === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Category chips — first ~4 */}
        {recap.entries.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {recap.entries.slice(0, 4).map((e) => (
              <span
                key={e.logId}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono"
                style={{
                  background: `${e.categoryColor}12`,
                  border: `1px solid ${e.categoryColor}28`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: e.categoryColor, boxShadow: `0 0 4px ${e.categoryColor}` }}
                />
                <span style={{ color: e.categoryColor }} className="font-bold">{e.categoryName}</span>
                <span className="text-slate-500">
                  {e.value}{e.unit}
                </span>
              </span>
            ))}
            {recap.entries.length > 4 && (
              <span className="text-[10px] font-mono text-slate-500">
                +{recap.entries.length - 4} more
              </span>
            )}
          </div>
        )}

        {proofThumbs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4">
            {proofThumbs.map((e) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={e.logId}
                src={e.proofImageUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover border border-[#1e1e30]"
              />
            ))}
          </div>
        )}

        <Button
          className="w-full"
          onClick={onPublish}
          loading={publishing}
          disabled={recap.logCount === 0}
        >
          Submit Today&rsquo;s Record
        </Button>
        <p className="text-[10px] text-slate-500 text-center mt-2">
          Friends will see one curated post — not every log.
        </p>
      </div>
    </motion.div>
  );
}

function PublishedState({ recap }: { recap: Recap }) {
  const editable = canEdit(recap);
  const editHoursLeft = recap.publishedAt
    ? Math.max(0, Math.ceil((recap.publishedAt.toDate().getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000)))
    : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(34,197,94,0.10), transparent 55%),' +
          'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
        border: '1px solid rgba(34,197,94,0.18)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #22c55e' }} />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
            Published
          </p>
          {recap.publishedAt && (
            <span className="text-[10px] font-mono text-slate-500">
              · {formatRelativeTime(recap.publishedAt.toDate())}
            </span>
          )}
        </div>
        {editable && editHoursLeft > 0 && (
          <span className="text-[10px] font-mono text-slate-500">
            Editable for {editHoursLeft}h
          </span>
        )}
      </div>

      <p className="text-sm text-slate-300 mb-3">
        {recap.logCount} log{recap.logCount === 1 ? '' : 's'} · +{recap.totalXP} XP · visible to friends
      </p>

      <div className="flex items-center gap-2">
        <Link href={`/recap/${recap.userId}/${recap.localDate}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            View record
          </Button>
        </Link>
      </div>
    </div>
  );
}

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
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-3.5"
      style={{
        background: 'linear-gradient(90deg, rgba(245,158,11,0.10) 0%, transparent 80%)',
        borderLeft: '2px solid #f59e0b',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Yesterday&rsquo;s record is unpublished
          </p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {recap.logCount} log{recap.logCount === 1 ? '' : 's'} · +{recap.totalXP} XP · publish before midnight to count
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onPublish} loading={publishing}>
          Publish
        </Button>
      </div>
    </motion.div>
  );
}
