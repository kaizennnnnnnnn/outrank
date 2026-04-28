'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRecap } from '@/hooks/useRecap';
import { RecapDetailView } from '@/components/recap/RecapDetailView';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActivityIcon } from '@/components/ui/AppIcons';

interface PageProps {
  params: Promise<{ uid: string; date: string }>;
}

export default function RecapDetailPage({ params }: PageProps) {
  const { uid, date } = use(params);
  const { user } = useAuth();
  const { recap, loading } = useRecap(uid, date);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ActivityIcon size={40} className="text-orange-400" />}
          title="Record not found"
          description="This day hasn't been published, or you can't see it."
          action={
            <Link href="/feed" className="text-orange-400 hover:underline text-sm">
              Back to feed
            </Link>
          }
        />
      </div>
    );
  }

  // Drafts are private — only the owner can view them. Friend rules already
  // gate at the Firestore layer; this is a UI guard for clearer messaging.
  if (recap.status === 'draft' && user?.uid !== uid) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ActivityIcon size={40} className="text-orange-400" />}
          title="Not published yet"
          description="The owner hasn't shared this day."
          action={
            <Link href="/feed" className="text-orange-400 hover:underline text-sm">
              Back to feed
            </Link>
          }
        />
      </div>
    );
  }

  return <RecapDetailView recap={recap} isOwner={user?.uid === uid} />;
}
