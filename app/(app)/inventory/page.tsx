'use client';

import { useAuth } from '@/hooks/useAuth';
import { ORB_BASE_COLORS, ORB_PULSE_COLORS, OrbColorSet } from '@/constants/orbColors';
import { XPBoostBadge, isXPBoostActive } from '@/components/profile/XPBoostBadge';
import { updateDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function InventoryPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  if (!user) return null;

  const userData = user as unknown as Record<string, unknown>;
  const ownedColors: string[] = (userData.ownedColors as string[]) || ['crimson', 'fire'];
  const fragments: number = (userData.fragments as number) || 0;
  const streakFreezes: number = user.streakFreezeTokens || 0;
  const xpBoostAt = userData.xpBoostActivatedAt;
  const boostActive = isXPBoostActive(xpBoostAt as never);
  const equippedBase: string = (userData.orbBaseColor as string) || 'crimson';
  const equippedPulse: string = (userData.orbPulseColor as string) || 'fire';

  const ownedBaseColors = ORB_BASE_COLORS.filter((c) => ownedColors.includes(c.id));
  const ownedPulseColors = ORB_PULSE_COLORS.filter((c) => ownedColors.includes(c.id));

  const equipBase = async (id: string) => {
    try {
      await updateDocument('users', user.uid, { orbBaseColor: id });
      addToast({ type: 'success', message: 'Base color equipped' });
    } catch {
      addToast({ type: 'error', message: 'Failed to equip' });
    }
  };
  const equipPulse = async (id: string) => {
    try {
      await updateDocument('users', user.uid, { orbPulseColor: id });
      addToast({ type: 'success', message: 'Pulse color equipped' });
    } catch {
      addToast({ type: 'error', message: 'Failed to equip' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <StatPill
          label="Fragments"
          value={fragments.toLocaleString()}
          color="#f97316"
          icon={<FragmentIcon />}
        />
        <StatPill
          label="Streak Freezes"
          value={streakFreezes.toString()}
          color="#06b6d4"
          icon={<ShieldIcon />}
        />
        <StatPill
          label="XP Boost"
          value={boostActive ? 'Active' : 'Idle'}
          color={boostActive ? '#fb923c' : '#475569'}
          icon={<BoltIcon />}
          extra={boostActive ? <XPBoostBadge activatedAt={xpBoostAt as never} size="sm" /> : null}
        />
        <StatPill
          label="Orb Tier"
          value={String((userData.orbTier as number) || 1)}
          color="#a855f7"
          icon={<OrbIcon />}
        />
      </section>

      {/* Base Colors */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Base Colors <span className="text-slate-600">({ownedBaseColors.length})</span>
          </h2>
        </div>
        {ownedBaseColors.length === 0 ? (
          <EmptyMsg msg="No base colors yet. Visit the shop." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ownedBaseColors.map((c) => (
              <ColorCard
                key={c.id}
                color={c}
                equipped={equippedBase === c.id}
                onEquip={() => equipBase(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pulse Colors */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Pulse Colors <span className="text-slate-600">({ownedPulseColors.length})</span>
        </h2>
        {ownedPulseColors.length === 0 ? (
          <EmptyMsg msg="No pulse colors yet. Visit the shop." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ownedPulseColors.map((c) => (
              <ColorCard
                key={c.id}
                color={c}
                equipped={equippedPulse === c.id}
                onEquip={() => equipPulse(c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
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

function ColorCard({
  color, equipped, onEquip,
}: {
  color: OrbColorSet; equipped: boolean; onEquip: () => void;
}) {
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      className={cn(
        'group relative overflow-hidden rounded-xl p-3 text-left transition-all',
        equipped
          ? 'border-orange-500/50 bg-orange-500/5 cursor-default'
          : 'border-[#1e1e30] bg-[#0b0b14] hover:border-orange-500/30'
      )}
      style={{ border: equipped ? undefined : `1px solid ${color.mid}1a` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex-shrink-0"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${color.core}cc, ${color.inner}aa 45%, ${color.mid}88 70%, ${color.outer}44)`,
            boxShadow: `0 0 18px -2px ${color.mid}80, inset 0 -4px 8px ${color.outer}80`,
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{color.name}</p>
          <p className="text-[10px] text-slate-500">
            {equipped ? 'Currently equipped' : 'Tap to equip'}
          </p>
        </div>
      </div>
      {equipped && (
        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded">
          Equipped
        </span>
      )}
    </button>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#1e1e30] bg-[#0b0b14] p-6 text-center">
      <p className="text-xs text-slate-500">{msg}</p>
    </div>
  );
}

function FragmentIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function OrbIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
