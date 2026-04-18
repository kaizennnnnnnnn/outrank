'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { ORB_BASE_COLORS, ORB_PULSE_COLORS, ORB_RING_COLORS, OrbColorSet } from '@/constants/orbColors';
import { PFP_FRAMES, NAME_EFFECTS, CosmeticRarity } from '@/constants/cosmetics';
import { OrbColorPreview } from '@/components/profile/OrbColorPreview';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Rarity = CosmeticRarity; // 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
type Tab = 'base' | 'pulse' | 'rings' | 'account' | 'boosts' | 'utilities';
type RarityFilter = 'all' | Rarity;

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type:
    | 'base_color'
    | 'pulse_color'
    | 'ring_color'
    | 'frame'
    | 'name_effect'
    | 'power_boost_1h'
    | 'power_boost_24h'
    | 'instant_evolve'
    | 'streak_freeze'
    | 'daily_challenge_x2';
  tab: Tab;
  colorValue?: string;
  rarity: Rarity;
  payload?: number;
}

// ---- Rarity → price tiers (auto-pricing for color items) --------------------
const BASE_PRICE: Record<Rarity, number>  = { common: 0, rare: 40,  epic: 110, legendary: 220, mythic: 550 };
const PULSE_PRICE: Record<Rarity, number> = { common: 0, rare: 40,  epic: 100, legendary: 200, mythic: 550 };
const RING_PRICE: Record<Rarity, number>  = { common: 0, rare: 45,  epic: 115, legendary: 240, mythic: 650 };
const FRAME_PRICE: Record<Rarity, number> = { common: 25, rare: 60,  epic: 150, legendary: 340, mythic: 750 };
const NAME_PRICE: Record<Rarity, number>  = { common: 0,  rare: 50,  epic: 130, legendary: 300, mythic: 700 };

// Canonical rarity per color id. Groups colors into families so the shop can
// be filtered/sorted without duplicating metadata inside orbColors.ts.
const BASE_RARITY: Record<string, Rarity> = {
  crimson: 'common',
  ember: 'rare', amber: 'rare', ocean: 'rare', sky: 'rare', emerald: 'rare',
  pear: 'rare', grape: 'rare', lavender: 'rare', rose: 'rare', coral: 'rare',
  teal: 'rare', slate: 'rare', snow: 'rare', midnight: 'rare',
  violet: 'epic', gold: 'epic', obsidian: 'epic', sunset: 'epic', candy: 'epic',
  toxic: 'epic', deepsea: 'epic', ruby_core: 'epic', jade: 'epic', twilight: 'epic',
  phoenix: 'legendary', aurora: 'legendary', nebula: 'legendary', prismatic: 'legendary',
  northern: 'legendary', bloodmoon: 'legendary', galactic: 'legendary', abyssal: 'legendary',
  zenith: 'legendary', mirage: 'legendary',
  rainbow: 'mythic', stargaze: 'mythic', eternal: 'mythic', quasar: 'mythic',
  nova: 'mythic', celestial: 'mythic', singularity: 'mythic',
};
const PULSE_RARITY: Record<string, Rarity> = {
  fire: 'common',
  ice: 'rare', lightning: 'rare', mint: 'rare', crimson_p: 'rare', azure: 'rare',
  bubblegum: 'rare', grove: 'rare', dusk: 'rare', saffron_p: 'rare', charcoal: 'rare',
  shadow: 'epic', plasma: 'epic', pulse_sunset: 'epic', pulse_toxic: 'epic',
  pulse_candy: 'epic', pulse_neon: 'epic', pulse_arctic: 'epic', pulse_royal: 'epic',
  solar: 'legendary', void: 'legendary', mystic: 'legendary', inferno: 'legendary',
  cosmic: 'legendary', abyss_p: 'legendary', seraph: 'legendary', nebula_p: 'legendary',
  pulse_rainbow: 'mythic', pulse_stargaze: 'mythic', pulse_eternal: 'mythic',
  pulse_quasar: 'mythic', pulse_cosmic: 'mythic', pulse_nova: 'mythic',
};
const RING_RARITY: Record<string, Rarity> = {
  ring_default: 'common',
  ring_silver: 'rare', ring_emerald: 'rare', ring_sapphire: 'rare', ring_ember: 'rare',
  ring_amber: 'rare', ring_rose: 'rare', ring_amethyst: 'rare', ring_mint: 'rare', ring_slate: 'rare',
  ring_royal: 'epic', ring_neon: 'epic', ring_ghost: 'epic', ring_copper: 'epic',
  ring_obsidian: 'epic', ring_twilight: 'epic',
  ring_sunset: 'legendary', ring_aurora: 'legendary', ring_molten: 'legendary', ring_candy: 'legendary',
  ring_toxic: 'legendary', ring_abyss: 'legendary', ring_phoenix: 'legendary',
  ring_rainbow: 'mythic', ring_void: 'mythic', ring_supernova: 'mythic',
  ring_cosmic: 'mythic', ring_celestial: 'mythic', ring_eternal: 'mythic',
};

