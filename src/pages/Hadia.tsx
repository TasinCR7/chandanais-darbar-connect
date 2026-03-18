import { motion } from "framer-motion";
import { Phone, MessageCircle } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";

const Hadia = () => {
  return (
    <>
      <SEO title="হাদিয়া ও নজরানা" description="চন্দনাইশ দরবার শরীফের খেদমতে হাদিয়া ও নজরানা প্রদান করুন। দরবারের সেবায় অংশগ্রহণ করুন।" canonical="/hadia" />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="صَدَقَة"
          title="হাদিয়া ও নজরানা"
          subtitle="দরবার শরীফের খেদমতে আপনার অবদান রাখুন"
        />

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card border border-gold/20 rounded-lg p-8 md:p-12 text-center"
          >
            <p className="font-arabic text-gold text-3xl mb-6">
              إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ
            </p>
            <p className="text-foreground leading-relaxed mb-8">
              ভক্তবৃন্দ সরাসরি যোগাযোগ করে দরবার শরীফে হাদিয়া ও নজরানা প্রদান করতে পারেন। 
              আপনার হাদিয়া দরবার শরীফের সেবামূলক কাজে ব্যবহৃত হয়।
            </p>

            <div className="space-y-4">
              <a
                href="tel:+8801XXXXXXXXX"
                className="flex items-center justify-center gap-3 bg-emerald hover:bg-emerald-light text-gold border border-gold/30 rounded-lg p-4 transition-all duration-300 gold-glow-hover"
              >
                <Phone size={20} />
                <span className="font-semibold">ফোনে যোগাযোগ করুন</span>
              </a>
              <a
                href="https://wa.me/8801XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-emerald hover:bg-emerald-light text-gold border border-gold/30 rounded-lg p-4 transition-all duration-300 gold-glow-hover"
              >
                <MessageCircle size={20} />
                <span className="font-semibold">হোয়াটসঅ্যাপে যোগাযোগ</span>
              </a>
            </div>

            <p className="text-muted-foreground text-sm mt-8">
              আল্লাহ তায়ালা আপনার হাদিয়া কবুল করুন। আমীন।
            </p>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Hadia;
