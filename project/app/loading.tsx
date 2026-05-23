'use client';

import { motion } from 'motion/react';
import BrandLogo from '@/components/BrandLogo';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-card rounded-3xl px-8 py-7 flex flex-col items-center text-center gap-3"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl bg-[#2A4365]/10 border border-[#2A4365]/20 flex items-center justify-center"
        >
          <BrandLogo size={30} />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Loading your family space</p>
          <p className="text-xs text-gray-500">We&apos;re syncing the latest updates.</p>
        </div>
        <motion.div
          animate={{ width: ['30%', '75%', '30%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="h-1.5 w-32 rounded-full bg-[#2A4365]/15 overflow-hidden"
        />
      </motion.div>
    </div>
  );
}
