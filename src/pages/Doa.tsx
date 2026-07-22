import React, { useState } from "react";
import { motion } from "framer-motion";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification, escapeTelegramHtml } from "@/utils/telegram";
import SuccessOverlay from "@/components/SuccessOverlay";

const doaSubjects = [
  "রোগমুক্তি / সুস্থতা",
  "বিপদ থেকে মুক্তি",
  "সন্তান লাভ",
  "বিবাহ / সংসার",
  "ব্যবসা / কর্মসংস্থান",
  "পরীক্ষায় সাফল্য",
  "মানসিক শান্তি",
  "অন্যান্য",
];

const Doa = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    subject: "",
    address: "",
    details: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedDetails = formData.details.trim();

    if (!trimmedName || !formData.subject || !trimmedDetails) {
      toast({
        title: "অসম্পূর্ণ তথ্য",
        description: "অনুগ্রহ করে সকল প্রয়োজনীয় (*) ঘর পূরণ করুন।",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length > 100 || trimmedDetails.length > 2000) {
      toast({
        title: "তথ্য অতিরিক্ত দীর্ঘ",
        description: "নাম ১০০ ও বিবরণ ২০০০ অক্ষরের মধ্যে রাখুন।",
        variant: "destructive",
      });
      return;
    }

    // Client-side rate limiting (spam protection)
    const nowTime = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxSubmissions = 3;
    
    let submissionTimes: number[] = [];
    try {
      submissionTimes = JSON.parse(localStorage.getItem("last_doa_submissions") || "[]");
    } catch (e) {
      submissionTimes = [];
    }
    
    submissionTimes = submissionTimes.filter((time: number) => nowTime - time < windowMs);
    
    if (submissionTimes.length >= maxSubmissions) {
      const minutesLeft = Math.ceil((windowMs - (nowTime - submissionTimes[0])) / 60000);
      toast({
        title: "অতিরিক্ত অনুরোধ",
        description: `নিরাপত্তার স্বার্থে প্রতি ৫ মিনিটে সর্বোচ্চ ৩ বার সাবমিট করা যাবে। অনুগ্রহ করে ${minutesLeft} মিনিট পর আবার চেষ্টা করুন।`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("submissions").insert({
        type: "doa",
        name: trimmedName,
        phone: formData.phone.trim() || null,
        subject: formData.subject,
        address: formData.address.trim() || null,
        details: trimmedDetails,
      });

      if (error) {
        console.error("Supabase Doa submission error:", error);
        toast({
          title: "ত্রুটি হয়েছে",
          description: "আবেদন পাঠাতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Save submission timestamp on success safely
      try {
        submissionTimes.push(nowTime);
        localStorage.setItem("last_doa_submissions", JSON.stringify(submissionTimes));
      } catch (storageErr) {
        console.warn("localStorage quota/privacy error:", storageErr);
      }

      // Send Telegram Notification
      const textMessage = `
🤲 *নতুন দোয়া আবেদন জমা হয়েছে!*
━━━━━━━━━━━━━━━━━━
👤 *নাম:* ${escapeTelegramHtml(trimmedName)}
📱 *মোবাইল:* ${escapeTelegramHtml(formData.phone.trim() || "দেওয়া হয়নি")}
📌 *বিষয়:* ${escapeTelegramHtml(formData.subject)}
📍 *ঠিকানা:* ${escapeTelegramHtml(formData.address.trim() || "দেওয়া হয়নি")}
📝 *বিস্তারিত:*
${escapeTelegramHtml(trimmedDetails)}
━━━━━━━━━━━━━━━━━━
পীর সাহেব হুজুরকে দোয়ার জন্য অবগত করুন।
      `;
      
      // Send Telegram Notification in background
      sendTelegramNotification(textMessage)
        .catch((err) => console.error("Failed to send Telegram notification from Doa page:", err));

      toast({
        title: "দোয়া আবেদন পাঠানো হয়েছে ✅",
        description: "আপনার আবেদন সফলভাবে জমা হয়েছে।",
      });

      setFormData({ name: "", phone: "", subject: "", address: "", details: "" });
      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (err: any) {
      console.error("Unexpected Doa page error:", err);
      toast({
        title: "ত্রুটি হয়েছে",
        description: "নেটওয়ার্ক বা সার্ভার সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="অনলাইন দোয়া আবেদন | চন্দনাইশ দরবার শরীফ" 
        description="আপনার যেকোনো সমস্যা বা অসুস্থতার জন্য চন্দনাইশ দরবার শরীফে অনলাইনে দোয়া আবেদন করুন। পীর সাহেব হুজুর আপনার জন্য খাস দোয়া করবেন।" 
        keywords="দোয়া আবেদন, অনলাইন দোয়া, পীর সাহেবের দোয়া, রোগমুক্তি দোয়া, চন্দনাইশ দরবার দোয়া, চন্দনাইশের মাজার"
        canonical="/doa" 
      />
      <div className="py-12 md:py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="الدُّعَاء"
            title="🤲 দোয়া আবেদন (অনলাইন ফর্ম)"
            subtitle="আপনার নাম ও সমস্যার বিবরণ দিন — পীর সাহেব বা তাঁর প্রতিনিধি দোয়া করবেন।"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative bg-card border border-gold/20 rounded-2xl p-6 md:p-10 overflow-hidden shadow-xl">
              <SuccessOverlay
                show={showSuccess}
                title="আপনার দোয়া আবেদন পাঠানো হয়েছে ✅"
                message="ইনশাআল্লাহ পীর সাহেব হুজুর বা তাঁর প্রতিনিধি আপনার জন্য খাস দোয়া করবেন।"
                onClose={() => setShowSuccess(false)}
              />

              {/* Simple Info banner */}
              <div className="border-l-4 border-gold bg-gold/5 rounded-r-lg p-4 mb-6">
                <p className="text-foreground font-semibold text-sm">অনলাইনে দোয়া আবেদন করুন</p>
                <p className="text-muted-foreground text-sm mt-1">
                  আপনার নাম ও সমস্যার বিবরণ দিন — পীর সাহেব বা তাঁর প্রতিনিধি দোয়া করবেন।
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      আপনার নাম <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="পূর্ণ নাম লিখুন"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      maxLength={100}
                      className="border-gold/20 focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      মোবাইল নম্বর
                    </label>
                    <Input
                      placeholder="০১XXXXXXXXX"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      maxLength={15}
                      className="border-gold/20 focus:border-gold"
                    />
                  </div>
                </div>

                {/* Row 2: Subject & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      দোয়ার বিষয় <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.subject || undefined}
                      onValueChange={(val) => setFormData({ ...formData, subject: val })}
                    >
                      <SelectTrigger className="border-gold/20 focus:border-gold">
                        <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {doaSubjects.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      ঠিকানা / এলাকা
                    </label>
                    <Input
                      placeholder="গ্রাম, উপজেলা, জেলা"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      maxLength={200}
                      className="border-gold/20 focus:border-gold"
                    />
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    বিস্তারিত বিবরণ <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="আপনার সমস্যা বা দোয়ার কারণ বিস্তারিত লিখুন..."
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    maxLength={2000}
                    rows={5}
                    className="border-gold/20 focus:border-gold resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-gold-gradient text-primary-foreground font-semibold px-8 py-3 rounded-lg gold-glow-hover transition-all duration-300 flex items-center justify-center gap-2 btn-shimmer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      পাঠানো হচ্ছে...
                    </>
                  ) : (
                    <>
                      <HandHeart className="w-5 h-5" />
                      🤲 দোয়া আবেদন পাঠান
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Quran Verse Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-6 sm:p-8 text-center space-y-3 mt-8 shadow-xl relative overflow-hidden"
            >
              <p className="font-arabic text-gold text-xl sm:text-2xl leading-relaxed arabic-glow">
                وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ
              </p>
              <p className="text-cream text-xs sm:text-sm font-medium italic max-w-xl mx-auto leading-relaxed">
                “আর যখন আমার বান্দাগণ আপনাকে আমার সম্পর্কে জিজ্ঞাসা করবে, নিশ্চয়ই আমি নিকটে। আহ্বানকারী যখন আমাকে ডাকে, আমি তার ডাকে সাড়া দেই।”
              </p>
              <p className="text-[10px] text-gold/60 font-bold uppercase tracking-widest pt-1">
                — সূরা আল-বাকারা: ১৮৬
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Doa;
