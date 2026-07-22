import React, { useState } from "react";
import { motion } from "framer-motion";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  HandHeart, 
  Sparkles, 
  User, 
  Phone, 
  Tag, 
  MapPin, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  HeartHandshake,
  Info 
} from "lucide-react";
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

    const { error } = await supabase.from("submissions").insert({
      type: "doa",
      name: trimmedName,
      phone: formData.phone.trim() || null,
      subject: formData.subject,
      address: formData.address.trim() || null,
      details: trimmedDetails,
    });

    if (error) {
      toast({
        title: "ত্রুটি হয়েছে",
        description: "আবেদন পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Save submission timestamp on success
    submissionTimes.push(nowTime);
    localStorage.setItem("last_doa_submissions", JSON.stringify(submissionTimes));

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
    
    // Send Telegram Notification in background to avoid blocking the UI
    sendTelegramNotification(textMessage)
      .catch((err) => console.error("Failed to send Telegram notification from Doa page:", err));

    toast({
      title: "দোয়া আবেদন পাঠানো হয়েছে ✅",
      description: "আপনার আবেদন সফলভাবে জমা হয়েছে।",
    });

    setFormData({ name: "", phone: "", subject: "", address: "", details: "" });
    setIsSubmitting(false);
    setShowSuccess(true);
  };

  return (
    <>
      <SEO 
        title="অনলাইন দোয়া আবেদন" 
        description="আপনার যেকোনো সমস্যা বা অসুস্থতার জন্য চন্দনাইশ দরবার শরীফে অনলাইনে দোয়া আবেদন করুন। পীর সাহেব হুজুর আপনার জন্য খাস দোয়া করবেন।" 
        keywords="দোয়া আবেদন, অনলাইন দোয়া, পীর সাহেবের দোয়া, রোগমুক্তি দোয়া, চন্দনাইশ দরবার দোয়া"
        canonical="/doa" 
      />
      <div className="py-10 md:py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4">
          
          {/* Header Badge & Title */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-widest mb-4 shadow-md"
            >
              <Sparkles size={14} className="animate-spin-slow text-gold" />
              <span>চন্দনাইশ দরবার শরীফ • অনলাইন দোয়া সেবা</span>
            </motion.div>

            <SectionTitle
              arabic="الدُّعَاء"
              title="দোয়া আবেদন (অনলাইন ফর্ম)"
              subtitle="আপনার নাম ও সমস্যার বিবরণ দিন — পীর সাহেব হুজুর বা তাঁর প্রতিনিধি খাস মোনাজাত করবেন।"
            />

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <HandHeart size={14} className="text-gold" /> সরাসরি খাস মোনাজাত
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <ShieldCheck size={14} className="text-gold" /> ১০০% তথ্য গোপনীয়তা
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <HeartHandshake size={14} className="text-gold" /> সম্পূর্ণ বিনামূল্যে সেবা
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-3xl mx-auto space-y-10"
          >
            {/* Glassmorphic Main Card */}
            <div className="relative bg-card/70 backdrop-blur-xl border border-gold/25 rounded-3xl p-6 md:p-10 overflow-hidden shadow-2xl transition-all duration-300 hover:border-gold/40">
              <SuccessOverlay
                show={showSuccess}
                title="আপনার দোয়া আবেদন পাঠানো হয়েছে ✅"
                message="ইনশাআল্লাহ পীর সাহেব হুজুর বা তাঁর প্রতিনিধি আপনার জন্য খাস দোয়া ও মোনাজাত করবেন।"
                onClose={() => setShowSuccess(false)}
              />

              {/* Form Card Header Banner */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-gold/15">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shadow-inner">
                    <HandHeart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-cream text-xl md:text-2xl flex items-center gap-2">
                      অনলাইন দোয়া আবেদন
                    </h3>
                    <p className="text-xs text-gold/70 font-semibold tracking-wider uppercase mt-0.5">
                      দরবার শরীফ আধ্যাত্মিক সেবা সেল
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold">
                  <ShieldCheck size={14} />
                  <span>গোপনীয়তা রক্ষিত</span>
                </div>
              </div>

              {/* Info Subtitle Banner */}
              <div className="border-l-4 border-gold bg-gold/5 rounded-r-2xl p-4 mb-6 flex items-start gap-3 border border-gold/10">
                <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <p className="text-foreground/90 text-sm leading-relaxed font-medium">
                  রোগমুক্তি, বিপদ থেক মুক্তি, সংসারের উন্নতি বা যেকোনো খাস নিয়তে দরবার শরীফে দোয়া পাঠাতে নিচের ফর্মটি সঠিক তথ্যে পূরণ করুন।
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-cream flex items-center gap-2">
                        <User size={15} className="text-gold" />
                        আপনার নাম <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[10px] text-gold/50">{formData.name.length}/100</span>
                    </div>
                    <Input
                      placeholder="আপনার পূর্ণ নাম লিখুন"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      maxLength={100}
                      className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-xl py-5 font-medium transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-cream flex items-center gap-2">
                      <Phone size={15} className="text-gold" />
                      মোবাইল নম্বর <span className="text-xs text-gold/60 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <Input
                      placeholder="যেমন: ০১৬২২-৭২১৯৯৬"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      maxLength={15}
                      className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-xl py-5 font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: Subject & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-cream flex items-center gap-2">
                      <Tag size={15} className="text-gold" />
                      দোয়ার বিষয় <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.subject}
                      onValueChange={(val) => setFormData({ ...formData, subject: val })}
                    >
                      <SelectTrigger className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream rounded-xl py-5 font-medium">
                        <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 border-gold/20 backdrop-blur-xl">
                        {doaSubjects.map((s) => (
                          <SelectItem key={s} value={s} className="hover:bg-gold/10 font-medium">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-cream flex items-center gap-2">
                      <MapPin size={15} className="text-gold" />
                      ঠিকানা / এলাকা <span className="text-xs text-gold/60 font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <Input
                      placeholder="গ্রাম, উপজেলা, জেলা"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      maxLength={200}
                      className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-xl py-5 font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-cream flex items-center gap-2">
                      <MessageSquare size={15} className="text-gold" />
                      সমস্যা বা দোয়ার কারণ বিস্তারিত <span className="text-destructive">*</span>
                    </label>
                    <span className="text-[10px] text-gold/50">{formData.details.length}/2000</span>
                  </div>
                  <Textarea
                    placeholder="আপনার অসুস্থতা, মানসিক কষ্ট বা যার জন্য দোয়া প্রয়োজন তাঁর নাম ও বিস্তারিত লিখুন..."
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    maxLength={2000}
                    rows={5}
                    className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-2xl p-4 font-medium resize-none transition-all"
                  />
                </div>

                {/* Privacy Note */}
                <div className="p-3.5 rounded-xl bg-card/40 border border-gold/10 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-gold/80 font-medium">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    আপনার দেওয়া নাম ও তথ্য দরবার শরীফের কাছে সম্পূর্ণ গোপন থাকবে।
                  </span>
                  <span className="text-[10px] text-gold/50 font-bold uppercase tracking-wider">গ্যারান্টিযুক্ত গোপনীয়তা</span>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-gold-gradient hover:opacity-95 text-primary-foreground font-bold text-base px-8 py-3.5 rounded-xl shadow-xl gold-glow-hover transition-all duration-300 flex items-center justify-center gap-2 btn-shimmer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      আবেদন পাঠানো হচ্ছে...
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

            {/* Spiritual Quran Verse Card at Bottom */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 backdrop-blur-xl border border-gold/20 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xl relative overflow-hidden"
            >
              <p className="font-arabic text-gold text-lg sm:text-xl leading-relaxed arabic-glow">
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
