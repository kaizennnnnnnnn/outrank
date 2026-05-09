'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { OrbHistory } from '@/components/profile/OrbHistory';
import { OrbNickname } from '@/components/profile/OrbNickname';
import { rollOrbLoot, lootColors, type OrbLoot } from '@/lib/orbLoot';
import { ORB_TIERS, MAX_ORB_TIER, getOrbTier } from '@/constants/orbTiers';
import { useUIStore } from '@/store/uiStore';
import { Masthead } from '@/components/editorial/Masthead';

/**
 * Orb command center — editorial Direction B v2 conversion.
 *
 * Designed as a naturalist field-guide entry: the orb is the
 * "specimen," tier is its taxonomic rank, and the spec table reads
 * its measurements. Even though the SoulOrb canvas always renders at
 * MAX_ORB_TIER (per the orb mechanic rework — no visual difference
 * between tiers), the table reflects the user's actual current tier
 * so the ladder still feels like progression. Charges available are
 * highlighted in the brand red and act as the ammunition for the
 * EVOLVE button below, which rolls a weighted loot drop and pops the
 * existing reveal modal.
 */

const ROMAN: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
};

// One-line poetic description per tier, indexed by tier number.
// These read as the field-guide entry's flavor text.
const TIER_FLAVOR: Record<number, string> = {
  1:  'A faint coal — barely a flicker. The first stirring of habit.',
  2:  'A small, steady flame. Practice catches.',
  3:  'A roaring fire — heat enough to feel from across the room.',
  4:  'A churning core of arcs and embers. The world bends, slightly.',
  5:  'A burst of new light. Detonation in slow motion.',
  6:  'Spiraling arms of cosmic dust, ordered into something with purpose.',
  7:  'A cloud of stars compressed inward, holding shape against the void.',
  8:  'A point so dense the rules quietly stop applying.',
  9:  'The first thing — older than time, brighter than memory.',
  10: 'Beyond category. The orb is the user; the user is the orb.',
};

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
      <div className="dir-b max-w-2xl mx-auto space-y-6 px-4">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  // NOTE: we do NOT mutate local state after the awaited writes.
  // The three useEffect hooks above already sync localTier /
  // localCharges / localAwakening from the Firestore snapshot
  // (per CLAUDE.md "evolve once, lose two charges" gotcha).
  // SoulOrb's evolve animation runs 2.0s end-to-end: rapid spin
  // (1.5s), explosion burst with shockwaves + flying sparkles
  // (1.5s-1.65s), tier swap masked by the white flash (1.65s),
  // canvas fade back in (1.65-2.0s). The onEvolve callback fires
  // here at 1.65s; we wait ~400ms more so the modal lands AFTER the
  // orb has resettled to the new tier rather than during the flash.
  const handleEvolve = async () => {
    if (localCharges <= 0) return;
    const ownedCosmetics = (userAny as unknown as { ownedCosmetics?: string[] } | null)?.ownedCosmetics ?? [];
    const loot = rollOrbLoot(ownedCosmetics);
    const startedAt = Date.now();
    const POST_WRITE_DELAY_MS = 400;
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
        const next = Math.min(100, localAwakening + loot.awakening);
        updates.awakening = next;
      }
      if (loot.cosmeticId) {
        updates.ownedCosmetics = arrayUnion(loot.cosmeticId);
      }
      await updateDocument('users', user.uid, updates);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, POST_WRITE_DELAY_MS - elapsed);
      window.setTimeout(() => setLootReveal(loot), remaining);
    } catch {
      addToast({ type: 'error', message: 'Evolution failed — try again' });
    }
  };

  // Ascend is gated to tier 10 only — the user has to climb the full
  // 10-step evolution ladder before they can ascend. Each ascension
  // resets orbTier to 1, so the cycle repeats. The cosmetic frame +
  // name effect grant once (arrayUnion is idempotent); subsequent
  // ascensions just stack fragments + orbAscensions. Fragment payout
  // scales per cycle so the 5th ascension feels meaningfully bigger
  // than the 1st.
  const handleAscend = async () => {
    if (!user) return;
    if (localTier < MAX_ORB_TIER) return;
    const ascensions = ((user as unknown as { orbAscensions?: number }).orbAscensions ?? 0) + 1;
    const fragmentReward = 500 + (ascensions - 1) * 250; // 500, 750, 1000, 1250, ...
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(fragmentReward),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
      addToast({
        type: 'success',
        message: ascensions === 1
          ? `First ascension. +${fragmentReward} fragments + Ascension wreath unlocked.`
          : `Ascension ${ascensions}. +${fragmentReward} fragments. The cycle begins again.`,
      });
    } catch {
      addToast({ type: 'error', message: 'Ascension failed' });
    }
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

  // Spec values come from the user's CURRENT tier config, not the max
  // tier. This makes the table change as the user climbs even though
  // the canvas above stays visually pinned at max.
  const tierConfig = getOrbTier(localTier);
  const fragments  = (user as unknown as Record<string, number>).fragments || 0;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Soul Orb" />

        <div style={{ padding: '0 22px', textAlign: 'center' }}>
          {/* Eyebrow + headline */}
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 8 }}
          >
            Specimen · Tier {ROMAN[localTier] ?? localTier} of X
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 46, fontWeight: 500, lineHeight: 1, margin: '4px 0 0' }}
          >
            <em
              className={`tier-name-${Math.max(1, Math.min(10, localTier))}`}
              style={{ fontStyle: 'italic' }}
            >
              {tierConfig.name}
            </em>
          </h1>
          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: 'var(--b-ink-60)',
              marginTop: 6,
              maxWidth: 280,
              marginInline: 'auto',
              lineHeight: 1.5,
            }}
          >
            {TIER_FLAVOR[localTier] ?? TIER_FLAVOR[10]}
          </p>

          {/* Specimen — the actual SoulOrb canvas, pinned to max tier
              for visual uniformity. Click opens OrbHistory modal. */}
          <div
            onClick={() => setShowOrbHistory(true)}
            style={{ display: 'flex', justifyContent: 'center', padding: '28px 0', cursor: 'pointer' }}
          >
            <SoulOrb
              intensity={localAwakening}
              tier={MAX_ORB_TIER}
              size={210}
              onEvolve={localCharges > 0 ? handleEvolve : undefined}
              onAscend={localTier >= MAX_ORB_TIER ? handleAscend : undefined}
              onFullAwaken={localAwakening >= 100 ? handleFullAwaken : undefined}
              baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
              pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
              ringColorId={(user as unknown as Record<string, string>).orbRingColor}
            />
          </div>
        </div>

        {/* Spec table — naturalist field-guide style. Each row hairline
            ruled, label left in spread caps, mono value right. */}
        <div style={{ padding: '0 22px' }}>
          <div
            style={{
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-ink)',
            }}
          >
            <SpecRow label="Awakening"        value={`${localAwakening}%`}                accent={localAwakening >= 100} />
            <SpecRow label="Particles"        value={String(tierConfig.particles)} />
            <SpecRow label="Connection arcs"  value={`${tierConfig.maxArcs} max`} />
            <SpecRow label="Glow intensity"   value={tierConfig.glowIntensity.toFixed(1)} />
            <SpecRow
              label="Charges available"
              value={String(localCharges).padStart(2, '0')}
              accent={localCharges > 0}
            />
            <SpecRow
              label="Ascensions"
              value={String((user as unknown as { orbAscensions?: number }).orbAscensions ?? 0).padStart(2, '0')}
              last
            />
          </div>

          {/* Fragments balance — small line under the table */}
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: 'var(--b-ink-60)',
              textAlign: 'right',
              fontFamily: 'var(--font-inter)',
            }}
          >
            <span className="tabular">◆ {fragments.toLocaleString()}</span>{' '}
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              fragments
            </span>
          </div>

          {/* Action row — EVOLVE filled black, CUSTOMIZE outlined */}
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <button
              onClick={handleEvolve}
              disabled={localCharges <= 0}
              className="font-body"
              style={{
                height: 48,
                border: '1px solid var(--b-ink)',
                background: localCharges > 0 ? 'var(--b-ink)' : 'var(--b-paper-2)',
                color: localCharges > 0 ? 'var(--b-paper)' : 'var(--b-ink-40)',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.08em',
                cursor: localCharges > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-inter)',
              }}
            >
              EVOLVE — {localCharges} ▶
            </button>
            <Link
              href="/shop"
              className="font-body"
              style={{
                height: 48,
                border: '1px solid var(--b-ink)',
                background: 'transparent',
                color: 'var(--b-ink)',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter)',
              }}
            >
              CUSTOMIZE
            </Link>
          </div>

          {/* Hint line — context-sensitive */}
          <p
            className="font-body"
            style={{
              fontSize: 10,
              color: 'var(--b-ink-60)',
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 1.6,
            }}
          >
            {localCharges === 0 && localAwakening < 100 ? (
              <>Log <b style={{ color: 'var(--b-accent)' }}>every pillar today</b> to earn an evolution charge.</>
            ) : localAwakening >= 100 ? (
              <>
                <b style={{ color: 'var(--b-accent)' }}>100% awakening reached.</b>{' '}
                Tap the orb to fully awaken — permanent XP bonus + exclusive frame.
              </>
            ) : (
              <>Each evolution rolls a drop. Higher rarities are rare; the math is on your side over time.</>
            )}
          </p>

          {/* Ascend — only at tier 10. Unlimited cycles; each ascension
              scales the fragment payout (500, 750, 1000, ...). */}
          {localTier >= MAX_ORB_TIER && (() => {
            const ascensions = (user as unknown as { orbAscensions?: number }).orbAscensions ?? 0;
            const nextReward = 500 + ascensions * 250;
            return (
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 14,
                  borderTop: '1px solid var(--b-rule)',
                  textAlign: 'center',
                }}
              >
                <div
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 6 }}
                >
                  {ascensions === 0 ? 'Ladder complete' : `${ordinal(ascensions + 1)} ascension`}
                </div>
                <p
                  className="font-body"
                  style={{
                    fontSize: 11,
                    color: 'var(--b-ink-60)',
                    marginBottom: 10,
                    lineHeight: 1.5,
                    maxWidth: 320,
                    marginInline: 'auto',
                  }}
                >
                  Ascending resets the ladder to tier I — your level, cosmetics, and
                  fragments stay. Each cycle awards more than the last.
                </p>
                <button
                  onClick={handleAscend}
                  className="font-body"
                  style={{
                    height: 40,
                    padding: '0 24px',
                    border: '1px solid var(--b-accent)',
                    background: 'transparent',
                    color: 'var(--b-accent)',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  ASCEND · +{nextReward} ◆
                </button>
                {ascensions > 0 && (
                  <p
                    className="font-body"
                    style={{
                      fontSize: 10,
                      color: 'var(--b-ink-40)',
                      marginTop: 8,
                      letterSpacing: '0.05em',
                    }}
                  >
                    You&apos;ve ascended {ascensions} time{ascensions === 1 ? '' : 's'} already.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Nickname + view details link */}
          <div style={{ marginTop: 22 }}>
            <OrbNickname user={user} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              onClick={() => setShowOrbHistory(true)}
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--b-ink-60)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              View Orb history
            </button>
          </div>
        </div>
      </div>

      <OrbHistory isOpen={showOrbHistory} onClose={() => setShowOrbHistory(false)} />

      {/* Loot reveal — fires after a successful evolve */}
      <OrbLootReveal loot={lootReveal} onClose={() => setLootReveal(null)} />
    </div>
  );
}

