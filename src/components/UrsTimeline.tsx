import { motion } from "framer-motion";
import { Moon, Star, Calendar } from "lucide-react";

interface TimelineEvent {
  title: string;
  arabicTitle: string;
  bengaliDate: string;
  bengaliMonth: string;
  englishDate: string;
  isPast: boolean;
}

const timelineEvents: TimelineEvent[] = [
  {
    title: "বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ",
    arabicTitle: "عُرْسِ زَوْجَة بَابَاجَان قِبْلَه",
    bengaliDate: "৩০",
    bengaliMonth: "পৌষ",
    englishDate: "14 January",
    isPast: false,
  },
  {
    title: "গাউছে জামান মাইজভান্ডারী ওরশ",
    arabicTitle: "عُرْسِ غَوْثِ الزَّمَان مَائِجْبھَانْدَارِی",
    bengaliDate: "২২",
    bengaliMonth: "মাঘ",
    englishDate: "5 February",
    isPast: false,
  },
  {
    title: "বার্ষিক ওরশ",
    arabicTitle: "العُرْسُ السَّنَوِي",
    bengaliDate: "১৬",
    bengaliMonth: "ফাল্গুন",
    englishDate: "1 March",
    isPast: false,
  },
  {
    title: "পীর বাবা ভান্ডারীর ওরশ",
    arabicTitle: "عُرْسِ پِیر بَابَا بھَانْدَارِی",
    bengaliDate: "১",
    bengaliMonth: "চৈত্র",
    englishDate: "15 March",
    isPast: false,
  },
  {
    title: "মেজ শাহজাদার ওরশ",
    arabicTitle: "عُرْسِ شَاهزَادَه أَوْسَط",
    bengaliDate: "১১",
    bengaliMonth: "জৈষ্ঠ",
    englishDate: "25 May",
    isPast: false,
  },
  {
    title: "বড় শাহজাদার ওরশ",
    arabicTitle: "عُرْسِ شَاهزَادَه أَكْبَر",
    bengaliDate: "১৪",
    bengaliMonth: "শ্রাবণ",
    englishDate: "29 July",
    isPast: false,
  },
  {
    title: "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন",
    arabicTitle: "مِيلَاد بَابَاجَان قِبْلَه",
    bengaliDate: "২২",
    bengaliMonth: "আশ্বিন",
    englishDate: "7 October",
    isPast: false,
  },
];

const UrsTimeline = () => {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Central vertical line */}
      <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold/50 via-gold/20 to-gold/50 sm:-translate-x-px" />

      {timelineEvents.map((event, i) => {
        const isLeft = i % 2 === 0;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className={`relative flex items-start mb-10 sm:mb-12 ${
              isLeft ? "sm:flex-row" : "sm:flex-row-reverse"
            } flex-row`}
          >
            {/* Timeline node */}
            <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald border-2 border-gold/60 flex items-center justify-center shadow-[0_0_15px_hsl(40_45%_56%/0.2)]">
                <Moon size={16} className="text-gold" />
              </div>
            </div>

            {/* Content card */}
            <div
              className={`ml-16 sm:ml-0 sm:w-[calc(50%-2rem)] ${
                isLeft ? "sm:pr-4 sm:text-right" : "sm:pl-4 sm:text-left"
              }`}
            >
              <div className="relative bg-card border border-gold/15 rounded-xl p-5 hover:border-gold/30 transition-colors duration-300 group overflow-hidden">
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-[0.03] islamic-pattern pointer-events-none" />

                {/* Date badge */}
                <div
                  className={`flex items-center gap-2 mb-3 ${
                    isLeft ? "sm:justify-end" : "sm:justify-start"
                  }`}
                >
                  <Calendar size={13} className="text-gold/60" />
                  <span className="text-xs font-bengali bg-emerald/80 text-gold-light px-2.5 py-0.5 rounded-full border border-gold/20">
                    {event.bengaliDate} {event.bengaliMonth} • {event.englishDate}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-cream font-heading font-bold text-sm sm:text-base mb-1.5 group-hover:text-gold transition-colors duration-300">
                  {event.title}
                </h4>

                {/* Arabic subtitle */}
                <p className="font-arabic text-gold/50 text-sm leading-relaxed">
                  {event.arabicTitle}
                </p>

                {/* Decorative corner stars */}
                <Star
                  size={8}
                  className={`absolute top-2 text-gold/20 ${isLeft ? "sm:left-2 right-2" : "left-2"}`}
                />
                <Star
                  size={8}
                  className={`absolute bottom-2 text-gold/20 ${isLeft ? "sm:right-2 left-2" : "right-2"}`}
                />
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Bottom ornament */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/30" />
        <Star size={12} className="text-gold/40" />
        <Moon size={14} className="text-gold/50" />
        <Star size={12} className="text-gold/40" />
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/30" />
      </div>
    </div>
  );
};

export default UrsTimeline;
