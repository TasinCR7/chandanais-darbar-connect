import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative bg-card border border-gold/20 rounded-2xl overflow-hidden shadow-xl"
    >
      <SuccessOverlay
        show={showSuccess}
        title={isQuestion ? "প্রশ্ন পাঠানো হয়েছে! ✅" : "অভিযোগ পাঠানো হয়েছে! ✅"}
        message="আপনার বার্তা সফলভাবে জমা হয়েছে। ইনশাআল্লাহ শীঘ্রই উত্তর দেওয়া হবে।"
        onClose={onCloseSuccess}
        extraContent={successExtraContent}
      />
      <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10 bg-card">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-heading font-bold text-foreground text-lg sm:text-xl">{title}</h3>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-5">
        <div className="border-l-4 border-gold bg-gold/5 rounded-r-lg p-3.5">
          <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">আপনার নাম</label>
              <Input
                placeholder="নাম লিখুন"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className="border-gold/20 focus:border-gold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">বিষয়</label>
              <Select value={form.subject} onValueChange={(val) => setForm({ ...form, subject: val })}>
                <SelectTrigger className="border-gold/20 focus:border-gold">
                  <SelectValue placeholder="বিষয় নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">মোবাইল নম্বর</label>
            <Input
              placeholder="০১৭১১-২৩৪৫৬৭"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={15}
              className="border-gold/20 focus:border-gold"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              {isQuestion ? "প্রশ্ন লিখুন" : "অভিযোগ লিখুন"}
            </label>
            <Textarea
              placeholder={isQuestion ? "আপনার প্রশ্ন বিস্তারিত লিখুন..." : "আপনার অভিযোগ বিস্তারিত লিখুন..."}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              maxLength={2000}
              rows={4}
              className="border-gold/20 focus:border-gold resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-gold-gradient text-primary-foreground font-semibold px-7 py-3 rounded-lg gold-glow-hover transition-all duration-300 flex items-center justify-center gap-2 btn-shimmer"
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
