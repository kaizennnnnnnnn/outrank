'use client';

import React from 'react';

/**
 * FIG. 01-05 — onboarding insight + trajectory + forecast visuals.
 *
 * Editorial dark-mode figures rendered inside InsightCard / Path /
 * Forecast steps on phase 4. Pure SVG/HTML; animations driven by
 * .fig-draw-in / .fig-pulse / .fig-bar-rise CSS classes in
 * globals.css.
 */

// ─── FIG. 01 · Mirror — Effort vs Results ──────────────────────────

export function MirrorVisual() {
  const W = 280, H = 156;
  const effort: [number, number][] = [
    [0, 118], [35, 108], [70, 94], [105, 80], [140, 64],
    [175, 46], [210, 28], [245, 16], [280, 8],
  ];
  const result: [number, number][] = [
    [0, 112], [35, 114], [70, 110], [105, 112], [140, 108],
    [175, 110], [210, 107], [245, 109], [280, 108],
  ];
  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p[0] + ' ' + p[1]).join(' ');

  return (
    <div style={{ width: 280 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span className="spread" style={{ color: 'var(--b-ink-60)' }}>Last 90 Days</span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>FIG. 01</span>
      </div>

      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height={H}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={0} x2={W}
            y1={20 + i * 28} y2={20 + i * 28}
            stroke="var(--b-rule)"
            strokeWidth="0.5"
            strokeDasharray={i === 4 ? undefined : '1 4'}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={i * 140} x2={i * 140} y1={132} y2={138} stroke="var(--b-ink-40)" strokeWidth="0.7" />
            <text x={i * 140 + 2} y={148} fontFamily="var(--font-jetbrains), monospace" fontSize="8" fill="var(--b-ink-40)">
              M{i + 1}
            </text>
          </g>
        ))}
        <line x1={W} x2={W} y1={132} y2={138} stroke="var(--b-ink-40)" strokeWidth="0.7" />

        {/* Area between the two curves */}
        <path
          d={toPath(effort) + ' L ' + result.slice().reverse().map((p) => p[0] + ' ' + p[1]).join(' L ') + ' Z'}
          fill="var(--b-accent)"
          fillOpacity="0.12"
        />
        <path
          d={toPath(effort)}
          stroke="var(--b-accent)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="fig-draw-in"
          style={{ ['--len' as string]: '360' } as React.CSSProperties}
        />
        <circle cx={effort[effort.length - 1][0]} cy={effort[effort.length - 1][1]} r="3" fill="var(--b-accent)" />
        <circle
          cx={effort[effort.length - 1][0]}
          cy={effort[effort.length - 1][1]}
          r="6"
          fill="none"
          stroke="var(--b-accent)"
          strokeWidth="0.6"
          opacity="0.4"
          className="fig-pulse"
        />
        <path
          d={toPath(result)}
          stroke="var(--b-ink)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 2"
          strokeLinecap="round"
          className="fig-draw-in"
          style={{ ['--len' as string]: '290', animationDelay: '0.9s' } as React.CSSProperties}
        />
        <circle cx={result[result.length - 1][0]} cy={result[result.length - 1][1]} r="2" fill="var(--b-ink)" />

        <text x={4} y={106} fontFamily="var(--font-jetbrains), monospace" fontSize="8" fill="var(--b-accent)" fontWeight="700">EFFORT</text>
        <text x={4} y={122} fontFamily="var(--font-jetbrains), monospace" fontSize="8" fill="var(--b-ink-60)">RESULTS</text>

        {/* Delta brackets right edge */}
        <line x1={W - 14} x2={W - 14} y1={effort[effort.length - 1][1]} y2={result[result.length - 1][1]} stroke="var(--b-ink)" strokeWidth="0.7" />
        <line x1={W - 18} x2={W - 10} y1={effort[effort.length - 1][1]} y2={effort[effort.length - 1][1]} stroke="var(--b-ink)" strokeWidth="0.7" />
        <line x1={W - 18} x2={W - 10} y1={result[result.length - 1][1]} y2={result[result.length - 1][1]} stroke="var(--b-ink)" strokeWidth="0.7" />
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--b-ink)',
          paddingTop: 8,
          marginTop: 4,
        }}
      >
        <div>
          <div className="spread" style={{ color: 'var(--b-accent)', fontSize: 8 }}>Effort</div>
          <div className="font-display tabular" style={{ fontSize: 18, fontStyle: 'italic' }}>47 sessions</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="spread" style={{ color: 'var(--b-ink-60)', fontSize: 8 }}>Δ Delta</div>
          <div className="font-display tabular" style={{ fontSize: 18, fontStyle: 'italic' }}>−92%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="spread" style={{ color: 'var(--b-ink-60)', fontSize: 8 }}>Results</div>
          <div className="font-display tabular" style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--b-ink-60)' }}>~0%</div>
        </div>
      </div>
    </div>
  );
}

