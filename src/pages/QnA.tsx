import { useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import QnAFormCard from "@/components/QnAFormCard";
import { HelpCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const questionSubjects = [
  "নামাজ সংক্রান্ত",
  "রোজা সংক্রান্ত",
  "যাকাত সংক্রান্ত",
  "হজ্জ সংক্রান্ত",
  "বিবাহ / পারিবারিক",
  "ব্যবসা / লেনদেন",
  "অন্যান্য",
];

const complaintSubjects = [
  "দরবার সংক্রান্ত",
  "ব্যবস্থাপনা বিষয়ক",
  "অনুষ্ঠান বিষয়ক",
  "আচরণ বিষয়ক",
  "অন্যান্য",
];

interface FormData {
  name: string;
  phone: string;
  subject: string;
  details: string;
}

const initialForm: FormData = { name: "", phone: "", subject: "", details: "" };

const QnA = () => {
  const { toast } = useToast();
  const [qForm, setQForm] = useState<FormData>({ ...initialForm });
  const [cForm, setCForm] = useState<FormData>({ ...initialForm });
  const [qSubmitting, setQSubmitting] = useState(false);
  const [cSubmitting, setCSubmitting] = useState(false);
  const [qSuccess, setQSuccess] = useState(false);
  const [cSuccess, setCSuccess] = useState(false);

  const handleSubmit = async (type: "question" | "complaint", form: FormData, setForm: (f: FormData) => void, setSubmitting: (b: boolean) => void, setSuccess: (b: boolean) => void) => {
    const trimmedName = form.name.trim();
    const trimmedDetails = form.details.trim();

    if (!trimmedName || !form.subject || !trimmedDetails) {
      toast({ title: "অসম্পূর্ণ তথ্য", description: "অনুগ্রহ করে সকল প্রয়োজনীয় ঘর পূরণ করুন।", variant: "destructive" });
      return;
    }

    if (trimmedName.length > 100 || trimmedDetails.length > 2000) {
      toast({ title: "তথ্য অতিরিক্ত দীর্ঘ", description: "নাম ১০০ ও বিবরণ ২০০০ অক্ষরের মধ্যে রাখুন।", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("submissions").insert({
      type,
      name: trimmedName,
      phone: form.phone.trim() || null,
      subject: form.subject,
      details: trimmedDetails,
    });

    if (error) {
      toast({ title: "ত্রুটি হয়েছে", description: "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setForm({ ...initialForm });
    setSubmitting(false);
    setSuccess(true);
  };

  return (
    <>
      <SEO title="প্রশ্ন-উত্তর ও অভিযোগ" description="চন্দনাইশ দরবার শরীফে শরিয়তের প্রশ্ন করুন বা অভিযোগ জানান।" canonical="/qna" />
      <div className="py-20 islamic-pattern">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="الأسئلة والشكاوى"
            title="প্রশ্ন-উত্তর ও অভিযোগ"
            subtitle="শরিয়তের বিষয়ে প্রশ্ন করুন অথবা অভিযোগ জানান।"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <QnAFormCard
              icon={HelpCircle}
              title="প্রশ্ন-উত্তর / ফতোয়া"
              subtitle="📖 শরিয়তের কোনো বিষয়ে সঠিক উত্তরের জন্য দরবার শরীফের আলেম সাহেবের সাথে যোগাযোগ করুন।"
              subjects={questionSubjects}
              form={qForm}
              setForm={setQForm}
              submitting={qSubmitting}
              onSubmit={() => handleSubmit("question", qForm, setQForm, setQSubmitting, setQSuccess)}
              buttonLabel="প্রশ্ন পাঠান"
              buttonIcon="📩"
              accentClass="bg-gold/10 text-gold"
              showSuccess={qSuccess}
              onCloseSuccess={() => setQSuccess(false)}
            />
            <QnAFormCard
              icon={AlertTriangle}
              title="অভিযোগ"
              subtitle="⚠️ দরবার শরীফ সংক্রান্ত কোনো অভিযোগ বা মতামত থাকলে জানান।"
              subjects={complaintSubjects}
              form={cForm}
              setForm={setCForm}
              submitting={cSubmitting}
              onSubmit={() => handleSubmit("complaint", cForm, setCForm, setCSubmitting, setCSuccess)}
              buttonLabel="অভিযোগ পাঠান"
              buttonIcon="📝"
              accentClass="bg-destructive/10 text-destructive"
              showSuccess={cSuccess}
              onCloseSuccess={() => setCSuccess(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default QnA;
