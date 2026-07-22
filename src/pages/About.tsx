import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { BookOpen, GraduationCap, Users, Star, Heart, MapPin, Calendar, ArrowRight } from "lucide-react";

const biographySections = [
  {
    icon: Star,
    title: "পরিচিতি",
    content: `গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ চন্দনাইশী মাইজভান্ডারী (ক:) ছিলেন মাইজভান্ডারী তরিকার অন্যতম ধারক ও বাহক এবং চন্দনাইশ দরবার শরীফের প্রতিষ্ঠাতা। তিনি স্রষ্টার সৃষ্টিকে প্রেমলীলার মধ্য দিয়ে গাউছিয়তের বেলায়তি শক্তির প্রকাশ ঘটিয়ে জাতি, ধর্ম ও বর্ণ নির্বিশেষে সবার কাছে শান্তির বাণী পৌঁছিয়ে দিয়েছেন।`,
  },
  {
    icon: MapPin,
    title: "জন্ম ও বংশ পরিচয়",
    items: [
      "তিনি ১৮০০ সালের শেষ দশকে বর্তমান চট্টগ্রাম জেলার চন্দনাইশ গ্রামে (তৎকালীন পটিয়া মহকুমার অধীন) জন্মগ্রহণ করেন।",
      "তাঁর পিতার নাম ছিল ছৈয়দ আলী হোছেন।",
      "তিনি মহান আল্লাহর সান্নিধ্য প্রাপ্ত হযরত শাহজালাল শাহ (র:)-এর পূর্ব বংশীয় হযরত নুরুদ্দীন শাহ (র:)-এর পবিত্র বংশে জন্মগ্রহণ করেন।",
    ],
  },
  {
    icon: GraduationCap,
    title: "শিক্ষাজীবন",
    items: [
      "নিজ গ্রামের হযরত শাহ আমিনুল্লাহ (র:) ও হযরত নজিবুল্লাহ শাহ (র:) নামক দুজন অলি আল্লাহর হাতে তাঁর প্রাথমিক শিক্ষার হাতেখড়ি হয়।",
      "পরবর্তীতে তিনি চট্টগ্রাম শহরের একটি মাদ্রাসায় ভর্তি হয়ে কোরআন, হাদীস, ফিকহ্ ও আরবী ভাষায় জ্ঞান অর্জন করেন এবং জামাতে উলা কৃতিত্বের সাথে শেষ করেন।",
      "উচ্চতর ইসলামী ডিগ্রী লাভের জন্য তিনি ভারতের কলিকাতা আলীয়া মাদ্রাসায় যান এবং সেখানে দীর্ঘ ৭ বছর অধ্যয়ন করেন।",
    ],
  },
  {
    icon: Users,
    title: "পারিবারিক জীবন",
    items: [
      "কলিকাতার মাদ্রাসায় তিন বছর অধ্যাপনা শেষে দেশে ফিরে তিনি চন্দনাইশ গাছবাড়ীয়া সংলগ্ন খলিফা পাড়া নিবাসী হযরত শাহ আলীউজ জামান (র:)-এর একমাত্র কন্যা আমানতুর রহীমের সাথে বিবাহ বন্ধনে আবদ্ধ হন।",
      "তাঁর বৈবাহিক জীবন ছিল অত্যন্ত সুখকর ও শান্তিময়।",
    ],
  },
  {
    icon: BookOpen,
    title: "পীর অন্বেষণ ও খেলাফত লাভ",
    items: [
      "স্বাধীন পীর অন্বেষণের লক্ষ্যে তিনি ৪০ রাত্রি মোরাকাবা (ধ্যান) করেন।",
      "চল্লিশতম রাত্রিতে গাউছুল আজম হযরত ছৈয়দ গোলামুর রহমান বাবাভান্ডারী (ক:) তাঁর সামনে উপস্থিত হন এবং মাইজভান্ডার শরীফে দেখা করতে বলেন।",
      "এরপর মাইজভান্ডার শরীফে গিয়ে বাবাভান্ডারীর (ক:) নিকট তিনি বায়াত গ্রহণ করেন। বাবাভান্ডারী (ক:) তাঁর উপর বিশেষ ফয়েজ বর্ষণ করেন এবং তাঁকে মাইজভান্ডারী ত্বরিকার রীতি অনুযায়ী বায়াতী কর্মকাণ্ড পরিচালনার নির্দেশ দিয়ে খেলাফত প্রদান করেন।",
    ],
  },
  {
    icon: Heart,
    title: "দরবার শরীফ প্রতিষ্ঠা ও ত্বরিকা প্রচার",
    items: [
      "খেলাফত লাভের পর তিনি নিজ বাড়িতে অবস্থান করে চন্দনাইশ দরবার শরীফ প্রতিষ্ঠা করেন এবং ত্বরিকায়ে মাইজভান্ডারী প্রচার শুরু করেন।",
      "নিজ পীর বাবাভান্ডারীর (ক:) জাহেরী নির্দেশে তিনি সন্দ্বীপ এবং বার্মার আকিয়াব শহরে সফর করে ত্বরিকার ব্যাপক প্রসার ঘটান।",
    ],
  },
];

