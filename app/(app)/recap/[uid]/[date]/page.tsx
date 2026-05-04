'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRecap } from '@/hooks/useRecap';
import { RecapDetailView } from '@/components/recap/RecapDetailView';
import { Skeleton } from '@/components/ui/Skeleton';

interface PageProps {
  params: Promise<{ uid: string; date: string }>;
}

export default function RecapDetailPage({ params }: PageProps) {
  const { uid, date } = use(params);
  const { user } = useAuth();
  const { recap, loading } = useRecap(uid, date);

  if (loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            Record not found.
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            This day hasn&rsquo;t been published, or you can&rsquo;t see it.
          </p>
          <Link
            href="/feed"
            className="font-body"
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '8px 14px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--b-paper)',
              background: 'var(--b-ink)',
              textDecoration: 'none',
            }}
          >
            Back to feed →
          </Link>
        </div>
      </div>
    );
  }

  if (recap.status === 'draft' && user?.uid !== uid) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            Not published yet.
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            The owner hasn&rsquo;t shared this day.
          </p>
          <Link
            href="/feed"
            className="font-body"
            style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '8px 14px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--b-paper)',
              background: 'var(--b-ink)',
              textDecoration: 'none',
            }}
          >
            Back to feed →
          </Link>
        </div>
      </div>
    );
  }

  return <RecapDetailView recap={recap} isOwner={user?.uid === uid} />;
}
