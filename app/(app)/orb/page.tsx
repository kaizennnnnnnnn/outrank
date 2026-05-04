'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { AwakeningBar } from '@/components/profile/AwakeningBar';
import { OrbHistory } from '@/components/profile/OrbHistory';
import { OrbNickname } from '@/components/profile/OrbNickname';
import { cn } from '@/lib/utils';
import { rollOrbLoot, lootColors, type OrbLoot } from '@/lib/orbLoot';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { useUIStore } from '@/store/uiStore';

/**
 * Orb command center. Everything related to evolving / ascending /
 * awakening the orb lives here. The profile page now only shows a
 * static visualization; interaction moved here so it's reachable from
 * the bottom-nav orb FAB on any screen.
 */
export default function OrbPage() {
  const { user } = useAuth();
  const userAny = user as unknown as Record<string, number> | null;
  const realTier = userAny?.orbTier || 1;
  const evolveCharges = userAny?.orbEvolutionCharges || 0;
  const storedAwakening = Math.min(100, userAny?.awakening || 0);

  const [localTier, setLocalTier] = useState(realTier);
  const [localCharges, setLocalCharges] = useState(evolveCharges);
  const [localAwakening, setLocalAwakening] = useState(storedAwakening);
  const [showOrbHistory, setShowOrbHistory] = useState(false);
  const [lootReveal, setLootReveal] = useState<OrbLoot | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => { setLocalTier(realTier); }, [realTier]);
  useEffect(() => { setLocalCharges(evolveCharges); }, [evolveCharges]);
  useEffect(() => { setLocalAwakening(storedAwakening); }, [storedAwakening]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  // NOTE: we do NOT mutate local state after the awaited writes.
  // The three useEffect hooks above already sync localTier /
  // localCharges / localAwakening from the Firestore snapshot
  // (via `user` through useAuth). If we *also* decrement locally,
  // the manual update stacks on top of the snapshot update —
  // which is why "Evolve once, lose two charges" was happening
  // (server went 3→2 via increment(-1), snapshot set local to 2,
  // then manual `c - 1` dragged it down to 1).
  // Evolve climbs the 1→10 tier ladder AND rolls a loot drop on the
  // weighted rarity table (lib/orbLoot.ts). The orb is rendered at
  // the max-tier visual regardless of where the user is on the
  // ladder — there's no visual difference between tiers; the only
  // thing that "feels" tier-up is the loot. Tier 10 caps the climb;
  // Ascend resets to 1 with prestige rewards.
  const handleEvolve = async () => {
    if (localCharges <= 0) return;
    const ownedCosmetics = (userAny as unknown as { ownedCosmetics?: string[] } | null)?.ownedCosmetics ?? [];
    const loot = rollOrbLoot(ownedCosmetics);
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      const updates: Record<string, unknown> = {
        orbEvolutionCharges: increment(-1),
      };
      if (localTier < 10) updates.orbTier = localTier + 1;
      if (loot.fragments) updates.fragments = increment(loot.fragments);
      if (loot.xp) {
        updates.totalXP      = increment(loot.xp);
        updates.weeklyXP     = increment(loot.xp);
        updates.monthlyXP    = increment(loot.xp);
        updates.seasonPassXP = increment(loot.xp);
      }
      if (loot.awakening) {
        // awakening is read-modify-write because increment can overshoot 100
        const next = Math.min(100, localAwakening + loot.awakening);
        updates.awakening = next;
      }
      if (loot.cosmeticId) {
        updates.ownedCosmetics = arrayUnion(loot.cosmeticId);
      }
      await updateDocument('users', user.uid, updates);
      setLootReveal(loot);
    } catch {
      addToast({ type: 'error', message: 'Evolution failed — try again' });
    }
  };

  const handleAscend = async () => {
    if (!user) return;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(500),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
    } catch { /* silent */ }
  };

  const handleFullAwaken = async () => {
    if (!user || localAwakening < 100) return;
    const userRaw = user as unknown as Record<string, number>;
    const firstTime = (userRaw.fullAwakenings || 0) === 0;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        awakening: 0,
        fullAwakenings: increment(1),
        awakeningBonus: increment(0.05),
        fragments: increment(2000),
        totalXP: increment(1000),
        weeklyXP: increment(1000),
        monthlyXP: increment(1000),
        seasonPassXP: increment(1000),
        orbEvolutionCharges: increment(2),
        ...(firstTime
          ? {
              ownedCosmetics: arrayUnion('frame_awakened', 'name_awakened'),
              equippedFrame: 'frame_awakened',
              equippedNameEffect: 'name_awakened',
            }
          : {}),
      });
    } catch { /* silent */ }
  };

  const fragments = (user as unknown as Record<string, number>).fragments || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(236,72,153,0.22), transparent 55%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(236,72,153,0.25)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-pink-300">The Orb</p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-0.5">
          Your Soul
        </h1>
        <p className="text-[11px] text-slate-500 mt-1 max-w-md">
          Evolve, ascend, and awaken — the orb tracks every step of your growth.
        </p>
      </div>

      {/* Interactive Soul Orb — all three ritual actions live here.
          The visual is pinned to MAX_ORB_TIER regardless of the
          user's actual orbTier; there's no visual difference between
          tiers anymore. Tier-up only "feels" through the loot drop. */}
      <div onClick={() => setShowOrbHistory(true)} className="cursor-pointer">
        <SoulOrb
          intensity={localAwakening}
          tier={MAX_ORB_TIER}
          size={300}
          onEvolve={localCharges > 0 ? handleEvolve : undefined}
          onAscend={handleAscend}
          onFullAwaken={localAwakening >= 100 ? handleFullAwaken : undefined}
          baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
          pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
          ringColorId={(user as unknown as Record<string, string>).orbRingColor}
        />
      </div>

      {/* Fragments + evolution charges chips */}
      <div className="flex items-center justify-center gap-3 flex-wrap -mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
          <span className="font-mono text-sm font-bold text-orange-400">{fragments}</span>
          <span className="text-[10px] text-slate-500">fragments</span>
        </div>
        {localTier < 10 && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border',
              localCharges > 0
                ? 'bg-pink-500/10 border-pink-500/30 animate-frame-pulse'
                : 'bg-[#10101a] border-[#1e1e30]'
            )}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={localCharges > 0 ? 'text-pink-300' : 'text-slate-600'}>
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" />
            </svg>
            <span className={cn('font-mono text-sm font-bold', localCharges > 0 ? 'text-pink-300' : 'text-slate-500')}>
              {localCharges}
            </span>
            <span className="text-[10px] text-slate-500">evolution{localCharges === 1 ? '' : 's'}</span>
          </div>
        )}
        <button onClick={() => setShowOrbHistory(true)} className="text-[10px] text-slate-500 hover:text-orange-400 transition-colors underline">
          View Orb Details
        </button>
      </div>

      {/* Awakening progress */}
      <AwakeningBar awakening={localAwakening} />
      {localCharges === 0 && localTier < 10 ? (
        <p className="text-[10px] text-center text-slate-500 -mt-3 max-w-sm mx-auto leading-relaxed">
          Log <b className="text-orange-400">every habit today</b> for extra rewards.
        </p>
      ) : localAwakening >= 100 ? (
        <p className="text-[10px] text-center -mt-3 max-w-sm mx-auto leading-relaxed">
          <b className="text-pink-300">100% reached.</b> Full Awaken for a permanent XP bonus + exclusive skin.
        </p>
      ) : (
        <p className="text-[10px] text-center text-slate-500 -mt-3 max-w-sm mx-auto leading-relaxed">
          Evolve now for <b className="text-orange-400">+{25 + Math.floor(localAwakening * 0.5)} frags</b>, <b className="text-orange-400">+{20 + Math.floor(localAwakening * 0.5)} XP</b>. Higher awakening = bigger prize.
        </p>
      )}

      <OrbHistory isOpen={showOrbHistory} onClose={() => setShowOrbHistory(false)} />

      {/* Loot reveal — fires after a successful evolve */}
      <OrbLootReveal loot={lootReveal} onClose={() => setLootReveal(null)} />

      {/* Nickname + mood */}
      <OrbNickname user={user} />

      {/* Shortcut to shop for orb cosmetics */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Link
          href="/shop"
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-colors"
        >
          Customize in Shop
        </Link>
        <Link
          href="/profile"
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-[#1e1e30] text-slate-400 hover:text-white hover:border-[#2d2d45] transition-colors"
        >
          Back to Profile
        </Link>
      </div>
    </div>
  );
}

