import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Star, Calendar, Sparkles } from "lucide-react";

interface UrsEvent {
  title: string;
  bengaliDate: string;
  arabicTitle: string;
  gregorianDate: string;
}

const ursEvents: UrsEvent[] = [
  { title: "মেজ শাহজাদার ওরশ", arabicTitle: "عُرْسِ شَاهزَادَه أَوْسَط", bengaliDate: "জ্যৈষ্ঠ ১১", gregorianDate: "2026-05-25" },
  { title: "বড় শাহজাদার ওরশ", arabicTitle: "عُرْسِ شَاهزَادَه أَكْبَر", bengaliDate: "শ্রাবণ ১৪", gregorianDate: "2026-07-29" },
  { title: "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন", arabicTitle: "مِيلَاد بَابَاجَان قِبْلَه", bengaliDate: "আশ্বিন ২২", gregorianDate: "2026-10-07" },
  { title: "বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ", arabicTitle: "عُرْسِ زَوْجَة بَابَاجَان قِبْلَه", bengaliDate: "পৌষ ৩০", gregorianDate: "2027-01-14" },
  { title: "গাউছে জামান মাইজভান্ডারী ওরশ", arabicTitle: "عُرْسِ غَوْثِ الزَّمَان مَائِجْبھَانْدَارِی", bengaliDate: "মাঘ ২২", gregorianDate: "2027-02-05" },
  { title: "বার্ষিক ওরশ", arabicTitle: "العُرْسُ السَّنَوِي", bengaliDate: "ফাল্গুন ১৬", gregorianDate: "2027-03-01" },
  { title: "পীর বাবা ভান্ডারীর ওরশ", arabicTitle: "عُرْسِ پِیر بَابَا بھَانْدَارِی", bengaliDate: "চৈত্র ১", gregorianDate: "2027-03-15" },
];

function getNextUrs(): UrsEvent & { targetDate: Date } {
  const now = new Date();
  for (const event of ursEvents) {
    const target = new Date(event.gregorianDate + "T00:00:00");
    if (target > now) {
      return { ...event, targetDate: target };
    }
  }
  // All events have passed — recycle event list for next year
  const first = ursEvents[0];
  const nextYearDate = first.gregorianDate.replace(/^\d{4}/, String(now.getFullYear() + 1));
  const target = new Date(nextYearDate + "T00:00:00");
  return { ...first, targetDate: target };
}

const monthlyUrsDates = [
  "2026-03-23", "2026-04-22", "2026-05-21", "2026-06-19",
  "2026-07-19", "2026-08-17", "2026-09-18", "2026-10-18",
  "2026-11-17", "2026-12-17", "2027-01-15", "2027-02-14"
];

function getNextMonthlyUrs(): Date {
  const now = new Date();
  for (const dateStr of monthlyUrsDates) {
    const target = new Date(dateStr + "T00:00:00");
    if (target > now) {
      return target;
    }
  }
  // All dates passed — use first date of next year cycle
  const firstDate = monthlyUrsDates[0];
  const nextYearDate = firstDate.replace(/^\d{4}/, String(now.getFullYear() + 1));
  return new Date(nextYearDate + "T00:00:00");
}

function calcTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const toBengaliNum = (n: number, padZero = true): string => {
  const str = padZero && n < 10 ? `0${n}` : String(n);
  return str.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
};