const karamats = [
  {
    title: "কলেরামুক্ত এলাকা",
    description: "আনোয়ারা থানার খাসখামা গ্রামে কলেরার মহামারী দেখা দিলে এলাকাবাসী তাঁর স্মরণাপন্ন হন। তিনি রাতে নিজ হুজুরা শরীফে অবস্থান করেও বেলায়তি শক্তির মাধ্যমে একই সাথে সেই গ্রামে উপস্থিত হয়ে কলেরার প্রকোপ কমিয়ে আনেন এবং শান্তি ফিরিয়ে আনেন।",
  },
  {
    title: "ঘূর্ণিঝড় থেকে রক্ষা",
    description: "নাফ নদীতে প্রবল ঘূর্ণিঝড়ে নৌকাসহ ডুবে যাওয়া ভক্ত কোরবান আলীকে তিনি অলৌকিকভাবে উপস্থিত হয়ে একটি গাছের সাহায্যে প্রাণে রক্ষা করেন।",
  },
  {
    title: "ফাঁসির রায় থেকে মুক্তি",
    description: "ষড়যন্ত্রের শিকার হয়ে এক দারোগার ফাঁসির রায় হওয়ার উপক্রম হলে তিনি তাঁকে সারেন্ডার করতে বলেন। আশ্চর্যজনকভাবে, বিচারক যখন ফাঁসির রায় লিখতে যান, তখন তাঁর কলম দিয়ে পর পর তিনবার 'বেকসুর খালাস' লেখা হয়ে যায় এবং ওই ব্যক্তি রক্ষা পান।",
  },
  {
    title: "বাংলাদেশ স্বাধীনের ভবিষ্যৎবাণী",
    description: "১৯৭১ সালের মুক্তিযুদ্ধের সময় তিনি ভবিষ্যৎবাণী করেছিলেন যে, আগামী ৮-৯ মাসের মধ্যে বাংলাদেশ স্বাধীন হয়ে যাবে, যা পরবর্তীতে অক্ষরে অক্ষরে মিলে যায়।",
  },
];

