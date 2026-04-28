'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUserPacts } from '@/hooks/usePacts';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PactCard } from '@/components/pacts/PactCard';
import { PactInvitePill } from '@/components/pacts/PactInvitePill';
import { PactCreateModal } from '@/components/pacts/PactCreateModal';
import { ActivityIcon } from '@/components/ui/AppIcons';

export default function PactsPage() {
  const { incoming, outgoing, active, resolved, loading } = useUserPacts();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(249,115,22,0.18), transparent 55%),' +
            'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(168,85,247,0.10), transparent 60%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(249,115,22,0.25)',
          boxShadow: '0 0 30px -14px rgba(249,115,22,0.4), inset 0 1px 0 rgba(249,115,22,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
              Friends-first
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-1 leading-none">
              Pacts
            </h1>
            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-md">
              Two of you commit to the same pillar for 7, 14, or 30 days. Both win the pot —
              or both lose it. Loss aversion is the whole point.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New pact</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Incoming invites — first because they need the user's response */}
          {incoming.length > 0 && (
            <Section
              label="Incoming invites"
              count={incoming.length}
              accent="#f97316"
            >
              <div className="space-y-2">
                {incoming.map((p) => (
                  <PactInvitePill key={p.id} pact={p} />
                ))}
              </div>
            </Section>
          )}

          {/* Active */}
          {active.length > 0 && (
            <Section label="Active" count={active.length} accent="#22c55e">
              <div className="space-y-3">
                {active.map((p) => (
                  <PactCard key={p.id} pact={p} />
                ))}
              </div>
            </Section>
          )}

          {/* Outgoing — smaller, just so the user knows what they sent */}
          {outgoing.length > 0 && (
            <Section label="Awaiting response" count={outgoing.length} accent="#64748b">
              <div className="space-y-2">
                {outgoing.map((p) => (
                  <PactInvitePill key={p.id} pact={p} outgoing />
                ))}
              </div>
            </Section>
          )}

          {/* History */}
          {resolved.length > 0 && (
            <Section label="History" count={resolved.length} accent="#a855f7">
              <div className="space-y-2 opacity-90">
                {resolved.map((p) => (
                  <PactCard key={p.id} pact={p} />
                ))}
              </div>
            </Section>
          )}

          {/* Empty state */}
          {incoming.length + outgoing.length + active.length + resolved.length === 0 && (
            <EmptyState
              icon={<ActivityIcon size={40} className="text-orange-400" />}
              title="No pacts yet"
              description="Find a friend who's serious about a pillar. Both win or both lose — that's the deal."
              action={
                <Button onClick={() => setShowCreate(true)}>Create your first pact</Button>
              }
            />
          )}
        </>
      )}

      <PactCreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
          {label}
        </p>
        <span className="text-[10px] font-mono text-slate-500 ml-1">· {count}</span>
      </div>
      {children}
    </motion.section>
  );
}
