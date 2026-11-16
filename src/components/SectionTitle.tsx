import React from "react";
import { motion } from "framer-motion";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  arabic?: string;
  subtitleClassName?: string;
  as?: 'h1' | 'h2' | 'h3';
}

const SectionTitle = React.memo(({ title, subtitle, arabic, subtitleClassName, as: Tag = 'h2' }: SectionTitleProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="text-center mb-12"
  >
    {arabic && (
      <p
        className="font-arabic text-gold text-2xl mb-2"
        lang="ar"
        dir="rtl"
        style={{ textShadow: "0 0 20px hsl(40 45% 56% / 0.4), 0 0 40px hsl(40 45% 56% / 0.15)" }}
      >
        {arabic}
      </p>
    )}

    {/* Decorative ornament line with title */}
    <div className="flex items-center justify-center gap-3 mb-3">
      {/* Left ornament */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="w-8 sm:w-12 h-px bg-gradient-to-r from-transparent to-gold/40" />
        <span className="text-gold/40 text-xs">✦</span>
        <div className="w-4 sm:w-6 h-px bg-gold/30" />
        <span className="text-gold/60 text-sm">★</span>
      </div>

      {/* Title */}
      <Tag className="text-3xl md:text-5xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-cream to-gold">
        {title}
      </Tag>

      {/* Right ornament */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="text-gold/60 text-sm">★</span>
        <div className="w-4 sm:w-6 h-px bg-gold/30" />
        <span className="text-gold/40 text-xs">✦</span>
        <div className="w-8 sm:w-12 h-px bg-gradient-to-l from-transparent to-gold/40" />
      </div>
    </div>

    {subtitle && (
      <p className={`max-w-2xl mx-auto ${subtitleClassName || "text-muted-foreground"}`}>
        {subtitle}
      </p>
    )}
    <div className="section-divider mt-6" />
  </motion.div>
));

SectionTitle.displayName = 'SectionTitle';

export default SectionTitle;
