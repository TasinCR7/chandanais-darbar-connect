import { useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import QnAFormCard from "@/components/QnAFormCard";
import { HelpCircle, AlertTriangle, FileQuestion, MessageSquareWarning, Search, Copy, Calendar, MessageSquare, ShieldCheck, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification } from "@/utils/telegram";
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

    if (trimmedName.length > 100 || trimmedDetails.length > 2000) {
      toast({
        title: "তথ্য অতিরিক্ত দীর্ঘ",
        description: "নাম ১০০ ও বিবরণ ২০০০ অক্ষরের মধ্যে রাখুন।",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        type,
        name: trimmedName,
        phone: form.phone.trim() || null,
        subject: form.subject,
        details: trimmedDetails,
      })
      .select("id")
      .single();

    if (error) {
      toast({
        title: "ত্রুটি হয়েছে",
        description: "পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন।",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const trackingNumber = data?.id ? data.id.replace(/-/g, "").substring(0, 8).toUpperCase() : "";
    setLastTrackingId(trackingNumber);

    // Send Telegram Notification
    const isComplaint = type === "complaint";
    const icon = isComplaint ? "🔴" : "🔵";
    const titleText = isComplaint ? "নতুন অভিযোগ জমা হয়েছে!" : "নতুন প্রশ্ন জমা হয়েছে!";

    const textMessage = `
${icon} *${titleText}*
━━━━━━━━━━━━━━━━━━
🆔 *ট্র্যাকিং নম্বর:* ${trackingNumber}
👤 *নাম:* ${trimmedName}
📱 *মোবাইল:* ${form.phone.trim() || "দেওয়া হয়নি"}
📌 *বিষয়:* ${form.subject}
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().replace(/-/g, "").toUpperCase();
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
    <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 my-4 text-center">
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
      <div className="py-20 islamic-pattern">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="الأسئلة والشكاوى"
            title="প্রশ্ন-উত্তর ও অভিযোগ"
            subtitle="শরিয়তের বিষয়ে প্রশ্ন করুন অথবা অভিযোগ জানান এবং ট্র্যাকিং নম্বর দিয়ে স্ট্যাটাস চেক করুন।"
          />

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="question" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-black/40 border border-gold/20 p-1 rounded-xl h-auto">
                <TabsTrigger
                  value="question"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-3 rounded-lg font-bold text-xs md:text-base flex items-center justify-center gap-2"
                >
                  <FileQuestion className="w-4 h-4 md:w-5 md:h-5" /> প্রশ্ন / ফতোয়া
                </TabsTrigger>
                <TabsTrigger
                  value="complaint"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white py-3 rounded-lg font-bold text-xs md:text-base flex items-center justify-center gap-2"
                >
                  <MessageSquareWarning className="w-4 h-4 md:w-5 md:h-5" /> অভিযোগ
                </TabsTrigger>
                <TabsTrigger
                  value="track"
                  className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-3 rounded-lg font-bold text-xs md:text-base flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" /> খোঁজ করুন 🔍
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
                      <div className="flex gap-2">
                        <Input
                          placeholder="যেমন: E4D58852"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-gold/20 focus:border-gold font-mono uppercase tracking-wider"
                        />
                        <Button
                          type="submit"
                          disabled={searchLoading}
                          className="bg-gold-gradient text-primary-foreground font-semibold px-6 gold-glow-hover transition-all duration-300 shrink-0"
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
                      className="mt-8 p-5 md:p-6 rounded-xl border border-gold/30 bg-card/65 backdrop-blur-md relative overflow-hidden"
                    >
                      <div className="absolute top-4 right-4">
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

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">ট্র্যাকিং নম্বর</p>
                          <p className="font-mono text-sm font-bold text-gold mt-0.5">
                            {searchResult.id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gold/10 pt-4">
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
                                  <span className="text-amber-500">অপেক্ষমাণ (জমা হয়েছে)</span>
                                </>
                              )}
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
                            <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" /> উত্তর / সমাধান
                            </p>
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 p-8 rounded-xl border border-destructive/20 bg-destructive/5 text-center"
                    >
                      <p className="text-destructive font-semibold mb-1">কোনো তথ্য পাওয়া যায়নি ❌</p>
                      <p className="text-muted-foreground text-xs">আপনার দেওয়া ট্র্যাকিং নম্বরটি সঠিক কিনা অনুগ্রহ করে পুনরায় পরীক্ষা করুন।</p>
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