// ─── FIG. 02 · Blind-spot pillars ──────────────────────────────────

export function BlindSpotVisual() {
  const PILLARS = [
    { name: 'Steps',     rank: 'A+', value: 0.95, weak: false },
    { name: 'Strength',  rank: 'A',  value: 0.86, weak: false },
    { name: 'Hydration', rank: 'B',  value: 0.65, weak: false },
    { name: 'Sleep',     rank: 'D',  value: 0.30, weak: true  },
    { name: 'Focus',     rank: 'F',  value: 0.18, weak: true  },
  ];
  return (
    <div style={{ width: 290 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span className="spread" style={{ color: 'var(--b-ink-60)' }}>Five Pillars · Diagnostic</span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>FIG. 02</span>
      </div>
      <div style={{ borderTop: '1px solid var(--b-ink)' }}>
        {PILLARS.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '14px 64px 1fr 28px',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: '1px solid var(--b-rule)',
              position: 'relative',
            }}
          >
            <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-display" style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 500 }}>
              {p.name}
            </span>
            <div
              style={{
                height: 8,
                background: 'var(--b-paper-2)',
                position: 'relative',
                border: '1px solid var(--b-ink-15)',
              }}
            >
              <div
                className="fig-bar-rise"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: (p.value * 100) + '%',
                  background: p.weak
                    ? 'repeating-linear-gradient(135deg, var(--b-accent), var(--b-accent) 3px, transparent 3px, transparent 6px)'
                    : 'var(--b-ink)',
                  animationDelay: (i * 0.08) + 's',
                }}
              />
              {[0.25, 0.5, 0.75].map((t) => (
                <div
                  key={t}
                  style={{
                    position: 'absolute',
                    left: (t * 100) + '%',
                    top: -2,
                    bottom: -2,
                    width: 1,
                    background: 'var(--b-ink-15)',
                  }}
                />
              ))}
            </div>
            <span
              className="font-display tabular"
              style={{
                fontSize: 18,
                fontStyle: 'italic',
                fontWeight: 500,
                textAlign: 'right',
                color: p.weak ? 'var(--b-accent)' : 'var(--b-ink)',
              }}
            >
              {p.rank}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <svg width="14" height="40" viewBox="0 0 14 40">
          <path d="M 12 2 Q 4 4 4 20 Q 4 36 12 38" stroke="var(--b-accent)" strokeWidth="1.2" fill="none" />
        </svg>
        <div>
          <div className="spread" style={{ color: 'var(--b-accent)' }}>Blind spot</div>
          <div style={{ fontSize: 11, color: 'var(--b-ink-60)', fontStyle: 'italic' }}>
            Sleep & focus are the leak.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FIG. 03 · Motivation decay heatmap ────────────────────────────

export function MotivationVisual() {
  // Deterministic patterns so SSR + client agree (no Math.random in render).
  const willMisses = new Set([7, 8, 9, 10, 11, 13, 14, 16, 17, 19, 20, 21, 23, 25, 26]);
  const will = Array.from({ length: 28 }, (_, i) =>
    i < 6 ? 1 : willMisses.has(i) ? 0 : 1
  );
  // System track: streak holds, two "freeze used" half-days at 14 and 22.
  const sys = Array.from({ length: 28 }, (_, i) =>
    i === 14 || i === 22 ? 0.5 : 1
  );

  const cellBg = (v: number, i: number, fade: boolean) => {
    if (v === 1) return fade && i >= 6 ? 'var(--b-paper-2)' : 'var(--b-ink)';
    if (v === 0.5)
      return 'repeating-linear-gradient(45deg, var(--b-ink), var(--b-ink) 1px, transparent 1px, transparent 3px)';
    return 'var(--b-paper-2)';
  };

  return (
    <div style={{ width: 290 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
        }}
      >
        <span className="spread" style={{ color: 'var(--b-ink-60)' }}>Motivation Decay · 28 Days</span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>FIG. 03</span>
      </div>

      <MotivationTrack
        label="Willpower alone"
        sub="Day 7: cracks"
        cells={will}
        cellBg={(v, i) => cellBg(v, i, true)}
        subTone="var(--b-accent)"
      />
      <div style={{ height: 10 }} />
      <MotivationTrack
        label="Outrank system"
        sub="Streak holds"
        cells={sys}
        cellBg={(v, i) => cellBg(v, i, false)}
        subTone="var(--b-ink-60)"
      />

      <div
        style={{
          marginTop: 10,
          borderTop: '1px solid var(--b-ink)',
          paddingTop: 8,
          fontSize: 11,
          color: 'var(--b-ink-60)',
          fontStyle: 'italic',
          lineHeight: 1.45,
        }}
      >
        Motivation is a feeling.{' '}
        <span style={{ color: 'var(--b-ink)', fontWeight: 600 }}>A streak is a contract.</span>
      </div>
    </div>
  );
}

function MotivationTrack({
  label,
  sub,
  cells,
  cellBg,
  subTone,
}: {
  label: string;
  sub: string;
  cells: number[];
  cellBg: (v: number, i: number) => string;
  subTone: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <span className="font-display" style={{ fontSize: 12, fontStyle: 'italic', fontWeight: 500 }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 9, color: subTone }}>{sub}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(28, 1fr)', gap: 2 }}>
        {cells.map((v, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              background: cellBg(v, i),
              border: '1px solid var(--b-ink-15)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── FIG. 04 · Trajectory ──────────────────────────────────────────

export function PathVisual() {
  const W = 280, H = 170;
  const path =
    'M 6 150 L 30 148 L 50 142 L 76 138 L 96 124 L 120 118 L 142 100 L 168 94 L 192 76 L 218 60 L 250 38 L 274 26';
  const waypoints = [
    { x: 6,   y: 150, label: 'TODAY',     key: 'M0',  active: false },
    { x: 96,  y: 124, label: '90 DAYS',   key: 'M3',  active: false },
    { x: 192, y: 76,  label: '6 MONTHS',  key: 'M6',  active: false },
    { x: 274, y: 26,  label: '12 MONTHS', key: 'M12', active: true  },
  ];
  return (
    <div style={{ width: 280 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span className="spread" style={{ color: 'var(--b-ink-60)' }}>Trajectory · 12 Months</span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>FIG. 04</span>
      </div>
      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height={H}>
        {/* Echo trail of past trajectories */}
        {[12, 24, 36].map((dy, i) => (
          <path
            key={i}
            d={path}
            transform={'translate(0 ' + dy + ')'}
            stroke="var(--b-ink)"
            strokeWidth="0.5"
            fill="none"
            opacity={0.18 - i * 0.04}
            strokeDasharray="2 3"
          />
        ))}
        <path
          d={path}
          stroke="var(--b-ink)"
          strokeWidth="1.5"
          fill="none"
          className="fig-draw-in"
          style={{ ['--len' as string]: '500' } as React.CSSProperties}
        />
        {waypoints.map((w) => (
          <g key={w.key}>
            <line
              x1={w.x} x2={w.x}
              y1={w.y} y2={H - 12}
              stroke="var(--b-ink-40)"
              strokeWidth="0.5"
              strokeDasharray="1 2"
            />
            <circle
              cx={w.x} cy={w.y}
              r={w.active ? 4 : 2.5}
              fill={w.active ? 'var(--b-accent)' : 'var(--b-ink)'}
            />
            {w.active && (
              <circle
                cx={w.x} cy={w.y}
                r="9"
                stroke="var(--b-accent)"
                strokeWidth="0.7"
                fill="none"
                className="fig-pulse"
              />
            )}
            <text
              x={w.x}
              y={H - 3}
              fontFamily="var(--font-jetbrains), monospace"
              fontSize="7"
              fill="var(--b-ink-60)"
              textAnchor="middle"
            >
              {w.label}
            </text>
          </g>
        ))}
        {/* +47 ranks tag */}
        <g transform="translate(220 14)">
          <rect x="0" y="0" width="56" height="14" fill="var(--b-paper)" stroke="var(--b-ink)" strokeWidth="0.7" />
          <text
            x="28" y="10"
            fontFamily="var(--font-fraunces), Georgia, serif"
            fontStyle="italic"
            fontSize="10"
            fill="var(--b-ink)"
            textAnchor="middle"
          >
            +47 ranks
          </text>
        </g>
      </svg>
    </div>
  );
}

// ─── FIG. 05 · 90-Day forecast (5 pillar sparklines) ───────────────

export function ProgressGraphVisual() {
  const series: { name: string; delta: string; pts: [number, number][] }[] = [
    { name: 'Strength', delta: '+24%', pts: [[0, 18], [20, 16], [40, 14], [60, 11], [80, 8],  [100, 4]] },
    { name: 'Sleep',    delta: '+12%', pts: [[0, 16], [20, 15], [40, 14], [60, 12], [80, 11], [100, 8]] },
    { name: 'Focus',    delta: '+38%', pts: [[0, 18], [20, 18], [40, 15], [60, 11], [80, 7],  [100, 2]] },
    { name: 'Steps',    delta: '+19%', pts: [[0, 17], [20, 15], [40, 12], [60, 10], [80, 8],  [100, 6]] },
    { name: 'Hydrate',  delta: '+9%',  pts: [[0, 15], [20, 14], [40, 13], [60, 12], [80, 11], [100, 10]] },
  ];
  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p[0] + ' ' + p[1]).join(' ');
  return (
    <div style={{ width: 290 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span className="spread" style={{ color: 'var(--b-ink-60)' }}>90-Day Forecast</span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>FIG. 05</span>
      </div>
      <div style={{ borderTop: '1px solid var(--b-ink)' }}>
        {series.map((s, i) => (
          <div
            key={s.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '74px 1fr 50px',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <span className="font-display" style={{ fontSize: 13, fontStyle: 'italic', fontWeight: 500 }}>
              {s.name}
            </span>
            <svg viewBox="0 0 100 22" width="100%" height="22" preserveAspectRatio="none">
              <line
                x1={0} x2={100}
                y1={11} y2={11}
                stroke="var(--b-rule)"
                strokeWidth="0.4"
                strokeDasharray="1 2"
              />
              <path
                d={toPath(s.pts)}
                stroke="var(--b-ink)"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                className="fig-draw-in"
                style={{
                  ['--len' as string]: '180',
                  animationDelay: (i * 0.15) + 's',
                } as React.CSSProperties}
              />
              <circle
                cx={s.pts[s.pts.length - 1][0]}
                cy={s.pts[s.pts.length - 1][1]}
                r="1.6"
                fill="var(--b-accent)"
              />
            </svg>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 11,
                color: 'var(--b-accent)',
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              {s.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
