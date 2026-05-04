'use client';

/**
 * Editorial bottom tab bar. Same shape as the existing MobileNav (5
 * slots, orb-FAB-as-center) but typeset as a periodical:
 *   - serif italic for the active tab
 *   - sans body for inactive
 *   - tiny accent dot under the active tab
 *
 * Routes match the existing MobileNav so deep links keep working. The
 * orb FAB still routes to /orb but the editorial design treats it as
 * a textual "Orb" tab rather than the raised pedestal — the visual
 * uniformity is part of the magazine grammar.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  href:  string;
  label: string;
}

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Home' },
  { href: '/compete',   label: 'Compete' },
  { href: '/orb',       label: 'Orb' },
  { href: '/feed',      label: 'Feed' },
  { href: '/profile',   label: 'You' },
];

export function EditorialTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
      style={{
        background: 'var(--b-paper)',
        borderTop: '1px solid var(--b-rule)',
      }}
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '12px 0 18px',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href));
          return (
            <li key={t.href} style={{ position: 'relative' }}>
              <Link
                href={t.href}
                className={cn('font-display', 'block')}
                style={{
                  fontStyle: active ? 'italic' : 'normal',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  color: active ? 'var(--b-ink)' : 'var(--b-ink-40)',
                  padding: '4px 6px',
                  textDecoration: 'none',
                }}
              >
                {t.label}
              </Link>
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--b-accent)',
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