// Build all color/frame/name cosmetic items from the constants tables.
const generatedColors: ShopItem[] = [
  ...ORB_BASE_COLORS.map<ShopItem>((c) => ({
    id: `color_${c.id}`,
    name: c.name,
    description: `${c.name} base color`,
    price: BASE_PRICE[BASE_RARITY[c.id] ?? 'rare'],
    type: 'base_color',
    tab: 'base',
    colorValue: c.mid,
    rarity: BASE_RARITY[c.id] ?? 'rare',
  })),
  ...ORB_PULSE_COLORS.map<ShopItem>((c) => ({
    id: `pulse_${c.id}`,
    name: `${c.name} Pulse`,
    description: `${c.name} wave color`,
    price: PULSE_PRICE[PULSE_RARITY[c.id] ?? 'rare'],
    type: 'pulse_color',
    tab: 'pulse',
    colorValue: c.mid,
    rarity: PULSE_RARITY[c.id] ?? 'rare',
  })),
  ...ORB_RING_COLORS.map<ShopItem>((c) => ({
    id: `ringcol_${c.id}`,
    name: `${c.name} Rings`,
    description: `${c.name} orbital rings`,
    price: RING_PRICE[RING_RARITY[c.id] ?? 'rare'],
    type: 'ring_color',
    tab: 'rings',
    colorValue: c.mid,
    rarity: RING_RARITY[c.id] ?? 'rare',
  })),
];

const generatedCosmetics: ShopItem[] = [
  ...PFP_FRAMES.filter((f) => f.id !== 'frame_none').map<ShopItem>((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    price: FRAME_PRICE[f.rarity],
    type: 'frame',
    tab: 'account',
    colorValue: f.colors[0] || '#888',
    rarity: f.rarity,
  })),
  ...NAME_EFFECTS.filter((e) => e.id !== 'name_plain').map<ShopItem>((e) => ({
    id: e.id,
    name: `${e.name} Name`,
    description: e.description,
    price: NAME_PRICE[e.rarity],
    type: 'name_effect',
    tab: 'account',
    colorValue: e.colors[0] || '#fff',
    rarity: e.rarity,
  })),
];

const utilityItems: ShopItem[] = [
  // ---- BOOSTS ----
  { id: 'boost_1h',  name: '1h Quick Boost', description: '2× XP for one hour', price: 20, type: 'power_boost_1h',  tab: 'boosts', rarity: 'common' },
  { id: 'boost_24h', name: '24h XP Boost',   description: '2× XP on every log for a full day', price: 75, type: 'power_boost_24h', tab: 'boosts', rarity: 'rare' },
  { id: 'daily_x2',  name: 'Daily Challenge ×2', description: 'Doubles the bonus XP on your next daily challenge', price: 35, type: 'daily_challenge_x2', tab: 'boosts', rarity: 'rare' },

  // ---- UTILITIES ----
  { id: 'freeze_1',       name: 'Streak Freeze',     description: 'Skip a day without losing your streak', price: 15, type: 'streak_freeze', tab: 'utilities', payload: 1, rarity: 'common' },
  { id: 'freeze_3',       name: '3× Streak Freezes', description: 'Three freezes at a bulk discount',       price: 35, type: 'streak_freeze', tab: 'utilities', payload: 3, rarity: 'rare' },
  { id: 'instant_evolve', name: 'Instant Evolution', description: 'Skip the grind — evolve your orb now',    price: 200, type: 'instant_evolve', tab: 'utilities', rarity: 'legendary' },
];

