'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LEAGUES, getLeague, getNextLeague } from '@/constants/seasons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weeklyXP: number;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Reward summary for each league — purely informational, shown in the modal.
const leagueRewards: Record<string, string> = {
  bronze:      'Starter league — no bonus, just your foundation.',
  silver:      '+25 fragments on season reset',
  gold:        '+75 fragments · Rare color unlock',
  platinum:    '+150 fragments · Epic color unlock',
  diamond:     '+300 fragments · Epic ring or pulse color',
  master:      '+600 fragments · Legendary color unlock · "Master" title',
  grandmaster: 'Top-tier. Mythic capstone reward + exclusive seasonal frame.',
};

/**
 * Editorial Direction B v2 ranks modal. Paper sheet, italic Fraunces
 * heading, ledger-style league rows. The league color survives only on
 * the rank name and the small left numeral — everything else is ink.
 */
export function RanksModal({ isOpen, onClose, weeklyXP }: Props) {
  const current = getLeague(weeklyXP);
  const next = getNextLeague(weeklyXP);
  const toNext = next ? Math.max(0, next.minWeeklyXP - weeklyXP) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="dir-b"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 190,
            background: 'rgba(20, 18, 14, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 460,
              maxHeight: '85vh',
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              border: '1px solid var(--b-ink)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--b-ink)' }}>
              <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
                Ranked Leagues
              </div>
              <h2
                className="font-display"
                style={{
                  fontSize: 28,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  lineHeight: 1.05,
                  margin: '4px 0 6px',
                }}
              >
                How ranking works.
              </h2>
              <p
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', margin: 0, lineHeight: 1.5 }}
              >
                Your league tier is set by <em className="font-display" style={{ fontStyle: 'italic' }}>weekly XP</em>.
                Log habits to climb. At the end of every 4-week season you keep your peak tier&rsquo;s
                cosmetics, then reset to one rank below.
              </p>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 14px' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {[...LEAGUES].reverse().map((l) => {
                  const isCurrent = l.id === current.id;
                  const reward = leagueRewards[l.id] || '';
                  const idx = LEAGUES.indexOf(l);
                  return (
                    <li
                      key={l.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 1fr auto',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        borderLeft: isCurrent ? '2px solid var(--b-accent)' : '2px solid transparent',
                        paddingLeft: isCurrent ? 10 : 0,
                      }}
                    >
                      <span
                        className="font-display tabular"
                        style={{
                          fontSize: 18,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          color: l.color,
                          textAlign: 'right',
                        }}
                      >
                        {NUMERALS[idx] ?? ''}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            className="font-display"
                            style={{
                              fontSize: 16,
                              fontStyle: 'italic',
                              fontWeight: 500,
                              color: l.color,
                            }}
                          >
                            {l.name}
                          </span>
                          {isCurrent && (
                            <span
                              className="spread"
                              style={{ fontSize: 8, color: 'var(--b-accent)' }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <p
                          className="font-mono tabular"
                          style={{ fontSize: 10, color: 'var(--b-ink-40)', margin: '2px 0 0' }}
                        >
                          {l.minWeeklyXP.toLocaleString()}+ weekly XP
                        </p>
                        <p
                          className="font-body"
                          style={{ fontSize: 11, color: 'var(--b-ink-60)', margin: '4px 0 0', lineHeight: 1.4 }}
                        >
                          {reward}
                        </p>
                      </div>
                      <span />
                    </li>
                  );
                })}
              </ul>

              {/* Self block */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderTop: '2px solid var(--b-ink)',
                  borderBottom: '1px solid var(--b-ink)',
                }}
              >
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                  Your weekly XP
                </div>
                <p
                  className="font-display tabular"
                  style={{
                    fontSize: 32,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    margin: '2px 0 0',
                    lineHeight: 1,
                  }}
                >
                  {weeklyXP.toLocaleString()}
                </p>
                <p
                  className="font-body"
                  style={{ fontSize: 11, color: 'var(--b-ink-60)', margin: '4px 0 0' }}
                >
                  Currently sitting in <span style={{ color: current.color }}>{current.name}</span>.
                  {next && (
                    <>
                      {' · '}
                      <span style={{ color: 'var(--b-ink)' }}>
                        {toNext.toLocaleString()} XP to{' '}
                        <span style={{ color: next.color }}>{next.name}</span>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
