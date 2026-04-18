'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { Button } from '@/components/ui/Button';
import { haptic } from '@/lib/haptics';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { Competition, CompetitionParticipant } from '@/types/competition';

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

/**
 * Prize tiers scale with duel duration so longer commitments pay more.
 * 3d baseline · 7d ≈ 1.5× · 14d ≈ 2× · 30d ≈ 3×.
 */
function getDurationMult(days: number | undefined): number {
  const d = days ?? 7;
  if (d >= 28) return 3;
  if (d >= 14) return 2;
  if (d >= 7) return 1.5;
  return 1;
}
const BASE = {
  win:  { xp: 100, fragments: 50 },
  tie:  { xp: 35,  fragments: 15 },
  loss: { xp: 15,  fragments: 5 },
};

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

  const mult = getDurationMult(competition.durationDays);
  const base = won ? BASE.win : tie ? BASE.tie : BASE.loss;
  const xp = Math.round(base.xp * mult);
  const fragments = Math.round(base.fragments * mult);

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

            {/* Orb arena — fully transparent, soft ambient glow behind the clash so the
                canvas edges of the two orbs never feel like bare rectangles. */}
            <div
              className="relative h-52 flex items-center justify-center my-6 rounded-2xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.07), transparent 65%)',
              }}
            >
              {/* My orb — slides in from left */}
              <motion.div
                animate={
                  phase === 'intro'
                    ? { x: -80, opacity: 0.6, scale: 0.9 }
                    : phase === 'clash'
                      ? { x: -30, scale: 1.05 }
                      : won
                        ? { x: -30, scale: 1.15 }
                        : { x: -30, scale: 0.85, opacity: 0.55 }
                }
                transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                className="absolute"
                style={{ left: '50%', transform: 'translateX(-100%)' }}
              >
                <div className="relative">
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
                        `0 0 30px ${color}77`,
                        `0 0 70px ${color}cc`,
                        `0 0 30px ${color}77`,
                      ]}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </div>
                <p className={`text-center text-xs mt-1 font-semibold ${won ? 'text-orange-400' : tie ? 'text-yellow-400' : 'text-slate-500'}`}>
                  You — {myScore}
                </p>
              </motion.div>

              {/* Clash-point flare */}
              {phase === 'clash' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2.4, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.6 }}
                  className="absolute w-24 h-24 rounded-full"
                  style={{ background: `radial-gradient(circle, ${color}cc, transparent 65%)` }}
                />
              )}

              {/* Mote stream — loser → winner */}
              {phase === 'reveal' && !tie && (
                <MoteStream from={won ? 'right' : 'left'} to={won ? 'left' : 'right'} color={color} />
              )}

              {/* Opponent orb — slides in from right */}
              <motion.div
                animate={
                  phase === 'intro'
                    ? { x: 80, opacity: 0.6, scale: 0.9 }
                    : phase === 'clash'
                      ? { x: 30, scale: 1.05 }
                      : !won && !tie
                        ? { x: 30, scale: 1.15 }
                        : tie
                          ? { x: 30, scale: 1.0 }
                          : { x: 30, scale: 0.85, opacity: 0.55 }
                }
                transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                className="absolute"
                style={{ left: '50%' }}
              >
                <div className="relative">
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
                        `0 0 30px ${color}77`,
                        `0 0 70px ${color}cc`,
                        `0 0 30px ${color}77`,
                      ]}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </div>
                <p className={`text-center text-xs mt-1 font-semibold ${!won && !tie ? 'text-orange-400' : tie ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {opp.username} — {oppScore}
                </p>
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
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1 pointer-events-none">
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          initial={{
            left: from === 'left' ? '30%' : '70%',
            opacity: 0,
          }}
          animate={{
            left: to === 'left' ? '30%' : '70%',
            opacity: [0, 1, 1, 0],
          }}
          transition={{ delay: i * 0.08, duration: 0.9, ease: 'easeIn' }}
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
