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
    transition={{ duration: 0.6, delay: index * 0.1 }}
    className="relative overflow-hidden rounded-lg group"
  >
    {/* Top gradient border accent */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    {/* Card body with glassmorphism */}
    <div className="bg-card/40 border border-gold/20 rounded-lg p-5 hover:border-gold/50 transition-colors duration-300">
      {/* Decorative star — top-right, visible on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <Star size={12} className="text-gold/50 fill-gold/20" />
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-emerald/50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald transition-colors duration-300">
          <Calendar
            size={20}
            className="text-gold transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          />
        </div>
        <div>
          <h3 className="text-cream font-heading font-semibold text-sm mb-1">
            {title}
          </h3>
          <p className="text-gold text-xs">
            {date}
            <span className="text-muted-foreground ml-2">
              ({calendarType === "bengali" ? "বাংলা" : "হিজরি"})
            </span>
          </p>
        </div>
      </div>
    </div>
  </motion.div>
));

export default EventCard;