const TimeBox = memo(({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center shrink-0">
    {/* Wrapper with radial glow */}
    <div className="relative">
      {/* Radial glow behind box */}
      <div className="absolute -inset-1 xs:-inset-2 rounded-2xl bg-[radial-gradient(ellipse_at_center,hsl(40_45%_56%/0.12),transparent_70%)] blur-sm pointer-events-none" />
      <div className="relative bg-emerald border border-gold/30 sm:border-2 rounded-xl w-11 h-11 xs:w-14 xs:h-14 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.4),inset_0_-1px_4px_rgba(0,0,0,0.2)]">
        <div className="absolute top-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-t sm:border-t-2 border-l sm:border-l-2 border-gold/50 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-t sm:border-t-2 border-r sm:border-r-2 border-gold/50 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-2 h-2 sm:w-3 sm:h-3 border-b sm:border-b-2 border-l sm:border-l-2 border-gold/50 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 border-b sm:border-b-2 border-r sm:border-r-2 border-gold/50 rounded-br-xl" />
        <span className="text-base xs:text-2xl sm:text-4xl font-heading font-bold text-gold drop-shadow-[0_0_8px_hsl(40_45%_56%/0.3)] tabular-nums select-none transition-transform duration-200">
          {toBengaliNum(value)}
        </span>
      </div>
    </div>
    <span className="text-gold-light/80 text-[10px] xs:text-xs sm:text-sm mt-1 xs:mt-2 font-bengali">{label}</span>
  </div>
));
TimeBox.displayName = 'TimeBox';

const SmallTimeBox = memo(({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center shrink-0">
    <div className="relative">
      <div className="absolute -inset-1 rounded-xl bg-[radial-gradient(ellipse_at_center,hsl(40_45%_56%/0.08),transparent_70%)] blur-sm pointer-events-none" />
      <div className="relative bg-emerald border border-gold/20 rounded-lg w-9 h-9 xs:w-11 xs:h-11 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden shadow-[inset_0_1px_4px_rgba(0,0,0,0.35),inset_0_-1px_3px_rgba(0,0,0,0.15)]">
        <span className="text-sm xs:text-lg sm:text-2xl font-heading font-bold text-gold drop-shadow-sm tabular-nums select-none transition-transform duration-200">
          {toBengaliNum(value)}
        </span>
      </div>
    </div>
    <span className="text-gold-light/60 text-[9px] xs:text-[10px] sm:text-xs mt-1 font-bengali">{label}</span>
  </div>
));
SmallTimeBox.displayName = 'SmallTimeBox';

const UrsCountdown = () => {
  const [nextUrs, setNextUrs] = useState(getNextUrs);
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(nextUrs.targetDate));

  const [monthlyTarget, setMonthlyTarget] = useState(getNextMonthlyUrs);
  const [monthlyTimeLeft, setMonthlyTimeLeft] = useState(() => calcTimeLeft(monthlyTarget));

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      // Only recalculate next event when countdown reaches zero
      if (nextUrs.targetDate.getTime() <= now.getTime()) {
        const currentNextUrs = getNextUrs();
        setNextUrs(currentNextUrs);
        setTimeLeft(calcTimeLeft(currentNextUrs.targetDate));
      } else {
        setTimeLeft(calcTimeLeft(nextUrs.targetDate));
      }

      if (monthlyTarget.getTime() <= now.getTime()) {
        const currentMonthlyTarget = getNextMonthlyUrs();
        setMonthlyTarget(currentMonthlyTarget);
        setMonthlyTimeLeft(calcTimeLeft(currentMonthlyTarget));
      } else {
        setMonthlyTimeLeft(calcTimeLeft(monthlyTarget));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [nextUrs.targetDate, monthlyTarget]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="relative bg-card rounded-2xl p-4 xs:p-6 sm:p-10 overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:p-px before:bg-gradient-to-b before:from-gold/30 before:via-transparent before:to-gold/10 before:pointer-events-none before:-z-0 border border-gold/20">
        <div className="absolute inset-0 opacity-5 islamic-pattern pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-b-2 border-gold/20 rounded-b-full" />

        <div className="relative flex items-center justify-center gap-1 mb-4">
          <Star size={14} className="text-gold/60" />
          <Moon size={28} className="text-gold" />
          <Star size={14} className="text-gold/60" />
        </div>

        <p className="font-arabic text-gold/80 text-lg mb-2">عُرْس شَرِيف</p>

        <h3 className="text-cream font-heading font-bold text-xl mb-1">
          আসন্ন ওরশ শরীফ
        </h3>
        <p className="text-gold font-semibold text-base mb-1">{nextUrs.title}</p>
        <p className="font-arabic text-gold/60 text-sm mb-3">{nextUrs.arabicTitle}</p>
        
        {/* Premium Glowing Dual Date Badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8 px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-full bg-gradient-to-r from-gold/15 via-emerald-950/80 to-gold/15 border border-gold/30 backdrop-blur-md shadow-[0_4px_20px_rgba(180,142,73,0.18)] group hover:border-gold/60 transition-all duration-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gold/20 text-gold font-bengali text-xs sm:text-sm font-bold border border-gold/40 shadow-inner">
            <Calendar className="h-3.5 w-3.5 text-gold animate-pulse" />
            <span>বাংলা: {nextUrs.bengaliDate}</span>
          </div>
          <span className="text-gold/40 text-xs hidden xs:inline">•</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald/70 text-cream/90 font-bengali text-xs sm:text-sm font-medium border border-gold/20">
            <Sparkles className="h-3.5 w-3.5 text-gold-light" />
            <span>ইংরেজি: {new Date(nextUrs.gregorianDate + "T00:00:00").toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex justify-center items-center gap-1 xs:gap-2.5 sm:gap-5">
          <TimeBox value={timeLeft.days} label="দিন" />
          <div className="flex items-center text-gold/40 text-sm xs:text-lg sm:text-2xl font-bold pb-4">:</div>
          <TimeBox value={timeLeft.hours} label="ঘন্টা" />
          <div className="flex items-center text-gold/40 text-sm xs:text-lg sm:text-2xl font-bold pb-4">:</div>
          <TimeBox value={timeLeft.minutes} label="মিনিট" />
          <div className="flex items-center text-gold/40 text-sm xs:text-lg sm:text-2xl font-bold pb-4">:</div>
          <TimeBox value={timeLeft.seconds} label="সেকেন্ড" />
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/30" />
          <Star size={10} className="text-gold/40" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/30" />
        </div>
      </div>

      <div className="relative bg-card rounded-2xl p-6 overflow-hidden mt-6 max-w-lg mx-auto transform transition-all hover:scale-[1.02] before:absolute before:inset-0 before:rounded-2xl before:p-px before:bg-gradient-to-b before:from-gold/25 before:via-transparent before:to-gold/10 before:pointer-events-none before:-z-0 border border-gold/15">
        <div className="absolute inset-0 opacity-[0.03] islamic-pattern pointer-events-none" />
        <h4 className="text-cream text-base sm:text-lg font-heading font-bold mb-1">
          প্রতি আরবি মাসের ৩ তারিখ ওরশ
        </h4>
        <p className="text-gold font-semibold text-xs mb-1">
          পরবর্তী: {(() => {
            const opts = { day: 'numeric', month: 'long' } as const;
            try { return monthlyTarget.toLocaleDateString('bn-BD', opts); }
            catch { return monthlyTarget.toLocaleDateString(undefined, opts); }
          })()}
        </p>
        <p className="font-arabic text-gold/40 text-xs mb-4">عُرْس شَهْرِي</p>

        <div className="flex justify-center gap-2 sm:gap-4 items-start">
          <SmallTimeBox value={monthlyTimeLeft.days} label="দিন" />
          <div className="flex items-center text-gold/40 text-lg font-bold pb-4">:</div>
          <SmallTimeBox value={monthlyTimeLeft.hours} label="ঘন্টা" />
          <div className="flex items-center text-gold/40 text-lg font-bold pb-4">:</div>
          <SmallTimeBox value={monthlyTimeLeft.minutes} label="মিনিট" />
          <div className="flex items-center text-gold/40 text-lg font-bold pb-4">:</div>
          <SmallTimeBox value={monthlyTimeLeft.seconds} label="সেকেন্ড" />
        </div>
      </div>
    </motion.div>
  );
};

export default UrsCountdown;
