'use client';

import { Pact } from '@/types/pact';
import { useAuth } from '@/hooks/useAuth';
import { pactDateKeys, PACT_REWARDS } from '@/lib/pacts';
import { Avatar } from '@/components/ui/Avatar';
import { localDateKey } from '@/lib/recap';

interface Props {
  pact: Pact;
}

/**
 * Active or resolved pact, rendered editorial-style with a partner-flavored
 * pillar stripe down the left, the pact's habit + duration + status, and
 * a tiny day-grid showing each side's daily log state. The grid is the
 * most useful artifact — at a glance you see who's keeping up.
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

  // Status-driven left-stripe color. Resolved states fall back to the
  // editorial accent / rule, active uses the habit's own color so the
  // pact still feels habit-flavored.
  const stripe =
    pact.status === 'succeeded' ? 'var(--b-ink)' :
    pact.status === 'broken' ? 'var(--b-accent)' :
    pact.status === 'active' ? pact.habitColor :
    'var(--b-rule)';

  const myStreakDays = countLogged(pact, me ?? '', dateKeys);
  const partnerStreakDays = countLogged(pact, partnerId, dateKeys);

  return (
    <div
      className="dir-b"
      style={{
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        borderLeft: `3px solid ${stripe}`,
        padding: 16,
        color: 'var(--b-ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="spread"
              style={{
                fontSize: 9,
                color: 'var(--b-ink-60)',
                paddingRight: 8,
                borderRight: '1px solid var(--b-rule)',
              }}
            >
              {labelForStatus(pact)}
            </span>
            <span
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
            >
              {pact.durationDays}-day · {pact.habitName}
            </span>
            {(pact.status === 'active' || pact.status === 'succeeded' || pact.status === 'broken') && (
              <FreezePill pact={pact} />
            )}
          </div>
          <p
            className="font-display"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 18,
              color: 'var(--b-ink)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {meMeta?.username || 'You'}{' '}
            <span style={{ color: 'var(--b-ink-40)', fontStyle: 'normal' }}>×</span>{' '}
            {partnerMeta?.username || 'Friend'}
          </p>
          <p
            className="font-mono tabular"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              marginTop: 4,
            }}
          >
            {pact.startDate} → {pact.endDate}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p
            className="font-display tabular"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 22,
              lineHeight: 1,
              margin: 0,
            }}
          >
            <span style={{ color: 'var(--b-ink)' }}>{myStreakDays}</span>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--b-ink-60)' }}>{pact.durationDays}</span>
          </p>
          <p
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 4 }}
          >
            Your Days
          </p>
        </div>
      </div>

      {/* Two-row day grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <DayRow
          label={meMeta?.avatarUrl ? '' : 'You'}
          avatarUrl={meMeta?.avatarUrl || ''}
          username={meMeta?.username || 'You'}
          dateKeys={dateKeys}
          today={today}
          uid={me ?? ''}
          pact={pact}
          stripe={stripe}
        />
        <DayRow
          label={partnerMeta?.avatarUrl ? '' : (partnerMeta?.username || 'Friend')}
          avatarUrl={partnerMeta?.avatarUrl || ''}
          username={partnerMeta?.username || 'Friend'}
          dateKeys={dateKeys}
          today={today}
          uid={partnerId}
          pact={pact}
          stripe={stripe}
        />
      </div>

      {pact.status === 'active' && (
        <>
          <p
            className="font-mono tabular"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--b-rule)',
            }}
          >
            <span className="spread" style={{ fontSize: 9, marginRight: 6 }}>Win</span>
            <span style={{ color: 'var(--b-accent)' }}>+{reward.xp} XP · +{reward.fragments} frags</span>
            {reward.cosmeticId && <span style={{ color: 'var(--b-ink-60)' }}> · cosmetic</span>}
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            <span>Partner: {partnerStreakDays}/{pact.durationDays}</span>
          </p>
          {pact.freezeUsedOn && (
            <p
              className="font-mono tabular"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                marginTop: 4,
              }}
            >
              Freeze used on {pact.freezeUsedOn} — one more miss breaks the pact.
            </p>
          )}
        </>
      )}
      {pact.status === 'broken' && pact.brokenBy && (
        <p
          className="font-mono tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-accent)',
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--b-rule)',
          }}
        >
          Pact broken — both sides lost 50 fragments.
        </p>
      )}
      {pact.status === 'succeeded' && (
        <p
          className="font-mono tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-ink)',
            marginTop: 12,
            paddingTop: 10,
            borderTop: '2px solid var(--b-ink)',
          }}
        >
          Complete · +{reward.xp} XP · +{reward.fragments} fragments earned each.
        </p>
      )}
    </div>
  );
}

/**
 * Tiny pill summarizing the pact's one-shot freeze state. Editorial
 * outlined hairline, no neon tints.
 */
function FreezePill({ pact }: { pact: Pact }) {
  const used = !!pact.freezeUsedOn;
  return (
    <span
      className="spread"
      style={{
        fontSize: 9,
        padding: '1px 6px',
        border: `1px solid ${used ? 'var(--b-rule)' : 'var(--b-ink)'}`,
        color: used ? 'var(--b-ink-60)' : 'var(--b-ink)',
      }}
      title={
        used
          ? `Pact freeze used on ${pact.freezeUsedOn}`
          : 'One free missed day allowed — uses up automatically the first time it\'s needed.'
      }
    >
      {used ? 'Freeze · used' : 'Freeze'}
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
  stripe,
  label,
}: {
  avatarUrl: string;
  username: string;
  dateKeys: string[];
  today: string;
  uid: string;
  pact: Pact;
  stripe: string;
  label?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flexShrink: 0, width: 28 }}>
        {avatarUrl ? (
          <Avatar src={avatarUrl} alt={username} size="sm" />
        ) : (
          <span
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            {label || username.slice(0, 2)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {dateKeys.map((key) => {
          const status = pact.dayStatus[key]?.[uid];
          const isToday = key === today;
          const isPast = key < today;
          const logged = status === 'logged';
          const frozen = isPast && !logged && pact.freezeUsedOn === key;
          const missed = isPast && !logged && !frozen;
          const bg =
            logged ? stripe
              : frozen ? 'var(--b-ink-40)'
                : missed ? 'var(--b-accent)'
                  : 'transparent';
          const opacity = missed ? 0.35 : frozen ? 0.5 : 1;
          return (
            <div
              key={key}
              style={{
                width: 14,
                height: 14,
                background: bg,
                opacity,
                border: isToday
                  ? '1px solid var(--b-ink)'
                  : '1px solid var(--b-rule)',
              }}
              title={
                logged ? `${key}: logged`
                  : frozen ? `${key}: rescued by pact freeze`
                    : missed ? `${key}: missed`
                      : isToday ? `${key}: today`
                        : `${key}: pending`
              }
            />
          );
        })}
      </div>
    </div>
  );
}