const SHOP_ITEMS: ShopItem[] = [...generatedColors, ...generatedCosmetics, ...utilityItems];

const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

const rarityAccent: Record<Rarity, { border: string; glow: string; text: string; bg: string }> = {
  common:    { border: '#475569',  glow: 'rgba(148,163,184,0.10)', text: '#94a3b8', bg: 'rgba(100,116,139,0.04)' },
  rare:      { border: '#3b82f6',  glow: 'rgba(59,130,246,0.18)',  text: '#60a5fa', bg: 'rgba(59,130,246,0.06)' },
  epic:      { border: '#a855f7',  glow: 'rgba(168,85,247,0.22)',  text: '#c084fc', bg: 'rgba(168,85,247,0.08)' },
  legendary: { border: '#f59e0b',  glow: 'rgba(245,158,11,0.28)',  text: '#fbbf24', bg: 'rgba(245,158,11,0.09)' },
  mythic:    { border: '#ec4899',  glow: 'rgba(236,72,153,0.38)',  text: '#f9a8d4', bg: 'rgba(236,72,153,0.12)' },
};

const rarityLabels: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'base',      label: 'Base',      icon: <OrbSmallIcon /> },
  { id: 'pulse',     label: 'Pulse',     icon: <WaveIcon /> },
  { id: 'rings',     label: 'Rings',     icon: <RingsIcon /> },
  { id: 'account',   label: 'Account',   icon: <ProfileIcon /> },
  { id: 'boosts',    label: 'Boosts',    icon: <BoltIcon /> },
  { id: 'utilities', label: 'Utilities', icon: <ShieldIcon /> },
];

// Default rarity filter per tab. Account defaults to 'all' because it
// naturally has fewer items than color tabs.
const defaultRarityFor: Record<Tab, RarityFilter> = {
  base:      'mythic',
  pulse:     'mythic',
  rings:     'mythic',
  account:   'all',
  boosts:    'all',
  utilities: 'all',
};

