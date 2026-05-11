import { useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import QnAFormCard from "@/components/QnAFormCard";
import { HelpCircle, AlertTriangle, FileQuestion, MessageSquareWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification } from "@/utils/telegram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

    // Send Telegram Notification
    const isComplaint = type === "complaint";
    const icon = isComplaint ? "🔴" : "🔵";
    const titleText = isComplaint ? "নতুন অভিযোগ জমা হয়েছে!" : "নতুন প্রশ্ন জমা হয়েছে!";
    
    const textMessage = `
${icon} *${titleText}*
━━━━━━━━━━━━━━━━━━
👤 *নাম:* ${trimmedName}
📱 *মোবাইল:* ${form.phone.trim() || "দেওয়া হয়নি"}
📌 *বিষয়:* ${form.subject}
📝 *বিস্তারিত:*
${trimmedDetails}
━━━━━━━━━━━━━━━━━━
অনুগ্রহ করে প্যানেল থেকে ব্যবস্থা নিন।
    `;
    
    // Send Telegram Notification in background to avoid blocking the UI
    sendTelegramNotification(textMessage)
      .then(() => console.log("Telegram notification sent successfully from QnA page"))
      .catch((err) => console.error("Failed to send Telegram notification from QnA page:", err));


    setForm({ ...initialForm });
    setSubmitting(false);
    setSuccess(true);
  };

  const faqData = [
    {
      question: "শরিয়তের কোনো বিষয়ে কি সরাসরি প্রশ্ন করা যাবে?",
      answer: "হ্যাঁ, আপনি এই পেজের ফর্ম ব্যবহার করে শরিয়তের যে কোনো বিষয়ে অভিজ্ঞ আলেমদের প্রশ্ন করতে পারেন।"
    },
    {
      question: "অভিযোগ বা মতামত জানানোর প্রক্রিয়া কী?",
      answer: "দরবার শরীফ সংক্রান্ত যেকোনো অভিযোগ বা গঠনমূলক মতামত আপনি অভিযোগ বক্সের মাধ্যমে সরাসরি জানাতে পারেন।"
    }
  ];

  return (
    <>
      <SEO 
        title="শরিয়তের প্রশ্ন ও অভিযোগ" 
        description="শরিয়তের যেকোনো বিষয়ে প্রশ্ন করুন অথবা দরবার শরীফ সংক্রান্ত কোনো অভিযোগ বা মতামত থাকলে জানান। অভিজ্ঞ আলেমগণ উত্তর প্রদান করবেন।" 
        keywords="ফতোয়া জিজ্ঞাসা, শরিয়তি প্রশ্ন, অভিযোগ বক্স, চন্দনাইশ দরবার মতামত, আলেমদের পরামর্শ"
        canonical="/qna" 
        faq={faqData}
      />
      <div className="py-20 islamic-pattern">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="الأسئلة والشكاوى"
            title="প্রশ্ন-উত্তর ও অভিযোগ"
            subtitle="শরিয়তের বিষয়ে প্রশ্ন করুন অথবা অভিযোগ জানান।"
          />

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="question" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 border border-gold/20 p-1 rounded-xl h-auto">
                <TabsTrigger value="question" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-3 rounded-lg font-bold text-sm md:text-base flex items-center justify-center gap-2">
                  <FileQuestion className="w-4 h-4 md:w-5 md:h-5" /> প্রশ্ন / ফতোয়া
                </TabsTrigger>
                <TabsTrigger value="complaint" className="data-[state=active]:bg-destructive data-[state=active]:text-white py-3 rounded-lg font-bold text-sm md:text-base flex items-center justify-center gap-2">
                  <MessageSquareWarning className="w-4 h-4 md:w-5 md:h-5" /> অভিযোগ
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="question" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
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
              </TabsContent>
              
              <TabsContent value="complaint" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default QnA;
