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
  X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification, escapeTelegramHtml } from "@/utils/telegram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

    let submissionId: string | null = null;

    // 1. Try RPC insert_submission first
    try {
      const { data, error } = await supabase.rpc("insert_submission", {
        p_type: type,
        p_name: trimmedName,
        p_phone: form.phone.trim() || null,
        p_subject: form.subject,
        p_details: trimmedDetails,
      });

      if (!error && data) {
        submissionId = String(data);
      }
    } catch (rpcErr) {
      console.warn("RPC insert_submission failed, falling back to table insert:", rpcErr);
    }

    // 2. Fallback to direct table insert if RPC returned no ID
    if (!submissionId) {
      const { data: directData, error: directErr } = await supabase
        .from("submissions")
        .insert({
          type: type,
          name: trimmedName,
          phone: form.phone.trim() || null,
          subject: form.subject,
          details: trimmedDetails,
        })
        .select("id")
        .maybeSingle();

      if (directErr) {
        console.error("Submission insert error:", directErr);
        toast({
          title: "ত্রুটি হয়েছে",
          description: directErr.message || "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      if (directData && directData.id) {
        submissionId = directData.id;
      }
    }

    // Save submission timestamp on success safely
    try {
      submissionTimes.push(nowTime);
      localStorage.setItem("last_qna_submissions", JSON.stringify(submissionTimes));
    } catch (storageErr) {
      console.warn("localStorage setItem warning:", storageErr);
    }

    const trackingNumber = submissionId
      ? submissionId.replace(/-/g, "").substring(0, 8).toUpperCase()
      : Math.random().toString(36).substring(2, 10).toUpperCase();

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
      let foundRecord: any = null;

      // 1. Try RPC get_submission_by_tracking first
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_submission_by_tracking", {
        p_tracking: cleanQuery,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        foundRecord = rpcData[0];
      } else {
        // 2. Fallback query if RPC didn't return a record
        const { data: fallbackData } = await supabase
          .from("submissions")
          .select("*");

        if (fallbackData && fallbackData.length > 0) {
          foundRecord = fallbackData.find((item: any) => {
            const cleanId = item.id.replace(/-/g, "").toLowerCase();
            return cleanId.startsWith(cleanQuery) || item.id.toLowerCase() === cleanQuery;
          }) || null;
        }
      }

      setSearchResult(foundRecord);

      if (!foundRecord && rpcError) {
        console.warn("RPC tracking search note:", rpcError);
      }
    } catch (err) {
      console.error("QnA search error:", err);
      toast({
        title: "অনুসন্ধান ব্যর্থ হয়েছে",
        description: "তথ্য খুঁজতে কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const trackingInfo = lastTrackingId ? (
    <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 sm:p-4 my-4 text-center">
      <p className="text-xs text-muted-foreground mb-1.5">আপনার ট্র্যাকিং নাম্বার (পরবর্তীতে চেক করার জন্য এটি সংরক্ষণ করুন):</p>
      <div className="flex items-center justify-center gap-2">
        <span className="font-mono font-bold text-lg text-gold select-all tracking-wider">{lastTrackingId}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(lastTrackingId);
            toast({ description: "ট্র্যাকিং নাম্বার কপি করা হয়েছে!" });
          }}
          className="p-1.5 hover:bg-gold/20 rounded text-gold transition-colors"
          title="কপি করুন"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  const faqData = [
    {
      question: "শরিয়তের কোনো বিষয়ে কি সরাসরি প্রশ্ন করা যাবে?",
      answer: "হ্যাঁ, আপনি এই পেজের ফর্ম ব্যবহার করে শরিয়তের যে কোনো বিষয়ে অভিজ্ঞ আলেমদের প্রশ্ন করতে পারেন।",
    },
    {
      question: "অভিযোগ বা মতামত জানানোর প্রক্রিয়া কী?",
      answer: "দরবার শরীফ সংক্রান্ত যেকোনো অভিযোগ বা গঠনমূলক মতামত আপনি অভিযোগ বক্সের মাধ্যমে সরাসরি জানাতে পারেন।",
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
          <SectionTitle
            arabic="الأسئلة والشكاوى"
            title="প্রশ্ন-উত্তর ও অভিযোগ"
            subtitle="শরিয়তের বিষয়ে প্রশ্ন করুন অথবা অভিযোগ জানান এবং ট্র্যাকিং নম্বর দিয়ে স্ট্যাটাস চেক করুন।"
          />

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="question" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 border border-gold/20 p-1 rounded-xl h-auto gap-0.5 xs:gap-1">
                <TabsTrigger
                  value="question"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-2 sm:py-3 px-1 rounded-lg font-bold text-[11px] xs:text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 leading-tight text-center"
                >
                  <FileQuestion className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" /> <span className="truncate">প্রশ্ন / ফতোয়া</span>
                </TabsTrigger>
                <TabsTrigger
                  value="complaint"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white py-2 sm:py-3 px-1 rounded-lg font-bold text-[11px] xs:text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 leading-tight text-center"
                >
                  <MessageSquareWarning className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" /> <span className="truncate">অভিযোগ</span>
                </TabsTrigger>
                <TabsTrigger
                  value="track"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-2 sm:py-3 px-1 rounded-lg font-bold text-[11px] xs:text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 leading-tight text-center"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 shrink-0" /> <span className="truncate">খোঁজ করুন</span>
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
                  onCloseSuccess={() => {
                    setQSuccess(false);
                    setLastTrackingId("");
                  }}
                  successExtraContent={trackingInfo}
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
                  onCloseSuccess={() => {
                    setCSuccess(false);
                    setLastTrackingId("");
                  }}
                  successExtraContent={trackingInfo}
                />
              </TabsContent>

              <TabsContent value="track" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="bg-card border border-gold/20 rounded-lg p-6 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gold/10 text-gold">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground text-lg">স্ট্যাটাস ও উত্তর খোঁজ করুন</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">আপনার প্রশ্ন বা অভিযোগের ট্র্যাকিং নম্বর দিয়ে অগ্রগতি জানুন।</p>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">ট্র্যাকিং নম্বর</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full">
                          <Input
                            placeholder="যেমন: E4D58852"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-base border-gold/20 focus:border-gold font-mono uppercase tracking-wider w-full pr-10"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setSearchResult(null);
                                setSearchAttempted(false);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              title="মুছে ফেলুন"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="submit"
                          disabled={searchLoading}
                          className="w-full sm:w-auto bg-gold-gradient text-primary-foreground font-semibold px-6 py-2.5 rounded-lg gold-glow-hover transition-all duration-300 shrink-0"
                        >
                          {searchLoading ? "খোঁজা হচ্ছে..." : "অনুসন্ধান"}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {searchResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-4 sm:p-6 rounded-xl border border-gold/30 bg-card/65 backdrop-blur-md relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gold/10">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">ট্র্যাকিং নম্বর</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-base font-bold text-gold tracking-wider">
                              {searchResult.id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cleanId = searchResult.id.replace(/-/g, "").substring(0, 8).toUpperCase();
                                navigator.clipboard.writeText(cleanId);
                                toast({ description: "ট্র্যাকিং নাম্বার কপি করা হয়েছে!" });
                              }}
                              className="p-1.5 hover:bg-gold/20 rounded text-gold transition-colors"
                              title="কপি করুন"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="self-start sm:self-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              searchResult.type === "question"
                                ? "bg-gold/10 text-gold border border-gold/20"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}
                          >
                            {searchResult.type === "question" ? "প্রশ্ন / ফতোয়া" : "অভিযোগ"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">জমা দেওয়ার তারিখ</p>
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium">
                              <Calendar className="w-4 h-4 text-gold/60" />
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
                                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  <span className="text-emerald-500">উত্তর দেওয়া হয়েছে</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                  <span className="text-amber-500">অপেক্ষমাণ (পর্যালোচনাধীন)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gold/10 pt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">আবেদনকারী</p>
                            <p className="font-semibold text-foreground mt-0.5">{searchResult.name}</p>
                          </div>
                          {searchResult.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground">মোবাইল নম্বর</p>
                              <p className="font-semibold text-foreground mt-0.5">
                                {searchResult.phone.replace(/[-\s]/g, "").length >= 10
                                  ? searchResult.phone.replace(/[-\s]/g, "").substring(0, 5) +
                                    "-XXXX-" +
                                    searchResult.phone.replace(/[-\s]/g, "").substring(searchResult.phone.replace(/[-\s]/g, "").length - 3)
                                  : searchResult.phone}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Visual Progress Tracker */}
                        <div className="max-w-md mx-auto py-6 px-4 relative border-t border-gold/10 mt-4">
                          <p className="text-[10px] text-muted-foreground mb-4 text-center uppercase tracking-widest font-bold">অগ্রগতি ট্র্যাকার</p>
                          <div className="relative flex items-center justify-between">
                            <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-[3px] bg-white/10 rounded-full z-0">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 via-gold to-emerald-500 rounded-full relative transition-all duration-500" 
                                style={{ width: searchResult.reply ? "100%" : "50%" }}
                              >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                              </div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center max-w-[80px] xs:max-w-[100px] sm:max-w-none text-center">
                              <div className="w-8 h-8 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                ✓
                              </div>
                              <span className="text-[10px] md:text-xs font-bold text-emerald-400 mt-2.5">
                                ১. জমা হয়েছে
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">সফলভাবে প্রাপ্ত</span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center max-w-[80px] xs:max-w-[100px] sm:max-w-none text-center">
                              {searchResult.reply ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                  ✓
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold font-bold text-xs shadow-[0_0_15px_rgba(212,175,55,0.4)] relative">
                                  <span className="absolute inset-0 rounded-full border border-gold/60 animate-ping opacity-60" />
                                  ২
                                </div>
                              )}
                              <span className={`text-[10px] md:text-xs font-bold mt-2.5 ${searchResult.reply ? 'text-emerald-400' : 'text-gold'}`}>
                                ২. পর্যালোচনা
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                {searchResult.reply ? 'সম্পন্ন' : 'চলমান আছে'}
                              </span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center max-w-[80px] xs:max-w-[100px] sm:max-w-none text-center">
                              {searchResult.reply ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                                  ✓
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-neutral-950 border-2 border-white/20 flex items-center justify-center text-muted-foreground font-bold text-xs">
                                  ৩
                                </div>
                              )}
                              <span className={`text-[10px] md:text-xs font-bold mt-2.5 ${searchResult.reply ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                ৩. উত্তর প্রদান
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">
                                {searchResult.reply ? 'উত্তর দেওয়া হয়েছে' : 'অপেক্ষমাণ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gold/10 pt-4">
                          <p className="text-xs text-muted-foreground">বিষয়</p>
                          <p className="font-semibold text-foreground mt-0.5">{searchResult.subject}</p>
                        </div>

                        <div className="border-t border-gold/10 pt-4">
                          <p className="text-xs text-muted-foreground">
                            {searchResult.type === "question" ? "আপনার প্রশ্ন" : "আপনার অভিযোগ"}
                          </p>
                          <p className="text-muted-foreground bg-gold/5 border border-gold/5 rounded-lg p-3 mt-1.5 text-sm whitespace-pre-wrap leading-relaxed">
                            {searchResult.details}
                          </p>
                        </div>

                         {searchResult.reply ? (
                          <div className="border-t border-emerald-500/20 pt-4 mt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" /> উত্তর / সমাধান
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(searchResult.reply);
                                  toast({ description: "উত্তর কপি করা হয়েছে!" });
                                }}
                                className="p-1 hover:bg-emerald-500/20 rounded text-emerald-500 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                title="উত্তর কপি করুন"
                              >
                                <Copy className="w-3 h-3" /> কপি করুন
                              </button>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {searchResult.reply}
                              {searchResult.replied_at && (
                                <p className="text-[10px] text-muted-foreground text-right mt-3">
                                  উত্তর প্রদানের সময়:{" "}
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
                          <div className="border-t border-gold/10 pt-4">
                            <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> অনুগ্রহ করে অপেক্ষা করুন, খুব শীঘ্রই দরবার শরীফের আলেম বা কর্তৃপক্ষ এটার উত্তর প্রদান করবেন।
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {!searchResult && searchAttempted && !searchLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="mt-8 p-6 md:p-10 rounded-2xl border border-destructive/25 bg-card/40 backdrop-blur-xl text-center space-y-6 relative overflow-hidden shadow-[0_0_35px_rgba(239,68,68,0.06)]"
                    >
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold tracking-wide uppercase">
                        আবেদন স্ট্যাটাস: পাওয়া যায়নি
                      </div>

                      <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/45 flex items-center justify-center text-destructive shadow-md">
                          <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-destructive font-heading font-bold text-lg md:text-xl tracking-wide">
                          ট্র্যাকিং নম্বরটি পাওয়া যায়নি
                        </h4>
                        <p className="text-foreground/90 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                          আপনার দেওয়া ট্র্যাকিং নম্বরটি ডাটাবেজে খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আপনার ট্র্যাকিং নম্বরটি সঠিক কিনা তা পুনরায় যাচাই করে আবার চেষ্টা করুন।
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

export default QnA;
