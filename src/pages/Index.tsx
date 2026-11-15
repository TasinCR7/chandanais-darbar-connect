import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, BookOpen, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-darbar.webp";
import SectionTitle from "@/components/SectionTitle";
import EventCard from "@/components/EventCard";
import UrsCountdown from "@/components/UrsCountdown";
import SEO from "@/components/SEO";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Bell, Info, MapPin, Mail, Phone, User } from "lucide-react";

const upcomingEvents = [
  { title: "বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ", date: "পৌষ ৩০", calendarType: "bengali" as const },
  { title: "গাউছে জামান মাইজভান্ডারী ওরশ", date: "মাঘ ২২", calendarType: "bengali" as const },
  { title: "বার্ষিক ওরশ", date: "ফাল্গুন ১৬", calendarType: "bengali" as const },
  { title: "পীর বাবা ভান্ডারীর ওরশ", date: "চৈত্র ১", calendarType: "bengali" as const },
  { title: "মেজ শাহজাদার ওরশ", date: "জ্যৈষ্ঠ ১১", calendarType: "bengali" as const },
  { title: "বড় শাহজাদার ওরশ", date: "শ্রাবণ ১৪", calendarType: "bengali" as const },
  { title: "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন", date: "আশ্বিন ২২", calendarType: "bengali" as const },
];

