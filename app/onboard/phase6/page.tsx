'use client';

import Link from 'next/link';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';

/**
 * Phase 6 placeholder — first rank reveal (best lifts → per-exercise
 * rank animation → world percentile → projected rank → active-lifters
 * globe). Built next session.
 */
export default function OnboardPhase6PlaceholderPage() {
  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col items-center justify-center px-6 text-center">
      <PhoenixMascot size={120} />
      <h1 className="font-heading text-2xl font-bold text-white mt-6">
        Phase 6 next
      </h1>
      <p className="text-slate-400 max-w-sm mt-3 text-sm leading-relaxed">
        First rank reveal — your best lifts, per-exercise ranks, world percentile, active-lifters globe. Coming up.
      </p>
      <Link
        href="/welcome"
        className="mt-8 px-6 py-2.5 rounded-full text-sm font-semibold text-slate-300 border border-white/15 hover:bg-white/[0.04] transition-colors"
      >
        Restart
      </Link>
    </div>
  );
}
