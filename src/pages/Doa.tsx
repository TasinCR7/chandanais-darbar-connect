import React, { useState } from "react";
import { motion } from "framer-motion";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart } from "lucide-react";
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
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="الدُّعَاء"
          title="🤲 দোয়া আবেদন (অনলাইন ফর্ম)"
          subtitle="আপনার নাম ও সমস্যার বিবরণ দিন — পীর সাহেব বা তাঁর প্রতিনিধি দোয়া করবেন।"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative bg-card border border-gold/20 rounded-lg p-6 md:p-10 overflow-hidden">
            <SuccessOverlay
              show={showSuccess}
              title="আপনার দোয়া আবেদন পাঠানো হয়েছে"
              message="ইনশাআল্লাহ পীর সাহেব হুজুর বা তাঁর প্রতিনিধি আপনার জন্য খাস দোয়া করবেন।"
              onClose={() => setShowSuccess(false)}
            />
            {/* Info banner */}
            <div className="border-l-4 border-gold bg-gold/5 rounded-r-lg p-4 mb-8">
              <p className="text-foreground font-semibold text-sm">অনলাইনে দোয়া আবেদন করুন</p>
              <p className="text-muted-foreground text-sm mt-1">
                আপনার নাম ও সমস্যার বিবরণ দিন — পীর সাহেব বা তাঁর প্রতিনিধি দোয়া করবেন।
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    আপনার নাম <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="পূর্ণ নাম লিখুন"
                    value={formData.name}
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
                    value={formData.phone}
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
                    value={formData.subject}
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

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gold-gradient text-primary-foreground font-semibold px-8 py-3 rounded-lg gold-glow-hover transition-all duration-300"
              >
                <HandHeart className="w-5 h-5 mr-2" />
                🤲 দোয়া আবেদন পাঠান
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
};

export default Doa;
