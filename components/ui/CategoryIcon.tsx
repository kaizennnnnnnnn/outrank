'use client';

import { cn } from '@/lib/utils';
import { getCategoryIconComponent } from './CategoryIcons';
import { resolveSlug } from '@/constants/categories';

interface CategoryIconProps {
  icon: string; // legacy prop — kept for backward compat, not used
  color: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  className?: string;
  slug?: string;
  name?: string; // when slug is missing, resolved from display name
}

const sizeMap = {
  sm: { box: 32, icon: 18 },
  md: { box: 40, icon: 22 },
  lg: { box: 56, icon: 30 },
};

/**
 * Category mark — flat editorial glyph in the category color.
 *
 * The previous version was a layered "gemstone" tile (gradient base +
 * radial spotlight + rim shadow + specular sheen + drop-shadow glow).
 * Beautiful but visually loud, and out of place against the new paper-
 * and-ink editorial chrome — every screen with a CategoryIcon was the
 * one place still glowing on the page.
 *
 * Now the component is just a square hairline frame around the unique
 * SVG glyph for that slug, tinted in the category color. Selected
 * state inverts to filled-color background with paper-color icon, so
 * pickers still register a clear "chosen" affordance without the glow.
 */
export function CategoryIcon({ color, size = 'md', selected, className, slug, name }: CategoryIconProps) {
  const s = sizeMap[size];
  const resolvedSlug = resolveSlug(slug, name) || 'generic';
  const IconComponent = getCategoryIconComponent(resolvedSlug);

  return (
    <span
      className={cn('inline-flex items-center justify-center flex-shrink-0', className)}
      style={{
        width: s.box,
        height: s.box,
        background: selected ? color : 'transparent',
        border: selected ? `1px solid ${color}` : `1px solid var(--b-rule)`,
        borderLeft: selected ? `1px solid ${color}` : `2px solid ${color}`,
        color: selected ? 'var(--b-paper)' : color,
        transition: 'background 180ms, border-color 180ms',
      }}
    >
      <IconComponent size={s.icon} />
    </span>
  );
}
