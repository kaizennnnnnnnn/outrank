'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pillar } from '@/constants/pillars';
import { CATEGORIES } from '@/constants/categories';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { seedPillar } from '@/lib/seedPillar';

interface Props {
  pillar: Pillar;
}

/**
 * A pillar slot the user hasn't set up yet. Shows the pillar's identity
 * (icon + name + blurb) with a one-tap "Set up" affordance — taps create
 * the userHabit doc with the pillar's defaultGoal so the row immediately
 * becomes a normal HabitCard on the next snapshot. No leaving the page,
 * no separate setup wizard.
 */
export function PillarPlaceholderRow({ pillar }: Props) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [seeding, setSeeding] = useState(false);

  // CategoryIcon needs the matching category's color/icon. Pillars are
  // backed by existing CATEGORIES entries by design.
  const cat = CATEGORIES.find((c) => c.slug === pillar.slug);
  const color = cat?.color || '#f97316';

  const handleSeed = async () => {
    if (!user || seeding) return;
    setSeeding(true);
    try {
      await seedPillar(user.uid, pillar);
      addToast({ type: 'success', message: `${pillar.name} set up — log it any time` });
    } catch {
      addToast({ type: 'error', message: 'Could not set up pillar' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={handleSeed}
      disabled={seeding}
      className="group relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02] w-full text-left disabled:opacity-60"
    >
      <div className="relative flex-shrink-0 opacity-50 grayscale group-hover:opacity-90 group-hover:grayscale-0 transition-all">
        {cat && (
          <CategoryIcon
            slug={pillar.slug}
            name={pillar.name}
            icon={cat.icon}
            color={color}
            size="md"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-slate-300 truncate">{pillar.name}</p>
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}40`,
            }}
            title="One of the 5 core pillars"
          >
            Pillar
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{pillar.blurb}</p>
      </div>

      <span
        className="text-[11px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{ color }}
      >
        {seeding ? 'Setting up…' : 'Set up →'}
      </span>
    </motion.button>
  );
}