export default function ShopPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [buying, setBuying] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('base');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>(defaultRarityFor['base']);

  const userData = user as unknown as Record<string, unknown> | undefined;
  const fragments = (userData?.fragments as number) || 0;
  const ownedColors = (userData?.ownedColors as string[]) || ['crimson', 'fire', 'ring_default'];
  const ownedCosmetics = (userData?.ownedCosmetics as string[]) || [];
  const equippedBase = (userData?.orbBaseColor as string) || 'crimson';
  const equippedPulse = (userData?.orbPulseColor as string) || 'fire';
  const equippedRing = (userData?.orbRingColor as string) || 'ring_default';
  const equippedFrame = (userData?.equippedFrame as string) || 'frame_none';
  const equippedName = (userData?.equippedNameEffect as string) || 'name_plain';

  // Map shop-item id → canonical color/cosmetic id used on the user doc.
  const colorIdOf = (item: ShopItem): string => {
    if (item.type === 'base_color')  return item.id.replace(/^color_/, '');
    if (item.type === 'pulse_color') return item.id.replace(/^pulse_/, '');
    if (item.type === 'ring_color')  return item.id.replace(/^ringcol_/, '');
    return item.id;
  };

  const isOwned = (item: ShopItem) => {
    if (item.type === 'base_color' || item.type === 'pulse_color' || item.type === 'ring_color') {
      return ownedColors.includes(colorIdOf(item));
    }
    if (item.type === 'frame' || item.type === 'name_effect') {
      return ownedCosmetics.includes(item.id);
    }
    return false;
  };
  const isEquipped = (item: ShopItem) => {
    const id = colorIdOf(item);
    if (item.type === 'base_color')  return equippedBase === id;
    if (item.type === 'pulse_color') return equippedPulse === id;
    if (item.type === 'ring_color')  return equippedRing === id;
    if (item.type === 'frame')       return equippedFrame === item.id;
    if (item.type === 'name_effect') return equippedName === item.id;
    return false;
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    const owned = isOwned(item);
    const equipped = isEquipped(item);
    if (equipped) return;

    if (owned) {
      setBuying(item.id);
      try {
        const id = colorIdOf(item);
        if (item.type === 'base_color')       await updateDocument('users', user.uid, { orbBaseColor: id });
        else if (item.type === 'pulse_color') await updateDocument('users', user.uid, { orbPulseColor: id });
        else if (item.type === 'ring_color')  await updateDocument('users', user.uid, { orbRingColor: id });
        else if (item.type === 'frame')       await updateDocument('users', user.uid, { equippedFrame: item.id });
        else if (item.type === 'name_effect') await updateDocument('users', user.uid, { equippedNameEffect: item.id });
        addToast({ type: 'success', message: `Equipped ${item.name}` });
      } catch {
        addToast({ type: 'error', message: 'Failed to equip' });
      } finally {
        setBuying(null);
      }
      return;
    }

    if (fragments < item.price) {
      addToast({ type: 'error', message: 'Not enough fragments' });
      return;
    }

    setBuying(item.id);
    try {
      if (item.price > 0) {
        await updateDocument('users', user.uid, { fragments: increment(-item.price) });
      }
      switch (item.type) {
        case 'base_color':
        case 'pulse_color':
        case 'ring_color': {
          const id = colorIdOf(item);
          const field = item.type === 'base_color' ? 'orbBaseColor' : item.type === 'pulse_color' ? 'orbPulseColor' : 'orbRingColor';
          await updateDocument('users', user.uid, { [field]: id, ownedColors: arrayUnion(id) });
          addToast({ type: 'success', message: `Purchased ${item.name}` });
          break;
        }
        case 'frame': {
          await updateDocument('users', user.uid, {
            equippedFrame: item.id,
            ownedCosmetics: arrayUnion(item.id),
          });
          addToast({ type: 'success', message: `Purchased & equipped ${item.name}` });
          break;
        }
        case 'name_effect': {
          await updateDocument('users', user.uid, {
            equippedNameEffect: item.id,
            ownedCosmetics: arrayUnion(item.id),
          });
          addToast({ type: 'success', message: `Purchased & equipped ${item.name}` });
          break;
        }
        case 'power_boost_1h':
        case 'power_boost_24h': {
          await updateDocument('users', user.uid, {
            xpBoostActivatedAt: Timestamp.now(),
            xpBoostVariant: item.type,
          });
          addToast({ type: 'success', message: `${item.name} activated` });
          break;
        }
        case 'daily_challenge_x2': {
          await updateDocument('users', user.uid, { dailyChallengeMultiplier: 2 });
          addToast({ type: 'success', message: 'Next daily challenge will pay 2×' });
          break;
        }
        case 'instant_evolve': {
          const currentTier = (userData?.orbTier as number) || 1;
          if (currentTier >= 10) {
            addToast({ type: 'error', message: 'Already at max tier' });
            return;
          }
          await updateDocument('users', user.uid, { orbTier: currentTier + 1 });
          addToast({ type: 'success', message: 'Orb evolved' });
          break;
        }
        case 'streak_freeze': {
          await updateDocument('users', user.uid, { streakFreezeTokens: increment(item.payload || 1) });
          addToast({ type: 'success', message: `+${item.payload || 1} Streak Freezes` });
          break;
        }
      }
    } catch {
      addToast({ type: 'error', message: 'Purchase failed' });
    } finally {
      setBuying(null);
    }
  };

  const tabItems = useMemo(() => SHOP_ITEMS.filter((i) => i.tab === tab), [tab]);
  const counts = useMemo(() => {
    const c: Record<RarityFilter, number> = { all: tabItems.length, common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
    for (const it of tabItems) c[it.rarity]++;
    return c;
  }, [tabItems]);

  // When tab changes, reset to its default rarity filter. Using a derived
  // fallback instead of a useEffect keeps this rendered-in-sync with the tab.
  const activeRarityFilter: RarityFilter =
    counts[rarityFilter] > 0 ? rarityFilter : (counts[defaultRarityFor[tab]] > 0 ? defaultRarityFor[tab] : 'all');

  const visible = useMemo(() => {
    const filtered = activeRarityFilter === 'all' ? tabItems : tabItems.filter((i) => i.rarity === activeRarityFilter);
    return filtered.sort((a, b) => {
      const r = rarityRank[b.rarity] - rarityRank[a.rarity];
      if (r !== 0) return r;
      return a.price - b.price;
    });
  }, [tabItems, activeRarityFilter]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Shop</h1>
          <p className="text-sm text-slate-500">Spend fragments on cosmetics, boosts, and utilities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory">
            <span className="text-xs text-orange-400 hover:underline">Inventory &rarr;</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
            <span className="font-mono text-sm font-bold text-orange-400">{fragments}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setRarityFilter(defaultRarityFor[t.id]);
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all whitespace-nowrap shrink-0',
              tab === t.id
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_6px_20px_-10px_rgba(239,68,68,0.7)]'
                : 'bg-[#10101a] border border-[#1e1e30] text-slate-400 hover:text-white'
            )}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Rarity filter chips — reduces scrolling drastically when lots of colors */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['all', 'mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((r) => {
          const active = activeRarityFilter === r;
          const count = counts[r];
          if (count === 0 && r !== 'all') return null;
          const accent = r === 'all' ? null : rarityAccent[r];
          return (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] whitespace-nowrap shrink-0 transition-all border',
                active
                  ? 'text-white'
                  : 'text-slate-500 hover:text-white border-[#1e1e30] bg-[#0b0b14]',
                r === 'mythic' && active && 'animate-shop-mythic-border',
                r === 'legendary' && active && 'animate-shop-legendary-border',
              )}
              style={active && accent ? {
                background: `linear-gradient(135deg, ${accent.border}30, ${accent.border}12 70%)`,
                borderColor: accent.border,
                color: accent.text,
                textShadow: `0 0 8px ${accent.border}`,
              } : active ? {
                background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(220,38,38,0.15) 70%)',
                borderColor: '#f97316',
              } : undefined}
            >
              <span>{r === 'all' ? 'All' : rarityLabels[r]}</span>
              <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content — either grouped (all) or single block */}
      {activeRarityFilter === 'all' ? (
        <>
          {(['mythic', 'legendary', 'epic', 'rare', 'common'] as Rarity[]).map((r) => {
            const items = visible.filter((i) => i.rarity === r);
            if (items.length === 0) return null;
            return (
              <RaritySection key={r} rarity={r} items={items} tab={tab} fragments={fragments} buying={buying} onBuy={handleBuy} isOwned={isOwned} isEquipped={isEquipped} />
            );
          })}
        </>
      ) : (
        <RaritySection rarity={activeRarityFilter} items={visible} tab={tab} fragments={fragments} buying={buying} onBuy={handleBuy} isOwned={isOwned} isEquipped={isEquipped} showBanner />
      )}
    </div>
  );
}

