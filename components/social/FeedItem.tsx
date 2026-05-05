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

/**
 * Editorial Direction B v2 legacy feed card. The dispatch list on the
 * /feed page renders its own dedicated DispatchCard / RecapFeedCard;
 * this component is kept around for any flow that still imports the
 * legacy shape so it typechecks and looks right.
 */
export function FeedItemCard({ item, currentUserId, onReact }: FeedItemProps) {
  const resolvedCat = item.categorySlug
    ? getCategoryBySlug(item.categorySlug)
    : item.categoryName
      ? getCategoryByName(item.categoryName)
      : undefined;
  const color = item.categoryColor || resolvedCat?.color || 'var(--b-accent)';

  return (
    <article
      style={{
        position: 'relative',
        padding: '14px 16px',
        background: 'transparent',
        borderTop: '1px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-rule)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/profile/${item.actorUsername}`} style={{ flexShrink: 0 }}>
          <Avatar src={item.actorAvatar} alt={item.actorUsername} size="md" />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/profile/${item.actorUsername}`}
            className="font-display"
            style={{
              fontSize: 16,
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--b-ink)',
              textDecoration: 'none',
            }}
          >
            {item.actorUsername}
          </Link>
          <p
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--b-ink-40)', margin: '2px 0 0', letterSpacing: '0.04em' }}
          >
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
      </header>

      <div
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-ink)',
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          lineHeight: 1.5,
        }}
      >
        <span>{item.message}</span>
        {item.verified && <VerifiedBadge />}
      </div>

      {item.proofImageUrl && (
        <div style={{ marginTop: 10 }}>
          <ProofImage src={item.proofImageUrl} alt={`${item.actorUsername}'s proof`} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <ReactionBar
          reactions={item.reactions || {}}
          currentUserId={currentUserId}
          onReact={onReact}
        />
      </div>
    </article>
  );
}
