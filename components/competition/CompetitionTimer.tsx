'use client';

import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';

interface CompetitionTimerProps {
  endDate: Timestamp;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Ended';

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  // Mono tabular HH:MM:SS-ish format. Pad fields so the type doesn't
  // visually jiggle every second.
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function CompetitionTimer({ endDate }: CompetitionTimerProps) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const end = endDate.toDate().getTime();
      const now = Date.now();
      setRemaining(formatCountdown(end - now));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
      >
        Ends In
      </div>
      <p
        className="font-mono tabular"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--b-ink)',
          marginTop: 2,
          letterSpacing: '0.04em',
        }}
      >
        {remaining}
      </p>
    </div>
  );
}
