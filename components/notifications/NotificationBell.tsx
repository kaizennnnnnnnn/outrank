'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon } from '@/components/ui/Icons';

interface NotificationBellProps {
  count: number;
}

export function NotificationBell({ count }: NotificationBellProps) {
  return (
    <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-[#1e1e30] transition-colors">
      <motion.div
        animate={count > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
        key={count}
      >
        <BellIcon size={20} className="text-slate-400" />
      </motion.div>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
