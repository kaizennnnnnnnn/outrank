'use client';

import { Avatar } from '@/components/ui/Avatar';
import { ReactionBar } from './ReactionBar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ProofImage, VerifiedBadge } from './ProofImage';
import { FeedItem as FeedItemType } from '@/types/feed';
import { formatRelativeTime } from '@/lib/utils';
import { getCategoryByName, getCategoryBySlug } from '@/constants/categories';
import Link from 'next/link';

interface FeedItemProps {
  item: FeedItemType;
  currentUserId: string;
  onReact: (emoji: string) => void;
}

export function FeedItemCard({ item, currentUserId, onReact }: FeedItemProps) {
  const resolvedCat = item.categorySlug
    ? getCategoryBySlug(item.categorySlug)
    : item.categoryName
      ? getCategoryByName(item.categoryName)
      : undefined;
  const color = item.categoryColor || resolvedCat?.color || '#f97316';
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
        <CategoryIcon
          slug={item.categorySlug}
          name={item.categoryName}
          icon={item.categoryIcon || ''}
          color={color}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="text-sm text-slate-300 flex items-center gap-2 flex-wrap">
        <span>{item.message}</span>
        {item.verified && <VerifiedBadge />}
      </div>

      {item.proofImageUrl && (
        <ProofImage src={item.proofImageUrl} alt={`${item.actorUsername}'s proof`} />
      )}

      {/* Reactions */}
      <ReactionBar
        reactions={item.reactions || {}}
        currentUserId={currentUserId}
        onReact={onReact}
      />
    </div>
  );
}