const About = () => {

  return (
    <>
      <SEO 
        title="চন্দনাইশ দরবার পরিচিতি ও হযরত আবদুল লতিফ শাহ্ (রাঃ) এর জীবনী | চন্দনাইশের মাজার" 
        description="গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ চন্দনাইশী মাইজভান্ডারী (রাঃ) এর বিস্তারিত জীবনী, শিক্ষাজীবন, অলৌকিক কারামত, চন্দনাইশের মাজার ও চন্দনাইশ দরবার শরীফ প্রতিষ্ঠার ইতিহাস।" 
        keywords="চন্দনাইশ দরবার শরীফ, দরবার শরীফ, হযরত আবদুল লতিফ শাহ্, চন্দনাইশের মাজার, চন্দনাইশ মাজার, গাউছে জামান জীবনী, আবদুল লতিফ শাহ, চন্দনাইশ দরবার পরিচিতি, মাইজভান্ডারী অলিয়া, সুফি জীবনী, চন্দনাইশ ইতিহাস, চট্টগ্রামের দরবার, বাংলাদেশের সেরা মাজার, Chandanaish Darbar Sharif History, Sufi saints of Bangladesh"
        canonical="/about" 
      />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="سِيرَة غَوْثِ الزَّمَان"
          title="গাউছে জামানের জীবনী"
          subtitle="হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ চন্দনাইশী মাইজভান্ডারী (ক:)"
          subtitleClassName="text-2xl md:text-4xl text-cream font-bold mt-8 mb-4 leading-tight"
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-16"
        >
          <Link
            to="/book"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gold-gradient rounded-full text-primary-foreground font-bold shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <BookOpen className="w-5 h-5 relative z-10" />
            <span className="relative z-10">সম্পূর্ণ জীবনী পড়ুন</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-10">
          {/* First biography section - পরিচিতি */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-gold/20 rounded-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gold">
                পরিচিতি
              </h3>
            </div>
            <p className="text-foreground leading-relaxed">{biographySections[0].content}</p>
          </motion.div>


          {/* Remaining Biography Sections (skip first since rendered above) */}
          {biographySections.slice(1).map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="bg-card border border-gold/20 rounded-lg p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-xl font-heading font-bold text-gold">
                  {section.title}
                </h3>
              </div>

              {section.content && (
                <p className="text-foreground leading-relaxed">{section.content}</p>
              )}

              {section.items && (
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-foreground leading-relaxed">
                      <span className="text-gold mt-1 shrink-0">✦</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {/* Karamats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-gold/20 rounded-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gold">
                উল্লেখযোগ্য কারামত (অলৌকিক ঘটনাবলী)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {karamats.map((k, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="bg-background/50 border border-gold/10 rounded-lg p-5"
                >
                  <h4 className="text-gold font-heading font-semibold mb-2">{k.title}</h4>
                  <p className="text-foreground text-sm leading-relaxed">{k.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Wafat */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-gold/20 rounded-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gold">
                ওফাত বা বেছাল শরীফ
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-foreground leading-relaxed">
                <span className="text-gold mt-1 shrink-0">✦</span>
                <span>১৯৮২ সালের ২৭শে ফেব্রুয়ারী (১৩৮৮ বাংলার ১৫ই ফাল্গুন, ১৪০২ হিজরীর ৩ জমাদিউল উলা) রাত ১১:২০ থেকে ১১:২৫ মিনিটের মধ্যে তিনি নিজ হুজরা শরীফে শেষ নিশ্বাস ত্যাগ করেন।</span>
              </li>
              <li className="flex items-start gap-2 text-foreground leading-relaxed">
                <span className="text-gold mt-1 shrink-0">✦</span>
                <span>২৮শে ফেব্রুয়ারী দরবারে নিজস্ব জমিতে জানাজা শেষে তাঁকে দাফন করা হয়।</span>
              </li>
              <li className="flex items-start gap-2 text-foreground leading-relaxed">
                <span className="text-gold mt-1 shrink-0">✦</span>
                <span>বর্তমানে প্রতি বছর ১৬ই ফাল্গুন তারিখে তাঁর পবিত্র ওরশ শরীফ মহাসমারোহে অনুষ্ঠিত হয়।</span>
              </li>
            </ul>
          </motion.div>

          {/* Silsila */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-gold/20 rounded-lg p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-bold text-gold">
                সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
              </h3>
            </div>
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                মাইজভান্ডারিয়া তরিকা হলো একটি সুফি আধ্যাত্মিক ধারা যা হযরত মাওলানা 
                শাহ সূফী সৈয়দ আহমদউল্লাহ মাইজভান্ডারী (কঃ) এর মাধ্যমে প্রতিষ্ঠিত। 
                এই তরিকার মূল শিক্ষা হলো আল্লাহর প্রেম, নবী প্রেম ও মানবপ্রেম।
              </p>
              <p>
                চন্দনাইশ দরবার শরীফ এই মহান সিলসিলার একটি গুরুত্বপূর্ণ কেন্দ্র, 
                যেখানে তরিকার শিক্ষা ও অনুশীলন নিয়মিতভাবে পরিচালিত হয়।
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

    </>
  );
};
export default About;
