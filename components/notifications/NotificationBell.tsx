'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BBellGlyph } from '@/components/editorial/BGlyphs';

interface NotificationBellProps {
  count: number;
}

/**
 * Editorial Direction B v2 bell. Inherits ink color from the surrounding
 * masthead; unread badge uses the accent red. No dark surface — the bell
 * lives on paper.
 */
export function NotificationBell({ count }: NotificationBellProps) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        color: 'var(--b-ink)',
      }}
      aria-label="Notifications"
    >
      <motion.div
        animate={count > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.5 }}
        key={count}
      >
        <BBellGlyph size={18} />
      </motion.div>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="font-mono tabular"
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              background: 'var(--b-accent)',
              color: 'var(--b-paper)',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: 0,
            }}
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
