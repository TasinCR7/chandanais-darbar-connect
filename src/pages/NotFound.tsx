import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO title="404 - পেজ পাওয়া যায়নি" description="আপনি যে পেজটি খুঁজছেন তা এই ওয়েবসাইটে নেই।" />
      <div className="min-h-screen flex items-center justify-center islamic-pattern relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gold/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-emerald/5 rounded-full blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center px-6 max-w-lg mx-auto relative z-10"
        >
          {/* 404 Number */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mb-6"
          >
            <span className="text-[120px] md:text-[160px] font-heading font-black bg-clip-text text-transparent bg-gradient-to-b from-gold/30 via-gold/15 to-transparent leading-none select-none">
              ৪০৪
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Search className="w-10 h-10 text-gold/60" />
              </div>
            </div>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p className="font-arabic text-gold/60 text-lg mb-3">صفحة غير موجودة</p>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-3">
              পেজটি পাওয়া যায়নি
            </h1>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              আপনি যে পেজটি খুঁজছেন সেটি সরিয়ে ফেলা হয়েছে, নাম পরিবর্তন করা হয়েছে, অথবা অস্থায়ীভাবে অনুপলব্ধ।
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              to="/"
              className="bg-gold-gradient text-primary-foreground px-6 py-3 rounded-lg font-semibold gold-glow-hover transition-all duration-300 inline-flex items-center justify-center gap-2"
            >
              <Home size={18} />
              হোমপেজে ফিরুন
            </Link>
            <button
              onClick={() => window.history.back()}
              className="border border-gold/30 text-gold px-6 py-3 rounded-lg font-semibold hover:bg-gold/10 transition-all duration-300 inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              আগের পেজে যান
            </button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default NotFound;
