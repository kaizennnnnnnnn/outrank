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
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

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

const rarityToneByLevel: Record<Rarity, string> = {
  common:    'var(--b-ink-60)',
  rare:      '#60a5fa',
  epic:      '#c084fc',
  legendary: '#fbbf24',
  mythic:    '#f472b6',
};
const rarityLabelByLevel: Record<Rarity, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
};

const rarityRank: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

type SortMode = 'rarity' | 'name';
type FilterType = 'all' | 'base' | 'pulse' | 'ring' | 'frame' | 'name';

export default function InventoryPage() {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  const [sort, setSort] = useState<SortMode>('rarity');
  const [filter, setFilter] = useState<FilterType>('all');

  const userData = (user || {}) as unknown as Record<string, unknown>;
  const ownedColors: string[] = (userData.ownedColors as string[]) || ['crimson', 'fire', 'ring_default'];
  const ownedCosmetics: string[] = (userData.ownedCosmetics as string[]) || [];
  const fragments: number = (userData.fragments as number) || 0;
  const streakFreezes: number = user?.streakFreezeTokens || 0;
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

  if (!user) return null;

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

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'base', label: 'Base' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'ring', label: 'Ring' },
    { value: 'frame', label: 'Frames' },
    { value: 'name', label: 'Names' },
  ];

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Wardrobe" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            The Wardrobe
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Inventory</em>
            </h1>
            <Link
              href="/shop"
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-accent)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open shop →
            </Link>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            Everything you own — equip with one tap.
          </p>

          {/* Stat strip */}
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <StatCell label="Fragments" value={fragments.toLocaleString()} accent="#f97316" />
            <StatCell label="Freezes" value={String(streakFreezes)} accent="#06b6d4" border />
            <StatCell label="XP Boost" value={boostActive ? 'Active' : 'Idle'} accent={boostActive ? '#fb923c' : 'var(--b-ink-60)'} extra={boostActive ? <XPBoostBadge activatedAt={xpBoostAt as never} size="sm" /> : null} border />
            <StatCell label="Orb Tier" value={String((userData.orbTier as number) || 1)} accent="#a855f7" border />
          </div>

          {/* Filter + sort */}
          <div style={{ marginTop: 18 }}>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
            >
              Show
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.map((f) => (
                <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
              ))}
            </div>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 12, marginBottom: 6 }}
            >
              Sort
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <FilterChip label="Rarity" active={sort === 'rarity'} onClick={() => setSort('rarity')} />
              <FilterChip label="Name" active={sort === 'name'} onClick={() => setSort('name')} />
            </div>
          </div>

          {/* Sections */}
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

          {showFrames && (
            <Section title="Profile Frames" count={ownedFrames.length}>
              {ownedFrames.length === 0 ? (
                <Empty>No frames yet. Unlock them from shop, battle pass, or ascend your orb.</Empty>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
            </Section>
          )}

          {showNames && (
            <Section title="Name Effects" count={ownedNames.length}>
              {ownedNames.length === 0 ? (
                <Empty>No name effects yet. Earn them from shop, battle pass, or ascend.</Empty>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
            </Section>
          )}
        </div>
      </div>
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

function sortColors(list: OrbColorSet[], mode: SortMode): OrbColorSet[] {
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

function StatCell({
  label, value, accent, extra, border,
}: { label: string; value: string; accent: string; extra?: React.ReactNode; border?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 0',
        textAlign: 'center',
        borderLeft: border ? '1px solid var(--b-rule)' : 'none',
      }}
    >
      <div
        className="font-display tabular"
        style={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: accent }}
      >
        {value}
      </div>
      <div
        className="font-body"
        style={{ fontSize: 8, color: 'var(--b-ink-60)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.14em' }}
      >
        {label}
      </div>
      {extra && <div style={{ marginTop: 4 }}>{extra}</div>}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-body"
      style={{
        padding: '5px 10px',
        background: active ? 'var(--b-ink)' : 'transparent',
        color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
        border: '1px solid var(--b-ink)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
          {title}
        </div>
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
        >
          § {String(count).padStart(2, '0')}
        </div>
      </div>
      {children}
    </section>
  );
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
    <Section title={title} count={count}>
      {colors.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
    </Section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '18px 14px',
        textAlign: 'center',
        border: '1px dashed var(--b-rule)',
      }}
    >
      <p
        className="font-body"
        style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
      >
        {children}
      </p>
    </div>
  );
}

function rarityChip(rarity: Rarity) {
  return (
    <span
      className="spread"
      style={{
        fontSize: 8,
        color: rarityToneByLevel[rarity],
        padding: '1px 5px',
        border: `1px solid ${rarityToneByLevel[rarity]}80`,
      }}
    >
      {rarityLabelByLevel[rarity]}
    </span>
  );
}

function equippedChip() {
  return (
    <span
      className="spread"
      style={{
        fontSize: 8,
        color: 'var(--b-accent)',
        padding: '1px 5px',
        border: '1px solid var(--b-accent)',
      }}
    >
      Equipped
    </span>
  );
}

function ColorCard({
  color, variant, equipped, onEquip,
}: {
  color: OrbColorSet; variant: 'orb' | 'ring'; equipped: boolean; onEquip: () => void;
}) {
  const rarity = RARITY_BY_ID[color.id] || 'common';
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px',
        background: 'transparent',
        border: equipped ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
        cursor: equipped ? 'default' : 'pointer',
        textAlign: 'left',
        color: 'var(--b-ink)',
      }}
    >
      <OrbColorPreview colorSet={color} variant={variant} id={color.id} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display"
          style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {color.name}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {rarityChip(rarity)}
          {equipped && equippedChip()}
        </div>
      </div>
    </button>
  );
}

function FrameCard({
  id, name, avatarUrl, alt, equipped, onEquip,
}: {
  id: string; name: string; avatarUrl?: string; alt: string; equipped: boolean; onEquip: () => void;
}) {
  const rarity = RARITY_BY_ID[id] || 'common';
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px',
        background: 'transparent',
        border: equipped ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
        cursor: equipped ? 'default' : 'pointer',
        textAlign: 'left',
        color: 'var(--b-ink)',
      }}
    >
      <FramedAvatar src={avatarUrl} alt={alt} size="sm" frameId={id} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="font-display"
          style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {rarityChip(rarity)}
          {equipped && equippedChip()}
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
  return (
    <button
      onClick={onEquip}
      disabled={equipped}
      style={{
        padding: '10px',
        background: 'transparent',
        border: equipped ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
        cursor: equipped ? 'default' : 'pointer',
        textAlign: 'left',
        color: 'var(--b-ink)',
      }}
    >
      <div
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          border: '1px solid var(--b-rule)',
          background: 'var(--b-paper-2, transparent)',
        }}
      >
        <NamePlate name={userName} effectId={id} size="md" />
      </div>
      <div
        className="font-display"
        style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500 }}
      >
        {name}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        {rarityChip(rarity)}
        {equipped && equippedChip()}
      </div>
    </button>
  );
}