// ─── Loot reveal modal ──────────────────────────────────────────────
//
// Tap-to-dismiss. Color-codes the rarity using the chestLoot palette.
// Shows the loot label + flavor + payload (fragments/XP/awakening/
// cosmetic). Pure cosmetic — the write already landed before this
// renders.

function OrbLootReveal({
  loot,
  onClose,
}: {
  loot: OrbLoot | null;
  onClose: () => void;
}) {
  if (!loot) return null;
  const c = lootColors(loot.rarity);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border-2 p-6 text-center"
        style={{
          borderColor: c.color,
          background: `radial-gradient(ellipse 100% 80% at 50% 0%, ${c.glow}, transparent 70%), linear-gradient(165deg, #10101a 0%, #0b0b14 100%)`,
          boxShadow: `0 0 60px -8px ${c.glow}`,
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.35em] font-bold"
          style={{ color: c.color, textShadow: `0 0 12px ${c.glow}` }}
        >
          {c.name}
        </p>
        <h3 className="font-heading font-bold text-2xl text-white mt-2 leading-tight">
          {loot.label}
        </h3>
        <p className="text-[13px] text-slate-300/85 mt-2 leading-relaxed">
          {loot.detail}
        </p>

        {/* Payload chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {!!loot.fragments && (
            <span className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-200">
              +{loot.fragments} fragments
            </span>
          )}
          {!!loot.xp && (
            <span className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
              +{loot.xp} XP
            </span>
          )}
          {!!loot.awakening && (
            <span className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/40 text-violet-200">
              +{loot.awakening} awakening
            </span>
          )}
          {!!loot.cosmeticId && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-200">
              Cosmetic unlocked
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          Claim
        </button>
      </div>
    </div>
  );
}
