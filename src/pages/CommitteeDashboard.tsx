import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, LogOut, MessageSquare, ThumbsUp, ThumbsDown, Vote, Send, Trash2, Megaphone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import PremiumLoader from "@/components/PremiumLoader";

import { Download, Share2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerBengaliFont } from "@/fonts/bengaliFont";
import { formatMonthBn } from "@/utils/dateHelpers";

interface TopicRecord { 
  id: string; 
  title: string; 
  description: string | null; 
  type: string; 
  options?: string[] | null;
  created_at: string; 
}
interface VoteRecord { id: string; topic_id: string; user_id: string; vote: string; }
interface CommentRecord { id: string; user_id: string; message: string; created_at: string; }
interface CommitteeNotice { id: string; title: string; message: string; created_at: string; }
interface Contribution { 
  id: string; 
  name: string; 
  amount: number; 
  area?: string | null;
  note?: string;
  target_month: string; 
  created_at: string; 
  payment_method?: string; 
  transaction_id?: string; 
}

export default function CommitteeDashboard() {
  const [member, setMember] = useState<{ id: string; name: string; designation: string } | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [votesData, setVotesData] = useState<VoteRecord[]>([]);
  const [commentsList, setCommentsList] = useState<CommentRecord[]>([]);
  const [comment, setComment] = useState("");
  const [notices, setNotices] = useState<CommitteeNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadDashboard = async (authId: string) => {
    try {
      // 1. Verify Member Profile
      const { data: memberData, error: memberErr } = await supabase
        .from("committee_members")
        .select("id, name, designation")
        .eq("id", authId)
        .eq("is_active", true)
        .single();
        
      if (memberErr || !memberData) {
        handleLogout();
        return;
      }
      setMember(memberData);
      // 2. Load Active Voting Topics, All Votes, All Comments, and Committee Notices
      const [topicsRes, votesRes, commentsRes, noticesRes, contributionsRes] = await Promise.all([
        supabase.from("vote_topics").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("votes").select("*"),
        supabase.from("committee_comments").select("*").order("created_at", { ascending: false }),
        supabase.from("committee_notices").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("committee_contributions").select("*").eq("name", memberData.name).order("created_at", { ascending: false })
      ]);
        
      if (topicsRes.data) setTopics(topicsRes.data);
      if (votesRes.data) setVotesData(votesRes.data);
      if (commentsRes.data) setCommentsList(commentsRes.data);
      if (noticesRes.data) setNotices(noticesRes.data);
      if (contributionsRes.data) setContributions(contributionsRes.data as Contribution[]);

    } catch (err) {
      console.error(err);
      toast({ title: "ত্রুটি", description: "ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authId = localStorage.getItem("committee_auth");
    if (!authId) {
      navigate("/committee-login");
    } else {
      loadDashboard(authId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("committee_auth");
    navigate("/committee-login");
  };

  const castVote = async (topicId: string, voteType: string) => {
    if (!member) return;
    
    // Prevent voting if already voted
    const topic = topics.find(t => t.id === topicId);
    if (topic && getVoteCounts(topic).myVote) {
      toast({ title: "সতর্কতা", description: "আপনি ইতিমধ্যে এই বিষয়ে আপনার মতামত প্রদান করেছেন।", variant: "destructive" });
      return;
    }

    // Since we are enforcing one vote per topic, we do not need to delete previous votes.
    const { error } = await supabase.from("votes").insert({
      topic_id: topicId,
      user_id: member.id,
      vote: voteType
    });

    if (!error) {
      toast({ title: "সফল", description: "আপনার মতামত সংরক্ষিত হয়েছে।" });
      const authId = localStorage.getItem("committee_auth");
      if (authId) loadDashboard(authId);
    } else {
      toast({ title: "ব্যর্থ", description: "ভোট সেভ করা সম্ভব হয়নি।", variant: "destructive" });
    }
  };

  const submitComment = async () => {
    if (!comment.trim() || !member) return;
    setSubmitLoading(true);
    try {
      const { error } = await supabase.from("committee_comments").insert({
        user_id: member.id,
        message: comment.trim()
      });
      if (!error) {
        toast({ title: "সফল", description: "আপনার মন্তব্য পাঠানো হয়েছে।" });
        setComment("");
        const authId = localStorage.getItem("committee_auth");
        if (authId) loadDashboard(authId);
      } else {
        toast({ title: "ব্যর্থ", description: "মন্তব্য পাঠানো সম্ভব হয়নি।", variant: "destructive" });
      }
    } catch (err: unknown) {
      toast({ title: "ত্রুটি", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSubmitLoading(false);
    }
  };


  const parseTopicData = (topic: TopicRecord) => {
    const desc = topic.description || "";
    const match = desc.match(/^\[POLL_OPTIONS: (.*?)\]\s*(.*)/s);
    if (match) {
      return {
        options: match[1].split(",").map(o => o.trim()),
        displayDescription: match[2] || null
      };
    }
    return {
      options: topic.options || null,
      displayDescription: topic.description
    };
  };

  const getVoteCounts = (topic: TopicRecord) => {
    const topicVotes = votesData.filter(v => v.topic_id === topic.id);
    const myVote = topicVotes.find(v => v.user_id === member?.id)?.vote || null;
    
    // Fallback: Parse options from description if column is empty
    const { options: parsedOptions } = parseTopicData(topic);
    
    // Default options if none provided
    const defaultOptions = ["সন্তুষ্ট", "অসন্তুষ্ট"];
    const options = (parsedOptions && parsedOptions.length > 0) ? parsedOptions : defaultOptions;
    
    const distribution: Record<string, number> = {};
    options.forEach(opt => {
      distribution[opt] = topicVotes.filter(v => v.vote === opt).length;
    });

    return {
      distribution,
      total: topicVotes.length,
      myVote,
      options
    };
  };

  const totalDeposit = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const currentYear = new Date().getFullYear();
  const paidMonthsThisYear = contributions.filter(c => c.target_month?.startsWith(currentYear.toString())).map(c => c.target_month);
  
  // Calculate due months from Jan to current month
  const currentMonthNum = new Date().getMonth() + 1;
  const dueMonths: string[] = [];
  for (let i = 1; i <= currentMonthNum; i++) {
    const monthStr = `${currentYear}-${i.toString().padStart(2, '0')}`;
    if (!paidMonthsThisYear.includes(monthStr)) {
      dueMonths.push(monthStr);
    }
  }

  const generateReceiptPdf = (c: Contribution) => {
    try {
      const doc = new jsPDF();
      registerBengaliFont(doc);
      const W = 210;
      const H = 297;
      
      // Page Background - White
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, W, H, "F");

      // Header Navy Blue Block
      doc.setFillColor(10, 37, 64);
      doc.rect(0, 0, W, 45, "F");
      
      // Teal Accent line
      doc.setFillColor(0, 212, 200);
      doc.rect(0, 45, W, 2, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("চন্দনাইশ দরবার শরীফ", W / 2, 22, { align: "center" });
      
      doc.setTextColor(150, 160, 175);
      doc.setFontSize(9);
      doc.text("চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | info@chandanaishdarbar.org", W / 2, 30, { align: "center" });
      
      doc.setFillColor(0, 212, 200);
      doc.roundedRect(W / 2 - 35, 36, 70, 8, 4, 4, "F");
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(11);
      doc.text("অফিসিয়াল পেমেন্ট রসিদ", W / 2, 42, { align: "center" });

      // Receipt meta
      const rid = c.id.slice(0, 8).toUpperCase();
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(10);
      doc.text("ইনভয়েস নম্বর:", 20, 65);
      doc.text("#" + rid, 20, 71);
      
      doc.text("ইস্যু তারিখ:", W - 20, 65, { align: "right" });
      doc.text(new Date(c.created_at).toLocaleDateString("bn-BD"), W - 20, 71, { align: "right" });

      // Main table
      const rows = [
        ["দাতার নাম", c.name || "-"],
        ["এলাকা/অবস্থান", c.area || "N/A"],
        ["সংগ্রহের মাস", formatMonthBn(c.target_month)],
        ["টাকার পরিমাণ", c.amount.toLocaleString("bn-BD") + " BDT"],
        ["পেমেন্ট মাধ্যম", c.payment_method || "ক্যাশ"],
        ["ট্রানজেকশন আইডি", c.transaction_id || "N/A"],
      ];
      autoTable(doc, {
        startY: 85,
        body: rows,
        theme: "grid",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 11, cellPadding: 8, lineColor: [230, 235, 241], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 50, textColor: [100, 110, 125], fillColor: [248, 250, 252] },
          1: { textColor: [10, 37, 64], fontStyle: "normal" },
        },
        margin: { left: 20, right: 20 }
      });

      let curY = (doc as any).lastAutoTable.finalY + 15;

      // Highlighted amount box
      doc.setDrawColor(0, 212, 200);
      doc.setLineWidth(0.5);
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(20, curY, W - 40, 24, 3, 3, "FD");
      
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(12);
      doc.text("মোট পরিশোধিত টাকা:", 30, curY + 15);
      
      doc.setTextColor(0, 160, 150);
      doc.setFontSize(20);
      doc.text(c.amount.toLocaleString("bn-BD") + " /-", W - 30, curY + 16, { align: "right" });
      
      curY += 45;

      // Signatures
      doc.setTextColor(100, 110, 125);
      doc.setFontSize(10);
      doc.setDrawColor(200, 210, 220);
      doc.line(25, curY, 85, curY);
      doc.text("সদস্যের স্বাক্ষর", 55, curY + 6, { align: "center" });
      
      doc.line(W - 85, curY, W - 25, curY);
      doc.text("কর্তৃপক্ষের স্বাক্ষর ও সিল", W - 55, curY + 6, { align: "center" });

      // Paid Stamp — subtle green watermark
      doc.setTextColor(180, 230, 200);
      doc.setFontSize(60);
      doc.text("PAID", W / 2, 180, { align: "center", angle: 30 });

      // Footer
      doc.setDrawColor(230, 235, 241);
      doc.setLineWidth(0.5);
      doc.line(15, H - 20, W - 15, H - 20);
      doc.setFontSize(8);
      doc.setTextColor(150, 160, 175);
      doc.text("অফিসিয়াল ডকুমেন্ট • চন্দনাইশ দরবার শরীফ ফিন্যান্স সিস্টেম", 15, H - 14);
      doc.text("জেনারেট করা হয়েছে: " + new Date().toLocaleString("bn-BD"), W - 15, H - 14, { align: "right" });

      doc.save(`Invoice_${c.target_month}.pdf`);
    } catch (e) {
      toast({ title: "ত্রুটি", description: "পিডিএফ তৈরি করা সম্ভব হয়নি।", variant: "destructive" });
    }
  };

  if (loading) return <PremiumLoader />;

  return (
    <div className="min-h-screen py-24 font-bengali">
      <SEO title="কমিটি ড্যাশবোর্ড" description="কমিটি মেম্বারদের প্রাইভেট পোর্টাল" />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        
        {/* Header Profile Section */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-card/60 backdrop-blur-md border border-gold/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-5 text-center md:text-left mb-6 md:mb-0">
            <div className="w-16 h-16 rounded-2xl bg-gold-gradient p-0.5 shadow-lg shadow-gold/20 shrink-0">
              <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
                <ShieldCheck size={32} className="text-gold" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gold/60 uppercase tracking-widest mb-1">স্বাগতম</p>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-cream bg-clip-text text-transparent bg-gradient-to-r from-cream to-gold">
                {member?.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 px-3 py-0.5 bg-gold/10 rounded-full inline-block border border-gold/20">
                {member?.designation}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="destructive" 
            className="rounded-xl px-6 h-12 shadow-lg shadow-destructive/20 font-bold"
          >
            <LogOut size={18} className="mr-2" /> লগআউট
          </Button>
        </div>

        {/* Committee Rules Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4"
        >
          <AlertCircle className="text-amber-500 shrink-0 mt-1" size={24} />
          <div>
            <h2 className="text-lg font-bold text-amber-500">কমিটি নিয়ম ও নীতিমালা</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2">
              <p className="text-sm text-amber-500/90 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                পরিশোধের সময়: প্রতি মাসের ১০ তারিখের মধ্যে।
              </p>
              <p className="text-sm text-amber-500/90 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                সর্বনিম্ন হাদিয়া: ৫০ টাকা (প্রত্যেক সদস্য)।
              </p>
            </div>
          </div>
        </motion.div>

        {/* Committee Notices Section */}
        {notices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 space-y-4"
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <Megaphone size={18} className="text-gold animate-pulse" />
              <h2 className="text-sm font-bold text-gold uppercase tracking-wider">সর্বশেষ নোটিশ</h2>
            </div>
            {notices.map((n, idx) => (
              <div 
                key={n.id} 
                className={`bg-gold-gradient rounded-2xl p-0.5 shadow-lg shadow-gold/10 ${idx === 0 ? "animate-inner-glow" : ""}`}
              >
                <div className="bg-background/95 backdrop-blur-sm rounded-[14px] p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-cream leading-tight">{n.title}</h3>
                    <span className="text-[10px] text-gold/40 font-black">{new Date(n.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed italic border-l-2 border-gold/30 pl-4 py-1">
                    "{n.message}"
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* My Contributions Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-card/60 backdrop-blur-md border border-gold/20 rounded-3xl p-6 shadow-xl"
        >
          <h2 className="text-xl font-heading font-bold text-gold mb-4 flex items-center gap-2">
            <ShieldCheck size={22} /> আমার অনুদান ও হিসাব
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-sm font-bold text-emerald-500/70 uppercase">মোট জমা</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">৳ {totalDeposit.toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-sm font-bold text-red-500/70 uppercase">বকেয়া মাস ({currentYear})</p>
              <p className="text-lg font-bold text-red-500 mt-1">
                {dueMonths.length > 0 ? dueMonths.map(m => formatMonthBn(m)).join(", ") : "কোনো বকেয়া নেই"}
              </p>
            </div>
          </div>
          
          <div className="overflow-x-auto bg-background/50 rounded-xl border border-gold/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-gold/10 text-gold uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="p-2 md:p-4">তারিখ</th>
                  <th className="p-2 md:p-4">মাস</th>
                  <th className="p-2 md:p-4">পরিমাণ</th>
                  <th className="p-2 md:p-4 text-center">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {contributions.length > 0 ? contributions.map((c) => (
                  <tr key={c.id} className="hover:bg-gold/5">
                    <td className="p-2 md:p-4 text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("bn-BD")}</td>
                    <td className="p-2 md:p-4 font-bold whitespace-nowrap">{formatMonthBn(c.target_month)}</td>
                    <td className="p-2 md:p-4 font-black text-emerald-500">৳{c.amount.toLocaleString("bn-BD")}</td>
                    <td className="p-2 md:p-4 text-center flex justify-center gap-2">
                      <button onClick={() => generateReceiptPdf(c)} className="p-2 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-primary-foreground transition-colors">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">কোনো অনুদান রেকর্ড পাওয়া যায়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Voting Area */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
               <h2 className="text-xl font-heading font-bold text-gold flex items-center gap-2">
                 <Vote size={22} /> কাজের মূল্যায়ন ও ভোটিং
               </h2>
            </div>
            
            {topics.length === 0 ? (
              <div className="bg-card/40 backdrop-blur-md border border-gold/10 rounded-3xl p-10 text-center">
                <Vote className="w-12 h-12 text-gold/20 mx-auto mb-3" />
                <p className="text-muted-foreground">বর্তমানে কোনো ভোটিং বিষয় চালু নেই।</p>
              </div>
            ) : (
              topics.map(topic => {
                const counts = getVoteCounts(topic);
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={topic.id} 
                    className="bg-card/40 border border-gold/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group mb-6 last:mb-0"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-gold/10" />
                    
                    <div className="flex gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/20">
                        {topic.type === "monthly" ? "মাসিক মূল্যায়ন" : "বার্ষিক মূল্যায়ন"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-cream mb-2 leading-snug">{topic.title}</h3>
                    {parseTopicData(topic).displayDescription && (
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed bg-black/20 p-3 rounded-lg border border-gold/5">
                        {parseTopicData(topic).displayDescription}
                      </p>
                    )}

                    {/* Results distribution */}
                    {counts.total > 0 && (
                      <div className="space-y-3 my-6">
                        {counts.options.map((opt, idx) => {
                          const count = counts.distribution[opt] || 0;
                          const pct = Math.round((count / counts.total) * 100);
                          const isMyVote = counts.myVote === opt;
                          
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className={isMyVote ? "text-gold" : "text-muted-foreground"}>
                                  {opt} {isMyVote && " (আপনার ভোট)"}
                                </span>
                                <span className="text-gold/60">{count} ভোট ({pct}%)</span>
                              </div>
                              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-gold/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  className={`h-full rounded-full ${isMyVote ? "bg-gold" : "bg-gold/30"}`} 
                                />
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-gold/30 uppercase tracking-widest text-center pt-1 font-bold">সর্বমোট ভোট: {counts.total}</p>
                      </div>
                    )}

                    {/* Vote buttons */}
                    <div className="flex flex-wrap gap-2 mt-6 relative z-10">
                      {counts.options.map((opt, idx) => (
                        <Button
                          key={idx}
                          onClick={() => castVote(topic.id, opt)}
                          variant={counts.myVote === opt ? "default" : "outline"}
                          disabled={!!counts.myVote}
                          className={`flex-1 min-w-[120px] rounded-xl h-11 font-bold transition-all duration-300 ${
                            counts.myVote === opt
                              ? "bg-gold-gradient text-primary-foreground border-0 shadow-lg shadow-gold/20 scale-[1.02]" 
                              : "border-gold/20 text-gold/70 hover:bg-gold/10"
                          } ${!!counts.myVote && counts.myVote !== opt ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {counts.myVote === opt && <ShieldCheck size={14} className="mr-1.5" />}
                          {opt}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Comment / Suggestion Area */}
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-bold text-gold px-2 flex items-center gap-2">
              <MessageSquare size={22} /> মতামত ও প্রস্তাবনা
            </h2>
            
            {/* New Comment */}
            <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-3xl p-6 shadow-xl sticky top-24">
              <h3 className="text-base font-bold text-cream mb-2">আপনার মন্তব্য লিখুন</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                দরবার শরীফের যেকোনো বিষয়ে আপনার ব্যক্তিগত মতামত, অভিযোগ বা পরামর্শ এডমিনকে জানাতে পারেন।
              </p>
              
              <Textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="এখানে বিস্তারিত লিখুন..."
                className="min-h-[140px] bg-black/40 border-gold/20 rounded-xl mb-4 focus:border-gold/50 text-cream resize-none"
              />
              
              <Button 
                onClick={submitComment}
                disabled={submitLoading || !comment.trim()}
                className="w-full h-11 bg-gold-gradient text-primary-foreground font-bold rounded-xl gold-glow-hover"
              >
                {submitLoading ? "পাঠানো হচ্ছে..." : (
                  <>
                    <Send size={16} className="mr-2" /> জমা দিন
                  </>
                )}
              </Button>
            </div>

            {/* Current Comments */}
            {commentsList.length > 0 && (
              <div className="space-y-3">
                {commentsList.map(c => (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-card/30 border border-gold/10 rounded-xl p-4 shadow-md">
                    <p className="text-cream/90 text-sm leading-relaxed">{c.message}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-gold/40 uppercase tracking-widest font-bold">
                        {new Date(c.created_at).toLocaleDateString("bn-BD")}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
