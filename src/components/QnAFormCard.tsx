import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { User, Phone, Tag, MessageSquare, ShieldCheck, Sparkles, Loader2, Info } from "lucide-react";
import SuccessOverlay from "@/components/SuccessOverlay";

interface FormData {
  name: string;
  phone: string;
  subject: string;
  details: string;
}

interface QnAFormCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  subjects: string[];
  form: FormData;
  setForm: (f: FormData) => void;
  submitting: boolean;
  onSubmit: () => void;
  buttonLabel: string;
  buttonIcon: string;
  accentClass: string;
  showSuccess: boolean;
  onCloseSuccess: () => void;
  successExtraContent?: ReactNode;
}

const QnAFormCard = ({
  icon: Icon,
  title,
  subtitle,
  subjects,
  form,
  setForm,
  submitting,
  onSubmit,
  buttonLabel,
  buttonIcon,
  accentClass,
  showSuccess,
  onCloseSuccess,
  successExtraContent,
}: QnAFormCardProps) => {
  const isQuestion = title === "প্রশ্ন-উত্তর / ফতোয়া";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-card/70 backdrop-blur-xl border border-gold/25 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-gold/40"
    >
      <SuccessOverlay
        show={showSuccess}
        title={isQuestion ? "প্রশ্ন পাঠানো হয়েছে! ✅" : "অভিযোগ পাঠানো হয়েছে! ✅"}
        message="আপনার বার্তা সফলভাবে জমা হয়েছে। ইনশাআল্লাহ শীঘ্রই উত্তর দেওয়া হবে।"
        onClose={onCloseSuccess}
        extraContent={successExtraContent}
      />
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-gold/15 bg-gradient-to-r from-black/40 via-card/80 to-black/40 gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${accentClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-cream text-xl md:text-2xl flex items-center gap-2">
              {title}
              <Sparkles size={16} className="text-gold/60 animate-pulse" />
            </h3>
            <span className="text-[11px] text-gold/70 font-semibold tracking-wider uppercase">
              {isQuestion ? "ইনসাফ সেল • আলেমদের সরাসরি মতামত" : "ইনসাফ সেল • দরবার শরীফ প্রশাসন"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold">
          <ShieldCheck size={14} />
          <span>গোপনীয়তা সংরক্ষিত</span>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Info Subtitle box */}
        <div className="border-l-4 border-gold bg-gold/5 rounded-r-2xl p-4 flex items-start gap-3 border border-gold/10">
          <Info className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <p className="text-foreground/90 text-sm leading-relaxed font-medium">{subtitle}</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-cream flex items-center gap-2">
                  <User size={15} className="text-gold" />
                  আপনার নাম <span className="text-destructive">*</span>
                </label>
                <span className="text-[10px] text-gold/50">{form.name.length}/100</span>
              </div>
              <Input
                placeholder="আপনার নাম লিখুন"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-xl py-5 font-medium transition-all"
              />
            </div>

            {/* Subject Select Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-cream flex items-center gap-2">
                <Tag size={15} className="text-gold" />
                বিষয় <span className="text-destructive">*</span>
              </label>
              <Select value={form.subject} onValueChange={(val) => setForm({ ...form, subject: val })}>
                <SelectTrigger className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream rounded-xl py-5 font-medium">
                  <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="bg-card/95 border-gold/20 backdrop-blur-xl">
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s} className="hover:bg-gold/10 font-medium">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-cream flex items-center gap-2">
                <Phone size={15} className="text-gold" />
                মোবাইল নম্বর <span className="text-xs text-gold/60 font-normal">(ঐচ্ছিক, ট্র্যাকিং এর জন্য)</span>
              </label>
            </div>
            <Input
              placeholder="যেমন: ০১৬২২-৭২১৯৯৬"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={15}
              className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-xl py-5 font-medium transition-all"
            />
          </div>

          {/* Details Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-cream flex items-center gap-2">
                <MessageSquare size={15} className="text-gold" />
                {isQuestion ? "আপনার প্রশ্ন বিস্তারিত লিখুন" : "আপনার অভিযোগ বিস্তারিত লিখুন"} <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] text-gold/50">{form.details.length}/2000</span>
            </div>
            <Textarea
              placeholder={isQuestion ? "আপনার প্রশ্নটি স্পষ্ট ও বিস্তারিতভাবে লিখুন..." : "আপনার অভিযোগ বা মতামতের বিস্তারিত বিবরণ দিন..."}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              maxLength={2000}
              rows={5}
              className="bg-black/30 border-gold/20 focus:border-gold focus:ring-1 focus:ring-gold/40 text-cream placeholder:text-muted-foreground/50 rounded-2xl p-4 font-medium resize-none transition-all"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-card/40 border border-gold/10 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-gold/80 font-medium">
              <ShieldCheck size={14} className="text-emerald-400" />
              আপনার নাম ও মোবাইল নম্বর সম্পূর্ণ গোপন রাখা হবে।
            </span>
            <span className="text-[10px] text-gold/50 font-bold uppercase tracking-wider">গ্যারান্টিযুক্ত গোপনীয়তা</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-gold-gradient hover:opacity-95 text-primary-foreground font-bold text-base px-8 py-3.5 rounded-xl shadow-xl gold-glow-hover transition-all duration-300 flex items-center justify-center gap-2 btn-shimmer"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                পাঠানো হচ্ছে...
              </>
            ) : (
              <>
                <span>{buttonIcon}</span>
                <span>{buttonLabel}</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default QnAFormCard;
