'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ORB_BASE_COLORS, ORB_PULSE_COLORS, ORB_RING_COLORS, OrbColorSet } from '@/constants/orbColors';
import { PFP_FRAMES, NAME_EFFECTS } from '@/constants/cosmetics';
import { XPBoostBadge, isXPBoostActive } from '@/components/profile/XPBoostBadge';
import { OrbColorPreview } from '@/components/profile/OrbColorPreview';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Rarity lookup — mirrors what's in the shop. Anything not listed falls back to common.
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
const RARITY_BY_ID: Record<string, Rarity> = {
  // base
  crimson: 'common', ocean: 'rare', emerald: 'rare', violet: 'epic', gold: 'epic',
  obsidian: 'epic', phoenix: 'legendary', aurora: 'legendary', nebula: 'legendary',
  prismatic: 'legendary', sunset: 'epic', northern: 'legendary', candy: 'epic',
  toxic: 'epic', deepsea: 'epic', bloodmoon: 'legendary',
  rainbow: 'mythic', stargaze: 'mythic', eternal: 'mythic',
  // pulse
  fire: 'common', ice: 'rare', lightning: 'rare', shadow: 'epic', plasma: 'epic',
  solar: 'legendary', cosmic: 'legendary', mystic: 'legendary', inferno: 'legendary', void: 'legendary',
  pulse_sunset: 'epic', pulse_toxic: 'epic', pulse_candy: 'epic', pulse_neon: 'epic',
  pulse_rainbow: 'mythic', pulse_stargaze: 'mythic', pulse_eternal: 'mythic',
  // ring
  ring_default: 'common', ring_silver: 'rare', ring_emerald: 'rare', ring_sapphire: 'rare',
  ring_royal: 'epic', ring_rose: 'epic', ring_neon: 'epic', ring_ghost: 'epic',
  ring_sunset: 'legendary', ring_aurora: 'legendary', ring_molten: 'legendary',
  ring_candy: 'legendary', ring_toxic: 'legendary',
  ring_rainbow: 'mythic', ring_void: 'mythic', ring_supernova: 'mythic',
  // frames
  frame_none: 'common', frame_iron: 'common',
  frame_silver: 'rare', frame_gold: 'rare',
  frame_emerald: 'epic', frame_ruby: 'epic', frame_sapphire: 'epic',
  frame_phoenix: 'legendary', frame_nebula: 'legendary',
  frame_ascension: 'mythic', frame_rainbow: 'mythic', frame_eternal: 'mythic',
  // name effects
  name_plain: 'common',
  name_ember: 'rare', name_ice: 'rare', name_emerald: 'rare',
  name_gold: 'epic', name_plasma: 'epic',
  name_phoenix: 'legendary',
  name_rainbow: 'mythic', name_ascendant: 'mythic', name_eternal: 'mythic',
};

