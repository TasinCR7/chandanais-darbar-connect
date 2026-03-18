import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import heroImage from "@/assets/hero-darbar.jpg";
import SectionTitle from "@/components/SectionTitle";
import EventCard from "@/components/EventCard";
import UrsCountdown from "@/components/UrsCountdown";
import SEO from "@/components/SEO";
import LatestNotice from "@/components/LatestNotice";

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
  return (
    <div>
      <SEO
        title="চন্দনাইশ দরবার শরীফ | সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া"
        description="চন্দনাইশ দরবার শরীফ - গৌছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর পবিত্র দরবার। ওরশ, মাহফিল ও ইসলামিক অনুষ্ঠান।"
        canonical="/"
      />
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="চন্দনাইশ দরবার শরীফ"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <p className="font-arabic text-gold text-xl md:text-2xl mb-4">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-cream mb-4 leading-tight">
              চন্দনাইশ দরবার শরীফ
            </h1>
            <p className="text-gold text-lg md:text-xl mb-2">
              সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
            </p>
            <p className="text-muted-foreground max-w-3xl mx-auto mb-8 text-lg md:text-2xl font-medium leading-relaxed">
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

      <LatestNotice />

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

      {/* CTA */}
      <section className="py-20 islamic-pattern">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
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
