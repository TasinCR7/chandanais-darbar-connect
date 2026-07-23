import React from "react";
import { motion } from "framer-motion";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  arabic?: string;
  subtitleClassName?: string;
}

const SectionTitle = React.memo(({ title, subtitle, arabic, subtitleClassName }: SectionTitleProps) => (
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

      {/* Title with shimmer */}
      <h2 className="text-3xl md:text-5xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-cream to-gold animate-shimmer">
        {title}
      </h2>

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

    {/* Shimmer keyframes */}
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .animate-shimmer {
        background-size: 200% auto;
        background-image: linear-gradient(
          90deg,
          hsl(0 0% 100%) 0%,
          hsl(36 33% 95%) 25%,
          hsl(40 45% 56%) 50%,
          hsl(36 33% 95%) 75%,
          hsl(0 0% 100%) 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 5s linear infinite;
      }
    `}</style>
  </motion.div>
));

export default SectionTitle;
