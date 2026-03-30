import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

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
    className="bg-card border border-gold/20 rounded-lg p-5 hover:border-gold/50 gold-glow-hover transition-all duration-500 group"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-emerald/50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald transition-colors duration-300">
        <Calendar size={20} className="text-gold" />
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
  </motion.div>
));

export default EventCard;
