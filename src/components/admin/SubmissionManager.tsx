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
  Check,
  Edit2,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onUpdateSubmission?: (
    id: string,
    updates: {
      name: string;
      phone: string | null;
      subject: string;
      details: string;
      address?: string | null;
    }
  ) => void;
}

const SubmissionManager = ({ 
  submissions, 
  onMarkRead, 
  onDelete, 
  onReply,
  onUpdateSubmission
}: SubmissionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const tracking = s.id.replace(/-/g, "").substring(0, 8).toLowerCase();
    const name = (s.name || "").toLowerCase();
    const phone = (s.phone || "").toLowerCase();
    const subject = (s.subject || "").toLowerCase();
    const details = (s.details || "").toLowerCase();
    return (
      tracking.includes(q) ||
      name.includes(q) ||
      phone.includes(q) ||
      subject.includes(q) ||
      details.includes(q)
    );
  });

  const questions = filteredSubmissions.filter((s) => s.type === "question");
  const complaints = filteredSubmissions.filter((s) => s.type === "complaint");
  const doas = filteredSubmissions.filter((s) => s.type === "doa");

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" size={18} />
        <Input
          placeholder="ট্র্যাকিং নাম্বার, নাম বা মোবাইল দিয়ে খুঁজুন..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-black/40 border-gold/20 focus:border-gold text-cream placeholder:text-gold/30 rounded-xl"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/50 hover:text-gold"
          >
            <X size={18} />
          </button>
        )}
      </div>
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
            <SubmissionList items={questions} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} onUpdateSubmission={onUpdateSubmission} emptyText="কোনো প্রশ্ন এখনও আসেনি।" />
          </TabsContent>
          <TabsContent value="complaints">
            <SubmissionList items={complaints} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} onUpdateSubmission={onUpdateSubmission} emptyText="কোনো অভিযোগ রেকর্ড করা নেই।" />
          </TabsContent>
          <TabsContent value="doa">
            <SubmissionList items={doas} onMarkRead={onMarkRead} onDelete={onDelete} onReply={onReply} onUpdateSubmission={onUpdateSubmission} emptyText="কোনো দোয়ার আবেদন পাওয়া যায়নি।" />
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
  onUpdateSubmission,
  emptyText,
}: {
  items: Submission[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (id: string, reply: string) => void;
  onUpdateSubmission?: (
    id: string,
    updates: {
      name: string;
      phone: string | null;
      subject: string;
      details: string;
      address?: string | null;
    }
  ) => void;
  emptyText: string;
}) => {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    subject: "",
    details: "",
    address: "",
  });
  
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

  const handleStartEdit = (s: Submission) => {
    setEditingSubmission(s);
    setEditForm({
      name: s.name || "",
      phone: s.phone || "",
      subject: s.subject || "",
      details: s.details || "",
      address: s.address || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSubmission) return;
    if (onUpdateSubmission) {
      await onUpdateSubmission(editingSubmission.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        subject: editForm.subject.trim(),
        details: editForm.details.trim(),
        address: editForm.address.trim() || null,
      });
    }
    setEditingSubmission(null);
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
                  <div className="flex items-center gap-1 bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-lg text-xs font-mono text-gold font-bold not-italic">
                    <span className="text-[10px] text-gold/70 font-sans font-bold uppercase tracking-tighter mr-0.5">ID:</span>
                    {s.id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                    <button
                      onClick={() => copyToClipboard(s.id.replace(/-/g, "").substring(0, 8).toUpperCase())}
                      className="ml-1 p-0.5 hover:bg-gold/25 rounded transition-colors text-gold/80 hover:text-gold"
                      title="কপি করুন"
                    >
                      <Copy size={10} />
                    </button>
                  </div>
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
                    title="পড়া হয়েছে"
                   >
                     <Eye size={18} />
                   </button>
                )}
                <button 
                  onClick={() => handleStartEdit(s)} 
                  className="p-2.5 rounded-xl bg-gold/10 text-gold hover:bg-gold hover:text-primary-foreground transition-all shadow-sm"
                  title="তথ্য সংশোধন"
                >
                  <Edit2 size={18} />
                </button>
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
            {s.reply && replyingId !== s.id && (
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
                <div className="mt-3 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setReplyingId(s.id); setReplyText(s.reply || ""); }} 
                    className="text-gold hover:text-gold/80 hover:bg-gold/10 font-bold text-xs p-1.5 h-auto flex items-center gap-1"
                  >
                    <Edit2 size={12} /> উত্তর সংশোধন করুন
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Reply Input Form */}
            {(replyingId === s.id || !s.reply) && (
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
                        <Send size={16} className="mr-2" /> {s.reply ? "উত্তর সংশোধন করুন" : "উত্তর পাঠান"}
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

      {/* Edit Submission Details Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={(open) => !open && setEditingSubmission(null)}>
        <DialogContent className="bg-card border border-gold/20 text-cream max-w-lg rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-premium-gradient flex items-center gap-2">
              <Edit2 size={20} className="text-gold" /> তথ্য সংশোধন করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-gold/70">নাম</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-black/30 border-gold/20 focus:border-gold text-cream"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-sm font-semibold text-gold/70">মোবাইল নম্বর</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="bg-black/30 border-gold/20 focus:border-gold text-cream"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject" className="text-sm font-semibold text-gold/70">বিষয়</Label>
              <Input
                id="edit-subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                className="bg-black/30 border-gold/20 focus:border-gold text-cream"
              />
            </div>
            {editingSubmission?.type === "doa" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-address" className="text-sm font-semibold text-gold/70">ঠিকানা / এলাকা</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="bg-black/30 border-gold/20 focus:border-gold text-cream"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-details" className="text-sm font-semibold text-gold/70">বিস্তারিত বিবরণ</Label>
              <Textarea
                id="edit-details"
                value={editForm.details}
                onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
                rows={4}
                className="bg-black/30 border-gold/20 focus:border-gold text-cream resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditingSubmission(null)}
              className="text-gold/60 hover:text-gold hover:bg-gold/10 font-bold rounded-xl"
            >
              বাতিল
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editForm.name.trim() || !editForm.subject.trim() || !editForm.details.trim()}
              className="bg-gold-gradient text-primary-foreground font-bold rounded-xl px-5"
            >
              সংরক্ষণ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmissionManager;
