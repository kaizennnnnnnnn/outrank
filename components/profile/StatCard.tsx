'use client';

import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

/**
 * Editorial Direction B v2 stat tile. Hairline frame, italic Fraunces
 * value, spread-caps eyebrow label. Icon ink-grey to keep the tile
 * quiet — the value carries the weight.
 */
export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div
      style={{
        padding: '12px 10px',
        border: '1px solid var(--b-rule)',
        textAlign: 'center',
        background: 'transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--b-ink-60)',
          marginBottom: 4,
        }}
      >
        {icon}
      </div>
      <p
        className="font-display tabular"
        style={{
          fontSize: 22,
          fontStyle: 'italic',
          fontWeight: 500,
          color: 'var(--b-ink)',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        className="spread"
        style={{
          fontSize: 9,
          color: 'var(--b-ink-60)',
          marginTop: 6,
        }}
      >
        {label}
      </p>
    </div>
  );
}
