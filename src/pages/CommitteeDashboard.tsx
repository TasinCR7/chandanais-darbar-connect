import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, LogOut, MessageSquare, ThumbsUp, ThumbsDown, Vote, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import PremiumLoader from "@/components/PremiumLoader";

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

export default function CommitteeDashboard() {
  const [member, setMember] = useState<{ id: string; name: string; designation: string } | null>(null);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [votesData, setVotesData] = useState<VoteRecord[]>([]);
  const [commentsList, setCommentsList] = useState<CommentRecord[]>([]);
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

      // 2. Load Active Voting Topics, All Votes, and All Comments
      const [topicsRes, votesRes, commentsRes] = await Promise.all([
        supabase.from("vote_topics").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("votes").select("*"),
        supabase.from("committee_comments").select("*").order("created_at", { ascending: false }),
      ]);
        
      if (topicsRes.data) setTopics(topicsRes.data);
      if (votesRes.data) setVotesData(votesRes.data);
      if (commentsRes.data) setCommentsList(commentsRes.data);

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
