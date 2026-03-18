import { motion } from "framer-motion";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { Clock, BookOpen, Heart, Users, Shield } from "lucide-react";

const rules = [
  {
    icon: Heart,
    title: "দরবারে আসার আদব",
    items: [
      "পবিত্র অবস্থায় দরবারে প্রবেশ করুন",
      "সালাম দিয়ে প্রবেশ করুন",
      "নম্র ও বিনয়ী আচরণ করুন",
      "মোবাইল ফোন সাইলেন্ট রাখুন",
      "দরবারের পরিবেশ শান্ত ও পবিত্র রাখুন",
      "অনুমতি ছাড়া ছবি বা ভিডিও করবেন না",
    ],
  },
  {
    icon: Clock,
    title: "নামাজের সময়সূচি",
    items: [
      "ফজর — ভোর ৫:০০ টা",
      "যোহর — দুপুর ১:১৫ টা",
      "আসর — বিকাল ৪:৩০ টা",
      "মাগরিব — সূর্যাস্তের পরপরই",
      "এশা — রাত ৮:০০ টা",
      "জুমুআ — দুপুর ১:০০ টা",
    ],
  },
  {
    icon: BookOpen,
    title: "জিকির ও ওয়াজিফার নিয়ম",
    items: [
      "পীরের কাছ থেকে বায়াত গ্রহণ করুন",
      "নির্ধারিত ওয়াজিফা নিয়মিত পড়ুন",
      "জিকিরের সময় একাগ্রতা বজায় রাখুন",
      "সামষ্টিক জিকিরে অংশগ্রহণ করুন",
      "পীরের নির্দেশনা অনুসরণ করুন",
    ],
  },
  {
    icon: Users,
    title: "সামাজিক আদব",
    items: [
      "সকলের সাথে সদ্ব্যবহার করুন",
      "অতিথিদের সাথে সম্মান ও আন্তরিকতার সাথে পেশ আসুন",
      "দরবারের লঙ্গরখানায় সেবায় অংশগ্রহণ করুন",
      "গরিব-দুঃখীদের সাহায্য করুন",
      "পরস্পরের মধ্যে ভ্রাতৃত্ববোধ বজায় রাখুন",
    ],
  },
  {
    icon: Shield,
    title: "সাধারণ নির্দেশনা",
    items: [
      "দরবার শরীফের সম্পত্তি রক্ষা করুন",
      "পরিষ্কার-পরিচ্ছন্নতা বজায় রাখুন",
      "ধূমপান ও তামাকজাত দ্রব্য পরিহার করুন",
      "দরবারের নিয়ম-কানুন মেনে চলুন",
      "যে কোনো সমস্যায় দরবারের খাদেমদের সাথে যোগাযোগ করুন",
    ],
  },
];

const Rules = () => {
  return (
    <>
      <SEO title="নিয়ম-নীতি" description="চন্দনাইশ দরবার শরীফে আসার আদব, জিয়ারতের নিয়ম ও সাধারণ নির্দেশনা। দরবারে প্রবেশের পূর্বে জেনে নিন।" canonical="/rules" />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="الْآدَابُ وَالْأَحْكَام"
          title="📜 দরবার শরীফের নিয়ম-নীতি"
          subtitle="দরবারে আসার আদব, নামাজের সময়সূচি ও সাধারণ নির্দেশনা"
        />

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border border-gold/20 rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <rule.icon className="w-5 h-5 text-gold" />
                </div>
                <h4 className="text-lg font-heading font-semibold text-gold">
                  {rule.title}
                </h4>
              </div>
              <ul className="space-y-2">
                {rule.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground text-sm">
                    <span className="text-gold mt-1">✦</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default Rules;
