import React from "react";
import { motion } from "framer-motion";
import { Calendar, Star } from "lucide-react";

interface EventCardProps {
  title: string;
  date: string;
  calendarType: "bengali" | "islamic";
  index: number;
}

const EventCard = React.memo(({ title, date, calendarType, index }: EventCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="relative overflow-hidden rounded-2xl group h-full"
  >
    {/* Card body with royal glassmorphism */}
    <div className="royal-card h-full p-5 flex flex-col justify-between relative overflow-hidden">
      {/* Top gradient border accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Subtle corner ornaments */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
        <Star size={12} className="text-gold fill-gold/25" />
      </div>
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gold/5 blur-xl group-hover:bg-gold/15 transition-colors duration-500 pointer-events-none" />

      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-light/80 to-emerald border border-gold/30 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:border-gold/60 group-hover:shadow-[0_0_16px_hsl(40_45%_56%/0.25)] transition-all duration-300">
          <Calendar
            size={20}
            className="text-gold transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-cream font-heading font-bold text-sm sm:text-[15px] leading-snug mb-2 group-hover:text-gold-light transition-colors">
            {title}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-semibold">
            <span>{date}</span>
            <span className="text-gold/40">•</span>
            <span className="text-cream/75 text-[11px] font-normal">
              {calendarType === "bengali" ? "বাংলা" : "হিজরি"}
            </span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
));

export default EventCard;

