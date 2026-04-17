'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'base_color' | 'pulse_color' | 'power_boost' | 'instant_evolve' | 'streak_freeze';
  colorValue?: string; // hex for preview
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const SHOP_ITEMS: ShopItem[] = [
  // Base Colors
  { id: 'color_crimson', name: 'Crimson Orb', description: 'Deep red base color', price: 0, type: 'base_color', colorValue: '#dc2626', rarity: 'common' },
  { id: 'color_ocean', name: 'Ocean Orb', description: 'Electric blue base color', price: 50, type: 'base_color', colorValue: '#2563eb', rarity: 'rare' },
  { id: 'color_emerald', name: 'Emerald Orb', description: 'Vibrant green base color', price: 50, type: 'base_color', colorValue: '#10b981', rarity: 'rare' },
  { id: 'color_violet', name: 'Violet Orb', description: 'Royal purple base color', price: 75, type: 'base_color', colorValue: '#7c3aed', rarity: 'epic' },
  { id: 'color_gold', name: 'Gold Orb', description: 'Prestigious gold base color', price: 100, type: 'base_color', colorValue: '#d97706', rarity: 'epic' },

  // Pulse Colors
  { id: 'pulse_fire', name: 'Fire Pulse', description: 'Orange fire wave', price: 0, type: 'pulse_color', colorValue: '#f97316', rarity: 'common' },
  { id: 'pulse_ice', name: 'Ice Pulse', description: 'Cyan ice wave', price: 40, type: 'pulse_color', colorValue: '#06b6d4', rarity: 'rare' },
  { id: 'pulse_lightning', name: 'Lightning Pulse', description: 'Yellow electric wave', price: 40, type: 'pulse_color', colorValue: '#eab308', rarity: 'rare' },
  { id: 'pulse_shadow', name: 'Shadow Pulse', description: 'Dark mysterious wave', price: 60, type: 'pulse_color', colorValue: '#78716c', rarity: 'epic' },
  { id: 'pulse_plasma', name: 'Plasma Pulse', description: 'Pink energy wave', price: 80, type: 'pulse_color', colorValue: '#d946ef', rarity: 'epic' },

  // Special Items
  { id: 'instant_evolve', name: 'Instant Evolution', description: 'Instantly evolve your orb to the next tier', price: 200, type: 'instant_evolve', rarity: 'legendary' },
  { id: 'streak_freeze_3', name: '3 Streak Freezes', description: 'Protect your streaks for 3 days', price: 30, type: 'streak_freeze', rarity: 'common' },
  { id: 'power_boost_24h', name: '24h XP Boost', description: 'Double XP for 24 hours', price: 75, type: 'power_boost', rarity: 'rare' },
];

