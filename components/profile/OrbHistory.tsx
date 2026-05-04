'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { getOrbTier, MAX_ORB_TIER, ORB_TIERS } from '@/constants/orbTiers';
import { ORB_ENERGY } from '@/constants/orbSystem';
import { getCollection, updateDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { HabitLog } from '@/types/habit';
import { getLevelForXP } from '@/constants/levels';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';
import { useUIStore } from '@/store/uiStore';
import { BCheckGlyph, BFlameGlyph, BWingsGlyph } from '@/components/editorial/BGlyphs';

/**
 * Orb history modal — editorial Direction B v2.
 *
 * Field-guide entry for the user's orb across its full lifecycle:
 * current tier specimen + ascension count + energy + records (XP /
 * streak / total logs / level) + most-logged habit + tier evolution
 * timeline. Ascend CTA appears when at MAX_ORB_TIER, with rewards
 * scaled to the upcoming ascension cycle.
 */

interface OrbHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROMAN: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
};

export function OrbHistory({ isOpen, onClose }: OrbHistoryProps) {
  const { user } = useAuth();
  const { habits } = useHabits();
  const [totalLogs, setTotalLogs] = useState(0);
  const [, setLoading] = useState(true);

  const orbTier = user ? ((user as unknown as Record<string, number>).orbTier || 1) : 1;
  const orbEnergy = user ? ((user as unknown as Record<string, number>).orbEnergy || 50) : 50;
  const fragments = user ? ((user as unknown as Record<string, number>).fragments || 0) : 0;
  const orbAscensions = user ? ((user as unknown as Record<string, number>).orbAscensions || 0) : 0;
  const config = getOrbTier(orbTier);

  const addToast = useUIStore((s) => s.addToast);
  const [ascendBurst, setAscendBurst] = useState(0);
  const [ascending, setAscending] = useState(false);
  const [confirmingAscend, setConfirmingAscend] = useState(false);

  const ascend = async () => {
    if (!user || ascending) return;
    setAscending(true);
    haptic('success');
    setAscendBurst((n) => n + 1);
    const next = orbAscensions + 1;
    const reward = 500 + (next - 1) * 250;
    try {
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(reward),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
      addToast({
        type: 'success',
        message: next === 1
          ? `First ascension. +${reward} fragments + Ascension Wreath unlocked.`
          : `Ascension ${next}. +${reward} fragments. The cycle begins again.`,
      });
      setConfirmingAscend(false);
    } catch {
      addToast({ type: 'error', message: 'Ascension failed' });
    } finally {
      setAscending(false);
    }
  };

  const level = user ? getLevelForXP(user.totalXP) : { level: 1, title: 'Rookie' };
  const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
  const mostLoggedHabit = habits.reduce((best, h) => h.totalLogs > (best?.totalLogs || 0) ? h : best, habits[0]);
  const totalHabitLogs = habits.reduce((sum, h) => sum + h.totalLogs, 0);

  useEffect(() => {
    if (!user || !isOpen) return;
    async function fetch() {
      try {
        const logs = await getCollection<HabitLog>(`logs/${user!.uid}/habitLogs`, []);
        setTotalLogs(logs.length);
      } catch { setTotalLogs(0); }
      setLoading(false);
    }
    fetch();
  }, [user, isOpen]);

  if (!user) return null;

  const ascendReward = 500 + orbAscensions * 250;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="The Orb" size="md">
      <div
        className="dir-b"
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          color: 'var(--b-ink)',
        }}
      >
        <ParticleBurst trigger={ascendBurst} color="#dc2626" count={140} />

        {/* Specimen header */}
        <div
          style={{
            borderTop: '1px solid var(--b-rule)',
            borderBottom: '1px solid var(--b-rule)',
            padding: '12px 0',
            textAlign: 'center',
          }}
        >
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Specimen · Tier {ROMAN[orbTier] ?? orbTier} of X
          </div>
          <h3
            className="font-display"
            style={{ fontSize: 30, fontStyle: 'italic', fontWeight: 500, marginTop: 4, color: 'var(--b-ink)' }}
          >
            {config.name}
          </h3>
          {orbAscensions > 0 && (
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: 'var(--b-accent)',
                marginTop: 4,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Lineage · {orbAscensions} ascension{orbAscensions === 1 ? '' : 's'}
            </div>
          )}
          <p
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--b-ink-60)',
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 280,
              marginInline: 'auto',
            }}
          >
            {config.description}
          </p>
        </div>

        {/* Ascend block — visible at tier 10 */}
        {orbTier >= MAX_ORB_TIER && (
          <div
            style={{
              marginTop: 14,
              padding: '14px 0',
              borderTop: '2px solid var(--b-accent)',
              borderBottom: '1px solid var(--b-ink)',
              textAlign: 'center',
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
              <BWingsGlyph size={12} />
              {orbAscensions === 0 ? 'Ascension ready' : `${orbAscensions + 1}-th ascension`}
            </div>
            <p
              className="font-display"
              style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, marginTop: 6 }}
            >
              Your orb has reached its final form.
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 11,
                color: 'var(--b-ink-60)',
                marginTop: 6,
                lineHeight: 1.5,
                maxWidth: 320,
                marginInline: 'auto',
              }}
            >
              Ascending resets to tier I and awards{' '}
              <b style={{ color: 'var(--b-ink)' }}>+{ascendReward} fragments</b>
              {orbAscensions === 0 && (
                <>
                  , the <b style={{ color: 'var(--b-ink)' }}>Ascension Wreath</b> frame, and the{' '}
                  <b style={{ color: 'var(--b-ink)' }}>Ascendant</b> name effect
                </>
              )}
              .
            </p>
            <div style={{ marginTop: 12 }}>
              {confirmingAscend ? (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onClick={() => setConfirmingAscend(false)}
                    className="font-body"
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--b-rule)',
                      background: 'transparent',
                      color: 'var(--b-ink-60)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={ascend}
                    disabled={ascending}
                    className="font-body"
                    style={{
                      padding: '8px 24px',
                      border: '1px solid var(--b-accent)',
                      background: 'var(--b-accent)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: ascending ? 'not-allowed' : 'pointer',
                      opacity: ascending ? 0.7 : 1,
                    }}
                  >
                    {ascending ? 'ASCENDING…' : 'CONFIRM'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingAscend(true)}
                  className="font-body"
                  style={{
                    padding: '10px 24px',
                    border: '1px solid var(--b-accent)',
                    background: 'transparent',
                    color: 'var(--b-accent)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                  }}
                >
                  ASCEND · +{ascendReward} ◆
                </button>
              )}
            </div>
          </div>
        )}

        {/* Energy */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              fontFamily: 'var(--font-inter)',
              alignItems: 'baseline',
            }}
          >
            <span
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
            >
              Orb Energy
            </span>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 11,
                color: orbEnergy > 30 ? 'var(--b-ink)' : 'var(--b-accent)',
                fontWeight: 700,
              }}
            >
              {orbEnergy} / {ORB_ENERGY.MAX}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 2,
              background: 'var(--b-rule)',
              marginTop: 6,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${orbEnergy}%`,
                background: orbEnergy > 30 ? 'var(--b-ink)' : 'var(--b-accent)',
              }}
            />
          </div>
          <p
            className="font-body"
            style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 4 }}
          >
            {orbEnergy > 60 ? 'Fully charged.'
              : orbEnergy > 30 ? 'Running low — keep logging.'
              : orbEnergy > 0 ? 'Critical — log soon.'
              : 'Dormant.'}
          </p>
        </div>

        {/* Spec rows */}
        <div
          style={{
            marginTop: 14,
            borderTop: '1px solid var(--b-ink)',
            borderBottom: '1px solid var(--b-ink)',
          }}
        >
          <SpecRow
            label="Fragments"
            value={fragments.toLocaleString()}
            accent
          />
          <SpecRow
            label="Total XP"
            value={user.totalXP.toLocaleString()}
          />
          <SpecRow
            label="Level"
            value={`${level.level} · ${level.title}`}
          />
          <SpecRow
            label="Total logs"
            value={totalHabitLogs.toLocaleString()}
          />
          <SpecRow
            label="Longest streak"
            value={`${longestStreak} d`}
            last
          />
        </div>

        {/* Most-logged habit */}
        {mostLoggedHabit && (
          <div style={{ marginTop: 14 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
              Most logged
            </div>
            <div
              style={{
                marginTop: 6,
                paddingBottom: 8,
                borderBottom: '1px solid var(--b-rule)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  className="font-display"
                  style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500 }}
                >
                  {mostLoggedHabit.categoryName}
                </div>
                <div
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
                >
                  {mostLoggedHabit.totalLogs} logs · best streak {mostLoggedHabit.longestStreak}d
                </div>
              </div>
              <BFlameGlyph size={20} style={{ color: 'var(--b-accent)' }} />
            </div>
          </div>
        )}

        {/* Evolution timeline */}
        <div style={{ marginTop: 14 }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
            Evolution path
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {ORB_TIERS.map((tierCfg) => {
              const t = tierCfg.tier;
              const tierConfig = getOrbTier(t);
              const reached = orbTier >= t;
              const current = orbTier === t;
              return (
                <li
                  key={t}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 16px',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--b-rule)',
                    alignItems: 'baseline',
                    opacity: reached ? 1 : 0.4,
                  }}
                >
                  <span
                    className="font-mono tabular"
                    style={{
                      fontSize: 11,
                      color: current ? 'var(--b-accent)' : reached ? 'var(--b-ink)' : 'var(--b-ink-40)',
                      fontWeight: 700,
                    }}
                  >
                    {ROMAN[t]}
                  </span>
                  <div>
                    <div
                      className="font-display"
                      style={{
                        fontSize: 14,
                        fontStyle: current ? 'italic' : 'normal',
                        fontWeight: current ? 600 : 500,
                        color: reached ? 'var(--b-ink)' : 'var(--b-ink-40)',
                      }}
                    >
                      {tierConfig.name}
                      {current && <span style={{ color: 'var(--b-accent)', fontStyle: 'italic', fontWeight: 400, marginLeft: 6 }}>· current</span>}
                    </div>
                    <div
                      className="font-body"
                      style={{
                        fontSize: 10,
                        color: 'var(--b-ink-60)',
                        marginTop: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {tierConfig.description}
                    </div>
                  </div>
                  {reached && !current && <BCheckGlyph size={12} style={{ color: 'var(--b-accent)' }} />}
                </li>
              );
            })}
          </ul>
        </div>

        <p
          className="font-body"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-40)',
            textAlign: 'center',
            marginTop: 14,
            letterSpacing: '0.04em',
          }}
        >
          {totalLogs > 0 && `${totalLogs} total logs across the lineage.`}
        </p>
      </div>
    </Modal>
  );
}

function SpecRow({
  label,
  value,
  accent,
  last,
}: {
  label:   string;
  value:   string;
  accent?: boolean;
  last?:   boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--b-rule)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--b-ink-60)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
