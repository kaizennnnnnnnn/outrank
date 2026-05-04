'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { ORB_BASE_COLORS, ORB_PULSE_COLORS, ORB_RING_COLORS, OrbColorSet } from '@/constants/orbColors';
import { PFP_FRAMES, NAME_EFFECTS, CosmeticRarity } from '@/constants/cosmetics';
import { OrbColorPreview } from '@/components/profile/OrbColorPreview';
import { SoulOrb } from '@/components/profile/SoulOrb';
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
// Calibrated so a typical active day (~125 fragments from daily-habits-done +
// chest + evolve) makes epic ~2 days, legendary ~5-7 days, and mythic ~12-16
// days of play. Prices pre-balance are 2-3× smaller; the user explicitly
// asked for mythics/legendaries to feel aspirational.
const BASE_PRICE: Record<Rarity, number>  = { common: 0,  rare: 80,  epic: 240, legendary: 625, mythic: 1500 };
const PULSE_PRICE: Record<Rarity, number> = { common: 0,  rare: 80,  epic: 220, legendary: 575, mythic: 1500 };
const RING_PRICE: Record<Rarity, number>  = { common: 0,  rare: 90,  epic: 260, legendary: 700, mythic: 1750 };
const FRAME_PRICE: Record<Rarity, number> = { common: 50, rare: 125, epic: 325, legendary: 825, mythic: 2000 };
const NAME_PRICE: Record<Rarity, number>  = { common: 0,  rare: 100, epic: 290, legendary: 775, mythic: 1800 };

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
  // grantOnly frames (e.g. frame_pact_holder, awarded for completing a
  // 30-day pact) are earned only — never purchasable from the shop.
  ...PFP_FRAMES.filter((f) => f.id !== 'frame_none' && !f.grantOnly).map<ShopItem>((f) => ({
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
  { id: 'boost_1h',  name: '1h Quick Boost', description: '2× XP for one hour', price: 45, type: 'power_boost_1h',  tab: 'boosts', rarity: 'common' },
  { id: 'boost_24h', name: '24h XP Boost',   description: '2× XP on every log for a full day', price: 180, type: 'power_boost_24h', tab: 'boosts', rarity: 'rare' },
  { id: 'daily_x2',  name: 'Daily Challenge ×2', description: 'Doubles the bonus XP on your next daily challenge', price: 75, type: 'daily_challenge_x2', tab: 'boosts', rarity: 'rare' },

  // ---- UTILITIES ----
  { id: 'freeze_1',       name: 'Streak Freeze',     description: 'Skip a day without losing your streak', price: 30, type: 'streak_freeze', tab: 'utilities', payload: 1, rarity: 'common' },
  { id: 'freeze_3',       name: '3× Streak Freezes', description: 'Three freezes at a bulk discount',       price: 75, type: 'streak_freeze', tab: 'utilities', payload: 3, rarity: 'rare' },
  { id: 'instant_evolve', name: 'Instant Evolution', description: 'Skip the grind — evolve your orb now',    price: 500, type: 'instant_evolve', tab: 'utilities', rarity: 'legendary' },
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
  const [confirm, setConfirm] = useState<ShopItem | null>(null);

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

  // Every card tap opens the preview modal. The modal itself decides
  // what action button to show (Equipped / Equip / Buy / Need X more)
  // based on owned + equipped + afford state. Previously the flow
  // short-circuited — equipping skipped the modal entirely and already-
  // equipped items were dead — so there was no way to actually preview
  // anything you already owned. That's what the user asked for.
  const handleBuy = (item: ShopItem) => {
    if (!user) return;
    setConfirm(item);
  };

  const performBuy = async (item: ShopItem) => {
    if (!user) return;
    const owned = isOwned(item);
    setConfirm(null);

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
    <div className="dir-b max-w-2xl mx-auto" style={{ color: 'var(--b-ink)' }}>
      {/* Editorial header */}
      <div style={{ paddingBottom: 12 }}>
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
          The Atelier
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, fontStyle: 'italic', margin: '2px 0 4px' }}
          >
            Cosmetics
          </h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <Link
              href="/inventory"
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                textDecoration: 'none',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              INVENTORY →
            </Link>
            <span
              className="font-mono tabular"
              style={{ fontSize: 14, color: 'var(--b-ink)', fontWeight: 700 }}
            >
              ◆ {fragments.toLocaleString()}
            </span>
          </div>
        </div>
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 4 }}
        >
          Spend fragments on cosmetics, boosts, and utilities.
        </p>
      </div>

      {/* Tabs — editorial: hairline-bracketed row, italic display labels */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          borderTop: '1px solid var(--b-ink)',
          borderBottom: '1px solid var(--b-rule)',
        }}
        className="no-scrollbar"
      >
        {TABS.map((t, i) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setRarityFilter(defaultRarityFor[t.id]);
              }}
              style={{
                flex: 1,
                minWidth: 90,
                padding: '10px 8px',
                borderLeft: i ? '1px solid var(--b-rule)' : 'none',
                background: 'transparent',
                border: 'none',
                borderTop: 'none',
                borderRight: 'none',
                borderLeftWidth: i ? 1 : 0,
                borderLeftStyle: 'solid',
                borderLeftColor: 'var(--b-rule)',
                borderBottom: active ? '2px solid var(--b-accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              <div
                className="font-display"
                style={{
                  fontSize: 13,
                  fontStyle: active ? 'italic' : 'normal',
                  fontWeight: 500,
                  color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Rarity filter chips */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '12px 0',
        }}
      >
        {(['all', 'mythic', 'legendary', 'epic', 'rare', 'common'] as const).map((r) => {
          const active = activeRarityFilter === r;
          const count = counts[r];
          if (count === 0 && r !== 'all') return null;
          const accent = r === 'all' ? null : rarityAccent[r];
          return (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className="font-body"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: '1px solid ' + (active
                  ? (accent ? accent.border : 'var(--b-ink)')
                  : 'var(--b-rule)'),
                background: active
                  ? (accent ? `${accent.border}1f` : 'var(--b-ink)')
                  : 'transparent',
                color: active
                  ? (accent ? accent.text : 'var(--b-paper)')
                  : 'var(--b-ink-60)',
                cursor: 'pointer',
              }}
            >
              <span>{r === 'all' ? 'All' : rarityLabels[r]}</span>
              <span
                className="font-mono tabular"
                style={{ fontSize: 9, opacity: 0.7 }}
              >
                {count}
              </span>
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

      <ItemPreviewModal
        item={confirm}
        fragments={fragments}
        owned={confirm ? isOwned(confirm) : false}
        equipped={confirm ? isEquipped(confirm) : false}
        currentBaseColorId={equippedBase}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && performBuy(confirm)}
      />
    </div>
  );
}

/**
 * Preview modal — opens on every card tap so the user can actually see
 * what they're buying/equipping. Shows a large, isolated preview of the
 * item (base color → full sphere, pulse → only the pulse wave,
 * ring → only the orbital rings, frame → framed avatar, name effect →
 * big nameplate). The primary button switches based on state:
 *   - already equipped        → just a disabled "Equipped" indicator
 *   - owned but not equipped  → "Equip"
 *   - can afford              → "Buy for X"  (+ cost ledger)
 *   - cannot afford           → "Need X more" (disabled)
 *   - free items (price 0)    → "Equip" directly
 */
function ItemPreviewModal({
  item, fragments, owned, equipped, currentBaseColorId, onClose, onConfirm,
}: {
  item: ShopItem | null;
  fragments: number;
  owned: boolean;
  equipped: boolean;
  /** User's currently-equipped base color. Used as the body under pulse
   *  previews so the pulse wave has an actual orb to travel through
   *  (matching what the user's real orb will look like after purchase). */
  currentBaseColorId: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!item) {
    return <Modal isOpen={false} onClose={onClose} title="" size="sm">{null}</Modal>;
  }
  const accent = rarityAccent[item.rarity];
  const canAfford = fragments >= item.price;
  const after = fragments - item.price;
  const isFree = item.price === 0;

  // Isolated, big preview per item type. We use the REAL SoulOrb canvas
  // for base / pulse / ring so the preview actually matches what the
  // user's orb will render as — not a separate CSS approximation. The
  // hideBody / hideRings / hidePulse props isolate just the layer the
  // user is shopping for:
  //   - base  : particles + glow visible, rings + pulse hidden
  //   - ring  : rings visible, body + pulse hidden
  //   - pulse : pulse waves visible, body + rings hidden
  // Tier is forced to 3 so rings are available to draw (previews run
  // at size > 100 so the "isSmall auto-hide rings" path doesn't fire).
  let preview: React.ReactNode;
  if (item.type === 'base_color') {
    preview = (
      <SoulOrb
        size={160}
        tier={3}
        intensity={100}
        interactive={false}
        hideLabel
        hideRings
        hidePulse
        baseColorId={colorIdForPreview(item)}
      />
    );
  } else if (item.type === 'pulse_color') {
    // Pulse = the wave of energy that travels THROUGH the orb. The preview
    // needs the actual orb body rendered so the wave has something to ride
    // through — an empty dark disc doesn't read as a pulse, just as a
    // generic ripple. We render the full orb (body + glow) using the user's
    // currently-equipped base color, then hide the rings so the pulse wave
    // is the dominant visual. Result: exactly what the user's orb will look
    // like with this pulse equipped.
    preview = (
      <SoulOrb
        size={160}
        tier={3}
        intensity={100}
        interactive={false}
        hideLabel
        hideRings
        baseColorId={currentBaseColorId}
        pulseColorId={colorIdForPreview(item)}
      />
    );
  } else if (item.type === 'ring_color') {
    preview = (
      <SoulOrb
        size={160}
        tier={3}
        intensity={100}
        interactive={false}
        hideLabel
        hideBody
        hidePulse
        ringColorId={colorIdForPreview(item)}
      />
    );
  } else if (item.type === 'frame') {
    preview = <FramedAvatar alt={item.name} size="xl" frameId={item.id} />;
  } else if (item.type === 'name_effect') {
    preview = (
      <div
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--b-rule)',
        }}
      >
        <NamePlate name="Example" effectId={item.id} size="xl" />
      </div>
    );
  } else {
    preview = (
      <div
        style={{
          width: 112,
          height: 112,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent.text,
          border: '1px solid var(--b-rule)',
          transform: 'scale(1.4)',
        }}
      >
        {iconFor(item.type)}
      </div>
    );
  }

  // Action button label + handler based on state
  let primaryLabel = '';
  let primaryDisabled = false;
  if (equipped) {
    primaryLabel = 'Equipped';
    primaryDisabled = true;
  } else if (owned) {
    primaryLabel = 'Equip';
  } else if (canAfford || isFree) {
    primaryLabel = isFree ? 'Equip' : `Buy for ${item.price}`;
  } else {
    primaryLabel = `Need ${item.price - fragments} more`;
    primaryDisabled = true;
  }

  return (
    <Modal isOpen={!!item} onClose={onClose} title="Preview" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Big preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            border: '1px solid var(--b-rule)',
            background: 'var(--b-paper-2, transparent)',
          }}
        >
          {preview}
        </div>

        {/* Title block */}
        <div>
          <div
            className="spread"
            style={{ fontSize: 9, color: accent.text, marginBottom: 4 }}
          >
            {rarityLabels[item.rarity]}
          </div>
          <div
            className="font-display"
            style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.1 }}
          >
            {item.name}
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, marginTop: 4 }}
          >
            {item.description}
          </p>
        </div>

        {/* Fragments ledger — purchase only */}
        {!owned && !isFree && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '10px 14px',
              border: '1px solid var(--b-ink)',
              borderTop: '2px solid var(--b-ink)',
              borderBottom: '2px solid var(--b-ink)',
            }}
          >
            <div>
              <div
                className="spread"
                style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
              >
                Cost
              </div>
              <div
                className="font-display tabular"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: 'var(--b-accent)', lineHeight: 1, marginTop: 2 }}
              >
                {item.price}
              </div>
            </div>
            <span
              className="font-mono"
              style={{ fontSize: 14, color: 'var(--b-ink-40)' }}
            >
              →
            </span>
            <div style={{ textAlign: 'right' }}>
              <div
                className="spread"
                style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
              >
                After
              </div>
              <div
                className="font-display tabular"
                style={{
                  fontSize: 22,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  lineHeight: 1,
                  marginTop: 2,
                  color: after < 0 ? '#ef4444' : 'var(--b-ink)',
                }}
              >
                {after}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1.5 }}
            disabled={primaryDisabled}
            onClick={onConfirm}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </Modal>
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
    <section style={{ marginTop: 18 }}>
      {showBanner ? (
        <div
          style={{
            paddingTop: 14,
            paddingBottom: 12,
            borderTop: `2px solid ${accent.border}`,
            borderBottom: '1px solid var(--b-rule)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              className="spread"
              style={{ fontSize: 9, color: accent.text }}
            >
              {rarityLabels[rarity]} tier
            </div>
            <div
              className="font-display"
              style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}
            >
              {rarityTagline(rarity)}
            </div>
          </div>
          <div
            className="font-mono tabular"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
          >
            § {String(items.length).padStart(2, '0')}
          </div>
        </div>
      ) : (
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 8,
            borderTop: '1px solid var(--b-ink)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500, color: accent.text }}
          >
            {rarityLabels[rarity]}
          </div>
          <div
            className="font-mono tabular"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
          >
            § {String(items.length).padStart(2, '0')}
          </div>
        </div>
      )}

      <div
        className={cn(
          'grid gap-3',
          tab === 'base' || tab === 'pulse' || tab === 'rings' || tab === 'account'
            ? 'grid-cols-2 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
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

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--b-rule)',
    borderLeft: `3px solid ${accent.border}`,
    background: 'transparent',
    opacity: !canAfford && !owned && !isFree ? 0.7 : 1,
    contain: 'layout style paint',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onBuy(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBuy(item);
        }
      }}
      style={{
        ...cardStyle,
        padding: 12,
        cursor: 'pointer',
        position: 'relative',
        outline: 'none',
      }}
    >
      {/* Rarity tag + state pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          className="spread"
          style={{ fontSize: 8, color: accent.text }}
        >
          {rarityLabels[item.rarity]}
        </span>
        {equipped ? (
          <span
            className="spread"
            style={{ fontSize: 8, color: 'var(--b-accent)' }}
          >
            Equipped
          </span>
        ) : owned ? (
          <span
            className="spread"
            style={{ fontSize: 8, color: '#34d399' }}
          >
            Owned
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {item.type === 'base_color' || item.type === 'pulse_color' || item.type === 'ring_color' ? (
          <OrbColorPreview
            colorSet={getOrbSet(item)}
            variant={
              item.type === 'ring_color'
                ? 'ring'
                : item.type === 'pulse_color'
                  ? 'pulse'
                  : 'orb'
            }
            id={colorIdForPreview(item)}
            size={42}
            rarity={item.rarity}
          />
        ) : item.type === 'frame' ? (
          <div style={{ flexShrink: 0 }}>
            <FramedAvatar alt={item.name} size="sm" frameId={item.id} />
          </div>
        ) : item.type === 'name_effect' ? (
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--b-rule)',
            }}
          >
            <NamePlate name="Aa" effectId={item.id} size="lg" />
          </div>
        ) : (
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accent.text,
              border: '1px solid var(--b-rule)',
            }}
          >
            {iconFor(item.type)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-display"
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </div>
          <p
            className="font-body"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              lineHeight: 1.35,
              marginTop: 2,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.description}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        variant={primary ? 'primary' : 'secondary'}
        disabled={disabled}
        loading={buying === item.id}
        onClick={(e) => {
          e.stopPropagation();
          onBuy(item);
        }}
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