function RaritySection({
  rarity, items, tab, fragments, buying, onBuy, isOwned, isEquipped, showBanner,
}: {
  rarity: Rarity;
  items: ShopItem[];
  tab: Tab;
  fragments: number;
  buying: string | null;
  onBuy: (item: ShopItem) => void;
  isOwned: (item: ShopItem) => boolean;
  isEquipped: (item: ShopItem) => boolean;
  showBanner?: boolean;
}) {
  if (items.length === 0) return null;
  const accent = rarityAccent[rarity];

  return (
    <section className="space-y-3">
      {showBanner ? (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl p-4 border',
            rarity === 'mythic' && 'animate-shop-mythic-border',
            rarity === 'legendary' && 'animate-shop-legendary-border',
          )}
          style={{
            background: rarity === 'mythic'
              ? 'linear-gradient(90deg, #ec489922, #a855f722, #22d3ee22, #fbbf2422, #ec489922)'
              : `linear-gradient(135deg, ${accent.bg}, #10101a 70%)`,
            borderColor: accent.border,
            backgroundSize: rarity === 'mythic' ? '200% 100%' : undefined,
          }}
        >
          <div className={cn('flex items-center gap-3', rarity === 'mythic' && 'animate-shop-mythic-bg')}>
            <RaritySigil rarity={rarity} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent.text }}>
                {rarityLabels[rarity]} tier
              </p>
              <p className="font-heading text-xl font-bold text-white mt-0.5">
                {rarityTagline(rarity)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <h2
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accent.text }}
        >
          <RaritySigil rarity={rarity} small />
          {rarityLabels[rarity]}
          <span className="text-slate-600 font-mono">{items.length}</span>
        </h2>
      )}

      <div className={cn(
        'grid gap-3',
        tab === 'base' || tab === 'pulse' || tab === 'rings' || tab === 'account'
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2',
      )}>
        {items.map((item) => (
          <ShopCard
            key={item.id}
            item={item}
            fragments={fragments}
            buying={buying}
            onBuy={onBuy}
            owned={isOwned(item)}
            equipped={isEquipped(item)}
          />
        ))}
      </div>
    </section>
  );
}

