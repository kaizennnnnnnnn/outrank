'use client';

import { motion } from 'framer-motion';
import { Pact } from '@/types/pact';
import { useAuth } from '@/hooks/useAuth';
import { pactDateKeys, PACT_REWARDS } from '@/lib/pacts';
import { Avatar } from '@/components/ui/Avatar';
import { localDateKey } from '@/lib/recap';

interface Props {
  pact: Pact;
}

/**
 * Active or resolved pact, rendered as a card with a partner-flavored
 * header, the pact's habit + duration + status, and a tiny day-grid
 * showing each side's daily log state. The grid is the most useful
 * artifact — at a glance you see who's keeping up.
 *
 * Pending invites use PactInvitePill; this card is for active +
 * resolved.
 */
export function PactCard({ pact }: Props) {
  const { user } = useAuth();
  const me = user?.uid;
  const partnerId = pact.participants.find((p) => p !== me) || pact.participants[1];
  const meMeta = me ? pact.participantsMeta[me] : null;
  const partnerMeta = pact.participantsMeta[partnerId];
  const reward = PACT_REWARDS[pact.durationDays];

  const today = localDateKey();
  const dateKeys = pactDateKeys(pact.startDate, pact.durationDays);

  // Status-driven accent color
  const accent =
    pact.status === 'succeeded' ? '#22c55e' :
    pact.status === 'broken' ? '#ef4444' :
    pact.status === 'active' ? pact.habitColor :
    '#64748b';

  const myStreakDays = countLogged(pact, me ?? '', dateKeys);
  const partnerStreakDays = countLogged(pact, partnerId, dateKeys);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${accent}10 0%, rgba(11,11,20,0.6) 70%)`,
        border: `1px solid ${accent}33`,
        boxShadow: pact.status === 'active' ? `0 0 22px -12px ${accent}88` : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${accent}, ${accent}40 70%, transparent)`,
        }}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  color: accent,
                  background: `${accent}15`,
                  border: `1px solid ${accent}55`,
                }}
              >
                {labelForStatus(pact)}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {pact.durationDays}-day · {pact.habitName}
              </span>
              {/* Freeze status — only render for active or resolved
                  pacts where the freeze field is meaningful. Skip for
                  pending invites + declined where it'd be noise. */}
              {(pact.status === 'active' || pact.status === 'succeeded' || pact.status === 'broken') && (
                <FreezePill pact={pact} />
              )}
            </div>
            <p className="font-heading text-base font-bold text-white leading-tight">
              {meMeta?.username || 'You'} <span className="text-slate-500 font-normal">×</span> {partnerMeta?.username || 'Friend'}
            </p>
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              {pact.startDate} → {pact.endDate}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="font-heading text-base font-bold text-white">
              <span style={{ color: accent }}>{myStreakDays}</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-slate-500">{pact.durationDays}</span>
            </p>
            <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mt-0.5">your days</p>
          </div>
        </div>

        {/* Two-row day grid: me on top, partner on bottom */}
        <div className="space-y-1.5">
          <DayRow
            label={meMeta?.avatarUrl ? '' : 'You'}
            avatarUrl={meMeta?.avatarUrl || ''}
            username={meMeta?.username || 'You'}
            dateKeys={dateKeys}
            today={today}
            uid={me ?? ''}
            pact={pact}
            accent={accent}
          />
          <DayRow
            label={partnerMeta?.avatarUrl ? '' : (partnerMeta?.username || 'Friend')}
            avatarUrl={partnerMeta?.avatarUrl || ''}
            username={partnerMeta?.username || 'Friend'}
            dateKeys={dateKeys}
            today={today}
            uid={partnerId}
            pact={pact}
            accent={accent}
          />
        </div>

        {pact.status === 'active' && (
          <>
            <p className="text-[10px] font-mono text-slate-500 mt-3">
              Win: <span style={{ color: accent }}>+{reward.xp} XP · +{reward.fragments} frags</span>
              {reward.cosmeticId && <span className="text-slate-500"> · cosmetic</span>}
              <span className="text-slate-700 mx-1.5">·</span>
              <span className="text-slate-500">Partner: {partnerStreakDays}/{pact.durationDays} days</span>
            </p>
            {pact.freezeUsedOn && (
              <p className="text-[10px] font-mono text-sky-300 mt-1">
                ❄ Freeze used on {pact.freezeUsedOn} — one more miss breaks the pact.
              </p>
            )}
          </>
        )}
        {pact.status === 'broken' && pact.brokenBy && (
          <p className="text-[10px] font-mono text-red-300 mt-3">
            Pact broken — both sides lost 50 fragments.
          </p>
        )}
        {pact.status === 'succeeded' && (
          <p className="text-[10px] font-mono text-emerald-300 mt-3">
            Complete · +{reward.xp} XP · +{reward.fragments} fragments earned each.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Tiny pill summarizing the pact's one-shot freeze state. Three flavors:
 *   - "🛡 Freeze ready"  — never used, still available
 *   - "❄ Freeze used"   — consumed; tooltip names the rescued date
 *   - "× No freeze"     — explicitly false but no record (legacy / impossible v1)
 */
function FreezePill({ pact }: { pact: Pact }) {
  if (pact.freezeUsedOn) {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-flex items-center gap-1"
        title={`Pact freeze used on ${pact.freezeUsedOn}`}
        style={{
          color: '#7dd3fc',
          background: 'rgba(56,189,248,0.12)',
          border: '1px solid rgba(56,189,248,0.45)',
        }}
      >
        ❄ Used
      </span>
    );
  }
  // Default = available (covers both true and missing field on legacy pacts)
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-flex items-center gap-1"
      title="One free missed day allowed — uses up automatically the first time it's needed."
      style={{
        color: '#a3e635',
        background: 'rgba(132,204,22,0.10)',
        border: '1px solid rgba(132,204,22,0.4)',
      }}
    >
      🛡 Freeze
    </span>
  );
}

