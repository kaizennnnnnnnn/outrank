'use client';

import { lootColors, type OrbLoot } from '@/lib/orbLoot';

/**
 * Tap-to-dismiss loot reveal — fires after a successful orb evolution.
 * Color-codes the rarity using the chestLoot palette. The Firestore
 * write has already landed before this renders; this modal is purely
 * the visual reward beat.
 */
export function OrbLootReveal({
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
          boxShadow: `0 24px 60px -12px rgba(0,0,0,0.55), 0 0 0 1px ${c.color}33, inset 0 64px 80px -40px ${c.color}33`,
        }}
      >
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

        <CornerDiamond color={c.color} pos="tl" reverse={false} />
        <CornerDiamond color={c.color} pos="tr" reverse />
        <CornerDiamond color={c.color} pos="bl" reverse />
        <CornerDiamond color={c.color} pos="br" reverse={false} />

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
            <div style={{ position: 'relative', zIndex: 1 }}>
              <OrbLootIcon loot={loot} color={c.color} />
            </div>
          </div>
        </div>

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
