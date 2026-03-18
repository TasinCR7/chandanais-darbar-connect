import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Star } from "lucide-react";

interface UrsEvent {
  title: string;
  bengaliDate: string;
  arabicTitle: string;
  gregorianDate: string;
}

const ursEvents: UrsEvent[] = [
  { title: "মেজ শাহজাদার ওরশ", arabicTitle: "عُرْسِ شَاهزَادَه أَوْسَط", bengaliDate: "জৈষ্ঠ ১১", gregorianDate: "2026-05-25" },
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
  const first = ursEvents[0];
  const nextYear = now.getFullYear() + 1;
  const target = new Date(`${nextYear}-04-14T00:00:00`);
  return { ...first, targetDate: target };
}

function getNextMonthlyUrs(): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat('en-US', { calendar: 'islamic-umalqura', day: 'numeric' });
  
  for (let i = 0; i < 35; i++) {
    if (formatter.format(target) === '3') {
      if (target.getTime() + 24 * 60 * 60 * 1000 > now.getTime()) {
        return target;
      }
    }
    target.setDate(target.getDate() + 1);
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // fallback
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

const toBengaliNum = (n: number): string =>
  String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const TimeBox = ({ value, label }: { value: number; label: string }) => (
  <motion.div
    className="flex flex-col items-center"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className="relative bg-emerald border-2 border-gold/30 rounded-xl w-18 h-18 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold/50 rounded-tl-xl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold/50 rounded-tr-xl" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold/50 rounded-bl-xl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold/50 rounded-br-xl" />
      <span className="text-3xl sm:text-4xl font-heading font-bold text-gold drop-shadow-[0_0_8px_hsl(40_45%_56%/0.3)]">
        {toBengaliNum(value)}
      </span>
    </div>
    <span className="text-gold-light/80 text-xs sm:text-sm mt-2 font-bengali">{label}</span>
  </motion.div>
);

const SmallTimeBox = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="relative bg-emerald border border-gold/20 rounded-lg w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden shadow-inner">
      <span className="text-xl sm:text-2xl font-heading font-bold text-gold drop-shadow-sm">
        {toBengaliNum(value)}
      </span>
    </div>
    <span className="text-gold-light/60 text-[10px] sm:text-xs mt-1.5 font-bengali">{label}</span>
  </div>
);

const UrsCountdown = () => {
  const [nextUrs] = useState(getNextUrs);
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(nextUrs.targetDate));

  const [monthlyTarget] = useState(getNextMonthlyUrs);
  const [monthlyTimeLeft, setMonthlyTimeLeft] = useState(() => calcTimeLeft(monthlyTarget));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(calcTimeLeft(nextUrs.targetDate));
      setMonthlyTimeLeft(calcTimeLeft(monthlyTarget));
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
      <div className="relative bg-card border border-gold/20 rounded-2xl p-8 sm:p-10 overflow-hidden">
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
        <p className="font-arabic text-gold/60 text-sm mb-1">{nextUrs.arabicTitle}</p>
        <p className="text-muted-foreground text-sm mb-8">
          📅 {nextUrs.bengaliDate} • {new Date(nextUrs.gregorianDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <div className="flex justify-center gap-3 sm:gap-5">
          <TimeBox value={timeLeft.days} label="দিন" />
          <div className="flex items-center text-gold/40 text-2xl font-bold pt-[-20px]">:</div>
          <TimeBox value={timeLeft.hours} label="ঘন্টা" />
          <div className="flex items-center text-gold/40 text-2xl font-bold">:</div>
          <TimeBox value={timeLeft.minutes} label="মিনিট" />
          <div className="flex items-center text-gold/40 text-2xl font-bold">:</div>
          <TimeBox value={timeLeft.seconds} label="সেকেন্ড" />
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/30" />
          <Star size={10} className="text-gold/40" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/30" />
        </div>
      </div>

      <div className="relative bg-card border border-gold/15 rounded-2xl p-6 overflow-hidden mt-6 max-w-lg mx-auto transform transition-all hover:scale-[1.02]">
        <div className="absolute inset-0 opacity-[0.03] islamic-pattern pointer-events-none" />
        <h4 className="text-cream text-base sm:text-lg font-heading font-bold mb-1">
          প্রতি আরবি মাসের ৩ তারিখ ওরশ
        </h4>
        <p className="font-arabic text-gold/60 text-sm mb-4">عُرْس شھری</p>

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