function labelForStatus(pact: Pact): string {
  switch (pact.status) {
    case 'active': return 'Active';
    case 'succeeded': return 'Complete';
    case 'broken': return 'Broken';
    case 'declined': return 'Declined';
    default: return 'Pending';
  }
}

function countLogged(pact: Pact, uid: string, dateKeys: string[]): number {
  let n = 0;
  for (const key of dateKeys) {
    if (pact.dayStatus[key]?.[uid] === 'logged') n += 1;
  }
  return n;
}

function DayRow({
  avatarUrl,
  username,
  dateKeys,
  today,
  uid,
  pact,
  accent,
  label,
}: {
  avatarUrl: string;
  username: string;
  dateKeys: string[];
  today: string;
  uid: string;
  pact: Pact;
  accent: string;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 w-7">
        {avatarUrl ? (
          <Avatar src={avatarUrl} alt={username} size="sm" />
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {label || username.slice(0, 2)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 flex-wrap">
        {dateKeys.map((key) => {
          const status = pact.dayStatus[key]?.[uid];
          const isToday = key === today;
          const isPast = key < today;
          const logged = status === 'logged';
          // The freeze date counts as "saved" for both participants —
          // even if it was the partner's miss being covered, the day
          // is no longer a hole on either row visually.
          const frozen = isPast && !logged && pact.freezeUsedOn === key;
          const missed = isPast && !logged && !frozen;
          return (
            <div
              key={key}
              className="w-3.5 h-3.5 rounded-sm"
              title={
                logged ? `${key}: logged`
                : frozen ? `${key}: rescued by pact freeze`
                : missed ? `${key}: missed`
                : isToday ? `${key}: today`
                : `${key}: pending`
              }
              style={{
                background: logged
                  ? accent
                  : frozen
                    ? 'rgba(56,189,248,0.35)'
                    : missed
                      ? 'rgba(239,68,68,0.3)'
                      : isToday
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.025)',
                border: frozen
                  ? '1px solid rgba(56,189,248,0.7)'
                  : isToday
                    ? `1px solid ${accent}88`
                    : '1px solid rgba(255,255,255,0.04)',
                boxShadow: logged
                  ? `0 0 4px ${accent}88`
                  : frozen
                    ? '0 0 4px rgba(56,189,248,0.6)'
                    : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
