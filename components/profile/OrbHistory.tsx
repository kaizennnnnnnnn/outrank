'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { getOrbTier, MAX_ORB_TIER, ORB_TIERS } from '@/constants/orbTiers';
import { getOrbPower, getOrbAura, ORB_ENERGY } from '@/constants/orbSystem';
import { getCollection, orderBy, limit, updateDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { HabitLog } from '@/types/habit';
import { getLevelForXP } from '@/constants/levels';
import { StreakFire } from '@/components/habits/StreakFire';
import { BoltFullIcon, TrophyIconFull, FireIcon, StarIcon, MedalIcon } from '@/components/ui/AppIcons';
import { Button } from '@/components/ui/Button';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';
import { useUIStore } from '@/store/uiStore';

interface OrbHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrbHistory({ isOpen, onClose }: OrbHistoryProps) {
  const { user } = useAuth();
  const { habits } = useHabits();
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);

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
    try {
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(500),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
      addToast({ type: 'success', message: 'Orb ascended! +500 fragments · Ascension frame + name effect unlocked.' });
      setConfirmingAscend(false);
    } catch {
      addToast({ type: 'error', message: 'Ascension failed' });
    } finally {
      setAscending(false);
    }
  };
  const power = getOrbPower(orbTier);
  const aura = getOrbAura(orbTier);
  const level = user ? getLevelForXP(user.totalXP) : { level: 1, title: 'Rookie' };

  const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
  const currentStreaks = habits.reduce((sum, h) => sum + h.currentStreak, 0);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Soul Orb" size="md">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

        <ParticleBurst trigger={ascendBurst} color="#f9a8d4" count={140} />

        {/* Orb Status */}
        <div className="glass-card rounded-xl p-4 text-center space-y-2">
          <p className="font-heading text-2xl font-bold text-orange-400">{config.name}</p>
          <p className="text-xs text-slate-500">
            Tier {orbTier} of {MAX_ORB_TIER}
            {orbAscensions > 0 && (
              <span className="ml-2 text-pink-300">· Lineage {orbAscensions}</span>
            )}
          </p>
          <p className="text-[10px] text-slate-600">{config.description}</p>
        </div>

        {/* Ascend — unlocks at tier 10 with a big pulsing pink CTA */}
        {orbTier >= MAX_ORB_TIER && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl p-5 animate-frame-pulse"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(168,85,247,0.18) 45%, #0b0b14 100%)',
              border: '1.5px solid rgba(236,72,153,0.55)',
              boxShadow: '0 0 30px -6px rgba(236,72,153,0.75), inset 0 1px 0 rgba(236,72,153,0.15)',
            }}
          >
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none"
              style={{ background: '#ec4899' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-300">
              Ascension Ready
            </p>
            <p className="text-base font-bold text-white mt-1.5">
              Your orb has reached its final form.
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Ascend to restart at Ember and claim <span className="text-pink-300 font-semibold">+500 fragments</span>,
              the <span className="text-pink-300 font-semibold">Ascension Wreath</span> PFP frame,
              and the <span className="text-pink-300 font-semibold">Ascendant</span> name effect.
            </p>
            <div className="mt-3">
              {confirmingAscend ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingAscend(false)}
                    className="flex-1 text-xs text-slate-400 hover:text-white border border-[#1e1e30] rounded-xl py-2.5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={ascend}
                    disabled={ascending}
                    className="flex-1 text-sm font-bold text-white rounded-xl py-2.5 bg-gradient-to-r from-pink-600 via-fuchsia-500 to-orange-400 hover:opacity-90 transition-opacity shadow-[0_6px_24px_-6px_rgba(236,72,153,0.8)]"
                  >
                    {ascending ? 'Ascending…' : 'Confirm Ascend'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingAscend(true)}
                  className="w-full text-base font-heading font-bold text-white rounded-xl py-3 bg-gradient-to-r from-pink-600 via-fuchsia-500 to-orange-400 hover:opacity-95 transition-all shadow-[0_8px_32px_-8px_rgba(236,72,153,0.9)] tracking-wider uppercase"
                >
                  Ascend
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Energy Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Orb Energy</span>
            <span className={orbEnergy > 30 ? 'text-orange-400' : 'text-red-400'}>{orbEnergy}/{ORB_ENERGY.MAX}</span>
          </div>
          <div className="w-full h-2.5 bg-[#18182a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${orbEnergy}%`,
                background: orbEnergy > 60 ? 'linear-gradient(to right, #dc2626, #f97316)'
                  : orbEnergy > 30 ? 'linear-gradient(to right, #f59e0b, #f97316)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)',
              }}
            />
          </div>
          <p className="text-[10px] text-slate-600">
            {orbEnergy > 60 ? 'Fully charged — powers active' :
             orbEnergy > 30 ? 'Running low — keep logging!' :
             orbEnergy > 0 ? 'Critical — log now or lose power!' :
             'DORMANT — orb powers disabled'}
          </p>
        </div>

        {/* Fragments */}
        <div className="flex items-center justify-between bg-[#0c0c16] rounded-xl p-3">
          <div className="flex items-center gap-2">
            <SparklesSvg />
            <span className="text-sm font-medium text-white">Fragments</span>
          </div>
          <span className="font-mono text-lg font-bold text-orange-400">{fragments}</span>
        </div>

        {/* Active Power */}
        {power && (
          <div className="bg-[#0c0c16] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              <BoltFullIcon size={16} className="text-orange-400" />
              <span className="text-sm font-bold text-white">{power.name}</span>
            </div>
            <p className="text-xs text-slate-400">{power.description}</p>
          </div>
        )}

        {/* Active Aura */}
        {aura.xpMultiplier > 1 && (
          <div className="bg-[#0c0c16] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              <StarIcon size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">{aura.name}</span>
            </div>
            <p className="text-xs text-slate-400">{aura.description}</p>
          </div>
        )}

        {/* Stats */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Records</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatBox icon={<FireIcon size={16} className="text-orange-400" />} value={`${longestStreak}d`} label="Longest Streak" />
            <StatBox icon={<TrophyIconFull size={16} className="text-yellow-400" />} value={`${totalHabitLogs}`} label="Total Logs" />
            <StatBox icon={<MedalIcon size={16} className="text-red-400" />} value={`Lv.${level.level}`} label={level.title} />
            <StatBox icon={<BoltFullIcon size={16} className="text-orange-400" />} value={`${user.totalXP}`} label="Total XP" />
          </div>
        </div>

        {/* Most Logged Habit */}
        {mostLoggedHabit && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Most Logged</h3>
            <div className="bg-[#0c0c16] rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">{mostLoggedHabit.categoryIcon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{mostLoggedHabit.categoryName}</p>
                <p className="text-xs text-slate-500">{mostLoggedHabit.totalLogs} logs &bull; Best streak: {mostLoggedHabit.longestStreak}d</p>
              </div>
            </div>
          </div>
        )}

        {/* Evolution Timeline */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Evolution Path</h3>
          <div className="space-y-2">
            {ORB_TIERS.map((tierCfg) => tierCfg.tier).map((t) => {
              const tierConfig = getOrbTier(t);
              const reached = orbTier >= t;
              const current = orbTier === t;
              return (
                <div key={t} className={`flex items-center gap-3 rounded-xl p-2.5 border ${
                  current ? 'border-orange-500/30 bg-orange-500/5' :
                  reached ? 'border-emerald-500/20 bg-emerald-500/5' :
                  'border-[#1e1e30] bg-[#0c0c16] opacity-40'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm ${
                    current ? 'bg-orange-500/20 text-orange-400' :
                    reached ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-[#18182a] text-slate-600'
                  }`}>
                    {t}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${reached ? 'text-white' : 'text-slate-600'}`}>
                      {tierConfig.name} {current && '(Current)'}
                    </p>
                    <p className="text-[10px] text-slate-600">{tierConfig.description}</p>
                  </div>
                  {reached && !current && <span className="text-xs text-emerald-400">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-[#0c0c16] rounded-xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="font-mono text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function SparklesSvg() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}
