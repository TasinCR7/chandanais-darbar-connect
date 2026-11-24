export interface UrsEvent {
  title: string;
  bengaliDate: string;
  arabicTitle: string;
  gregorianDate: string;
}

export const ursEvents: UrsEvent[] = [
  { title: "মেজ শাহজাদার ওরশ", arabicTitle: "عُرْسِ شَاهزَادَه أَوْسَط", bengaliDate: "জ্যৈষ্ঠ ১১", gregorianDate: "2026-05-25" },
  { title: "বড় শাহজাদার ওরশ", arabicTitle: "عُرْسِ شَاهزَادَه أَكْبَر", bengaliDate: "শ্রাবণ ১৪", gregorianDate: "2026-07-29" },
  { title: "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন", arabicTitle: "مِيلَاد بَابَاجَان قِبْلَه", bengaliDate: "আশ্বিন ২২", gregorianDate: "2026-10-07" },
  { title: "বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ", arabicTitle: "عُرْسِ زَوْجَة بَابَاجَان قِبْلَه", bengaliDate: "পৌষ ৩০", gregorianDate: "2027-01-14" },
  { title: "গাউছে জামান মাইজভান্ডারী ওরশ", arabicTitle: "عُرْسِ غَوْثِ الزَّمَان مَائِجْبھَانْدَارِی", bengaliDate: "মাঘ ২২", gregorianDate: "2027-02-05" },
  { title: "বার্ষিক ওরশ", arabicTitle: "العُرْسُ السَّنَوِي", bengaliDate: "ফাল্গুন ১৬", gregorianDate: "2027-03-01" },
  { title: "পীর বাবা ভান্ডারীর ওরশ", arabicTitle: "عُرْسِ پِیر بَابَا بھَانْدَارِی", bengaliDate: "চৈত্র ১", gregorianDate: "2027-03-15" },
];

export function getNextUrs(now: Date = new Date()): UrsEvent & { targetDate: Date } {
  for (const event of ursEvents) {
    const target = new Date(event.gregorianDate + "T00:00:00");
    if (target > now) {
      return { ...event, targetDate: target };
    }
  }
  const currentYear = now.getFullYear();
  let best: (UrsEvent & { targetDate: Date }) | null = null;
  for (const event of ursEvents) {
    const monthDay = event.gregorianDate.slice(5);
    let candidate = new Date(`${currentYear}-${monthDay}T00:00:00`);
    if (candidate <= now) {
      candidate = new Date(`${currentYear + 1}-${monthDay}T00:00:00`);
    }
    if (!best || candidate < best.targetDate) {
      best = { ...event, targetDate: candidate };
    }
  }
  return best!;
}

export const monthlyUrsDates = [
  "2026-03-23", "2026-04-22", "2026-05-21", "2026-06-19",
  "2026-07-19", "2026-08-17", "2026-09-18", "2026-10-18",
  "2026-11-17", "2026-12-17", "2027-01-15", "2027-02-14"
];

export function getNextMonthlyUrs(now: Date = new Date()): Date {
  for (const dateStr of monthlyUrsDates) {
    const target = new Date(dateStr + "T00:00:00");
    if (target > now) {
      return target;
    }
  }
  const currentYear = now.getFullYear();
  let best: Date | null = null;
  for (const dateStr of monthlyUrsDates) {
    const monthDay = dateStr.slice(5);
    let candidate = new Date(`${currentYear}-${monthDay}T00:00:00`);
    if (candidate <= now) {
      candidate = new Date(`${currentYear + 1}-${monthDay}T00:00:00`);
    }
    if (!best || candidate < best) {
      best = candidate;
    }
  }
  return best!;
}
