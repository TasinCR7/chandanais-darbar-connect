import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { Loader2, ShieldCheck } from "lucide-react";
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-card/90 backdrop-blur-md border border-gold/25 rounded-2xl overflow-hidden shadow-xl"
    >
      <SuccessOverlay
        show={showSuccess}
        title={isQuestion ? "প্রশ্ন পাঠানো হয়েছে! ✅" : "অভিযোগ পাঠানো হয়েছে! ✅"}
        message="আপনার বার্তা সফলভাবে জমা হয়েছে। ইনশাআল্লাহ শীঘ্রই উত্তর দেওয়া হবে।"
        onClose={onCloseSuccess}
        extraContent={successExtraContent}
      />

      {/* Clean Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gold/15 bg-card/60">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${accentClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground text-lg sm:text-xl">{title}</h3>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-gold/80 font-medium px-2.5 py-1 rounded-full bg-gold/5 border border-gold/15">
          <ShieldCheck size={13} className="text-gold" />
          <span>গোপনীয়তা সংরক্ষিত</span>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-5">
        {/* Info Banner */}
        <div className="border-l-4 border-gold bg-gold/5 rounded-r-xl p-3.5 border border-gold/10">
          <p className="text-foreground/90 text-sm leading-relaxed font-medium">{subtitle}</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground">
                  আপনার নাম <span className="text-destructive">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground/60">{form.name.length}/100</span>
              </div>
              <Input
                placeholder="পূর্ণ নাম লিখুন"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className="bg-black/20 border-gold/25 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 rounded-xl py-4.5"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                বিষয় <span className="text-destructive">*</span>
              </label>
              <Select value={form.subject || undefined} onValueChange={(val) => setForm({ ...form, subject: val })}>
                <SelectTrigger className="bg-black/20 border-gold/25 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 rounded-xl py-4.5">
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

          {/* Phone */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              মোবাইল নম্বর <span className="text-xs text-muted-foreground/70 font-normal">(ঐচ্ছিক, ট্র্যাকিং এর জন্য)</span>
            </label>
            <Input
              placeholder="যেমন: ০১৭১১-২৩৪৫৬৭"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={15}
              className="bg-black/20 border-gold/25 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 rounded-xl py-4.5"
            />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-foreground">
                {isQuestion ? "প্রশ্ন বিস্তারিত লিখুন" : "অভিযোগ বিস্তারিত লিখুন"} <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground/60">{form.details.length}/2000</span>
            </div>
            <Textarea
              placeholder={isQuestion ? "আপনার প্রশ্নটি স্পষ্ট ও বিস্তারিতভাবে লিখুন..." : "আপনার অভিযোগ বিস্তারিত লিখুন..."}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              maxLength={2000}
              rows={5}
              className="bg-black/20 border-gold/25 focus:border-gold/60 focus:ring-1 focus:ring-gold/30 rounded-xl p-3.5 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.subject || !form.details.trim()}
            className="w-full sm:w-auto bg-gold-gradient text-primary-foreground font-bold text-sm px-8 py-3 rounded-xl shadow-lg gold-glow-hover transition-all duration-300 flex items-center justify-center gap-2 btn-shimmer"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
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