const rarityStyles: Record<Rarity, { label: string; text: string; bg: string; border: string }> = {
  common:    { label: 'Common',    text: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
  rare:      { label: 'Rare',      text: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)'   },
  epic:      { label: 'Epic',      text: '#c084fc', bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)'   },
  legendary: { label: 'Legendary', text: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.45)'  },
  mythic:    { label: 'Mythic',    text: '#f9a8d4', bg: 'rgba(236,72,153,0.18)',  border: 'rgba(236,72,153,0.5)'   },
};

const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

type SortMode = 'rarity' | 'name';
type FilterType = 'all' | 'base' | 'pulse' | 'ring' | 'frame' | 'name';

export default function InventoryPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  const [sort, setSort] = useState<SortMode>('rarity');
  const [filter, setFilter] = useState<FilterType>('all');

  if (!user) return null;

  const userData = user as unknown as Record<string, unknown>;
  const ownedColors: string[] = (userData.ownedColors as string[]) || ['crimson', 'fire', 'ring_default'];
  const ownedCosmetics: string[] = (userData.ownedCosmetics as string[]) || [];
  const fragments: number = (userData.fragments as number) || 0;
  const streakFreezes: number = user.streakFreezeTokens || 0;
  const xpBoostAt = userData.xpBoostActivatedAt;
  const boostActive = isXPBoostActive(xpBoostAt as never);
  const equippedBase: string = (userData.orbBaseColor as string) || 'crimson';
  const equippedPulse: string = (userData.orbPulseColor as string) || 'fire';
  const equippedRing: string = (userData.orbRingColor as string) || 'ring_default';
  const equippedFrame: string = (userData.equippedFrame as string) || 'frame_none';
  const equippedNameEffect: string = (userData.equippedNameEffect as string) || 'name_plain';

  const ownedBaseColors = useMemo(
    () => sortColors(ORB_BASE_COLORS.filter((c) => ownedColors.includes(c.id)), sort),
    [ownedColors, sort]
  );
  const ownedPulseColors = useMemo(
    () => sortColors(ORB_PULSE_COLORS.filter((c) => ownedColors.includes(c.id)), sort),
    [ownedColors, sort]
  );
  const ownedRingColors = useMemo(
    () => sortColors(ORB_RING_COLORS.filter((c) => ownedColors.includes(c.id) || c.id === 'ring_default'), sort),
    [ownedColors, sort]
  );
  const ownedFrames = useMemo(
    () => sortCosmeticsByRarity(PFP_FRAMES.filter((f) => ownedCosmetics.includes(f.id) || f.id === 'frame_none'), sort),
    [ownedCosmetics, sort],
  );
  const ownedNames = useMemo(
    () => sortCosmeticsByRarity(NAME_EFFECTS.filter((n) => ownedCosmetics.includes(n.id) || n.id === 'name_plain'), sort),
    [ownedCosmetics, sort],
  );

  const equipBase = async (id: string) => {
    try { await updateDocument('users', user.uid, { orbBaseColor: id }); addToast({ type: 'success', message: 'Base color equipped' }); }
    catch { addToast({ type: 'error', message: 'Failed to equip' }); }
  };
  const equipPulse = async (id: string) => {
    try { await updateDocument('users', user.uid, { orbPulseColor: id }); addToast({ type: 'success', message: 'Pulse color equipped' }); }
    catch { addToast({ type: 'error', message: 'Failed to equip' }); }
  };
  const equipRing = async (id: string) => {
    try { await updateDocument('users', user.uid, { orbRingColor: id }); addToast({ type: 'success', message: 'Ring color equipped' }); }
    catch { addToast({ type: 'error', message: 'Failed to equip' }); }
  };
  const equipFrame = async (id: string) => {
    try { await updateDocument('users', user.uid, { equippedFrame: id }); addToast({ type: 'success', message: 'Frame equipped' }); }
    catch { addToast({ type: 'error', message: 'Failed to equip' }); }
  };
  const equipNameEffect = async (id: string) => {
    try { await updateDocument('users', user.uid, { equippedNameEffect: id }); addToast({ type: 'success', message: 'Name effect equipped' }); }
    catch { addToast({ type: 'error', message: 'Failed to equip' }); }
  };

  const showBase = filter === 'all' || filter === 'base';
  const showPulse = filter === 'all' || filter === 'pulse';
  const showFrames = filter === 'all' || filter === 'frame';
  const showNames = filter === 'all' || filter === 'name';
  const showRing = filter === 'all' || filter === 'ring';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Inventory</h1>
          <p className="text-sm text-slate-500">Everything you own — equip with one tap.</p>
        </div>
        <Link href="/shop">
          <span className="text-xs text-orange-400 hover:underline">Open shop &rarr;</span>
        </Link>
      </div>

      {/* Currencies + Consumables */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Fragments" value={fragments.toLocaleString()} color="#f97316" icon={<FragmentIcon />} />
        <StatPill label="Streak Freezes" value={streakFreezes.toString()} color="#06b6d4" icon={<ShieldIcon />} />
        <StatPill label="XP Boost" value={boostActive ? 'Active' : 'Idle'} color={boostActive ? '#fb923c' : '#475569'} icon={<BoltIcon />} extra={boostActive ? <XPBoostBadge activatedAt={xpBoostAt as never} size="sm" /> : null} />
        <StatPill label="Orb Tier" value={String((userData.orbTier as number) || 1)} color="#a855f7" icon={<OrbIcon />} />
      </section>

      {/* Filter + sort controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Show</span>
        <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip label="Base" active={filter === 'base'} onClick={() => setFilter('base')} />
        <FilterChip label="Pulse" active={filter === 'pulse'} onClick={() => setFilter('pulse')} />
        <FilterChip label="Rings" active={filter === 'ring'} onClick={() => setFilter('ring')} />
        <FilterChip label="Frames" active={filter === 'frame'} onClick={() => setFilter('frame')} />
        <FilterChip label="Names" active={filter === 'name'} onClick={() => setFilter('name')} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 ml-2">Sort</span>
        <FilterChip label="Rarity" active={sort === 'rarity'} onClick={() => setSort('rarity')} />
        <FilterChip label="Name" active={sort === 'name'} onClick={() => setSort('name')} />
      </div>

      {/* Base Colors */}
      {showBase && (
        <ColorSection
          title="Base Colors"
          count={ownedBaseColors.length}
          empty="No base colors yet. Visit the shop."
          colors={ownedBaseColors}
          equippedId={equippedBase}
          onEquip={equipBase}
          variant="orb"
        />
      )}

      {/* Pulse Colors */}
      {showPulse && (
        <ColorSection
          title="Pulse Colors"
          count={ownedPulseColors.length}
          empty="No pulse colors yet. Visit the shop."
          colors={ownedPulseColors}
          equippedId={equippedPulse}
          onEquip={equipPulse}
          variant="orb"
        />
      )}

      {/* Ring Colors */}
      {showRing && (
        <ColorSection
          title="Ring Colors"
          count={ownedRingColors.length}
          empty="No ring colors yet. Visit the shop."
          colors={ownedRingColors}
          equippedId={equippedRing}
          onEquip={equipRing}
          variant="ring"
        />
      )}

      {/* PFP Frames */}
      {showFrames && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Profile Frames <span className="text-slate-600">({ownedFrames.length})</span>
          </h2>
          {ownedFrames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1e1e30] bg-[#0b0b14] p-6 text-center">
              <p className="text-xs text-slate-500">No frames yet. Unlock them from shop, battle pass, or ascend your orb.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ownedFrames.map((f) => (
                <FrameCard
                  key={f.id}
                  id={f.id}
                  name={f.name}
                  avatarUrl={user.avatarUrl}
                  alt={user.username}
                  equipped={equippedFrame === f.id}
                  onEquip={() => equipFrame(f.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Name Effects */}
      {showNames && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Name Effects <span className="text-slate-600">({ownedNames.length})</span>
          </h2>
          {ownedNames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1e1e30] bg-[#0b0b14] p-6 text-center">
              <p className="text-xs text-slate-500">No name effects yet. Earn them from shop, battle pass, or ascend.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ownedNames.map((n) => (
                <NameEffectCard
                  key={n.id}
                  id={n.id}
                  name={n.name}
                  userName={user.username}
                  equipped={equippedNameEffect === n.id}
                  onEquip={() => equipNameEffect(n.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function sortCosmeticsByRarity<T extends { id: string; name: string }>(list: T[], mode: SortMode): T[] {
  const sorted = [...list];
  if (mode === 'rarity') {
    sorted.sort((a, b) => {
      const ra = rarityRank[RARITY_BY_ID[a.id] || 'common'];
      const rb = rarityRank[RARITY_BY_ID[b.id] || 'common'];
      if (ra !== rb) return rb - ra;
      return a.name.localeCompare(b.name);
    });
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

function FrameCard({
  id, name, avatarUrl, alt, equipped, onEquip,
}: {
  id: string; name: string; avatarUrl?: string; alt: string; equipped: boolean; onEquip: () => void;
}) {
  const rarity = RARITY_BY_ID[id] || 'common';
  const rs = rarityStyles[rarity];
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      className={cn('relative overflow-hidden rounded-xl p-3 text-left transition-all hover:border-orange-500/40')}
      style={{
        border: equipped ? '1px solid rgba(249,115,22,0.5)' : `1px solid ${rs.border}`,
        background: equipped
          ? 'linear-gradient(145deg, rgba(249,115,22,0.08), #0b0b14 60%)'
          : `linear-gradient(145deg, ${rs.bg}, #0b0b14 60%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <FramedAvatar src={avatarUrl} alt={alt} size="sm" frameId={id} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
              style={{ color: rs.text, background: rs.bg, border: `1px solid ${rs.border}` }}>
              {rs.label}
            </span>
            {equipped && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 border border-orange-500/30 px-1.5 py-[1px] rounded">
                Equipped
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function NameEffectCard({
  id, name, userName, equipped, onEquip,
}: {
  id: string; name: string; userName: string; equipped: boolean; onEquip: () => void;
}) {
  const rarity = RARITY_BY_ID[id] || 'common';
  const rs = rarityStyles[rarity];
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      className={cn('relative overflow-hidden rounded-xl p-3 text-left transition-all hover:border-orange-500/40')}
      style={{
        border: equipped ? '1px solid rgba(249,115,22,0.5)' : `1px solid ${rs.border}`,
        background: equipped
          ? 'linear-gradient(145deg, rgba(249,115,22,0.08), #0b0b14 60%)'
          : `linear-gradient(145deg, ${rs.bg}, #0b0b14 60%)`,
      }}
    >
      <div className="h-12 flex items-center justify-center mb-2 bg-[#0b0b14] border border-[#1e1e30] rounded-lg">
        <NamePlate name={userName} effectId={id} size="md" />
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-sm font-semibold text-white">{name}</span>
      </div>
      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
          style={{ color: rs.text, background: rs.bg, border: `1px solid ${rs.border}` }}>
          {rs.label}
        </span>
        {equipped && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 border border-orange-500/30 px-1.5 py-[1px] rounded">
            Equipped
          </span>
        )}
      </div>
    </button>
  );
}

function sortColors(list: OrbColorSet[], mode: SortMode): OrbColorSet[] {
  const sorted = [...list];
  if (mode === 'rarity') {
    // Mythic first, then Legendary, Epic, Rare, Common. Tie-break by name.
    sorted.sort((a, b) => {
      const ra = rarityRank[RARITY_BY_ID[a.id] || 'common'];
      const rb = rarityRank[RARITY_BY_ID[b.id] || 'common'];
      if (ra !== rb) return rb - ra;
      return a.name.localeCompare(b.name);
    });
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

function ColorSection({
  title, count, empty, colors, equippedId, onEquip, variant,
}: {
  title: string;
  count: number;
  empty: string;
  colors: OrbColorSet[];
  equippedId: string;
  onEquip: (id: string) => void;
  variant: 'orb' | 'ring';
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
        {title} <span className="text-slate-600">({count})</span>
      </h2>
      {colors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1e1e30] bg-[#0b0b14] p-6 text-center">
          <p className="text-xs text-slate-500">{empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {colors.map((c) => (
            <ColorCard
              key={c.id}
              color={c}
              variant={variant}
              equipped={equippedId === c.id}
              onEquip={() => onEquip(c.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ColorCard({
  color, variant, equipped, onEquip,
}: {
  color: OrbColorSet; variant: 'orb' | 'ring'; equipped: boolean; onEquip: () => void;
}) {
  const rarity = RARITY_BY_ID[color.id] || 'common';
  const rs = rarityStyles[rarity];
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      className={cn(
        'group relative overflow-hidden rounded-xl p-3 text-left transition-all',
        equipped ? 'cursor-default' : 'hover:border-orange-500/40'
      )}
      style={{
        border: equipped ? '1px solid rgba(249,115,22,0.5)' : `1px solid ${rs.border}`,
        background: equipped
          ? 'linear-gradient(145deg, rgba(249,115,22,0.08), #0b0b14 60%)'
          : `linear-gradient(145deg, ${rs.bg}, #0b0b14 60%)`,
        boxShadow: rarity === 'mythic' || rarity === 'legendary'
          ? `0 0 14px -6px ${rs.text}55`
          : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <OrbColorPreview colorSet={color} variant={variant} id={color.id} size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{color.name}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span
              className="text-[8px] font-bold uppercase tracking-[0.06em] px-1.5 py-[1px] rounded whitespace-nowrap"
              style={{ color: rs.text, background: rs.bg, border: `1px solid ${rs.border}` }}
            >
              {rs.label}
            </span>
            {equipped && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 border border-orange-500/30 px-1.5 py-[1px] rounded whitespace-nowrap">
                Equipped
              </span>
            )}
          </div>
          {!equipped && (
            <p className="text-[10px] text-slate-500 mt-1">Tap to equip</p>
          )}
        </div>
      </div>
    </button>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors border',
        active
          ? 'text-white border-orange-500/50 bg-gradient-to-br from-red-600/25 to-orange-500/15'
          : 'text-slate-400 border-[#1e1e30] bg-[#0b0b14] hover:text-white hover:border-[#2a2a3d]'
      )}
    >
      {label}
    </button>
  );
}

function StatPill({
  label, value, color, icon, extra,
}: {
  label: string; value: string; color: string; icon: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 text-center"
      style={{
        background: `linear-gradient(145deg, ${color}15 0%, #10101a 60%, #0b0b14 100%)`,
        border: `1px solid ${color}25`,
      }}
    >
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <p className="font-mono text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function FragmentIcon() {
  return (<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>);
}
function ShieldIcon() {
  return (<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
}
function BoltIcon() {
  return (<svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);
}
function OrbIcon() {
  return (<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" /></svg>);
}