const rarityColors: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export default function ShopPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [buying, setBuying] = useState<string | null>(null);

  const fragments = user ? ((user as unknown as Record<string, number>).fragments || 0) : 0;
  const userData = user as unknown as Record<string, unknown> | undefined;
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

    // Already equipped color — do nothing
    if (equipped) return;

    // Owned but not equipped — just equip without charging
    if (owned && (item.type === 'base_color' || item.type === 'pulse_color')) {
      setBuying(item.id);
      try {
        if (item.type === 'base_color') {
          const colorId = item.id.replace('color_', '');
          await updateDocument('users', user.uid, { orbBaseColor: colorId });
          addToast({ type: 'success', message: `Equipped ${item.name}!` });
        } else {
          const colorId = item.id.replace('pulse_', '');
          await updateDocument('users', user.uid, { orbPulseColor: colorId });
          addToast({ type: 'success', message: `Equipped ${item.name}!` });
        }
      } catch {
        addToast({ type: 'error', message: 'Failed to equip' });
      } finally {
        setBuying(null);
      }
      return;
    }

    if (fragments < item.price) {
      addToast({ type: 'error', message: 'Not enough fragments!' });
      return;
    }

    setBuying(item.id);
    try {
      if (item.price > 0) {
        await updateDocument('users', user.uid, { fragments: increment(-item.price) });
      }

      if (item.type === 'base_color') {
        const colorId = item.id.replace('color_', '');
        await updateDocument('users', user.uid, {
          orbBaseColor: colorId,
          ownedColors: arrayUnion(colorId),
        });
        addToast({ type: 'success', message: `Purchased & equipped ${item.name}!` });
      } else if (item.type === 'pulse_color') {
        const colorId = item.id.replace('pulse_', '');
        await updateDocument('users', user.uid, {
          orbPulseColor: colorId,
          ownedColors: arrayUnion(colorId),
        });
        addToast({ type: 'success', message: `Purchased & equipped ${item.name}!` });
      } else if (item.type === 'instant_evolve') {
        const currentTier = (user as unknown as Record<string, number>).orbTier || 1;
        if (currentTier >= 5) {
          addToast({ type: 'error', message: 'Already at max tier!' });
          return;
        }
        await updateDocument('users', user.uid, { orbTier: currentTier + 1 });
        addToast({ type: 'success', message: 'Orb evolved!' });
      } else if (item.type === 'streak_freeze') {
        await updateDocument('users', user.uid, { streakFreezeTokens: increment(3) });
        addToast({ type: 'success', message: '+3 Streak Freezes!' });
      } else if (item.type === 'power_boost') {
        addToast({ type: 'success', message: '24h XP Boost activated!' });
      }
    } catch {
      addToast({ type: 'error', message: 'Purchase failed' });
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Shop</h1>
          <p className="text-sm text-slate-500">Spend fragments on orb upgrades and power-ups.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
          <span className="font-mono text-sm font-bold text-orange-400">{fragments}</span>
        </div>
      </div>

      {/* Base Colors */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Orb Base Colors</h2>
        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.filter(i => i.type === 'base_color').map((item) => (
            <ShopCard key={item.id} item={item} fragments={fragments} buying={buying} onBuy={handleBuy} owned={isOwned(item)} equipped={isEquipped(item)} />
          ))}
        </div>
      </section>

      {/* Pulse Colors */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pulse Wave Colors</h2>
        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.filter(i => i.type === 'pulse_color').map((item) => (
            <ShopCard key={item.id} item={item} fragments={fragments} buying={buying} onBuy={handleBuy} owned={isOwned(item)} equipped={isEquipped(item)} />
          ))}
        </div>
      </section>

      {/* Special Items */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Special Items</h2>
        <div className="space-y-3">
          {SHOP_ITEMS.filter(i => !['base_color', 'pulse_color'].includes(i.type)).map((item) => (
            <ShopCard key={item.id} item={item} fragments={fragments} buying={buying} onBuy={handleBuy} owned={false} equipped={false} wide />
          ))}
        </div>
      </section>
    </div>
  );
}

function ShopCard({ item, fragments, buying, onBuy, owned, equipped, wide }: {
  item: ShopItem; fragments: number; buying: string | null; onBuy: (item: ShopItem) => void; owned: boolean; equipped: boolean; wide?: boolean;
}) {
  const canAfford = fragments >= item.price;
  const isFree = item.price === 0;
  const rarityColor = rarityColors[item.rarity];

  let buttonLabel: string;
  let buttonVariant: 'primary' | 'secondary' = 'primary';
  let buttonDisabled = buying === item.id;
  if (equipped) {
    buttonLabel = 'Equipped';
    buttonVariant = 'secondary';
    buttonDisabled = true;
  } else if (owned) {
    buttonLabel = 'Equip (Owned)';
    buttonVariant = 'primary';
  } else if (isFree) {
    buttonLabel = 'Equip (Free)';
  } else if (!canAfford) {
    buttonLabel = `${item.price} Fragments`;
    buttonVariant = 'secondary';
    buttonDisabled = true;
  } else {
    buttonLabel = `${item.price} Fragments`;
  }

  return (
    <div className={cn(
      'glass-card rounded-xl p-3 space-y-2 border transition-all relative',
      equipped ? 'border-orange-500/40' : canAfford || owned ? 'border-[#1e1e30] hover:border-orange-500/20' : 'border-[#1e1e30] opacity-50',
      wide && 'col-span-2'
    )}>
      {equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
          Equipped
        </span>
      )}
      {owned && !equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          Owned
        </span>
      )}
      <div className="flex items-center gap-3">
        {item.colorValue && (
          <div className="w-8 h-8 rounded-lg" style={{
            background: `radial-gradient(circle, ${item.colorValue}80, ${item.colorValue}30)`,
            boxShadow: `0 0 10px ${item.colorValue}20`,
          }} />
        )}
        {!item.colorValue && (
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{item.name}</p>
          <p className="text-[10px] text-slate-500">{item.description}</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: rarityColor }}>
            {item.rarity}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        variant={buttonVariant}
        disabled={buttonDisabled}
        loading={buying === item.id}
        onClick={() => onBuy(item)}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
