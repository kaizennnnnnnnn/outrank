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

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
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
    <div className="text-center">
      <p className="text-xs text-slate-500">Time remaining</p>
      <p className="font-mono text-lg font-bold text-white">{remaining}</p>
    </div>
  );
}
