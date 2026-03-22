import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, LogOut, MessageSquare, ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import PremiumLoader from "@/components/PremiumLoader";

export default function CommitteeDashboard() {
  const [member, setMember] = useState<{ id: string; name: string; designation: string } | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
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

      // 2. Load Active Voting Topics
      const { data: topicsData } = await supabase
        .from("vote_topics")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
        
      if (topicsData) setTopics(topicsData);

      // 3. Load User's Past Votes
      const { data: votesData } = await supabase
        .from("votes")
        .select("topic_id, vote")
        .eq("user_id", authId);
        
      if (votesData) {
        const votesMap: Record<string, string> = {};
        votesData.forEach(v => votesMap[v.topic_id] = v.vote);
        setUserVotes(votesMap);
      }
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
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("committee_auth");
    navigate("/committee-login");
  };

  const castVote = async (topicId: string, choice: string) => {
    if (!member) return;
    try {
      const { error } = await supabase.from("votes").insert({
        topic_id: topicId,
        user_id: member.id,
        vote: choice
      });
      if (error) throw error;
      
      setUserVotes(prev => ({ ...prev, [topicId]: choice }));
      toast({ title: "ভোট গ্রহণ করা হয়েছে", description: "আপনার মূল্যবান মতামতের জন্য ধন্যবাদ।" });
    } catch (err: any) {
      toast({ title: "ভোট গ্রহণ ব্যর্থ", description: err.message, variant: "destructive" });
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
      if (error) throw error;
      
      toast({ title: "মন্তব্য পাঠানো হয়েছে", description: "আপনার মতামতের জন্য অশেষ ধন্যবাদ।" });
      setComment("");
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <PremiumLoader />;

  return (
    <div className="min-h-screen py-24 islamic-pattern font-bengali">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Voting Area */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
               <h2 className="text-xl font-heading font-bold text-gold">কাজের মূল্যায়ন ও ভোটিং</h2>
            </div>
            
            {topics.length === 0 ? (
              <div className="bg-card/40 backdrop-blur-md border border-gold/10 rounded-3xl p-10 text-center">
                <p className="text-muted-foreground">বর্তমানে কোনো ভোটিং বিষয় চালু নেই।</p>
              </div>
            ) : (
              topics.map(topic => {
                const hasVoted = userVotes[topic.id];
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={topic.id} 
                    className="bg-card/40 border border-gold/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-gold/10" />
                    
                    <div className="flex gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/20">
                        {topic.type === "monthly" ? "মাসিক মূল্যায়ন" : "বার্ষিক মূল্যায়ন"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-cream mb-2 leading-snug">{topic.title}</h3>
                    {topic.description && (
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed bg-black/20 p-3 rounded-lg border border-gold/5">
                        {topic.description}
                      </p>
                    )}

                    {hasVoted ? (
                      <div className="mt-4 p-4 rounded-xl bg-gold/5 border border-gold/20 flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 size={24} className="text-green-500" />
                        <p className="text-sm font-bold text-gold/80">
                          আপনি ইতিমধ্যে "<span className="text-cream">{hasVoted}</span>" ভোট দিয়েছেন।
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <Button 
                          onClick={() => castVote(topic.id, "সন্তুষ্ট")}
                          className="h-14 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 font-bold text-lg"
                        >
                          <ThumbsUp size={20} className="mr-2" /> সন্তুষ্ট
                        </Button>
                        <Button 
                          onClick={() => castVote(topic.id, "অসন্তুষ্ট")}
                          className="h-14 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/20 shadow-lg shadow-red-500/5 font-bold text-lg"
                        >
                          <ThumbsDown size={20} className="mr-2 mt-1" /> অসন্তুষ্ট
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Comment / Suggestion Area */}
          <div className="space-y-6">
            <h2 className="text-xl font-heading font-bold text-gold px-2">মতামত ও পরামর্শ</h2>
            <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-3xl p-6 shadow-xl sticky top-24">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                <MessageSquare size={20} className="text-gold" />
              </div>
              <h3 className="text-base font-bold text-cream mb-2">আপনার মন্তব্য লিখুন</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                দরবার শরীফের যেকোনো বিষয়ে আপনার ব্যক্তিগত মতামত, অভিযোগ বা পরামর্শ এডমিনকে জানাতে পারেন।
              </p>
              
              <Textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="এখানে আপনার মতামত বিস্তারিত লিখুন..."
                className="min-h-[160px] bg-black/40 border-gold/20 rounded-xl mb-4 focus:border-gold/50 text-cream resize-none"
              />
              
              <Button 
                onClick={submitComment}
                disabled={submitLoading || !comment.trim()}
                className="w-full h-12 bg-gold-gradient text-primary-foreground font-bold rounded-xl gold-glow-hover"
              >
                {submitLoading ? "পাঠানো হচ্ছে..." : "মতামত জমা দিন"}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
