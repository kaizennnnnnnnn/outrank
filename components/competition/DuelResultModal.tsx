'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { Button } from '@/components/ui/Button';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { Competition, CompetitionParticipant } from '@/types/competition';
import { getDuelRewards } from '@/lib/duelRewards';

interface OrbSkin {
  tier?: number;
  baseColor?: string;
  pulseColor?: string;
  ringColor?: string;
}

interface DuelResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition;
  currentUserId: string;
  /** Called when the user clicks Claim. Use this to update Firestore. */
  onClaim: (result: { won: boolean; tie: boolean; xp: number; fragments: number }) => Promise<void>;
  /** Current user's orb cosmetics (tier/colors). Controls their orb render. */
  myOrb?: OrbSkin;
  /** Opponent's orb cosmetics fetched from their user doc. */
  opponentOrb?: OrbSkin;
}

type Phase = 'intro' | 'clash' | 'reveal' | 'claimed';

export function DuelResultModal({
  isOpen, onClose, competition, currentUserId, onClaim,
  myOrb, opponentOrb,
}: DuelResultModalProps) {
  const me = competition.participants.find((p: CompetitionParticipant) => p.userId === currentUserId);
  const opp = competition.participants.find((p: CompetitionParticipant) => p.userId !== currentUserId);
  const myScore = me?.score ?? 0;
  const oppScore = opp?.score ?? 0;
  const tie = myScore === oppScore;
  const won = !tie && myScore > oppScore;

  const { xp, fragments } = getDuelRewards(
    won ? 'win' : tie ? 'tie' : 'loss',
    competition.durationDays,
  );

  const [phase, setPhase] = useState<Phase>('intro');
  const [burst, setBurst] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const startedRef = useRef(false);

  // Drive the sequence: intro → clash → reveal
  useEffect(() => {
    if (!isOpen) {
      setPhase('intro');
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    haptic('tap');
    const t1 = setTimeout(() => {
      setPhase('clash');
      haptic('double');
    }, 800);
    const t2 = setTimeout(() => {
      setPhase('reveal');
      setBurst((n) => n + 1);
      haptic(won ? 'success' : 'error');
    }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen, won]);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    haptic('success');
    try {
      await onClaim({ won, tie, xp, fragments });
      setPhase('claimed');
      setTimeout(() => onClose(), 500);
    } finally {
      setClaiming(false);
    }
  };

  if (!me || !opp) return null;

  const title = tie ? 'Draw' : won ? 'Victory' : 'Defeat';
  const color = tie ? '#fbbf24' : won ? '#f97316' : '#64748b';
  // The winning orb ALWAYS glows warm — using slate gray as a box-shadow
  // color painted a dull dark disc around the opponent orb on defeat.
  const winnerGlow = tie ? '#fbbf24' : '#f97316';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[180] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg rounded-2xl border border-[#1e1e30] bg-gradient-to-b from-[#12121c] to-[#07070c] p-6 overflow-hidden"
          >
            <ParticleBurst trigger={burst} color={color} count={100} />

            {/* Title / Subtitle */}
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Duel Ended
              </p>
              <h2
                className="font-heading text-4xl font-bold mt-1"
                style={{
                  color: '#fff',
                  background: phase === 'reveal' || phase === 'claimed'
                    ? `linear-gradient(90deg, ${color}, #ffffff, ${color})`
                    : undefined,
                  WebkitBackgroundClip: phase === 'reveal' || phase === 'claimed' ? 'text' : undefined,
                  WebkitTextFillColor: phase === 'reveal' || phase === 'claimed' ? 'transparent' : undefined,
                }}
              >
                {phase === 'intro' ? '...' : title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{competition.title}</p>
            </div>

            {/* Orb arena — layered warm ambient glow so canvas edges blend
                into the background instead of reading as a flat dark disc. */}
            <div
              className="relative h-52 flex items-center justify-center my-6 rounded-2xl overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse 70% 90% at 50% 50%, rgba(249,115,22,0.12), rgba(220,38,38,0.06) 45%, transparent 75%)',
              }}
            >
              {/* My orb — starts far left, flies to center on clash, outcome decides final state */}
              <motion.div
                animate={
                  phase === 'intro'
                    ? { x: -110, opacity: 0.6, scale: 0.85 }
                    : phase === 'clash'
                      ? { x: 0, scale: 1.15 }
                      : won
                        ? { x: 0, scale: 1.35 }
                        : tie
                          ? { x: -75, scale: 1.05 }
                          : { x: 0, scale: 0.25, opacity: 0 }
                }
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                className="absolute flex flex-col items-center"
              >
                <div className="relative">
                  {/* Soft warm halo behind the canvas to hide any edge */}
                  <div
                    className="absolute -inset-4 rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.08) 45%, transparent 75%)',
                      filter: 'blur(2px)',
                    }}
                  />
                  <SoulOrb
                    intensity={100}
                    tier={myOrb?.tier ?? 1}
                    size={110}
                    hideLabel
                    baseColorId={myOrb?.baseColor}
                    pulseColorId={myOrb?.pulseColor}
                    ringColorId={myOrb?.ringColor}
                  />
                  {phase !== 'intro' && won && (
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      animate={{ boxShadow: [
                        `0 0 40px ${winnerGlow}aa`,
                        `0 0 90px ${winnerGlow}ff`,
                        `0 0 40px ${winnerGlow}aa`,
                      ]}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </div>
                {/* Name label UNDER the orb. Hidden during clash (both orbs
                    stacked at center) and for the loser during reveal. */}
                <motion.p
                  animate={{
                    opacity:
                      phase === 'clash' ||
                      (phase === 'reveal' && !won && !tie)
                        ? 0
                        : 1,
                  }}
                  className={`text-center text-xs mt-2 font-semibold whitespace-nowrap pointer-events-none ${won ? 'text-orange-400' : tie ? 'text-yellow-400' : 'text-slate-500'}`}
                >
                  You <span className="font-mono ml-1">{myScore}</span>
                </motion.p>
              </motion.div>

              {/* Clash — layered blast: hot core + shockwave ring + radial rays */}
              {phase === 'clash' && (
                <>
                  {/* Hot core flash */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2.8, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.55 }}
                    className="absolute w-28 h-28 rounded-full"
                    style={{
                      background: `radial-gradient(circle, #ffffff 0%, ${color}cc 35%, transparent 70%)`,
                      boxShadow: `0 0 80px 20px ${color}bb`,
                    }}
                  />
                  {/* Expanding shockwave ring */}
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [0.3, 4.5], opacity: [1, 0] }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="absolute w-32 h-32 rounded-full"
                    style={{
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 40px ${color}, inset 0 0 20px ${color}`,
                    }}
                  />
                  {/* Secondary shockwave (delayed) */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 5.5], opacity: [0.8, 0] }}
                    transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
                    className="absolute w-32 h-32 rounded-full border"
                    style={{ borderColor: `${color}55` }}
                  />
                  {/* Radial rays */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.5, delay: 0.05 + i * 0.01 }}
                      className="absolute top-1/2 left-1/2 origin-bottom w-[2px]"
                      style={{
                        height: '60px',
                        background: `linear-gradient(to top, ${color}, transparent)`,
                        transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-40px)`,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                  ))}
                </>
              )}

              {/* Mote stream — loser → winner */}
              {phase === 'reveal' && !tie && (
                <MoteStream from={won ? 'right' : 'left'} to={won ? 'left' : 'right'} color={color} />
              )}

              {/* Opponent orb — mirrors the above. On win, it shrinks into center (consumed). */}
              <motion.div
                animate={
                  phase === 'intro'
                    ? { x: 110, opacity: 0.6, scale: 0.85 }
                    : phase === 'clash'
                      ? { x: 0, scale: 1.15 }
                      : !won && !tie
                        ? { x: 0, scale: 1.35 }
                        : tie
                          ? { x: 75, scale: 1.05 }
                          : { x: 0, scale: 0.25, opacity: 0 }
                }
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                className="absolute flex flex-col items-center"
              >
                <div className="relative">
                  <div
                    className="absolute -inset-4 rounded-full pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.08) 45%, transparent 75%)',
                      filter: 'blur(2px)',
                    }}
                  />
                  <SoulOrb
                    intensity={100}
                    tier={opponentOrb?.tier ?? 1}
                    size={110}
                    hideLabel
                    baseColorId={opponentOrb?.baseColor}
                    pulseColorId={opponentOrb?.pulseColor}
                    ringColorId={opponentOrb?.ringColor}
                  />
                  {phase !== 'intro' && !won && !tie && (
                    <motion.div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      animate={{ boxShadow: [
                        `0 0 40px ${winnerGlow}aa`,
                        `0 0 90px ${winnerGlow}ff`,
                        `0 0 30px ${winnerGlow}77`,
                      ]}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </div>
                <motion.p
                  animate={{
                    opacity:
                      phase === 'clash' || (phase === 'reveal' && won) ? 0 : 1,
                  }}
                  className={`text-center text-xs mt-2 font-semibold whitespace-nowrap pointer-events-none ${!won && !tie ? 'text-orange-400' : tie ? 'text-yellow-400' : 'text-slate-500'}`}
                >
                  {opp.username} <span className="font-mono ml-1">{oppScore}</span>
                </motion.p>
              </motion.div>
            </div>

            {/* Prizes */}
            {(phase === 'reveal' || phase === 'claimed') && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-2 mb-4"
              >
                <Prize
                  icon={<BoltIcon />}
                  value={`+${xp}`}
                  label="XP"
                  color="#f97316"
                />
                <Prize
                  icon={<FragmentIcon />}
                  value={`+${fragments}`}
                  label="Fragments"
                  color="#fbbf24"
                />
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {phase === 'reveal' ? (
                <Button className="flex-1" onClick={handleClaim} loading={claiming}>
                  {won ? 'Claim Victory' : tie ? 'Accept Draw' : 'Accept Defeat'}
                </Button>
              ) : phase === 'claimed' ? (
                <Button className="flex-1" variant="secondary" disabled>Claimed</Button>
              ) : (
                <Button className="flex-1" variant="secondary" disabled>
                  <span className="animate-pulse">Resolving...</span>
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MoteStream({ from, to, color }: { from: 'left' | 'right'; to: 'left' | 'right'; color: string }) {
  // With both orbs centered now, motes just spiral inward to "center" from a
  // short side-offset, implying the winner devours whatever's left of the loser.
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 pointer-events-none">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 12px ${color}, 0 0 4px #ffffff`,
            width: 6 - (i % 3),
            height: 6 - (i % 3),
          }}
          initial={{
            left: from === 'left' ? '35%' : '65%',
            top: `${50 + (Math.sin(i) * 12)}%`,
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            left: '50%',
            top: '50%',
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.8, 0],
          }}
          transition={{ delay: i * 0.055, duration: 0.85, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

function Prize({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2 flex items-center gap-2"
      style={{
        background: `linear-gradient(145deg, ${color}18, #0b0b14 60%)`,
        border: `1px solid ${color}33`,
      }}
    >
      <div style={{ color }}>{icon}</div>
      <div>
        <p className="font-mono text-lg font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function BoltIcon() { return <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>; }
function FragmentIcon() { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>; }
