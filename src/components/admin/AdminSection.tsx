import React from 'react';
import { motion } from 'framer-motion';

interface AdminSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * AdminSection provides a consistent padded, glass‑morphism container for each admin tab.
 */
export default function AdminSection({ title, children }: AdminSectionProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card/45 backdrop-blur-xl border border-gold/15 rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -ml-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10 relative z-10">
        <div className="w-1.5 h-7 bg-gold-gradient rounded-full" />
        <h2 className="text-xl md:text-2xl font-heading font-bold text-cream tracking-wide">{title}</h2>
      </div>

      <div className="relative z-10 text-cream/90">
        {children}
      </div>
    </motion.section>
  );
}

