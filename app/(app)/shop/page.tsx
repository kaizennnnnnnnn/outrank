'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { ORB_BASE_COLORS, ORB_PULSE_COLORS, OrbColorSet } from '@/constants/orbColors';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type Tab = 'colors' | 'boosts' | 'utilities';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type:
    | 'base_color'
    | 'pulse_color'
    | 'power_boost_1h'
    | 'power_boost_24h'
    | 'power_boost_7d'
    | 'instant_evolve'
    | 'streak_freeze'      // grants N freezes (payload)
    | 'daily_challenge_x2' // next daily challenge awards 2x bonus XP
    | 'streak_shield_week'; // 7 freezes bundle
  tab: Tab;
  colorValue?: string;
  rarity: Rarity;
  payload?: number;
}

const SHOP_ITEMS: ShopItem[] = [
  // ---- COLORS: BASE ----
  { id: 'color_crimson', name: 'Crimson', description: 'Deep red base', price: 0, type: 'base_color', tab: 'colors', colorValue: '#dc2626', rarity: 'common' },
  { id: 'color_ocean', name: 'Ocean', description: 'Electric blue', price: 50, type: 'base_color', tab: 'colors', colorValue: '#2563eb', rarity: 'rare' },
  { id: 'color_emerald', name: 'Emerald', description: 'Vibrant green', price: 50, type: 'base_color', tab: 'colors', colorValue: '#10b981', rarity: 'rare' },
  { id: 'color_violet', name: 'Violet', description: 'Royal purple', price: 75, type: 'base_color', tab: 'colors', colorValue: '#7c3aed', rarity: 'epic' },
  { id: 'color_gold', name: 'Gold', description: 'Prestige gold', price: 100, type: 'base_color', tab: 'colors', colorValue: '#d97706', rarity: 'epic' },
  { id: 'color_obsidian', name: 'Obsidian', description: 'Black with violet veins', price: 150, type: 'base_color', tab: 'colors', colorValue: '#a78bfa', rarity: 'epic' },
  { id: 'color_phoenix', name: 'Phoenix', description: 'Molten red-to-gold', price: 175, type: 'base_color', tab: 'colors', colorValue: '#f59e0b', rarity: 'legendary' },
  { id: 'color_aurora', name: 'Aurora', description: 'Green and violet lights', price: 225, type: 'base_color', tab: 'colors', colorValue: '#10b981', rarity: 'legendary' },
  { id: 'color_nebula', name: 'Nebula', description: 'Purple-pink cosmic dust', price: 250, type: 'base_color', tab: 'colors', colorValue: '#ec4899', rarity: 'legendary' },
  { id: 'color_prismatic', name: 'Prismatic', description: 'Full spectrum — pinnacle flex', price: 400, type: 'base_color', tab: 'colors', colorValue: '#a855f7', rarity: 'legendary' },

  // ---- COLORS: PULSE ----
  { id: 'pulse_fire', name: 'Fire Pulse', description: 'Orange fire wave', price: 0, type: 'pulse_color', tab: 'colors', colorValue: '#f97316', rarity: 'common' },
  { id: 'pulse_ice', name: 'Ice Pulse', description: 'Cyan ice wave', price: 40, type: 'pulse_color', tab: 'colors', colorValue: '#06b6d4', rarity: 'rare' },
  { id: 'pulse_lightning', name: 'Lightning Pulse', description: 'Yellow electric wave', price: 40, type: 'pulse_color', tab: 'colors', colorValue: '#eab308', rarity: 'rare' },
  { id: 'pulse_shadow', name: 'Shadow Pulse', description: 'Dark mysterious wave', price: 60, type: 'pulse_color', tab: 'colors', colorValue: '#78716c', rarity: 'epic' },
  { id: 'pulse_plasma', name: 'Plasma Pulse', description: 'Pink energy wave', price: 80, type: 'pulse_color', tab: 'colors', colorValue: '#d946ef', rarity: 'epic' },
  { id: 'pulse_solar', name: 'Solar Pulse', description: 'Yellow-white corona', price: 120, type: 'pulse_color', tab: 'colors', colorValue: '#fde047', rarity: 'legendary' },
  { id: 'pulse_cosmic', name: 'Cosmic Pulse', description: 'Blue to pink gradient', price: 130, type: 'pulse_color', tab: 'colors', colorValue: '#4f46e5', rarity: 'legendary' },
  { id: 'pulse_mystic', name: 'Mystic Pulse', description: 'Emerald with violet threads', price: 140, type: 'pulse_color', tab: 'colors', colorValue: '#059669', rarity: 'legendary' },
  { id: 'pulse_inferno', name: 'Inferno Pulse', description: 'Lava-hot orange-red', price: 150, type: 'pulse_color', tab: 'colors', colorValue: '#b91c1c', rarity: 'legendary' },
  { id: 'pulse_void', name: 'Void Pulse', description: 'Black hole collapse', price: 180, type: 'pulse_color', tab: 'colors', colorValue: '#7e22ce', rarity: 'legendary' },

  // ---- BOOSTS ----
  { id: 'boost_1h', name: '1h Quick Boost', description: '2× XP for one hour — try before you commit', price: 20, type: 'power_boost_1h', tab: 'boosts', rarity: 'common' },
  { id: 'boost_24h', name: '24h XP Boost', description: '2× XP on every log for a full day', price: 75, type: 'power_boost_24h', tab: 'boosts', rarity: 'rare' },
  { id: 'boost_7d', name: '7-Day Power Surge', description: '2× XP all week. Domination mode', price: 400, type: 'power_boost_7d', tab: 'boosts', rarity: 'legendary' },
  { id: 'daily_x2', name: 'Daily Challenge ×2', description: 'Doubles the bonus XP on your next daily challenge', price: 35, type: 'daily_challenge_x2', tab: 'boosts', rarity: 'rare' },

  // ---- UTILITIES ----
  { id: 'freeze_1', name: 'Streak Freeze', description: 'Skip a day without losing your streak. Once', price: 15, type: 'streak_freeze', tab: 'utilities', payload: 1, rarity: 'common' },
  { id: 'freeze_3', name: '3× Streak Freezes', description: 'Three freezes at a bulk discount', price: 35, type: 'streak_freeze', tab: 'utilities', payload: 3, rarity: 'common' },
  { id: 'freeze_7', name: 'Week Shield', description: 'Seven freezes — keep any streak alive for a week', price: 70, type: 'streak_shield_week', tab: 'utilities', payload: 7, rarity: 'epic' },
  { id: 'instant_evolve', name: 'Instant Evolution', description: 'Skip the grind — evolve your orb now', price: 200, type: 'instant_evolve', tab: 'utilities', rarity: 'legendary' },
];

