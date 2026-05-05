'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

// Inverted editorial tooltip: ink fill, paper text, mono digits.
export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 font-mono whitespace-nowrap z-50"
            style={{
              background: 'var(--b-ink)',
              color: 'var(--b-paper)',
              border: '1px solid var(--b-ink)',
              borderRadius: 0,
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 10px',
              fontWeight: 600,
            }}
          >
            {content}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1"
              style={{ background: 'var(--b-ink)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