function rarityTagline(r: Rarity): string {
  switch (r) {
    case 'mythic':    return 'Impossible to miss';
    case 'legendary': return 'Worth the grind';
    case 'epic':      return 'Meaningful upgrades';
    case 'rare':      return 'Style on a budget';
    case 'common':    return 'Your starting loadout';
  }
}

function RaritySigil({ rarity, small }: { rarity: Rarity; small?: boolean }) {
  const accent = rarityAccent[rarity];
  const size = small ? 14 : 28;
  const stroke = accent.border;
  const glow = `drop-shadow(0 0 4px ${accent.border})`;
  switch (rarity) {
    case 'mythic':
      // 8-point burst
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 6px ${stroke}) drop-shadow(0 0 2px ${stroke})` }}>
          <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill={stroke} opacity="0.35" />
          <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} x1="12" y1="12" x2={12 + Math.cos((a * Math.PI) / 180) * 10} y2={12 + Math.sin((a * Math.PI) / 180) * 10}
              stroke={stroke} strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'legendary':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" fill={stroke} opacity="0.3" />
          <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case 'epic':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M6 10l6-7 6 7-6 11z" fill={stroke} opacity="0.25" />
          <path d="M6 10l6-7 6 7-6 11z" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case 'rare':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="7" fill={stroke} opacity="0.2" />
          <circle cx="12" cy="12" r="7" fill="none" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
    case 'common':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
  }
}

function ShopCard({
  item, fragments, buying, onBuy, owned, equipped,
}: {
  item: ShopItem;
  fragments: number;
  buying: string | null;
  onBuy: (item: ShopItem) => void;
  owned: boolean;
  equipped: boolean;
}) {
  const canAfford = fragments >= item.price;
  const isFree = item.price === 0;
  const accent = rarityAccent[item.rarity];

  let label: string;
  let disabled = buying === item.id;
  let primary = true;
  if (equipped) {
    label = 'Equipped';
    primary = false;
    disabled = true;
  } else if (owned) {
    label = 'Equip';
  } else if (isFree) {
    label = 'Claim';
  } else if (!canAfford) {
    label = `${item.price}`;
    primary = false;
    disabled = true;
  } else {
    label = `Buy · ${item.price}`;
  }

  // Visual tier per rarity — Mythic wraps in an animated gradient shell, then
  // the card content sits on top. Legendary gets a pulsing gold shadow. Epic
  // gets a steady purple glow. Rare/Common stay flat.
  const isMythic = item.rarity === 'mythic';
  const isLegendary = item.rarity === 'legendary';

  const cardStyle: React.CSSProperties = {
    background: isMythic
      ? 'linear-gradient(145deg, rgba(236,72,153,0.18), rgba(168,85,247,0.12) 40%, rgba(34,211,238,0.08) 75%, #0b0b14 100%)'
      : isLegendary
        ? `linear-gradient(145deg, rgba(251,191,36,0.14), ${accent.bg} 40%, #10101a 80%)`
        : `linear-gradient(145deg, ${accent.bg}, #10101a 55%, #0b0b14 100%)`,
    border: `1px solid ${equipped ? '#f97316aa' : accent.border + (isMythic ? '99' : isLegendary ? '66' : '40')}`,
    opacity: !canAfford && !owned && !isFree ? 0.72 : 1,
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-3 transition-all',
        isMythic && 'animate-shop-mythic-border',
        isLegendary && !isMythic && 'animate-shop-legendary-border',
      )}
      style={cardStyle}
    >
      {/* Mythic background shimmer */}
      {isMythic && (
        <div
          className="absolute inset-0 pointer-events-none animate-shop-mythic-bg"
          style={{
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Rarity pill (top-left) — adds a visible cue even if user ignores grouping */}
      <span
        className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded z-10"
        style={{
          background: `${accent.border}22`,
          color: accent.text,
          border: `1px solid ${accent.border}55`,
        }}
      >
        {rarityLabels[item.rarity]}
      </span>

      {equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded z-10">
          Equipped
        </span>
      )}
      {owned && !equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded z-10">
          Owned
        </span>
      )}

      <div className="relative flex items-center gap-3 mb-3 mt-5">
        {item.type === 'base_color' || item.type === 'pulse_color' || item.type === 'ring_color' ? (
          <OrbColorPreview
            colorSet={getOrbSet(item)}
            variant={item.type === 'ring_color' ? 'ring' : 'orb'}
            id={colorIdForPreview(item)}
            size={48}
          />
        ) : item.type === 'frame' ? (
          <div className="flex-shrink-0">
            <FramedAvatar alt={item.name} size="sm" frameId={item.id} />
          </div>
        ) : item.type === 'name_effect' ? (
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#0b0b14] border border-[#1e1e30]">
            <NamePlate name="Aa" effectId={item.id} size="lg" />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: `${accent.border}1a`, color: accent.text }}
          >
            {iconFor(item.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
          <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{item.description}</p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full relative z-10"
        variant={primary ? 'primary' : 'secondary'}
        disabled={disabled}
        loading={buying === item.id}
        onClick={() => onBuy(item)}
      >
        {label}
      </Button>
    </div>
  );
}

function colorIdForPreview(item: ShopItem): string {
  if (item.type === 'base_color')  return item.id.replace(/^color_/, '');
  if (item.type === 'pulse_color') return item.id.replace(/^pulse_/, '');
  if (item.type === 'ring_color')  return item.id.replace(/^ringcol_/, '');
  return item.id;
}

function iconFor(type: ShopItem['type']) {
  const c = 'currentColor';
  switch (type) {
    case 'power_boost_1h':
    case 'power_boost_24h':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill={c}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case 'instant_evolve':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6" /><path d="M12 22v-6" /><circle cx="12" cy="12" r="4" /><path d="m16.24 7.76 1.42-1.42" /><path d="m6.34 17.66 1.42-1.42" /><path d="m16.24 16.24 1.42 1.42" /><path d="m6.34 6.34 1.42 1.42" /></svg>;
    case 'streak_freeze':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case 'daily_challenge_x2':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6" /><path d="M16 10a4 4 0 01-8 0" /><rect x="4" y="10" width="16" height="12" rx="2" /></svg>;
    default:
      return null;
  }
}

function getOrbSet(item: ShopItem): OrbColorSet {
  const id = colorIdForPreview(item);
  if (item.type === 'base_color')  return ORB_BASE_COLORS.find((c) => c.id === id) || ORB_BASE_COLORS[0];
  if (item.type === 'pulse_color') return ORB_PULSE_COLORS.find((c) => c.id === id) || ORB_PULSE_COLORS[0];
  return ORB_RING_COLORS.find((c) => c.id === id) || ORB_RING_COLORS[0];
}

function OrbSmallIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" opacity="0.25" /><circle cx="12" cy="12" r="5" /></svg>;
}
function WaveIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" /><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity="0.5" /></svg>;
}
function RingsIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(20 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-20 12 12)" opacity="0.6" /></svg>;
}
function ProfileIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0116 0v1" /></svg>;
}
function BoltIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function ShieldIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
