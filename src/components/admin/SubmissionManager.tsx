import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, 
  AlertTriangle, 
  HandHeart, 
  Eye, 
  Trash2, 
  Send, 
  Filter,
  CheckCircle2,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";


interface Submission {
  id: string;
  type: string;
  name: string;
  phone: string | null;
  subject: string;
  address?: string | null;
  details: string;
  is_read: boolean;
  reply?: string | null;
  replied_at?: string | null;
  created_at: string;
}

interface SubmissionManagerProps {
  submissions: Submission[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string, reply: string) => void;
}

const SubmissionManager = ({ 
  submissions, 
  onMarkRead, 
  onDelete, 
  onReply 
}: SubmissionManagerProps) => {
  const questions = submissions.filter((s) => s.type === "question");
  const complaints = submissions.filter((s) => s.type === "complaint");
  const doas = submissions.filter((s) => s.type === "doa");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="bg-card/40 backdrop-blur-md border border-gold/20 w-full flex h-auto p-1.5 rounded-2xl shadow-xl overflow-x-auto no-scrollbar">
          <TabsTrigger value="questions" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm whitespace-nowrap">
            <HelpCircle size={18} /> প্রশ্ন ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="complaints" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm whitespace-nowrap">
            <AlertTriangle size={18} /> অভিযোগ ({complaints.length})
          </TabsTrigger>
          <TabsTrigger value="doa" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-xs sm:text-sm whitespace-nowrap">
            <HandHeart size={18} /> দোয়া ({doas.length})
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="questions">
            <SubmissionList items={questions} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} emptyText="কোনো প্রশ্ন এখনও আসেনি।" />
          </TabsContent>
          <TabsContent value="complaints">
            <SubmissionList items={complaints} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} emptyText="কোনো অভিযোগ রেকর্ড করা নেই।" />
          </TabsContent>
          <TabsContent value="doa">
            <SubmissionList items={doas} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} emptyText="কোনো দোয়ার আবেদন পাওয়া যায়নি।" />
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

const SubmissionList = ({
  items,
  onMarkRead,
  onDelete,
  onReply,
  emptyText,
}: {
  items: Submission[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string, reply: string) => void;
  emptyText: string;
}) => {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "ট্র্যাকিং নাম্বার কপি করা হয়েছে!",
    });
  };

  if (items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-card/20 border border-gold/10 rounded-2xl backdrop-blur-sm shadow-inner"
      >
        <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center mx-auto mb-4 border border-gold/10">
          <Filter size={32} className="text-gold/20" />
        </div>
        <p className="text-muted-foreground font-medium text-lg italic">{emptyText}</p>
      </motion.div>
    );
  }

  const handleReplySubmit = (id: string) => {
    if (!replyText.trim()) return;
    onReply(id, replyText.trim());
    setReplyingId(null);
    setReplyText("");
  };

  return (
    <div className="grid gap-5">
      {items.map((s, idx) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={`group bg-card/40 backdrop-blur-md border rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-lg ${
            s.is_read ? "border-gold/10 scale-[0.99] grayscale-[0.3]" : "border-gold/30 gold-glow shadow-gold/5"
          }`}
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-heading font-bold text-cream text-lg underline underline-offset-4 decoration-gold/30">{s.name}</h3>
                  {!s.is_read && (
                    <span className="text-[10px] bg-gold-gradient text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">New</span>
                  )}
                  {s.reply && (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                      <CheckCircle2 size={10} /> উত্তর দেওয়া হয়েছে
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-gold/60 italic mt-1.5">
                   <div className="flex items-center gap-1 bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-xl text-[11px] font-mono text-gold font-bold not-italic">
                     <span className="text-[10px] text-gold/70 font-sans font-bold uppercase tracking-tighter mr-0.5">Tracking:</span>
                     {s.id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                     <button
                       onClick={() => copyToClipboard(s.id.replace(/-/g, "").substring(0, 8).toUpperCase())}
                       className="ml-1.5 p-0.5 hover:bg-gold/25 rounded transition-colors text-gold/80 hover:text-gold"
                       title="কপি করুন"
                     >
                       <Copy size={12} />
                     </button>
                   </div>
                   <p className="flex items-center gap-1.5 truncate">
                     <span className="text-gold opacity-50 font-bold uppercase tracking-tighter">Subject:</span> {s.subject}
                   </p>
                   {s.phone && (
                     <p className="flex items-center gap-1.5">
                       <span className="text-gold opacity-50 font-bold uppercase tracking-tighter">Phone:</span> {s.phone}
                     </p>
                   )}
                   <p className="flex items-center gap-1.5 whitespace-nowrap">
                     <Clock size={12} className="text-gold/40" />
                     {new Date(s.created_at).toLocaleDateString("bn-BD")}
                   </p>
                </div>
              </div>


              <div className="flex gap-2">
                {!s.is_read && (
                   <button 
                    onClick={() => onMarkRead(s.id)} 
                    className="p-2.5 rounded-xl bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all shadow-sm"
                    title="পড়া হয়েছি"
                   >
                     <Eye size={18} />
                   </button>
                )}
                <button 
                  onClick={() => onDelete(s.id)} 
                  className="p-2.5 rounded-xl bg-destructive/10 text-destructive/60 hover:text-destructive hover:bg-destructive/20 transition-all shadow-sm"
                  title="ডিলিট"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-black/30 p-4 rounded-xl border border-gold/5 text-cream text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words font-medium italic">
                {s.details}
              </div>
              {s.address && (
                <div className="mt-2 text-[10px] text-gold/40 flex items-center gap-1 px-1 font-bold tracking-wider uppercase">
                  <span>Location: {s.address}</span>
                </div>
              )}
            </div>

            {/* Existing Reply Display */}
            {s.reply && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-l-4 border-gold bg-gold/5 rounded-r-xl p-4 md:p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-5">
                   <Send size={48} className="text-gold" />
                </div>
                <p className="text-gold font-heading font-bold text-sm mb-2 uppercase tracking-wide">আপনার উত্তর:</p>
                <p className="text-cream text-sm md:text-base italic leading-relaxed font-semibold">“{s.reply}”</p>
                {s.replied_at && (
                  <p className="text-[10px] text-gold/40 mt-3 font-bold tracking-widest text-right">
                    REPLIED ON: {new Date(s.replied_at).toLocaleDateString("bn-BD")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Reply Input Form */}
            {!s.reply && (
              <div className="pt-2">
                {replyingId === s.id ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-3"
                  >
                    <Textarea
                      placeholder="এখানে আপনার উত্তর লিখুন..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="bg-black/40 border-gold/30 focus:border-gold rounded-xl text-cream placeholder:text-gold/20 font-medium p-4"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleReplySubmit(s.id)} 
                        disabled={!replyText.trim()} 
                        className="bg-gold-gradient text-primary-foreground font-bold rounded-xl px-5 py-5"
                      >
                        <Send size={16} className="mr-2" /> উত্তর পাঠান
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setReplyingId(null); setReplyText(""); }} 
                        className="text-gold/60 hover:text-gold hover:bg-gold/10 font-bold rounded-xl px-4"
                      >
                        বাতিল
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setReplyingId(s.id); setReplyText(""); }} 
                    className="text-gold hover:text-gold/80 hover:bg-gold/10 font-bold text-xs p-0 h-auto"
                  >
                    <Send size={14} className="mr-1.5" /> উত্তর দিন
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SubmissionManager;
