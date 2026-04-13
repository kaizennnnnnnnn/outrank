'use client';

import { motion } from 'framer-motion';
import { getLevelForXP, getXPProgress } from '@/constants/levels';

interface LevelBadgeProps {
  totalXP: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { outer: 48, inner: 38, stroke: 3, fontSize: 'text-xs', ringSize: 'w-12 h-12' },
  md: { outer: 72, inner: 58, stroke: 4, fontSize: 'text-sm', ringSize: 'w-[72px] h-[72px]' },
  lg: { outer: 100, inner: 82, stroke: 5, fontSize: 'text-xl', ringSize: 'w-[100px] h-[100px]' },
};

export function LevelBadge({ totalXP, size = 'md' }: LevelBadgeProps) {
  const level = getLevelForXP(totalXP);
  const xp = getXPProgress(totalXP);
  const config = sizeConfig[size];
  const radius = (config.outer - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (xp.percentage / 100) * circumference;

  return (
    <div className={`relative ${config.ringSize} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${config.outer} ${config.outer}`}>
        {/* Background ring */}
        <circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke="#1e1e30"
          strokeWidth={config.stroke}
        />
        {/* Progress ring */}
        <motion.circle
          cx={config.outer / 2}
          cy={config.outer / 2}
          r={radius}
          fill="none"
          stroke="url(#levelGradient)"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`font-heading font-bold text-white ${config.fontSize}`}>
        {level.level}
      </span>
    </div>
  );
}
