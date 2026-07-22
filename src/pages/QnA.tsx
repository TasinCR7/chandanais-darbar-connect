import { useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import QnAFormCard from "@/components/QnAFormCard";
import { 
  HelpCircle, 
  AlertTriangle, 
  FileQuestion, 
  MessageSquareWarning, 
  Search, 
  Copy, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  X,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification, escapeTelegramHtml } from "@/utils/telegram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

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

  // Tracking states
  const [lastTrackingId, setLastTrackingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const handleSubmit = async (
    type: "question" | "complaint",
    form: FormData,
    setForm: (f: FormData) => void,
    setSubmitting: (b: boolean) => void,
    setSuccess: (b: boolean) => void
  ) => {
    const trimmedName = form.name.trim();
    const trimmedDetails = form.details.trim();

    if (!trimmedName || !form.subject || !trimmedDetails) {
      toast({
        title: "অসম্পূর্ণ তথ্য",
        description: "অনুগ্রহ করে সকল প্রয়োজনীয় ঘর পূরণ করুন।",
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
      submissionTimes = JSON.parse(localStorage.getItem("last_qna_submissions") || "[]");
    } catch (e) {
      submissionTimes = [];
    }
    
    // Filter timestamps within the window
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

    setSubmitting(true);

    const { data, error } = await supabase.rpc("insert_submission", {
      p_type: type,
      p_name: trimmedName,
      p_phone: form.phone.trim() || null,
      p_subject: form.subject,
      p_details: trimmedDetails,
    });

    if (error) {
      toast({
        title: "ত্রুটি হয়েছে",
        description: "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Save submission timestamp on success
    submissionTimes.push(nowTime);
    localStorage.setItem("last_qna_submissions", JSON.stringify(submissionTimes));

    const trackingNumber = data ? data.replace(/-/g, "").substring(0, 8).toUpperCase() : "";
    setLastTrackingId(trackingNumber);

    // Send Telegram Notification
    const isComplaint = type === "complaint";
    const icon = isComplaint ? "🔴" : "🔵";
    const titleText = isComplaint ? "নতুন অভিযোগ জমা হয়েছে!" : "নতুন প্রশ্ন জমা হয়েছে!";

    const textMessage = `
${icon} *${titleText}*
━━━━━━━━━━━━━━━━━━
🆔 *ট্র্যাকিং নম্বর:* ${trackingNumber}
👤 *নাম:* ${escapeTelegramHtml(trimmedName)}
📱 *মোবাইল:* ${escapeTelegramHtml(form.phone.trim() || "দেওয়া হয়নি")}
📌 *বিষয়:* ${escapeTelegramHtml(form.subject)}
📝 *বিস্তারিত:*
${escapeTelegramHtml(trimmedDetails)}
━━━━━━━━━━━━━━━━━━
অনুগ্রহ করে প্যানেল থেকে ব্যবস্থা নিন।
    `;

    // Send Telegram Notification in background to avoid blocking the UI
    sendTelegramNotification(textMessage)
      .catch((err) => console.error("Failed to send Telegram notification from QnA page:", err));

    setForm({ ...initialForm });
    setSubmitting(false);
    setSuccess(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().replace(/[-\s]/g, "").toLowerCase();
    if (!cleanQuery) {
      toast({
        title: "ট্র্যাকিং নম্বর দিন",
        description: "অনুগ্রহ করে আপনার ট্র্যাকিং নম্বরটি লিখুন।",
        variant: "destructive",
      });
      return;
    }

    setSearchLoading(true);
    setSearchAttempted(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase.rpc("get_submission_by_tracking", {
        p_tracking: cleanQuery,
      });

      if (error) {
        console.error("Search error:", error);
        toast({
          title: "অনুসন্ধান ব্যর্থ হয়েছে",
          description: "তথ্য খুঁজতে কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন।",
          variant: "destructive",
        });
      } else if (data && data.length > 0) {
        setSearchResult(data[0]);
      } else {
        setSearchResult(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const trackingInfo = lastTrackingId ? (
    <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 sm:p-5 my-4 text-center shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-10">
        <Sparkles className="w-16 h-16 text-gold" />
      </div>
      <p className="text-xs text-gold/80 font-bold uppercase tracking-wider mb-2">আপনার ট্র্যাকিং নম্বর (এটি দিয়ে স্ট্যাটাস চেক করতে পারবেন)</p>
      <div className="flex items-center justify-center gap-3">
        <span className="font-mono font-bold text-xl sm:text-2xl text-gold select-all tracking-widest bg-black/40 border border-gold/30 px-4 py-1.5 rounded-xl shadow-inner">
          {lastTrackingId}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(lastTrackingId);
            toast({ description: "ট্র্যাকিং নম্বর কপি করা হয়েছে!" });
          }}
          className="p-2.5 hover:bg-gold/20 rounded-xl text-gold transition-all duration-300 active:scale-95 border border-gold/30"
          title="কপি করুন"
        >
          <Copy className="w-5 h-5" />
        </button>
      </div>
    </div>
  ) : null;

  const faqData = [
    {
      question: "শরিয়তের কোনো বিষয়ে কি সরাসরি প্রশ্ন করা যাবে?",
      answer: "হ্যাঁ, আপনি এই পেজের ফর্ম ব্যবহার করে শরিয়তের যে কোনো বিষয়ে অভিজ্ঞ আলেমদের প্রশ্ন করতে পারেন। অভিজ্ঞ আলেমগণ বিশ্বস্ততার সাথে উত্তর প্রদান করবেন।",
    },
    {
      question: "প্রশ্ন বা অভিযোগের উত্তর পেতে কত সময় লাগে?",
      answer: "সাধারণত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে দরবার শরীফের আলেম অথবা ইনসাফ সেল আপনার আবেদনের উত্তর বা সমাধান প্রদান করে থাকেন।",
    },
    {
      question: "আমার নাম ও মোবাইল নম্বর কি প্রকাশ করা হবে?",
      answer: "না, আপনার নাম ও যোগাযোগের তথ্য সম্পূর্ণ গোপন রাখা হবে। শুধুমাত্র দরবার শরীফের সংশ্লিষ্ট আলেম ও প্রশাসন তা দেখতে পারবেন।",
    },
    {
      question: "ট্র্যাকিং নম্বর হারিয়ে গেলে কীভাবে খোঁজ নেব?",
      answer: "যদি আপনার মোবাইল নম্বর ফর্মে দিয়ে থাকেন, তবে মোবাইল নম্বর দিয়েও খোঁজ করা সম্ভব অথবা পুনরায় আবেদন করতে পারেন।",
    },
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
      <div className="py-10 md:py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4">
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-widest mb-4 shadow-md"
            >
              <Sparkles size={14} className="animate-spin-slow" />
              <span>ইনসাফ ও ফতোয়া সেল • চন্দনাইশ দরবার</span>
            </motion.div>
            
            <SectionTitle
              arabic="الأسئلة والشكاوى"
              title="প্রশ্ন-উত্তর ও অভিযোগ"
              subtitle="শরিয়তের যেকোনো বিষয়ে অভিজ্ঞ আলেম সাহেবের মতামত নিন অথবা দরবার শরীফের যেকোনো অভিযোগ জানান।"
            />

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <Lock size={14} className="text-gold" /> ১০০% তথ্য গোপনীয়তা
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <Clock size={14} className="text-gold" /> দ্রুত উত্তর সুবিধা
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/60 border border-gold/15">
                <ShieldCheck size={14} className="text-gold" /> সরাসরি ট্র্যাকিং
              </span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            <Tabs defaultValue="question" className="w-full">
              {/* Glassmorphic Tab Bar */}
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-card/60 backdrop-blur-xl border border-gold/25 p-1.5 rounded-2xl h-auto gap-1 shadow-2xl">
                <TabsTrigger
                  value="question"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg py-3 sm:py-3.5 rounded-xl font-bold text-xs xs:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300"
                >
                  <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> 
                  <span>প্রশ্ন / ফতোয়া</span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="complaint"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white data-[state=active]:shadow-lg py-3 sm:py-3.5 rounded-xl font-bold text-xs xs:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300"
                >
                  <MessageSquareWarning className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> 
                  <span>অভিযোগ</span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="track"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg py-3 sm:py-3.5 rounded-xl font-bold text-xs xs:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> 
                  <span>খোঁজ করুন</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Question Form */}
              <TabsContent value="question" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <QnAFormCard
                  icon={HelpCircle}
                  title="প্রশ্ন-উত্তর / ফতোয়া"
                  subtitle="📖 শরিয়তের যেকোনো বিষয়ে নির্ভুল মাসআলা ও সঠিক দিকনির্দেশনার জন্য দরবার শরীফের আলেম সাহেবের সাথে যোগাযোগ করুন।"
                  subjects={questionSubjects}
                  form={qForm}
                  setForm={setQForm}
                  submitting={qSubmitting}
                  onSubmit={() => handleSubmit("question", qForm, setQForm, setQSubmitting, setQSuccess)}
                  buttonLabel="প্রশ্ন পাঠান"
                  buttonIcon="📩"
                  accentClass="bg-gold/15 text-gold border border-gold/30"
                  showSuccess={qSuccess}
                  onCloseSuccess={() => {
                    setQSuccess(false);
                    setLastTrackingId("");
                  }}
                  successExtraContent={trackingInfo}
                />
              </TabsContent>

              {/* Tab 2: Complaint Form */}
              <TabsContent value="complaint" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <QnAFormCard
                  icon={AlertTriangle}
                  title="অভিযোগ"
                  subtitle="⚠️ দরবার শরীফের যেকোনো ব্যবস্থাপনা, সেবা বা আচরণ সংক্রান্ত অভিযোগ বা গঠনমূলক মতামত নিঃসংকোচে জানান।"
                  subjects={complaintSubjects}
                  form={cForm}
                  setForm={setCForm}
                  submitting={cSubmitting}
                  onSubmit={() => handleSubmit("complaint", cForm, setCForm, setCSubmitting, setCSuccess)}
                  buttonLabel="অভিযোগ পাঠান"
                  buttonIcon="📝"
                  accentClass="bg-destructive/15 text-destructive border border-destructive/30"
                  showSuccess={cSuccess}
                  onCloseSuccess={() => {
                    setCSuccess(false);
                    setLastTrackingId("");
                  }}
                  successExtraContent={trackingInfo}
                />
              </TabsContent>

              {/* Tab 3: Track & Search Status */}
              <TabsContent value="track" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-card/70 backdrop-blur-xl border border-gold/25 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl"
                >
                  <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-gold/15">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gold/15 text-gold border border-gold/30">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-cream text-xl md:text-2xl">স্ট্যাটাস ও উত্তর খোঁজ করুন</h3>
                      <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">আপনার প্রশ্ন বা অভিযোগের ট্র্যাকিং নম্বর দিয়ে অগ্ৰগতি জানুন।</p>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-cream mb-2 block flex items-center gap-2">
                        <Lock size={15} className="text-gold" /> ট্র্যাকিং নম্বর লিখুন
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative w-full">
                          <Input
                            placeholder="যেমন: E4D58852"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/40 border-gold/30 focus:border-gold font-mono uppercase tracking-widest w-full pr-10 py-5 text-lg text-gold font-bold rounded-xl"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResult(null);
                                setSearchAttempted(false);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-white/10"
                              title="মুছে ফেলুন"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="submit"
                          disabled={searchLoading}
                          className="w-full sm:w-auto bg-gold-gradient hover:opacity-95 text-primary-foreground font-bold px-8 py-5 rounded-xl gold-glow-hover transition-all duration-300 shrink-0 text-base shadow-lg btn-shimmer"
                        >
                          {searchLoading ? "খোঁজা হচ্ছে..." : "অনুসন্ধান করুন"}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Search Result Found Display */}
                  {searchResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-6 sm:p-8 rounded-3xl border border-gold/35 bg-gradient-to-b from-card/90 via-black/40 to-card/90 backdrop-blur-2xl relative overflow-hidden shadow-2xl"
                    >
                      {/* Decorative Header Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gold/15">
                        <div>
                          <span className="text-[10px] text-gold/60 uppercase tracking-widest font-bold block mb-1">অফিসিয়াল ট্র্যাকিং কোড</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-bold text-gold tracking-widest bg-black/50 border border-gold/30 px-3 py-1 rounded-lg">
                              {searchResult.id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cleanId = searchResult.id.replace(/-/g, "").substring(0, 8).toUpperCase();
                                navigator.clipboard.writeText(cleanId);
                                toast({ description: "ট্র্যাকিং নম্বর কপি করা হয়েছে!" });
                              }}
                              className="p-2 hover:bg-gold/20 rounded-lg text-gold transition-all border border-gold/20"
                              title="কপি করুন"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="self-start sm:self-center">
                          <span
                            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              searchResult.type === "question"
                                ? "bg-gold/15 text-gold border border-gold/30 shadow-md"
                                : "bg-destructive/15 text-destructive border border-destructive/30 shadow-md"
                            }`}
                          >
                            {searchResult.type === "question" ? "📖 প্রশ্ন / ফতোয়া" : "⚠️ অভিযোগ"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-6 mt-6">
                        {/* Meta info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-4 rounded-2xl border border-gold/10">
                          <div>
                            <p className="text-xs text-muted-foreground">জমা দেওয়ার তারিখ</p>
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-cream">
                              <Calendar className="w-4 h-4 text-gold" />
                              {new Date(searchResult.created_at).toLocaleDateString("bn-BD", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">বর্তমান অবস্থা</p>
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-bold">
                              {searchResult.reply ? (
                                <>
                                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                  <span className="text-emerald-400">উত্তর দেওয়া হয়েছে</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                                  <span className="text-amber-400">অপেক্ষমাণ (পর্যালোচনাধীন)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Applicant details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gold/10 pt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">আবেদনকারী</p>
                            <p className="font-bold text-cream text-base mt-0.5">{searchResult.name}</p>
                          </div>
                          {searchResult.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground">মোবাইল নম্বর</p>
                              <p className="font-mono font-bold text-gold mt-0.5">
                                {searchResult.phone.replace(/[-\s]/g, "").length >= 10
                                  ? searchResult.phone.replace(/[-\s]/g, "").substring(0, 5) +
                                    "-XXXX-" +
                                    searchResult.phone.replace(/[-\s]/g, "").substring(searchResult.phone.replace(/[-\s]/g, "").length - 3)
                                  : searchResult.phone}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 3-Step Progress Tracker Bar */}
                        <div className="max-w-md mx-auto py-6 px-2 relative border-t border-gold/10 mt-6">
                          <p className="text-[10px] text-gold/70 mb-5 text-center uppercase tracking-widest font-bold">অগ্রগতি ট্র্যাকার</p>
                          <div className="relative flex items-center justify-between">
                            {/* Progress Line */}
                            <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-[3px] bg-white/10 rounded-full z-0">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 via-gold to-emerald-500 rounded-full relative transition-all duration-700" 
                                style={{ width: searchResult.reply ? "100%" : "50%" }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#fff]" />
                              </div>
                            </div>

                            {/* Step 1 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                              <div className="w-8 h-8 rounded-full bg-emerald-950/90 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                ✓
                              </div>
                              <span className="text-[11px] font-bold text-emerald-400 mt-2.5">
                                ১. জমা হয়েছে
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">প্রাপ্ত</span>
                            </div>

                            {/* Step 2 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                              {searchResult.reply ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-950/90 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                  ✓
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold font-bold text-xs shadow-[0_0_15px_rgba(212,175,55,0.4)] relative">
                                  <span className="absolute inset-0 rounded-full border border-gold/60 animate-ping opacity-60" />
                                  ২
                                </div>
                              )}
                              <span className={`text-[11px] font-bold mt-2.5 ${searchResult.reply ? 'text-emerald-400' : 'text-gold'}`}>
                                ২. পর্যালোচনা
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                {searchResult.reply ? 'সম্পন্ন' : 'চলমান আছে'}
                              </span>
                            </div>

                            {/* Step 3 */}
                            <div className="relative z-10 flex flex-col items-center text-center">
                              {searchResult.reply ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-950/90 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                  ✓
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-950 border-2 border-white/20 flex items-center justify-center text-muted-foreground font-bold text-xs">
                                  ৩
                                </div>
                              )}
                              <span className={`text-[11px] font-bold mt-2.5 ${searchResult.reply ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                ৩. উত্তর প্রদান
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                {searchResult.reply ? 'উত্তর দেওয়া হয়েছে' : 'অপেক্ষমাণ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="border-t border-gold/10 pt-4">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">বিষয়</p>
                          <p className="font-semibold text-cream text-base mt-1">{searchResult.subject}</p>
                        </div>

                        {/* User Details */}
                        <div className="border-t border-gold/10 pt-4">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
                            {searchResult.type === "question" ? "আপনার প্রশ্ন" : "আপনার অভিযোগ"}
                          </p>
                          <div className="text-foreground/90 bg-black/40 border border-gold/15 rounded-2xl p-4 text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                            {searchResult.details}
                          </div>
                        </div>

                        {/* Reply / Solution Display */}
                        {searchResult.reply ? (
                          <div className="border-t border-emerald-500/30 pt-6 mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-emerald-400" /> 
                                <span>উত্তর / সমাধান</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(searchResult.reply);
                                  toast({ description: "উত্তর কপি করা হয়েছে!" });
                                }}
                                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-bold border border-emerald-500/30"
                                title="উত্তর কপি করুন"
                              >
                                <Copy className="w-3.5 h-3.5" /> কপি করুন
                              </button>
                            </div>
                            
                            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 text-base text-cream whitespace-pre-wrap leading-relaxed shadow-lg">
                              {searchResult.reply}
                              {searchResult.replied_at && (
                                <p className="text-xs text-emerald-400/70 text-right mt-4 font-medium border-t border-emerald-500/20 pt-2">
                                  উত্তর প্রদানের সময়:{" "}
                                  {new Date(searchResult.replied_at).toLocaleDateString("bn-BD", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-gold/10 pt-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                            <p className="text-xs text-amber-300/90 font-medium">
                              অনুগ্রহ করে একটু অপেক্ষা করুন, খুব শীঘ্রই দরবার শরীফের অভিজ্ঞ আলেম বা প্রশাসন আপনার আবেদনের উত্তর প্রদান করবেন।
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Not Found Display */}
                  {!searchResult && searchAttempted && !searchLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="mt-8 p-6 md:p-8 rounded-3xl border border-destructive/30 bg-card/40 backdrop-blur-xl text-center space-y-5 relative overflow-hidden shadow-xl"
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold tracking-wide uppercase">
                        আবেদন পাওয়া যায়নি
                      </div>

                      <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-destructive/15 border border-destructive/40 flex items-center justify-center text-destructive">
                          <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-destructive font-heading font-bold text-lg md:text-xl">
                          ট্র্যাকিং নম্বরটি সঠিক নয়
                        </h4>
                        <p className="text-foreground/80 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                          আপনার প্রদানকৃত ট্র্যাকিং নম্বরটি ডাটাবেজে খুঁজে পাওয়া যায়নি। ট্র্যাকিং নম্বরটি পুনরায় পরীক্ষা করে চেষ্টা করুন।
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* Interactive FAQ Section at Bottom */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 backdrop-blur-xl border border-gold/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gold/15 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-cream text-lg md:text-xl">সাধারণ জিজ্ঞাসা (FAQ)</h3>
                    <p className="text-muted-foreground text-xs">সরাসরি প্রশ্ন করার পূর্বে কিছু সাধারণ জিজ্ঞাসার উত্তর দেখুন</p>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqData.map((item, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`item-${idx}`}
                    className="border border-gold/15 bg-black/30 rounded-2xl px-5 transition-all duration-300 hover:border-gold/30 overflow-hidden"
                  >
                    <AccordionTrigger className="text-sm md:text-base font-bold text-cream hover:text-gold hover:no-underline py-4">
                      <span className="flex items-center gap-2 text-left">
                        <ChevronRight size={16} className="text-gold shrink-0" />
                        {item.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed border-t border-gold/10 pt-3 pb-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
};

export default QnA;
