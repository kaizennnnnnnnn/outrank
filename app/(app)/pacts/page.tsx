'use client';

import { useState } from 'react';
import { useUserPacts } from '@/hooks/usePacts';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PactCard } from '@/components/pacts/PactCard';
import { PactInvitePill } from '@/components/pacts/PactInvitePill';
import { PactCreateModal } from '@/components/pacts/PactCreateModal';
import { Masthead } from '@/components/editorial/Masthead';

export default function PactsPage() {
  const { incoming, outgoing, active, resolved, loading } = useUserPacts();
  const [showCreate, setShowCreate] = useState(false);
  const isEmpty = !loading && incoming.length + outgoing.length + active.length + resolved.length === 0;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Pacts" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Friends-first
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Pacts</em>
            </h1>
            <Button size="sm" onClick={() => setShowCreate(true)}>+ New pact</Button>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 420, lineHeight: 1.5 }}
          >
            Two of you commit to the same pillar for 7, 14, or 30 days. Both win the pot —
            or both lose it. Loss aversion is the whole point.
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <Skeleton className="h-24" />
              <Skeleton className="h-32" />
            </div>
          ) : isEmpty ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                No pacts yet.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 320, marginInline: 'auto', lineHeight: 1.5 }}
              >
                Find a friend who&rsquo;s serious about a pillar. Both win or both lose — that&rsquo;s the deal.
              </p>
              <Button style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>Create your first pact</Button>
            </div>
          ) : (
            <>
              {incoming.length > 0 && (
                <Section label="Incoming Invites" count={incoming.length} accent="#f97316">
                  {incoming.map((p) => (
                    <div key={p.id} style={{ marginBottom: 8 }}>
                      <PactInvitePill pact={p} />
                    </div>
                  ))}
                </Section>
              )}

              {active.length > 0 && (
                <Section label="Active" count={active.length} accent="#22c55e">
                  {active.map((p) => (
                    <div key={p.id} style={{ marginBottom: 12 }}>
                      <PactCard pact={p} />
                    </div>
                  ))}
                </Section>
              )}

              {outgoing.length > 0 && (
                <Section label="Awaiting Response" count={outgoing.length} accent="var(--b-ink-60)">
                  {outgoing.map((p) => (
                    <div key={p.id} style={{ marginBottom: 8 }}>
                      <PactInvitePill pact={p} outgoing />
                    </div>
                  ))}
                </Section>
              )}

              {resolved.length > 0 && (
                <Section label="History" count={resolved.length} accent="#a855f7">
                  <div style={{ opacity: 0.85 }}>
                    {resolved.map((p) => (
                      <div key={p.id} style={{ marginBottom: 12 }}>
                        <PactCard pact={p} />
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>

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
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div
          className="font-display"
          style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: accent }}
        >
          {label}
        </div>
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
        >
          § {String(count).padStart(2, '0')}
        </div>
      </div>
      {children}
    </section>
  );
}
