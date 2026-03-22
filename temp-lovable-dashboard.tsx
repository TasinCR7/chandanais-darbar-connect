import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, Phone, ArrowRight, ThumbsUp, ThumbsDown, MessageSquare, Send, LogOut, Vote, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SEO from "@/components/SEO";
import PremiumLoader from "@/components/PremiumLoader";
import type { User as SupaUser } from "@supabase/supabase-js";

interface VoteTopic {
  id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
}

interface VoteRecord {
  id: string;
  topic_id: string;
  user_id: string;
  vote: string;
}

interface Comment {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

const CommitteeDashboard = () => {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [isCommitteeMember, setIsCommitteeMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Login form
  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Data
  const [topics, setTopics] = useState<VoteTopic[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  const { toast } = useToast();

  const checkCommitteeMembership = async (currentUser: SupaUser) => {
    // Check if user_id exists in committee_members
    const { data } = await supabase
      .from("committee_members")
      .select("name")
      .eq("user_id", currentUser.id)
      .eq("is_active", true)
      .maybeSingle();
    
    if (data) {
      setIsCommitteeMember(true);
      setMemberName(data.name);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => { if (mounted) setVerifying(false); }, 3000);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      const u = session?.user ?? null;
      if (u) {
        setUser(u);
        await checkCommitteeMembership(u);
      }
      setVerifying(false);
      clearTimeout(timer);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await checkCommitteeMembership(u);
      } else {
        setIsCommitteeMember(false);
        setMemberName("");
      }
      setVerifying(false);
    });

    return () => { mounted = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  // Fetch data when authenticated as committee member
  useEffect(() => {
    if (isCommitteeMember && user) {
      fetchData();
    }
  }, [isCommitteeMember, user]);

  const fetchData = async () => {
    setLoadingData(true);
    const [topicsRes, votesRes, commentsRes] = await Promise.all([
      supabase.from("vote_topics").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("votes").select("*"),
      supabase.from("committee_comments").select("*").order("created_at", { ascending: false }),
    ]);
    if (topicsRes.data) setTopics(topicsRes.data as VoteTopic[]);
    if (votesRes.data) setVotes(votesRes.data as VoteRecord[]);
    if (commentsRes.data) setComments(commentsRes.data as Comment[]);
    setLoadingData(false);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const credentials = method === "email"
        ? { email, password }
        : { phone: phone.startsWith("+") ? phone : `+88${phone}`, password };
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) toast({ title: "αª▓αªùαªçαª¿ αª¼αºìαª»αª░αºìαªÑ", description: error.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsCommitteeMember(false);
    setMemberName("");
  };

  const handleVote = async (topicId: string, voteType: "satisfied" | "unsatisfied") => {
    if (!user) return;
    const existing = votes.find(v => v.topic_id === topicId && v.user_id === user.id);
    
    if (existing) {
      // Update vote
      await supabase.from("votes").update({ vote: voteType }).eq("id", existing.id);
    } else {
      // Insert vote
      await supabase.from("votes").insert({ topic_id: topicId, user_id: user.id, vote: voteType });
    }
    toast({ title: "αª¡αºïαªƒ αªªαºçαªôαª»αª╝αª╛ αª╣αª»αª╝αºçαª¢αºç" });
    fetchData();
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    await supabase.from("committee_comments").insert({ user_id: user.id, message: newComment.trim() });
    setNewComment("");
    toast({ title: "αª«αª¿αºìαªñαª¼αºìαª» αª»αºïαªù αª╣αª»αª╝αºçαª¢αºç" });
    fetchData();
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from("committee_comments").delete().eq("id", id);
    fetchData();
  };

  // Get vote counts for a topic
  const getVoteCounts = (topicId: string) => {
    const topicVotes = votes.filter(v => v.topic_id === topicId);
    return {
      satisfied: topicVotes.filter(v => v.vote === "satisfied").length,
      unsatisfied: topicVotes.filter(v => v.vote === "unsatisfied").length,
      total: topicVotes.length,
      myVote: topicVotes.find(v => v.user_id === user?.id)?.vote || null,
    };
  };

  // Signup
  const [signupMode, setSignupMode] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleSignup = async () => {
    setSignupLoading(true);
    try {
      const credentials = method === "email"
        ? { email, password, options: { data: { full_name: signupName } } }
        : { phone: phone.startsWith("+") ? phone : `+88${phone}`, password, options: { data: { full_name: signupName } } };
      const { error } = await supabase.auth.signUp(credentials);
      if (error) {
        toast({ title: "αª╕αª╛αªçαª¿αªåαª¬ αª¼αºìαª»αª░αºìαªÑ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "αª╕αª╛αªçαª¿αªåαª¬ αª╕αª½αª▓", description: "αªåαª¬αª¿αª╛αª░ αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒ αªñαºêαª░αª┐ αª╣αª»αª╝αºçαª¢αºçαÑñ αªÅαªíαª«αª┐αª¿ αªåαª¬αª¿αª╛αªòαºç αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª» αª╣αª┐αª╕αºçαª¼αºç αª»αºüαªòαºìαªñ αªòαª░αª▓αºç αª▓αªùαªçαª¿ αªòαª░αªñαºç αª¬αª╛αª░αª¼αºçαª¿αÑñ" });
        setSignupMode(false);
      }
    } finally {
      setSignupLoading(false);
    }
  };

  // LOGIN SCREEN
  if (!user || !isCommitteeMember) {
    return (
      <>
        <SEO title="αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª» αª▓αªùαªçαª¿" description="αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª»αªªαºçαª░ αª¡αºïαªƒαª┐αªé αªô αª«αªñαª╛αª«αªñ αª¬αºìαª»αª╛αª¿αºçαª▓" canonical="/committee-login" />
        <div className="islamic-pattern min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-card/60 backdrop-blur-xl border border-gold/20 rounded-2xl p-6 sm:p-10 w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -ml-16 -mb-16" />

            <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gold-gradient p-0.5 shadow-lg shadow-gold/20">
                <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center">
                  <Vote size={28} className="text-gold animate-glow-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-1">
                  {signupMode ? "αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª» αª╕αª╛αªçαª¿αªåαª¬" : "αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª» αª▓αªùαªçαª¿"}
                </h1>
                <p className="text-gold/60 text-sm font-medium">
                  {signupMode ? "αª¿αªñαºüαª¿ αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒ αªñαºêαª░αª┐ αªòαª░αºüαª¿" : "αª¡αºïαªƒαª┐αªé αªô αª«αªñαª╛αª«αªñ αª¬αºìαª░αªªαª╛αª¿αºçαª░ αª£αª¿αºìαª» αª▓αªùαªçαª¿ αªòαª░αºüαª¿"}
                </p>
              </div>
            </div>

            {user && !isCommitteeMember && !signupMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-destructive font-medium text-center">αªåαª¬αª¿αª┐ αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª» αª╣αª┐αª╕αºçαª¼αºç αª¿αª┐αª¼αª¿αºìαªºαª┐αªñ αª¿αª¿αÑñ</p>
              </motion.div>
            )}

            <div className="space-y-6 relative z-10">
              {/* Method Toggle */}
              <div className="flex bg-black/20 rounded-xl p-1 border border-gold/10">
                <button onClick={() => setMethod("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${method === "phone" ? "bg-gold-gradient text-primary-foreground shadow-lg" : "text-gold/60 hover:text-gold"}`}>
                  <Phone size={16} /> αª«αºïαª¼αª╛αªçαª▓
                </button>
                <button onClick={() => setMethod("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${method === "email" ? "bg-gold-gradient text-primary-foreground shadow-lg" : "text-gold/60 hover:text-gold"}`}>
                  <Mail size={16} /> αªçαª«αºçαªçαª▓
                </button>
              </div>

              <div className="space-y-4">
                {signupMode && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">αªåαª¬αª¿αª╛αª░ αª¿αª╛αª« *</label>
                    <Input type="text" placeholder="αª¬αºéαª░αºìαªú αª¿αª╛αª«" value={signupName} onChange={e => setSignupName(e.target.value)}
                      className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl px-4 text-cream placeholder:text-muted-foreground/50 font-medium" />
                  </div>
                )}

                {method === "email" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">αªçαª«αºçαªçαª▓</label>
                    <Input type="email" placeholder="example@gmail.com" value={email} onChange={e => setEmail(e.target.value)}
                      className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl px-4 text-cream placeholder:text-muted-foreground/50 font-medium" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">αª«αºïαª¼αª╛αªçαª▓ αª¿αª«αºìαª¼αª░</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/60 font-bold text-sm">+88</span>
                      <Input type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                        className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl pl-14 pr-4 text-cream placeholder:text-muted-foreground/50 font-medium" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">αª¬αª╛αª╕αªôαª»αª╝αª╛αª░αºìαªí</label>
                  <Input type="password" placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" value={password} onChange={e => setPassword(e.target.value)}
                    className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl px-4 text-cream placeholder:text-muted-foreground/50 font-medium"
                    onKeyDown={e => e.key === "Enter" && (signupMode ? handleSignup() : handleLogin())} />
                </div>

                {signupMode ? (
                  <Button onClick={handleSignup} disabled={signupLoading || !(method === "email" ? email : phone) || !password || !signupName.trim()}
                    className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 text-base font-bold rounded-xl mt-4">
                    {signupLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        αª╕αª╛αªçαª¿αªåαª¬ αª╣αªÜαºìαª¢αºç...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">αª╕αª╛αªçαª¿αªåαª¬ αªòαª░αºüαª¿ <ArrowRight size={18} /></div>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleLogin} disabled={loginLoading || !(method === "email" ? email : phone) || !password}
                    className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 text-base font-bold rounded-xl mt-4">
                    {loginLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        αª▓αªùαªçαª¿ αª╣αªÜαºìαª¢αºç...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">αª▓αªùαªçαª¿ αªòαª░αºüαª¿ <ArrowRight size={18} /></div>
                    )}
                  </Button>
                )}

                <div className="pt-4 border-t border-gold/10 text-center">
                  <button onClick={() => setSignupMode(!signupMode)} className="text-sm text-gold/70 hover:text-gold font-medium transition-colors">
                    {signupMode ? "αªçαªñαª┐αª«αªºαºìαª»αºç αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒ αªåαª¢αºç? αª▓αªùαªçαª¿ αªòαª░αºüαª¿" : "αª¿αªñαºüαª¿ αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒ αªñαºêαª░αª┐ αªòαª░αºüαª¿"}
                  </button>
                </div>

                {user && !isCommitteeMember && !signupMode && (
                  <div className="pt-2">
                    <Button variant="outline" onClick={handleLogout} className="w-full border-gold/30 text-gold h-12 rounded-xl font-semibold hover:bg-gold/5">
                      αªàαª¿αºìαª» αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒαºç αª▓αªùαªçαª¿
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // DASHBOARD
  return (
    <>
      <SEO title="αªòαª«αª┐αªƒαª┐ αªíαºìαª»αª╛αª╢αª¼αºïαª░αºìαªí" description="αª¡αºïαªƒαª┐αªé αªô αª«αªñαª╛αª«αªñ αª¬αºìαª░αªªαª╛αª¿" canonical="/committee-login" />
      <div className="py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4 bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-gold/20 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                <User size={22} className="text-gold" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-gold">{memberName}</h1>
                <p className="text-xs text-muted-foreground">αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª»</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-gold/30 text-gold hover:bg-gold/5 rounded-xl">
              <LogOut size={16} className="mr-2" /> αª▓αªùαªåαªëαªƒ
            </Button>
          </div>

          {loadingData ? <PremiumLoader /> : (
            <div className="space-y-10">
              {/* VOTING SECTION */}
              <section>
                <h2 className="text-xl font-heading font-bold text-gold mb-6 flex items-center gap-2">
                  <Vote size={22} /> αª¡αºïαªƒαª┐αªé
                </h2>

                {topics.length === 0 ? (
                  <div className="text-center py-12 bg-card/30 rounded-2xl border border-gold/10">
                    <Vote className="w-12 h-12 text-gold/20 mx-auto mb-3" />
                    <p className="text-muted-foreground">αªÅαªûαª¿αºï αªòαºïαª¿αºï αª¡αºïαªƒαºçαª░ αª¼αª┐αª╖αª»αª╝ αª¿αºçαªçαÑñ</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topics.map((topic) => {
                      const counts = getVoteCounts(topic.id);
                      const totalVotes = counts.satisfied + counts.unsatisfied;
                      const satisfiedPct = totalVotes > 0 ? Math.round((counts.satisfied / totalVotes) * 100) : 0;

                      return (
                        <motion.div key={topic.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          className="bg-card/50 backdrop-blur border border-gold/15 rounded-2xl p-5">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <h3 className="font-heading font-bold text-cream text-lg">{topic.title}</h3>
                              {topic.description && <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gold/50 bg-gold/10 px-2 py-1 rounded-md">
                              {topic.type === "monthly" ? "αª«αª╛αª╕αª┐αªò" : "αª¼αª╛αª░αºìαª╖αª┐αªò"}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {totalVotes > 0 && (
                            <div className="my-4">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                <span>αª╕αª¿αºìαªñαºüαª╖αºìαªƒ {counts.satisfied}</span>
                                <span>αªàαª╕αª¿αºìαªñαºüαª╖αºìαªƒ {counts.unsatisfied}</span>
                              </div>
                              <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${satisfiedPct}%` }} />
                              </div>
                              <p className="text-[10px] text-gold/40 mt-1">αª«αºïαªƒ αª¡αºïαªƒ: {totalVotes}</p>
                            </div>
                          )}

                          {/* Vote buttons */}
                          <div className="flex gap-3 mt-4">
                            <Button
                              onClick={() => handleVote(topic.id, "satisfied")}
                              variant={counts.myVote === "satisfied" ? "default" : "outline"}
                              className={`flex-1 rounded-xl h-11 font-bold ${counts.myVote === "satisfied" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : "border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/10"}`}
                            >
                              <ThumbsUp size={16} className="mr-2" /> αª╕αª¿αºìαªñαºüαª╖αºìαªƒ
                            </Button>
                            <Button
                              onClick={() => handleVote(topic.id, "unsatisfied")}
                              variant={counts.myVote === "unsatisfied" ? "default" : "outline"}
                              className={`flex-1 rounded-xl h-11 font-bold ${counts.myVote === "unsatisfied" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-red-600/30 text-red-400 hover:bg-red-600/10"}`}
                            >
                              <ThumbsDown size={16} className="mr-2" /> αªàαª╕αª¿αºìαªñαºüαª╖αºìαªƒ
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* COMMENTS SECTION */}
              <section>
                <h2 className="text-xl font-heading font-bold text-gold mb-6 flex items-center gap-2">
                  <MessageSquare size={22} /> αª«αªñαª╛αª«αªñ αªô αª«αª¿αºìαªñαª¼αºìαª»
                </h2>

                {/* New comment */}
                <div className="bg-card/50 backdrop-blur border border-gold/15 rounded-2xl p-5 mb-6">
                  <Textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="αªåαª¬αª¿αª╛αª░ αª«αªñαª╛αª«αªñ αª¼αª╛ αª«αª¿αºìαªñαª¼αºìαª» αª▓αª┐αªûαºüαª¿..."
                    className="bg-black/20 border-gold/20 focus:border-gold text-cream min-h-[80px] rounded-xl mb-3"
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}
                    className="bg-gold-gradient text-primary-foreground font-bold rounded-xl">
                    <Send size={16} className="mr-2" /> αª«αª¿αºìαªñαª¼αºìαª» αªòαª░αºüαª¿
                  </Button>
                </div>

                {/* Comments list */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">αªòαºïαª¿αºï αª«αª¿αºìαªñαª¼αºìαª» αª¿αºçαªçαÑñ</p>
                  ) : (
                    comments.map(c => (
                      <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-card/30 border border-gold/10 rounded-xl p-4">
                        <p className="text-cream text-sm leading-relaxed">{c.message}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-gold/40">
                            {new Date(c.created_at).toLocaleDateString("bn-BD")}
                          </span>
                          {c.user_id === user?.id && (
                            <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-destructive/60 hover:text-destructive">
                              αª«αºüαª¢αºüαª¿
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CommitteeDashboard;
