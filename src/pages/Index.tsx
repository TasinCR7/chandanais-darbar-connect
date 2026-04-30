import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, BookOpen } from "lucide-react";
import heroImage from "@/assets/hero-new.png";
import SectionTitle from "@/components/SectionTitle";
import EventCard from "@/components/EventCard";
import UrsCountdown from "@/components/UrsCountdown";
import SEO from "@/components/SEO";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Info } from "lucide-react";

const upcomingEvents = [
  { title: "বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ", date: "পৌষ ৩০", calendarType: "bengali" as const },
  { title: "গাউছে জামান মাইজভান্ডারী ওরশ", date: "মাঘ ২২", calendarType: "bengali" as const },
  { title: "বার্ষিক ওরশ", date: "ফাল্গুন ১৬", calendarType: "bengali" as const },
  { title: "পীর বাবা ভান্ডারীর ওরশ", date: "চৈত্র ১", calendarType: "bengali" as const },
  { title: "মেজ শাহজাদার ওরশ", date: "জৈষ্ঠ ১১", calendarType: "bengali" as const },
  { title: "বড় শাহজাদার ওরশ", date: "শ্রাবণ ১৪", calendarType: "bengali" as const },
  { title: "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন", date: "আশ্বিন ২২", calendarType: "bengali" as const },
];

const Index = () => {
  const [detailedNotices, setDetailedNotices] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetailedNotices = async () => {
      const { data } = await ((supabase as any)
        .from('notices')
        .select('*')
        .eq('type', 'detailed')
        .eq('is_active', true)
        .order('created_at', { ascending: false }));
      if (data) setDetailedNotices(data);
    };
    fetchDetailedNotices();
  }, []);
  return (
    <div>
      <SEO
        title="চন্দনাইশ দরবার শরীফ | মাইজভান্ডারী তরিকা, চট্টগ্রাম"
        description="চন্দনাইশ দরবার শরীফ — হযরত আবদুল লতিফ শাহ্ (রাঃ) এর পবিত্র মাজার। ওরশ শরীফ, ইসলামি মাহফিল ও আধ্যাত্মিক কার্যক্রমের সময়সূচী জানুন। চন্দনাইশ, চট্টগ্রাম।"
        keywords="চন্দনাইশ দরবার শরীফ, Chandanaish Darbar Sharif, ওরশ শরীফ ২০২৬, মাইজভান্ডারী তরিকা, গাউছে জামান আবদুল লতিফ শাহ, আধ্যাত্মিক কেন্দ্র চট্টগ্রাম, চন্দনাইশ, চট্টগ্রাম দরবার, সুফিবাদ বাংলাদেশ, ইসলামি মাহফিল"
        canonical="/"
      />
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          role="img"
          aria-label="চন্দনাইশ দরবার শরীফ হিরো ইমেজ"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-background" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-arabic text-gold text-base md:text-2xl mb-4">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <h1 className="text-3xl md:text-6xl lg:text-7xl font-heading font-bold text-cream mb-4 leading-tight px-2">
              চন্দনাইশ দরবার শরীফ
            </h1>
            <h2 className="text-gold text-base md:text-xl mb-2 font-medium">
              সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
            </h2>
            <p className="text-cream text-base md:text-2xl font-medium leading-relaxed px-4 max-w-3xl mx-auto mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              গৌছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর পবিত্র দরবার
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
              className="bg-gold-gradient text-primary-foreground px-8 py-3 rounded-md font-semibold gold-glow-hover transition-all duration-300 inline-flex items-center justify-center gap-2"
            >
              দরবার সম্পর্কে জানুন
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/events"
              className="border border-gold/40 text-gold px-8 py-3 rounded-md font-semibold hover:bg-gold/10 transition-all duration-300 inline-flex items-center justify-center gap-2"
            >
              ওরশের তারিখসমূহ
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Detailed Notices Section */}
      {detailedNotices.length > 0 && (
        <section className="py-12 bg-background relative overflow-hidden">
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
                গৌছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) 
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
                  className="inline-flex items-center gap-2 text-gold hover:text-gold-light font-bold transition-all transition-colors group"
                >
                  <BookOpen size={20} className="group-hover:scale-110 transition-transform" />
                  গাউছেজামানের পূর্ণাঙ্গ জীবনী বই পড়ুন
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
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-arabic text-gold text-xl mb-4">الأسئلة والشكاوى</p>
            <h2 className="text-3xl font-heading font-bold text-cream mb-4">
              প্রশ্ন-উত্তর ও অভিযোগ
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              শরিয়তের যেকোনো বিষয়ে আলেম সাহেবকে প্রশ্ন করুন অথবা দরবার শরীফ সংক্রান্ত আপনার কোনো অভিযোগ বা মতামত থাকলে আমাদের সরাসরি জানান।
            </p>
            <Link
              to="/qna"
              className="border border-gold/40 text-gold px-8 py-3 rounded-md font-semibold hover:bg-gold/10 transition-all duration-300 inline-flex items-center gap-2"
            >
              <Info size={18} />
              প্রশ্ন বা অভিযোগ জানান
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 islamic-pattern">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-arabic text-gold text-xl mb-4">صَدَقَة</p>
            <h2 className="text-3xl font-heading font-bold text-cream mb-4">
              হাদিয়া ও নজরানা
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              দরবার শরীফের খেদমতে আপনার হাদিয়া ও নজরানা প্রদান করুন।
            </p>
            <Link
              to="/hadia"
              className="bg-gold-gradient text-primary-foreground px-8 py-3 rounded-md font-semibold gold-glow-hover transition-all duration-300 animate-glow-pulse inline-block"
            >
              হাদিয়া দিন
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
