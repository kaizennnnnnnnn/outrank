'use client';

import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils';
import { updateDocument, doc } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { ReactionEmoji } from '@/types/feed';
import { cn } from '@/lib/utils';
import { ActivityIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

const REACTIONS: ReactionEmoji[] = ['🔥', '💪', '👏', '⚡', '🤝'];

export default function FeedPage() {
  const { user } = useAuth();
  const { items, loading } = useFeed();
  const addToast = useUIStore((s) => s.addToast);

  const handleReaction = async (feedOwnerId: string, itemId: string, emoji: ReactionEmoji) => {
    if (!user) return;
    try {
      // Update the item in MY feed (that's where I'm reading it from)
      const ref = doc(db, `feed/${user.uid}/items`, itemId);
      const field = `reactions.${emoji}`;
      await updateDoc(ref, {
        [field]: arrayUnion(user.uid),
      });
    } catch (err) {
      console.error('Reaction failed:', err);
      addToast({ type: 'error', message: 'Failed to react' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white font-heading">Activity Feed</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon size={40} className="text-red-400" />}
          title="No activity yet"
          description="Add friends to see their progress in your feed."
          action={
            <Link href="/friends">
              <span className="text-orange-400 hover:underline text-sm">Find Friends</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.filter((item) => item.actorId !== user?.uid).map((item) => (
            <div key={item.id} className="glass-card rounded-2xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Link href={`/profile/${item.actorUsername}`}>
                  <Avatar src={item.actorAvatar} alt={item.actorUsername} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${item.actorUsername}`}>
                    <p className="text-sm font-semibold text-white hover:text-orange-400">{item.actorUsername}</p>
                  </Link>
                  <p className="text-xs text-slate-600">
                    {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
                  </p>
                </div>
                {item.categoryIcon && <span className="text-2xl">{item.categoryIcon}</span>}
              </div>

              {/* Content */}
              <p className="text-sm text-slate-300">{item.message}</p>

              {/* Reactions */}
              <div className="flex items-center gap-2">
                {REACTIONS.map((emoji) => {
                  const reacted = item.reactions?.[emoji]?.includes(user?.uid || '');
                  const count = item.reactions?.[emoji]?.length || 0;
                  return (
                    <button
                      key={emoji}
                      onClick={() => item.id && handleReaction(item.actorId, item.id, emoji)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                        reacted
                          ? 'bg-red-500/20 border border-red-500/30'
                          : 'bg-[#18182a] border border-[#2d2d45] hover:border-red-500/20'
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-slate-400">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
