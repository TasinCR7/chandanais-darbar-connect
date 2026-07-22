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
        localStorage.setItem('detailed_notices_cache', JSON.stringify(list));
      }
      return list;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('detailed_notices_cache');
        if (cached) {
          try { return JSON.parse(cached); } catch (e) { return undefined; }
        }
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
        title="চন্দনাইশ দরবার শরীফ | চন্দনাইশের মাজার, হযরত আবদুল লতিফ শাহ্ (রাঃ) এর মাজার শরীফ, চট্টগ্রাম"
        description="চন্দনাইশ দরবার শরীফ — গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ (রাঃ) এর পবিত্র মাজার শরীফ। চন্দনাইশের মাজার, চট্টগ্রামের বিখ্যাত দরবার, ওরশ শরীফ, ফাতেহা ও সুফি আধ্যাত্মিক কেন্দ্র। চন্দনাইশ, চট্টগ্রাম।"
        keywords="দরবার শরীফ, চন্দনাইশ দরবার শরীফ, চন্দনাইশের মাজার, চন্দনাইশ মাজার, হযরত আবদুল লতিফ শাহ্, চট্টগ্রামের দরবার, বাংলাদেশের সেরা মাজার, মাজার, চট্টগ্রামের মাজার, চট্টগ্রাম দরবার শরীফ, গাউছে জামান চন্দনাইশী, মাইজভান্ডারী দরবার শরীফ, চন্দনাইশ দরবার শরীফের ইতিহাস, চন্দনাইশ দরবার শরীফের ওরশ, Chandanaish Darbar Sharif, Chandanaish Mazar Sharif, Famous Mazar in Chittagong Bangladesh"
        canonical="/"
        faq={homeFaq}
      />
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gpu-smooth">
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
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p 
              className="font-arabic text-gold text-base md:text-2xl mb-4 arabic-glow"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: 0.3 }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </motion.p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold mb-4 leading-tight px-2 bg-clip-text text-transparent bg-gradient-to-b from-white via-cream to-gold drop-shadow-sm animate-text-shimmer">
              চন্দনাইশ দরবার শরীফ
            </h1>
            <motion.h2 
              className="text-gold text-base md:text-xl mb-2 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles size={14} className="text-gold/50" />
                সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
                <Sparkles size={14} className="text-gold/50" />
              </span>
            </motion.h2>
            <p className="text-cream text-base md:text-2xl font-medium leading-relaxed px-4 max-w-3xl mx-auto mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর পবিত্র দরবার
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/about"
              className="bg-gold-gradient text-primary-foreground px-8 py-3 rounded-md font-semibold gold-glow-hover transition-all duration-300 inline-flex items-center justify-center gap-2 btn-shimmer"
            >
              দরবার সম্পর্কে জানুন
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/events"
              className="border border-gold/40 text-gold px-8 py-3 rounded-md font-semibold hover:bg-gold/10 transition-all duration-300 inline-flex items-center justify-center gap-2 group"
            >
              ওরশের তারিখসমূহ
              <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold/40 font-bold">নিচে দেখুন</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-12 bg-gradient-to-b from-gold/40 to-transparent"
          />
        </motion.div>
      </section>
      {/* Welcome / About Section */}
      <section className="py-20 islamic-pattern">
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
            <div className="bg-card border border-gold/20 rounded-lg p-8 md:p-12">
              <Star size={24} className="text-gold mx-auto mb-4" />
              <p className="text-foreground leading-relaxed mb-6">
                গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) 
                ছিলেন মাইজভান্ডারী সিলসিলার একজন মহান আউলিয়া। তাঁর প্রতিষ্ঠিত এই দরবার শরীফ 
                আজও ভক্তদের আধ্যাত্মিক পথপ্রদর্শনের কেন্দ্রবিন্দু হিসেবে কাজ করে যাচ্ছে।
              </p>
              <p className="text-muted-foreground text-sm">
                বর্তমানে শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভান্ডারী (মাদ্দাঃ) 
                এই দরবারের খেদমত পরিচালনা করছেন।
              </p>
              <div className="mt-8">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 text-gold hover:text-gold-light font-bold transition-all group"
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
      <section className="py-20 bg-card">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {upcomingEvents.map((event, i) => (
              <EventCard key={i} {...event} index={i} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/events"
              className="text-gold hover:text-gold-light transition-colors duration-300 text-sm inline-flex items-center gap-1"
            >
              সকল অনুষ্ঠান দেখুন <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* QnA Section */}
      <section className="py-12 md:py-20 bg-card">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-arabic text-gold text-lg md:text-xl mb-4">الأسئلة والشكاوى</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-4">
              প্রশ্ন-উত্তর ও অভিযোগ
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              শরিয়তের যেকোনো বিষয়ে আলেম সাহেবকে প্রশ্ন করুন অথবা দরবার শরীফ সংক্রান্ত আপনার কোনো অভিযোগ বা মতামত থাকলে আমাদের সরাসরি জানান।
            </p>
            <Link
              to="/qna"
              className="border border-gold/40 text-gold px-6 md:px-8 py-3 rounded-md font-semibold hover:bg-gold/10 transition-all duration-300 inline-flex items-center gap-2 text-sm md:text-base"
            >
              <Info size={18} />
              প্রশ্ন বা অভিযোগ জানান
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 islamic-pattern">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-arabic text-gold text-lg md:text-xl mb-4">صَدَقَة</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-4">
              হাদিয়া ও নজরানা
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              দরবার শরীফের খেদমতে আপনার হাদিয়া ও নজরানা প্রদান করুন।
            </p>
            <Link
              to="/hadia"
              className="bg-gold-gradient text-primary-foreground px-8 py-3 rounded-md font-semibold gold-glow-hover transition-all duration-300 animate-glow-pulse inline-block btn-shimmer"
            >
              হাদিয়া দিন
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Detailed Notices Section (moved to the end of the homepage) */}
      {detailedNotices.length > 0 && (
        <section className="py-12 bg-background relative overflow-hidden gpu-smooth">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-6">
              {detailedNotices.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-3xl p-6 md:p-8 relative group hover:border-gold/40 transition-all shadow-2xl"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Bell size={64} className="text-gold" />
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                      <Info className="text-gold h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-heading font-bold text-cream group-hover:text-gold transition-colors font-bangla">
                        {n.title}
                      </h3>
                      <p className="text-[10px] text-gold/50 font-bold uppercase tracking-widest mt-1">
                        ঘোষিত: {n.created_at ? new Date(n.created_at).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : 'অজানা তারিখ'}
                      </p>
                    </div>
                  </div>
                  {n.message && (
                    <div className="text-foreground/80 leading-relaxed font-bangla text-base md:text-lg border-l-2 border-gold/20 pl-6 py-2 bg-white/5 rounded-r-2xl">
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
      <section className="py-8 md:py-12 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-2xl space-y-4">
          {/* Card 1: Address */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-[#121212] border border-[#2d281e] rounded-xl p-4 sm:p-4.5 flex items-center gap-4 shadow-xl hover:border-gold/35 transition-all"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#191814] border border-[#3d3725] flex items-center justify-center text-gold shrink-0 shadow-inner">
              <MapPin className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#d4af37]" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-[#b59a59] mb-0.5">ঠিকানা</p>
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
            className="bg-[#121212] border border-[#2d281e] rounded-xl p-4 sm:p-4.5 flex items-center gap-4 shadow-xl hover:border-gold/35 transition-all"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#191814] border border-[#3d3725] flex items-center justify-center text-gold shrink-0 shadow-inner">
              <Mail className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#d4af37]" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-[#b59a59] mb-0.5">ইমেইল</p>
              <a 
                href="mailto:info@chandanaishdarbar.com" 
                className="text-cream font-heading font-bold text-sm sm:text-base leading-snug hover:text-gold transition-colors block tracking-wide break-all"
              >
                info@chandanaishdarbar.com
              </a>
            </div>
          </motion.div>

          {/* Card 3: Important Phone Numbers Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-[#101010] border border-[#2d281e] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-[#24211a] pb-3.5">
              <Phone className="w-5 h-5 text-[#d4af37]" />
              <h3 className="font-heading font-bold text-cream text-lg sm:text-xl tracking-wide">
                গুরুত্বপূর্ণ ফোন নম্বর
              </h3>
            </div>

            {/* 2x2 Contacts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact 1 */}
              <div className="bg-[#151515] border border-[#29251c] rounded-xl p-3.5 flex items-center gap-3 hover:border-gold/40 transition-all shadow-md">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1a1914] border border-[#3a3424] flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#b59a59] mb-0.5">যোগাযোগ</p>
                  <h5 className="font-heading font-bold text-cream text-xs sm:text-sm mb-0.5">শাহজাদা বাহাদুর শাহ</h5>
                  <a href="tel:+8801714338533" className="font-mono font-bold text-[#cbb06d] text-xs tracking-wide hover:underline block">
                    +8801714338533
                  </a>
                </div>
              </div>

              {/* Contact 2 */}
              <div className="bg-[#151515] border border-[#29251c] rounded-xl p-3.5 flex items-center gap-3 hover:border-gold/40 transition-all shadow-md">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1a1914] border border-[#3a3424] flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#b59a59] mb-0.5">যোগাযোগ</p>
                  <h5 className="font-heading font-bold text-cream text-xs sm:text-sm mb-0.5">শাহজাদা জাহাঙ্গীর শাহ</h5>
                  <a href="tel:+8801726285000" className="font-mono font-bold text-[#cbb06d] text-xs tracking-wide hover:underline block">
                    +8801726285000
                  </a>
                </div>
              </div>

              {/* Contact 3 */}
              <div className="bg-[#151515] border border-[#29251c] rounded-xl p-3.5 flex items-center gap-3 hover:border-gold/40 transition-all shadow-md">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1a1914] border border-[#3a3424] flex items-center justify-center text-gold shrink-0">
                  <Phone className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#b59a59] mb-0.5">যোগাযোগ</p>
                  <h5 className="font-heading font-bold text-cream text-xs sm:text-sm mb-0.5">শাহজাদা পারভেজ শাহ</h5>
                  <a href="tel:+8801717621418" className="font-mono font-bold text-[#cbb06d] text-xs tracking-wide hover:underline block">
                    +8801717621418
                  </a>
                </div>
              </div>

              {/* Contact 4 */}
              <div className="bg-[#151515] border border-[#29251c] rounded-xl p-3.5 flex items-center gap-3 hover:border-gold/40 transition-all shadow-md">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1a1914] border border-[#3a3424] flex items-center justify-center text-gold shrink-0">
                  <User className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#b59a59] mb-0.5">কারিগরি সহায়তা</p>
                  <h5 className="font-heading font-bold text-cream text-xs sm:text-sm leading-snug mb-0.5">
                    ওয়েবসাইট ডেভেলপার <br className="hidden sm:inline" /> (তাসিন)
                  </h5>
                  <a href="tel:+8801622721996" className="font-mono font-bold text-[#cbb06d] text-xs tracking-wide hover:underline block">
                    +8801622721996
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
