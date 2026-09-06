import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Notice {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface NoticeManagerProps {
  notices: Notice[];
  loading: boolean;
  onAddNotice: (type: 'scrolling' | 'detailed', title: string, message?: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDeleteNotice: (id: string) => void;
}

const NoticeManager = ({ 
  notices, 
  loading, 
  onAddNotice, 
  onToggleActive, 
  onDeleteNotice 
}: NoticeManagerProps) => {
  const [scrollingTitle, setScrollingTitle] = useState("");
  const [detailedTitle, setDetailedTitle] = useState("");
  const [detailedMessage, setDetailedMessage] = useState("");

  return (
    <div className="space-y-6">
      <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl">
        {/* Scrolling Notice Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Bell size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-cream">স্ক্রলিং নোটিশ</h2>
              <p className="text-xs text-gold/60">ওয়েবসাইটের একদম উপরে সরু লাইনে জিকির বা জরুরি সংবাদের জন্য।</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="অল্প কথায় নোটিশটি লিখুন *"
              value={scrollingTitle}
              onChange={(e) => setScrollingTitle(e.target.value)}
              className="bg-black/20 border-gold/30 focus:border-gold flex-1 h-12 rounded-xl text-cream"
            />
            <Button
              onClick={() => {
                onAddNotice('scrolling', scrollingTitle);
                setScrollingTitle("");
              }}
              disabled={loading || !scrollingTitle.trim()}
              className="bg-gold-gradient text-primary-foreground shrink-0 h-12 px-6 font-bold rounded-xl shadow-lg shadow-gold/10"
            >
              যোগ করুন
            </Button>
          </div>
        </div>

        <div className="h-px bg-gold/10" />

        {/* Detailed Notice Section */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Plus size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-cream">বিস্তারিত নোটিশ</h2>
              <p className="text-xs text-gold/60">হোমপেজে বড় বক্স আকারে বিস্তারিত দেখা যাবে।</p>
            </div>
          </div>

          <div className="grid gap-4">
            <Input
              placeholder="বিস্তারিত নোটিশের শিরোনাম *"
              value={detailedTitle}
              onChange={(e) => setDetailedTitle(e.target.value)}
              className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl text-cream"
            />
            <Textarea
              placeholder="বিস্তারিত বার্তা লিখুন"
              value={detailedMessage}
              onChange={(e) => setDetailedMessage(e.target.value)}
              className="bg-black/20 border-gold/30 focus:border-gold min-h-[120px] rounded-xl text-cream"
              rows={4}
            />
            <Button
              onClick={() => {
                onAddNotice('detailed', detailedTitle, detailedMessage);
                setDetailedTitle("");
                setDetailedMessage("");
              }}
              disabled={loading || !detailedTitle.trim()}
              className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 font-bold rounded-xl shadow-lg shadow-gold/10"
            >
              নতুন ঘোষণা পোস্ট করুন
            </Button>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-cream flex items-center gap-3 px-1">
          <Bell size={24} className="text-gold" />
          সংশ্লিষ্ট নোটিশসমূহ ({notices.length})
        </h2>
        
        {notices.length === 0 ? (
          <div className="text-center py-16 bg-card/20 border border-gold/10 rounded-2xl backdrop-blur-sm">
            <Bell size={48} className="mx-auto text-gold/10 mb-4" />
            <p className="text-muted-foreground font-medium">বর্তমানে কোনো নোটিশ নেই।</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {notices.map((n) => (
              <motion.div 
                key={n.id} 
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card/40 backdrop-blur-sm border border-gold/20 rounded-2xl p-5 hover:border-gold/40 transition-all group shadow-lg"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        n.type === 'scrolling' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'bg-gold/10 text-gold border border-gold/20'
                      }`}>
                        {n.type === 'scrolling' ? 'স্ক্রলিং' : 'বিস্তারিত'}
                      </span>
                      <p className="font-bold text-cream text-lg md:text-xl leading-tight">{n.title}</p>
                    </div>
                    {n.message && (
                      <div className="text-sm text-gold/80 leading-relaxed bg-black/30 p-4 rounded-xl border border-gold/5 italic">
                        {n.message}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                      <span>ID: {n.id.slice(0, 8)}</span>
                      <span className="w-1 h-1 rounded-full bg-gold/30" />
                      <span>{new Date(n.created_at).toLocaleDateString("bn-BD", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0 pt-4 md:pt-0 md:border-l md:border-gold/10 md:pl-5">
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={n.is_active} 
                        onCheckedChange={() => onToggleActive(n.id, n.is_active)}
                        className="data-[state=checked]:bg-gold"
                      />
                      <span className={`text-xs font-bold uppercase tracking-tighter ${n.is_active ? "text-gold" : "text-muted-foreground"}`}>
                        {n.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-gold/10 hidden md:block" />
                    <button 
                      onClick={() => onDeleteNotice(n.id)} 
                      className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 p-2.5 rounded-xl transition-all shadow-sm"
                      title="ডিলিট করুন"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeManager;
