import { motion } from "framer-motion";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";

const Pir = () => {
  return (
    <>
      <SEO 
        title="পীর ও শাহজাদা | চন্দনাইশ দরবার শরীফ ও চন্দনাইশের মাজার" 
        description="চন্দনাইশ দরবার শরীফ ও চন্দনাইশের মাজার শরীফের সাজ্জাদানশীন পীর সাহেব এবং শাহজাদাগণের পরিচিতি। মাইজভান্ডারী সিলসিলার বর্তমান খেদমতকারীগণ।" 
        keywords="চন্দনাইশ দরবার শরীফ, দরবার শরীফ, চন্দনাইশের মাজার, চন্দনাইশ মাজার, হযরত আবদুল লতিফ শাহ্, পীর বাবা চন্দনাইশী, শাহজাদা চন্দনাইশ, মাইজভান্ডারী দরবার শরীফ, চট্টগ্রামের দরবার, বাংলাদেশের সেরা মাজার" 
        canonical="/pir" 
      />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="اَلْمُرْشِد"
          title="পীর ও শাহজাদা"
          subtitle="দরবার শরীফের বর্তমান খেদমতকারী"
        />

        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card border border-gold/20 rounded-lg p-8 md:p-12"
          >
            <h3 className="text-2xl font-heading font-bold text-gold mb-6">
              শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভান্ডারী (মাদ্দাঃ)
            </h3>
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভান্ডারী (মাদ্দাঃ) 
                হলেন গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ) 
                এর সুযোগ্য উত্তরসূরি।
              </p>
              <p>
                বর্তমানে তিনি চন্দনাইশ দরবার শরীফের খেদমত পরিচালনা করছেন। তাঁর নেতৃত্বে 
                দরবার শরীফের বিভিন্ন ধর্মীয় ও সামাজিক কার্যক্রম সুচারুরূপে পরিচালিত হচ্ছে।
              </p>
              <p>
                তিনি মাইজভান্ডারী তরিকার শিক্ষা ও আদর্শ প্রচারে নিরলসভাবে কাজ করে যাচ্ছেন 
                এবং ভক্তদের আধ্যাত্মিক পথপ্রদর্শন করছেন।
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card border border-gold/20 rounded-lg p-8 md:p-12"
          >
            <h3 className="text-2xl font-heading font-bold text-gold mb-6">
              তরিকায়ে মাইজভান্ডারীর অনুশীলন
            </h3>
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                মাইজভান্ডারী তরিকার মূল অনুশীলনগুলোর মধ্যে রয়েছে জিকির, মুরাকাবা, 
                ওয়াজিফা ও আধ্যাত্মিক সাধনা। এই তরিকায় আল্লাহর নৈকট্য লাভের জন্য 
                পীরের কাছে বায়াত গ্রহণ করা হয়।
              </p>
              <p>
                দরবার শরীফে নিয়মিত জিকির মাহফিল, মিলাদ শরীফ ও ওয়াজ মাহফিল অনুষ্ঠিত হয়।
                ভক্তরা পীরের কাছ থেকে আধ্যাত্মিক নির্দেশনা গ্রহণ করেন।
              </p>
            </div>
          </motion.div>

          {/* বংশলতিকা / Visual Family Tree */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card border border-gold/20 rounded-lg p-8 md:p-12"
          >
            <h3 className="text-2xl font-heading font-bold text-gold mb-10 text-center">
              বংশলতিকা — আওলাদগণ
            </h3>

            <div className="flex flex-col items-center">
              {/* Root */}
              <div className="bg-gold/20 border-2 border-gold text-gold font-heading font-bold text-center px-6 py-4 rounded-xl shadow-lg text-sm md:text-base max-w-xs">
                গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (ক:)
              </div>

              {/* Vertical connector */}
              <div className="w-0.5 h-10 bg-gold/50" />

              {/* Horizontal bar */}
              <div className="relative w-full max-w-2xl">
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gold/50 md:left-[20%] md:right-[20%] hidden sm:block" />

                {/* Branches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-4 md:gap-8">
                  {/* পুত্র শাখা */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-gold/50" />
                    <div className="bg-primary/15 border border-primary/40 text-primary font-bold px-4 py-2 rounded-lg text-sm mb-4">
                      পুত্র
                    </div>
                    <div className="space-y-3 w-full">
                      {[
                        { name: "ছৈয়দ মাওলানা মোহাম্মদ জহুরুল আলম শাহ আল্ চন্দনাইশী মাইজভাণ্ডারী", tag: "রাহ:" },
                        { name: "ছৈয়দ মোহাম্মদ নাজমুল আলম শাহ আল্ চন্দনাইশী মাইজভাণ্ডারী", tag: "রাহ:" },
                        { name: "ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভাণ্ডারী", tag: "মাদ্দা:" },
                      ].map((item, i) => (
                        <div key={i} className="relative flex items-start gap-2">
                          <div className="flex flex-col items-center shrink-0 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/60" />
                            {i < 2 && <div className="w-0.5 h-full bg-primary/30 absolute top-3 left-[5px]" />}
                          </div>
                          <div className="bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-xs md:text-sm text-foreground leading-relaxed flex-1">
                            <span className="font-semibold">শাহজাদা {item.name}</span>
                            <span className="block text-muted-foreground text-[10px] md:text-xs mt-0.5">({item.tag})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* কন্যা শাখা */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-gold/50" />
                    <div className="bg-destructive/15 border border-destructive/40 text-destructive font-bold px-4 py-2 rounded-lg text-sm mb-4">
                      কন্যা
                    </div>
                    <div className="relative flex items-start gap-2 w-full">
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive border-2 border-destructive/60" />
                      </div>
                      <div className="bg-muted/60 border border-border rounded-lg px-3 py-2.5 text-xs md:text-sm text-foreground leading-relaxed flex-1">
                        <span className="font-semibold">শাহজাদী মোস্তাফা খাতুন</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Pir;
