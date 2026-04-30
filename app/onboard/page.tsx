'use client';

import Link from 'next/link';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';

/**
 * Phase 2 placeholder. The full mascot-led question flow ships in
 * the next phase — this stub just confirms the carousel handoff
 * lands somewhere real and gives the user a way back.
 */
export default function OnboardPlaceholderPage() {
  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col items-center justify-center px-6 text-center">
      <PhoenixMascot size={120} />
      <h1 className="font-heading text-2xl font-bold text-white mt-6">
        Funnel coming next
      </h1>
      <p className="text-slate-400 max-w-sm mt-3 text-sm leading-relaxed">
        Phase 2 wires up the question flow — name, experience, goals, and the rest.
      </p>
      <Link
        href="/welcome"
        className="mt-8 px-6 py-2.5 rounded-full text-sm font-semibold text-slate-300 border border-white/15 hover:bg-white/[0.04] transition-colors"
      >
        Back to start
      </Link>
    </div>
  );
}
