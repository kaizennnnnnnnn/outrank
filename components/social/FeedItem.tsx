'use client';

import { Avatar } from '@/components/ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { FeedItem as FeedItemType } from '@/types/feed';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface FeedItemProps {
  item: FeedItemType;
  currentUserId: string;
  onReact: (emoji: string) => void;
}

export function FeedItemCard({ item, currentUserId, onReact }: FeedItemProps) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${item.actorUsername}`}>
          <Avatar src={item.actorAvatar} alt={item.actorUsername} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${item.actorUsername}`}>
            <p className="text-sm font-semibold text-white hover:text-orange-400 transition-colors">
              {item.actorUsername}
            </p>
          </Link>
          <p className="text-xs text-slate-600">
            {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
          </p>
        </div>
        {(item.categorySlug || item.categoryIcon) && (
          <CategoryIcon
            slug={item.categorySlug}
            icon={item.categoryIcon || ''}
            color={item.categoryColor || '#f97316'}
            size="sm"
          />
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-slate-300">{item.message}</p>

      {/* Reactions */}
      <ReactionBar
        reactions={item.reactions || {}}
        currentUserId={currentUserId}
        onReact={onReact}
      />
    </div>
  );
}