// ─── Spec row ───────────────────────────────────────────────────────

function SpecRow({
  label,
  value,
  accent,
  last,
}: {
  label:  string;
  value:  string;
  accent?: boolean;
  last?:   boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--b-rule)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: 'var(--b-ink-60)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Loot reveal modal — preserved from prior commit ───────────────
//
// Tap-to-dismiss. Color-codes the rarity using the chestLoot palette.
// The write already landed before this renders.

function OrbLootReveal({
  loot,
  onClose,
}: {
  loot: OrbLoot | null;
  onClose: () => void;
}) {
  if (!loot) return null;
  const c = lootColors(loot.rarity);

  // 6 sparkles drift up through the modal background. Hand-placed
  // x positions + delays so they're spread across the panel and
  // never all sparkle at the same instant.
  const sparkles = [
    { x: '12%', delay: '0s'    },
    { x: '34%', delay: '0.6s'  },
    { x: '52%', delay: '1.4s'  },
    { x: '68%', delay: '2.1s'  },
    { x: '84%', delay: '2.8s'  },
    { x: '22%', delay: '1.0s'  },
  ];

  return (
    <div
      onClick={onClose}
      className="dir-b fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${c.color}22 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.92) 100%)`,
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm"
        style={{
          background: 'var(--b-paper)',
          color: 'var(--b-ink)',
          border: '1px solid var(--b-ink)',
          padding: '24px 24px 22px',
          animation: 'orb-loot-reveal-in 520ms cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          // Soft rarity-color ambient glow inside the panel — a faint
          // wash from the top so the whole modal feels lit by the
          // reward's color rather than just the top stripe.
          boxShadow: `0 24px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px ${c.color}33, inset 0 64px 80px -40px ${c.color}33`,
        }}
      >
        {/* Top rarity stripe with a running shine so the reveal beat
            keeps moving even after the entrance settles. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: c.color,
            overflow: 'hidden',
          }}
        >
          <div className="loot-stripe-shine" style={{ position: 'absolute', inset: 0 }} />
        </div>

        {/* Corner ornaments — four small diamond glyphs that spin
            slowly. Two CW, two CCW so the eye never settles. */}
        <CornerDiamond color={c.color} pos="tl" reverse={false} />
        <CornerDiamond color={c.color} pos="tr" reverse />
        <CornerDiamond color={c.color} pos="bl" reverse />
        <CornerDiamond color={c.color} pos="br" reverse={false} />

        {/* Backdrop sparkle drift — small white-yellow dots floating
            up. Sits behind the content. */}
        {sparkles.map((s, i) => (
          <div
            key={i}
            aria-hidden
            className="loot-sparkle-drift"
            style={{
              position: 'absolute',
              left: s.x,
              bottom: 12,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: i % 2 === 0 ? '#ffffff' : c.color,
              boxShadow: `0 0 6px ${c.color}aa, 0 0 2px #ffffff`,
              animationDelay: s.delay,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ))}

        {/* Eyebrow rule + spread caps */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid var(--b-rule)',
            paddingBottom: 6,
            marginBottom: 14,
          }}
        >
          <span className="spread" style={{ fontSize: 9, color: c.color, letterSpacing: '0.24em' }}>
            ★ Evolution Reward
          </span>
          <span
            className="font-mono tabular"
            style={{
              fontSize: 9,
              color: 'var(--b-ink-60)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Rarity · <span style={{ color: c.color, fontWeight: 700 }}>{c.name}</span>
          </span>
        </div>

        {/* Headline — italic Fraunces with a metallic shine in the
            rarity color. */}
        <h3
          className="font-display"
          style={{
            position: 'relative',
            zIndex: 2,
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: 0,
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          <em
            style={{
              fontStyle: 'italic',
              background: `linear-gradient(110deg, ${c.color} 0%, ${c.color}cc 35%, #ffffff 50%, ${c.color}cc 65%, ${c.color} 100%)`,
              backgroundSize: '220% 100%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'loot-stripe-shine 4.5s linear infinite',
            }}
          >
            {loot.label}
          </em>
        </h3>
        <p
          className="font-body"
          style={{
            position: 'relative',
            zIndex: 2,
            fontSize: 12,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: '8px auto 0',
            maxWidth: 280,
            fontStyle: 'italic',
          }}
        >
          {loot.detail}
        </p>

        {/* Hero illustration — bigger plinth (110×110) with breathing
            radial halo behind the icon and a small rise-in animation. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            justifyContent: 'center',
            margin: '20px 0 14px',
          }}
        >
          <div
            className="loot-hero-rise"
            style={{
              position: 'relative',
              width: 110,
              height: 110,
              border: `1px solid ${c.color}`,
              background: 'var(--b-paper)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 10px 30px -8px ${c.color}55, inset 0 0 0 1px var(--b-paper)`,
            }}
          >
            {/* Breathing rarity halo — sits at z 0 inside the plinth */}
            <div
              aria-hidden
              className="loot-halo-breathe"
              style={{
                position: 'absolute',
                inset: 4,
                background: `radial-gradient(circle at 50% 45%, ${c.color}66 0%, ${c.color}22 45%, transparent 75%)`,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            {/* Icon on top of the halo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <OrbLootIcon loot={loot} color={c.color} />
            </div>
          </div>
        </div>

        {/* Reward chips — editorial hairline tiles */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 6,
          }}
        >
          {!!loot.fragments && <RewardChip label={`+${loot.fragments}`} unit="Fragments" tone={c.color} />}
          {!!loot.xp && <RewardChip label={`+${loot.xp}`} unit="XP" />}
          {!!loot.awakening && <RewardChip label={`+${loot.awakening}`} unit="Awakening" tone={c.color} />}
          {!!loot.cosmeticId && <RewardChip label="Cosmetic" unit="Unlocked" tone={c.color} />}
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="font-body"
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 20,
            width: '100%',
            padding: '13px 16px',
            border: '1px solid var(--b-ink)',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Claim →
        </button>
      </div>
    </div>
  );
}

// Small rotating diamond ornament parked in one of the modal's four
// inside corners. Adds an "expensive" feel without doing much work.
function CornerDiamond({
  color,
  pos,
  reverse,
}: {
  color:   string;
  pos:     'tl' | 'tr' | 'bl' | 'br';
  reverse: boolean;
}) {
  const offset = 9;
  const sty: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: 'transparent',
    border: `1px solid ${color}`,
    pointerEvents: 'none',
    zIndex: 1,
  };
  if (pos === 'tl') { sty.top = offset; sty.left  = offset; }
  if (pos === 'tr') { sty.top = offset; sty.right = offset; }
  if (pos === 'bl') { sty.bottom = offset; sty.left  = offset; }
  if (pos === 'br') { sty.bottom = offset; sty.right = offset; }
  return (
    <div
      aria-hidden
      className={reverse ? 'loot-corner-spin-rev' : 'loot-corner-spin'}
      style={sty}
    />
  );
}

function RewardChip({ label, unit, tone }: { label: string; unit: string; tone?: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '5px 9px',
        border: `1px solid ${tone ?? 'var(--b-rule)'}`,
        background: 'transparent',
      }}
    >
      <span
        className="font-display tabular"
        style={{
          fontSize: 13,
          fontStyle: 'italic',
          fontWeight: 600,
          color: tone ?? 'var(--b-ink)',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        className="spread"
        style={{
          fontSize: 7.5,
          color: 'var(--b-ink-60)',
          letterSpacing: '0.18em',
        }}
      >
        {unit}
      </span>
    </div>
  );
}

function OrbLootIcon({ loot, color }: { loot: OrbLoot; color: string }) {
  const stroke = { color, filter: `drop-shadow(0 0 4px ${color}66)` } as React.CSSProperties;
  if (loot.cosmeticId) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
      </svg>
    );
  }
  if (loot.fragments) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      </svg>
    );
  }
  if (loot.awakening) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </svg>
    );
  }
  return (
    <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Ordinal number formatter — 1 → "1st", 2 → "2nd", 13 → "13th", etc.
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Suppress unused-import warning — ORB_TIERS is referenced via getOrbTier
// but TS still emits a warning in some configs.
void ORB_TIERS;