// Lower index = less rare; we sort desc so legendary appears first within tab
const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

const rarityAccent: Record<Rarity, { border: string; glow: string; text: string }> = {
  common:    { border: '#475569',  glow: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  rare:      { border: '#3b82f6',  glow: 'rgba(59,130,246,0.18)',  text: '#60a5fa' },
  epic:      { border: '#a855f7',  glow: 'rgba(168,85,247,0.22)',  text: '#c084fc' },
  legendary: { border: '#f59e0b',  glow: 'rgba(245,158,11,0.28)',  text: '#fbbf24' },
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'colors',    label: 'Cosmetics', icon: <PaintIcon /> },
  { id: 'boosts',    label: 'Boosts',    icon: <BoltIcon /> },
  { id: 'utilities', label: 'Utilities', icon: <ShieldIcon /> },
];

export default function ShopPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [buying, setBuying] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('colors');

  const userData = user as unknown as Record<string, unknown> | undefined;
  const fragments = (userData?.fragments as number) || 0;
  const ownedColors = (userData?.ownedColors as string[]) || ['crimson', 'fire'];
  const equippedBase = (userData?.orbBaseColor as string) || 'crimson';
  const equippedPulse = (userData?.orbPulseColor as string) || 'fire';

  const isOwned = (item: ShopItem) => {
    if (item.type === 'base_color') return ownedColors.includes(item.id.replace('color_', ''));
    if (item.type === 'pulse_color') return ownedColors.includes(item.id.replace('pulse_', ''));
    return false;
  };
  const isEquipped = (item: ShopItem) => {
    if (item.type === 'base_color') return equippedBase === item.id.replace('color_', '');
    if (item.type === 'pulse_color') return equippedPulse === item.id.replace('pulse_', '');
    return false;
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    const owned = isOwned(item);
    const equipped = isEquipped(item);
    if (equipped) return;

    // Colors you already own — equip for free
    if (owned && (item.type === 'base_color' || item.type === 'pulse_color')) {
      setBuying(item.id);
      try {
        if (item.type === 'base_color') {
          await updateDocument('users', user.uid, { orbBaseColor: item.id.replace('color_', '') });
        } else {
          await updateDocument('users', user.uid, { orbPulseColor: item.id.replace('pulse_', '') });
        }
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
        case 'base_color': {
          const colorId = item.id.replace('color_', '');
          await updateDocument('users', user.uid, { orbBaseColor: colorId, ownedColors: arrayUnion(colorId) });
          addToast({ type: 'success', message: `Purchased ${item.name}` });
          break;
        }
        case 'pulse_color': {
          const colorId = item.id.replace('pulse_', '');
          await updateDocument('users', user.uid, { orbPulseColor: colorId, ownedColors: arrayUnion(colorId) });
          addToast({ type: 'success', message: `Purchased ${item.name}` });
          break;
        }
        case 'power_boost_1h':
        case 'power_boost_24h':
        case 'power_boost_7d': {
          // Store activation time; logHabit checks the 24h window for now — we stash
          // the variant so future logic can respect 1h / 7d.
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
        case 'streak_freeze':
        case 'streak_shield_week': {
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

  // Filter by tab, then sort by rarity desc, then by price asc
  const visible = useMemo(() => {
    return SHOP_ITEMS.filter((i) => i.tab === tab)
      .sort((a, b) => {
        const r = rarityRank[b.rarity] - rarityRank[a.rarity];
        if (r !== 0) return r;
        return a.price - b.price;
      });
  }, [tab]);

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
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
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

      {/* Group by rarity so "Legendary" items show together at the top */}
      <RarityGroup
        title="Legendary"
        items={visible.filter((i) => i.rarity === 'legendary')}
        tab={tab}
        fragments={fragments}
        buying={buying}
        onBuy={handleBuy}
        isOwned={isOwned}
        isEquipped={isEquipped}
      />
      <RarityGroup
        title="Epic"
        items={visible.filter((i) => i.rarity === 'epic')}
        tab={tab}
        fragments={fragments}
        buying={buying}
        onBuy={handleBuy}
        isOwned={isOwned}
        isEquipped={isEquipped}
      />
      <RarityGroup
        title="Rare"
        items={visible.filter((i) => i.rarity === 'rare')}
        tab={tab}
        fragments={fragments}
        buying={buying}
        onBuy={handleBuy}
        isOwned={isOwned}
        isEquipped={isEquipped}
      />
      <RarityGroup
        title="Common"
        items={visible.filter((i) => i.rarity === 'common')}
        tab={tab}
        fragments={fragments}
        buying={buying}
        onBuy={handleBuy}
        isOwned={isOwned}
        isEquipped={isEquipped}
      />
    </div>
  );
}

function RarityGroup({
  title, items, tab, fragments, buying, onBuy, isOwned, isEquipped,
}: {
  title: string;
  items: ShopItem[];
  tab: Tab;
  fragments: number;
  buying: string | null;
  onBuy: (item: ShopItem) => void;
  isOwned: (item: ShopItem) => boolean;
  isEquipped: (item: ShopItem) => boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">{title}</h2>
      <div className={cn(
        'grid gap-3',
        tab === 'colors' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2',
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
    label = 'Equip (owned)';
  } else if (isFree) {
    label = 'Equip (free)';
  } else if (!canAfford) {
    label = `${item.price} frags`;
    primary = false;
    disabled = true;
  } else {
    label = `Buy for ${item.price}`;
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 transition-all"
      style={{
        background: `linear-gradient(145deg, ${accent.glow}, #10101a 55%, #0b0b14 100%)`,
        border: `1px solid ${equipped ? '#f97316aa' : `${accent.border}40`}`,
        boxShadow: item.rarity === 'legendary' ? `0 0 20px -6px ${accent.glow}` : undefined,
        opacity: !canAfford && !owned && !isFree ? 0.7 : 1,
      }}
    >
      {equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded">
          Equipped
        </span>
      )}
      {owned && !equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
          Owned
        </span>
      )}

      <div className="flex items-center gap-3 mb-3">
        {item.type === 'base_color' || item.type === 'pulse_color' ? (
          <OrbPreview colorSet={getOrbSet(item)} />
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
        className="w-full"
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

function iconFor(type: ShopItem['type']) {
  const c = 'currentColor';
  switch (type) {
    case 'power_boost_1h':
    case 'power_boost_24h':
    case 'power_boost_7d':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill={c}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case 'instant_evolve':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6" /><path d="M12 22v-6" /><circle cx="12" cy="12" r="4" /><path d="m16.24 7.76 1.42-1.42" /><path d="m6.34 17.66 1.42-1.42" /><path d="m16.24 16.24 1.42 1.42" /><path d="m6.34 6.34 1.42 1.42" /></svg>;
    case 'streak_freeze':
    case 'streak_shield_week':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case 'daily_challenge_x2':
      return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6" /><path d="M16 10a4 4 0 01-8 0" /><rect x="4" y="10" width="16" height="12" rx="2" /></svg>;
    default:
      return null;
  }
}

function getOrbSet(item: ShopItem): OrbColorSet {
  if (item.type === 'base_color') {
    const id = item.id.replace('color_', '');
    return ORB_BASE_COLORS.find((c) => c.id === id) || ORB_BASE_COLORS[0];
  }
  const id = item.id.replace('pulse_', '');
  return ORB_PULSE_COLORS.find((c) => c.id === id) || ORB_PULSE_COLORS[0];
}

function OrbPreview({ colorSet }: { colorSet: OrbColorSet }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex-shrink-0"
      style={{
        background: `radial-gradient(circle at 35% 30%, ${colorSet.core}cc, ${colorSet.inner}aa 45%, ${colorSet.mid}88 70%, ${colorSet.outer}44)`,
        boxShadow: `0 0 18px -2px ${colorSet.mid}80, inset 0 -4px 8px ${colorSet.outer}80`,
      }}
    />
  );
}

function PaintIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.946.746-1.688 1.688-1.688h1.998c3.042 0 5.541-2.499 5.541-5.542C22 6.305 17.5 2 12 2z" /></svg>;
}
function BoltIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function ShieldIcon() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
