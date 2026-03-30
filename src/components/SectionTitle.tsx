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
      <p className="font-arabic text-gold text-2xl mb-2">{arabic}</p>
    )}
    <h2 className="text-3xl md:text-4xl font-heading font-bold text-cream mb-3">
      {title}
    </h2>
    {subtitle && (
      <p className={`max-w-2xl mx-auto ${subtitleClassName || "text-muted-foreground"}`}>
        {subtitle}
      </p>
    )}
    <div className="section-divider mt-6" />
  </motion.div>
));

export default SectionTitle;