const Index = () => {
  const { data: detailedNotices = [] } = useQuery({
    queryKey: ['detailed_notices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notices')
        .select('id, title, message, created_at, is_active, type')
        .eq('type', 'detailed')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      const list = (data as Tables<"notices">[]) ?? [];
      if (typeof window !== 'undefined' && list.length > 0) {
        try {
          localStorage.setItem('detailed_notices_cache', JSON.stringify(list));
        } catch (e) { console.warn("Cache write warning", e); }
      }
      return list;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('detailed_notices_cache');
          if (cached) return JSON.parse(cached);
        } catch (e) { return undefined; }
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
  const homeFaq = [
    {
      question: "চন্দনাইশ দরবার শরীফ কোথায় অবস্থিত?",
      answer: "চন্দনাইশ দরবার শরীফ চট্টগ্রাম জেলার চন্দনাইশ উপজেলায় অবস্থিত। এটি গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর পবিত্র মাজার শরীফ।"
    },
    {
      question: "চন্দনাইশ দরবার শরীফের বার্ষিক ওরশ কবে অনুষ্ঠিত হয়?",
      answer: "প্রতি বছর ১৬ই ফাল্গুন গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী (রাঃ) এর পবিত্র বার্ষিক ওরশ শরীফ মহাসমারোহে অনুষ্ঠিত হয়।"
    },
    {
      question: "চন্দনাইশ দরবার শরীফের প্রতিষ্ঠাতা কে?",
      answer: "এই পবিত্র দরবার শরীফের প্রতিষ্ঠাতা হলেন মাইজভান্ডারী সিলসিলার অন্যতম মহান সাধক গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ)।"
    }
  ];

  return (
    <div>
      <SEO
        title="চন্দনাইশ দরবার শরীফ | চট্টগ্রামের আধ্যাত্মিক স্থান, চন্দনাইশের মাজার, হযরত আবদুল লতিফ শাহ্ (রাঃ) এর মাজার শরীফ, চট্টগ্রাম"
        description="চন্দনাইশ দরবার শরীফ — চট্টগ্রামের অন্যতম পবিত্র আধ্যাত্মিক স্থান ও গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ (রাঃ) এর মাজার শরীফ। চন্দনাইশের মাজার, বাংলাদেশের আধ্যাত্মিক স্থান, চট্টগ্রামের বিখ্যাত দরবার, ওরশ শরীফ, ফাতেহা ও সুফি আধ্যাত্মিক কেন্দ্র। চন্দনাইশ, চট্টগ্রাম।"
        keywords="দরবার শরীফ, চন্দনাইশ দরবার শরীফ, চন্দনাইশের মাজার, চন্দনাইশ মাজার, হযরত আবদুল লতিফ শাহ্, চট্টগ্রামের দরবার, বাংলাদেশের সেরা মাজার, মাজার, চট্টগ্রামের মাজার, চট্টগ্রামের আধ্যাত্মিক স্থান, আধ্যাত্মিক স্থান, বাংলাদেশের আধ্যাত্মিক স্থান, চট্টগ্রামের দর্শনীয় আধ্যাত্মিক স্থান, সুফি আধ্যাত্মিক কেন্দ্র, জিয়ারতের স্থান, চট্টগ্রাম দরবার শরীফ, গাউছে জামান চন্দনাইশী, মাইজভান্ডারী দরবার শরীফ, Chandanaish Darbar Sharif, Chandanaish Mazar Sharif, Spiritual place in Chittagong, Spiritual places in Bangladesh"
        canonical="/"
        faq={homeFaq}
      />
      <section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden gpu-smooth">
        <img 
          src={heroImage}
          alt="চন্দনাইশ দরবার শরীফ হিরো ইমেজ"
          className="absolute inset-0 w-full h-full object-cover object-center"
          fetchPriority="high"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-background" />
        {/* Radial gold tint overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(40_45%_56%/0.08)_0%,_transparent_70%)]" />

        {/* Floating Gold Particles (100% GPU-accelerated CSS) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-gold/50 css-particle"
              style={{
                left: `${15 + i * 14}%`,
                bottom: '-5%',
                animationDuration: `${7 + i * 2}s`,
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          {/* Soft ambient halo behind hero text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[540px] h-[240px] rounded-full bg-gold/10 blur-[90px] pointer-events-none -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Ornate Bismillah Frame */}
            <motion.div
              className="inline-flex items-center gap-3 px-5 py-1.5 rounded-full bg-black/45 border border-gold/30 backdrop-blur-md mb-5 shadow-[0_0_24px_hsl(40_45%_56%/0.18)]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: 0.2 }}
            >
              <span className="text-gold/60 text-xs">✦</span>
              <p className="font-arabic text-gold text-base md:text-2xl arabic-glow leading-none py-0.5">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <span className="text-gold/60 text-xs">✦</span>
            </motion.div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold mb-4 leading-tight px-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-cream to-gold drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] animate-text-shimmer">
              চন্দনাইশ দরবার শরীফ
            </h1>

            <motion.h2 
              className="text-gold text-sm sm:text-base md:text-xl mb-4 font-semibold tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald/60 border border-gold/25 backdrop-blur-sm">
                <Sparkles size={14} className="text-gold" />
                সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
                <Sparkles size={14} className="text-gold" />
              </span>
            </motion.h2>

            <p className="text-cream/95 text-base sm:text-lg md:text-2xl font-medium leading-relaxed px-4 max-w-3xl mx-auto mb-9 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর পবিত্র দরবার
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row flex-wrap gap-3.5 justify-center items-center"
          >
            <Link
              to="/about"
              className="w-full sm:w-auto bg-gold-gradient text-primary-foreground px-8 py-3.5 rounded-xl font-bold gold-glow-hover transition-all duration-300 inline-flex items-center justify-center gap-2 btn-shimmer shadow-lg"
            >
              দরবার সম্পর্কে জানুন
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/events"
              className="w-full sm:w-auto bg-black/45 backdrop-blur-md border border-gold/45 text-gold px-8 py-3.5 rounded-xl font-semibold hover:bg-gold/15 hover:border-gold transition-all duration-300 inline-flex items-center justify-center gap-2 group"
            >
              ওরশের তারিখসমূহ
              <ArrowRight size={15} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
            </Link>
            <Link
              to="/hadia"
              className="w-full sm:w-auto bg-emerald/80 backdrop-blur-md border border-gold/35 text-cream hover:text-gold px-7 py-3.5 rounded-xl font-semibold hover:border-gold/60 transition-all duration-300 inline-flex items-center justify-center gap-2"
            >
              হাদিয়া ও নজরানা
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold/50 font-bold">নিচে দেখুন</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-10 bg-gradient-to-b from-gold/50 to-transparent"
          />
        </motion.div>
      </section>

      {/* Welcome / About Section */}
      <section className="py-20 islamic-pattern relative">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="اَلسَّلَامُ عَلَيْكُمْ"
            title="দরবার শরীফে স্বাগতম"
            subtitle="চন্দনাইশ দরবার শরীফ মাইজভান্ডারী তরিকার একটি পবিত্র স্থান, যেখানে আধ্যাত্মিক জ্ঞান ও ঐতিহ্য সংরক্ষিত হয়ে আসছে।"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="royal-card p-8 md:p-12 relative overflow-hidden">
              {/* Decorative corner borders */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold/40 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold/40 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold/40 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold/40 rounded-br-lg pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-light to-emerald border border-gold/35 flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_hsl(40_45%_56%/0.2)]">
                <Star size={24} className="text-gold fill-gold/20" />
              </div>

              <p className="text-cream/95 text-base sm:text-lg leading-relaxed mb-6">
                গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) 
                ছিলেন মাইজভান্ডারী সিলসিলার একজন মহান আউলিয়া। তাঁর প্রতিষ্ঠিত এই দরবার শরীফ 
                আজও ভক্তদের আধ্যাত্মিক পথপ্রদর্শনের কেন্দ্রবিন্দু হিসেবে কাজ করে যাচ্ছে।
              </p>

              <div className="inline-block px-5 py-3 rounded-xl bg-emerald/40 border border-gold/20 mb-8">
                <p className="text-gold-light/90 text-sm sm:text-base font-medium">
                  বর্তমানে শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভান্ডারী (মাদ্দাঃ) 
                  এই দরবারের খেদমত পরিচালনা করছেন।
                </p>
              </div>

              <div>
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gold/10 border border-gold/35 text-gold hover:bg-gold/20 hover:border-gold font-bold transition-all group shadow-md"
                >
                  <BookOpen size={20} className="group-hover:scale-110 transition-transform" />
                  গাউছে জামানের পূর্ণাঙ্গ জীবনী বই পড়ুন
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Urs Countdown */}
      <section className="py-20 bg-card/60 border-y border-gold/15 relative">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="ওরশ কাউন্টডাউন"
            subtitle="পরবর্তী ওরশ শরীফ পর্যন্ত সময় বাকি"
          />
          <UrsCountdown />
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 islamic-pattern">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="আসন্ন ওরশ ও অনুষ্ঠান"
            subtitle="দরবার শরীফের গুরুত্বপূর্ণ আসন্ন অনুষ্ঠানসমূহ"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {upcomingEvents.map((event, i) => (
              <EventCard key={i} {...event} index={i} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 hover:border-gold/50 transition-all duration-300 text-sm font-semibold"
            >
              সকল অনুষ্ঠান দেখুন <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Dual Spiritual Services Showcase: QnA & Hadia */}
      <section className="py-16 md:py-24 bg-card/50 border-t border-gold/15 islamic-pattern">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* QnA Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="royal-card p-8 md:p-10 text-center flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <div>
                <span className="inline-block px-4 py-1 rounded-full bg-gold/10 border border-gold/25 font-arabic text-gold text-base md:text-lg mb-4">
                  الأسئلة والشكاوى
                </span>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-3">
                  প্রশ্ন-উত্তর ও অভিযোগ
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
                  শরিয়তের যেকোনো বিষয়ে আলেম সাহেবকে প্রশ্ন করুন অথবা দরবার শরীফ সংক্রান্ত আপনার কোনো অভিযোগ বা মতামত থাকলে আমাদের সরাসরি জানান।
                </p>
              </div>
              <div>
                <Link
                  to="/qna"
                  className="w-full sm:w-auto border border-gold/45 bg-gold/10 text-gold px-7 py-3 rounded-xl font-semibold hover:bg-gold/20 hover:border-gold transition-all duration-300 inline-flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <Info size={18} />
                  প্রশ্ন বা অভিযোগ জানান
                </Link>
              </div>
            </motion.div>

            {/* Hadia & Nazrana Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="royal-card p-8 md:p-10 text-center flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
              <div>
                <span className="inline-block px-4 py-1 rounded-full bg-gold/15 border border-gold/30 font-arabic text-gold text-base md:text-lg mb-4">
                  صَدَقَة وَ هَدِيَّة
                </span>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-3">
                  হাদিয়া ও নজরানা
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
                  দরবার শরীফের খেদমত, লঙ্গরখানা ও উন্নয়নমূলক কাজে আপনার পবিত্র হাদিয়া ও নজরানা অনলাইনের মাধ্যমে সহজেই প্রদান করুন।
                </p>
              </div>
              <div>
                <Link
                  to="/hadia"
                  className="w-full sm:w-auto bg-gold-gradient text-primary-foreground px-8 py-3 rounded-xl font-bold gold-glow-hover transition-all duration-300 inline-flex items-center justify-center gap-2 btn-shimmer"
                >
                  হাদিয়া দিন
                  <ArrowRight size={18} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Detailed Notices Section (moved to the end of the homepage) */}
      {detailedNotices.length > 0 && (
        <section className="py-12 bg-background relative overflow-hidden gpu-smooth">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col gap-6">
              {detailedNotices.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="royal-card p-6 md:p-8 relative group"
                >
                  <div className="absolute top-0 right-0 p-3 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Bell size={48} className="text-gold md:w-16 md:h-16" />
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                      <Info className="text-gold h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-heading font-bold text-cream group-hover:text-gold transition-colors font-bangla">
                        {n.title}
                      </h3>
                      <p className="text-[10px] text-gold/60 font-bold uppercase tracking-widest mt-1">
                        ঘোষিত: {n.created_at ? (() => {
                          const date = new Date(n.created_at);
                          const opts = { day: 'numeric', month: 'long', year: 'numeric' } as const;
                          try { return date.toLocaleDateString('bn-BD', opts); }
                          catch { return date.toLocaleDateString(undefined, opts); }
                        })() : 'অজানা তারিখ'}
                      </p>
                    </div>
                  </div>
                  {n.message && (
                    <div className="text-foreground/85 leading-relaxed font-bangla text-base md:text-lg border-l-2 border-gold/30 pl-6 py-2.5 bg-white/[0.03] rounded-r-2xl">
                      {n.message}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & Important Phone Numbers Section */}
      <section className="py-16 md:py-20 bg-background relative overflow-hidden border-t border-gold/15">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <SectionTitle
            title="যোগাযোগ ও জরুরি নম্বর"
            subtitle="দরবার শরীফের ঠিকানা এবং সরাসরি যোগাযোগের নম্বরসমূহ"
          />

          {/* Top Row: Address & Email side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Address */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="royal-card p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-light to-emerald border border-gold/35 flex items-center justify-center text-gold shrink-0 shadow-inner">
                <MapPin className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs font-bold text-gold/80 mb-0.5 uppercase tracking-wider">ঠিকানা</p>
                <h4 className="text-cream font-heading font-bold text-sm sm:text-base leading-snug">
                  চন্দনাইশ দরবার শরীফ, চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ
                </h4>
              </div>
            </motion.div>

            {/* Card 2: Email */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="royal-card p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-light to-emerald border border-gold/35 flex items-center justify-center text-gold shrink-0 shadow-inner">
                <Mail className="w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gold/80 mb-0.5 uppercase tracking-wider">ইমেইল</p>
                <a 
                  href="mailto:info@chandanaishdarbar.com" 
                  className="text-cream font-heading font-bold text-sm sm:text-base leading-snug hover:text-gold transition-colors block tracking-wide break-all"
                >
                  info@chandanaishdarbar.com
                </a>
              </div>
            </motion.div>
          </div>

          {/* Card 3: Important Phone Numbers Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="royal-card p-5 sm:p-7 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gold/20 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-gold" />
                </div>
                <h3 className="font-heading font-bold text-cream text-lg sm:text-xl tracking-wide">
                  গুরুত্বপূর্ণ ফোন নম্বর
                </h3>
              </div>
              <span className="text-[11px] text-gold/70 font-medium hidden sm:inline">
                কল করতে নম্বরের ওপর ট্যাপ করুন
              </span>
            </div>

            {/* 2x2 Contacts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Contact 1 */}
              <a href="tel:+8801714338533" className="group bg-black/40 border border-gold/20 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gold/50 hover:bg-gold/[0.04] transition-all shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald/70 border border-gold/30 flex items-center justify-center text-gold shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gold/75 mb-0.5">যোগাযোগ</p>
                    <h5 className="font-heading font-bold text-cream text-sm mb-0.5 group-hover:text-gold-light transition-colors">শাহজাদা বাহাদুর শাহ</h5>
                    <span className="font-mono font-bold text-gold text-xs tracking-wide block">
                      +8801714338533
                    </span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold font-semibold group-hover:bg-gold group-hover:text-primary-foreground transition-colors">
                  কল
                </span>
              </a>

              {/* Contact 2 */}
              <a href="tel:+8801726285000" className="group bg-black/40 border border-gold/20 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gold/50 hover:bg-gold/[0.04] transition-all shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald/70 border border-gold/30 flex items-center justify-center text-gold shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gold/75 mb-0.5">যোগাযোগ</p>
                    <h5 className="font-heading font-bold text-cream text-sm mb-0.5 group-hover:text-gold-light transition-colors">শাহজাদা জাহাঙ্গীর শাহ</h5>
                    <span className="font-mono font-bold text-gold text-xs tracking-wide block">
                      +8801726285000
                    </span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold font-semibold group-hover:bg-gold group-hover:text-primary-foreground transition-colors">
                  কল
                </span>
              </a>

              {/* Contact 3 */}
              <a href="tel:+8801717621418" className="group bg-black/40 border border-gold/20 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gold/50 hover:bg-gold/[0.04] transition-all shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald/70 border border-gold/30 flex items-center justify-center text-gold shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gold/75 mb-0.5">যোগাযোগ</p>
                    <h5 className="font-heading font-bold text-cream text-sm mb-0.5 group-hover:text-gold-light transition-colors">শাহজাদা পারভেজ শাহ</h5>
                    <span className="font-mono font-bold text-gold text-xs tracking-wide block">
                      +8801717621418
                    </span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold font-semibold group-hover:bg-gold group-hover:text-primary-foreground transition-colors">
                  কল
                </span>
              </a>

              {/* Contact 4 */}
              <a href="tel:+8801622721996" className="group bg-black/40 border border-gold/20 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gold/50 hover:bg-gold/[0.04] transition-all shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald/70 border border-gold/30 flex items-center justify-center text-gold shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gold/75 mb-0.5">কারিগরি সহায়তা</p>
                    <h5 className="font-heading font-bold text-cream text-sm leading-snug mb-0.5 group-hover:text-gold-light transition-colors">
                      ওয়েবসাইট ডেভেলপার (তাসিন)
                    </h5>
                    <span className="font-mono font-bold text-gold text-xs tracking-wide block">
                      +8801622721996
                    </span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold font-semibold group-hover:bg-gold group-hover:text-primary-foreground transition-colors">
                  কল
                </span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
