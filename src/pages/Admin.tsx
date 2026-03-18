import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, LogIn, LogOut, HelpCircle, AlertTriangle, Eye, Send, HandHeart } from "lucide-react";
import SEO from "@/components/SEO";
import type { User } from "@supabase/supabase-js";

interface Notice {
  id: string;
  title: string;
  message: string | null;
  is_active: boolean;
  created_at: string;
}

interface Submission {
  id: string;
  type: string;
  name: string;
  phone: string | null;
  subject: string;
  address?: string | null;
  details: string;
  is_read: boolean;
  created_at: string;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Auth listener
  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (error) console.error("Error checking role:", error);
        if (mounted) setIsAdmin(!!data);
      } catch (err) {
        console.error("Exception checking role:", err);
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = session?.user ?? null;
        if (mounted) setUser(currentUser);

        if (currentUser) {
          await checkAdmin(currentUser.id);
        } else {
          if (mounted) {
            setIsAdmin(false);
            setAuthLoading(false);
          }
        }
      } catch (error) {
        console.error("Session error:", error);
        if (mounted) {
          setIsAdmin(false);
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await checkAdmin(currentUser.id);
        } else {
          setIsAdmin(false);
          setAuthLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotices(data);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSubmissions(data as Submission[]);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchNotices();
      fetchSubmissions();
    }
  }, [isAdmin]);

  const addNotice = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("notices").insert({
      title: title.trim(),
      message: message.trim() || null,
      is_active: true,
    });
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল ✅", description: "নোটিশ যোগ করা হয়েছে।" });
      setTitle("");
      setMessage("");
      fetchNotices();
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("notices").update({ is_active: !current }).eq("id", id);
    fetchNotices();
  };

  const deleteNotice = async (id: string) => {
    await supabase.from("notices").delete().eq("id", id);
    fetchNotices();
  };

  const markAsRead = async (id: string) => {
    await supabase.from("submissions").update({ is_read: true } as any).eq("id", id);
    fetchSubmissions();
  };

  const submitReply = async (id: string, reply: string) => {
    const { error } = await supabase
      .from("submissions")
      .update({ reply, replied_at: new Date().toISOString(), is_read: true } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: "উত্তর পাঠাতে সমস্যা হয়েছে।", variant: "destructive" });
    } else {
      toast({ title: "উত্তর পাঠানো হয়েছে ✅" });
      fetchSubmissions();
    }
  };

  const deleteSubmission = async (id: string) => {
    await supabase.from("submissions").delete().eq("id", id);
    fetchSubmissions();
  };

  const unreadCount = submissions.filter((s) => !s.is_read).length;
  const questions = submissions.filter((s) => s.type === "question");
  const complaints = submissions.filter((s) => s.type === "complaint");
  const doas = submissions.filter((s) => s.type === "doa");

  if (authLoading) {
    return (
      <div className="py-20 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  // Login Screen
  if (!user || !isAdmin) {
    return (
      <>
        <SEO title="এডমিন লগইন" description="এডমিন প্যানেলে লগইন করুন" canonical="/admin" />
        <div className="islamic-pattern min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-gold/20 rounded-xl p-6 sm:p-8 w-full max-w-sm shadow-lg"
          >
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                <LogIn size={24} className="text-gold" />
              </div>
              <h1 className="text-xl font-heading font-bold text-gold">এডমিন লগইন</h1>
            </div>

            {user && !isAdmin && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-4">
                <p className="text-sm text-destructive text-center">আপনার এডমিন অনুমতি নেই।</p>
              </div>
            )}

            <div className="space-y-4">
              <Input
                type="email"
                placeholder="ইমেইল"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gold/30 focus:border-gold h-12"
              />
              <Input
                type="password"
                placeholder="পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-gold/30 focus:border-gold h-12"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <Button
                onClick={handleLogin}
                disabled={loginLoading || !email || !password}
                className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 text-base"
              >
                {loginLoading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>
              {user && !isAdmin && (
                <Button variant="outline" onClick={handleLogout} className="w-full border-gold/30 text-gold h-12">
                  অন্য অ্যাকাউন্টে লগইন
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Admin Panel
  return (
    <>
      <SEO title="এডমিন প্যানেল" description="নোটিশ ও ঘোষণা পরিচালনা" canonical="/admin" />
      <div className="py-20 islamic-pattern">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-8 gap-3">
              <h1 className="text-xl md:text-2xl font-heading font-bold text-gold">এডমিন প্যানেল</h1>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-gold/30 text-gold shrink-0">
                <LogOut size={14} className="mr-1 md:mr-2" />
                <span className="hidden sm:inline">লগআউট</span>
              </Button>
            </div>

            <Tabs defaultValue="notices" className="space-y-6">
              <TabsList className="bg-card border border-gold/20 w-full flex flex-wrap h-auto p-1">
                <TabsTrigger value="notices" className="data-[state=active]:bg-gold/20 flex-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
                  <Bell size={14} className="mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">নোটিশ</span>
                </TabsTrigger>
                <TabsTrigger value="questions" className="data-[state=active]:bg-gold/20 flex-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
                  <HelpCircle size={14} className="mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">প্রশ্ন ({questions.length})</span>
                </TabsTrigger>
                <TabsTrigger value="complaints" className="data-[state=active]:bg-gold/20 flex-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
                  <AlertTriangle size={14} className="mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">অভিযোগ ({complaints.length})</span>
                </TabsTrigger>
                <TabsTrigger value="doa" className="data-[state=active]:bg-gold/20 flex-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
                  <HandHeart size={14} className="mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">দোয়া ({doas.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Notices Tab */}
              <TabsContent value="notices" className="space-y-6">
                <div className="bg-card border border-gold/20 rounded-lg p-6 space-y-4">
                  <h2 className="text-lg font-heading font-semibold text-foreground">নতুন নোটিশ যোগ করুন</h2>
                  <Input
                    placeholder="নোটিশ শিরোনাম *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-gold/30 focus:border-gold"
                  />
                  <Textarea
                    placeholder="বিস্তারিত বার্তা (ঐচ্ছিক)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="border-gold/30 focus:border-gold"
                    rows={3}
                  />
                  <Button
                    onClick={addNotice}
                    disabled={loading || !title.trim()}
                    className="bg-gold-gradient text-primary-foreground gold-glow-hover"
                  >
                    <Plus size={16} className="mr-2" />
                    নোটিশ যোগ করুন
                  </Button>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-heading font-semibold text-foreground">
                    সকল নোটিশ ({notices.length})
                  </h2>
                  {notices.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">কোনো নোটিশ নেই।</p>
                  )}
                  {notices.map((n) => (
                    <div key={n.id} className="bg-card border border-gold/20 rounded-lg p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground break-words">{n.title}</p>
                        {n.message && <p className="text-sm text-muted-foreground mt-1 break-words">{n.message}</p>}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(n.created_at).toLocaleDateString("bn-BD")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gold/10">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch checked={n.is_active} onCheckedChange={() => toggleActive(n.id, n.is_active)} />
                          <span className="text-xs text-muted-foreground">{n.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                        </div>
                        <button onClick={() => deleteNotice(n.id)} className="text-destructive hover:text-destructive/80 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Questions Tab */}
              <TabsContent value="questions">
                <SubmissionList items={questions} onMarkRead={markAsRead} onDelete={deleteSubmission} onReply={submitReply} emptyText="কোনো প্রশ্ন আসেনি।" showReply />
              </TabsContent>

              {/* Complaints Tab */}
              <TabsContent value="complaints">
                <SubmissionList items={complaints} onMarkRead={markAsRead} onDelete={deleteSubmission} onReply={submitReply} emptyText="কোনো অভিযোগ আসেনি।" showReply />
              </TabsContent>

              {/* Doa Tab */}
              <TabsContent value="doa">
                <SubmissionList items={doas} onMarkRead={markAsRead} onDelete={deleteSubmission} onReply={submitReply} emptyText="কোনো দোয়ার আবেদন আসেনি।" showReply />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </>
  );
};

const SubmissionList = ({
  items,
  onMarkRead,
  onDelete,
  onReply,
  emptyText,
  showReply,
}: {
  items: Submission[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onReply?: (id: string, reply: string) => void;
  emptyText: string;
  showReply?: boolean;
}) => {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">{emptyText}</p>;
  }

  const handleReply = (id: string) => {
    if (!replyText.trim() || !onReply) return;
    onReply(id, replyText.trim());
    setReplyingId(null);
    setReplyText("");
  };

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div
          key={s.id}
          className={`bg-card border rounded-lg p-3 sm:p-4 ${s.is_read ? "border-gold/10" : "border-gold/30"}`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-foreground text-sm sm:text-base">{s.name}</p>
              {!s.is_read && (
                <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-medium">নতুন</span>
              )}
              {s.reply && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">উত্তর দেওয়া হয়েছে</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1 break-words">
              {s.subject} • {s.phone || "ফোন নেই"} {s.address ? `• ${s.address}` : ""} • {new Date(s.created_at).toLocaleDateString("bn-BD")}
            </p>
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">{s.details}</p>

            {/* Show existing reply */}
            {s.reply && (
              <div className="mt-3 border-l-2 border-gold/40 pl-3 bg-gold/5 rounded-r p-2">
                <p className="text-xs text-gold font-semibold mb-1">উত্তর:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{s.reply}</p>
                {s.replied_at && (
                  <p className="text-xs text-muted-foreground mt-1">{new Date(s.replied_at).toLocaleDateString("bn-BD")}</p>
                )}
              </div>
            )}

            {/* Reply input */}
            {showReply && replyingId === s.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="উত্তর লিখুন..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="border-gold/20 focus:border-gold resize-none text-sm w-full"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReply(s.id)} disabled={!replyText.trim()} className="bg-gold-gradient text-primary-foreground">
                    <Send size={14} className="mr-1" />
                    পাঠান
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyText(""); }} className="text-xs">
                    বাতিল
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gold/10">
            {showReply && !s.reply && replyingId !== s.id && (
              <button
                onClick={() => { setReplyingId(s.id); setReplyText(""); }}
                className="text-gold hover:text-gold/80 p-1 text-xs flex items-center gap-1"
                title="উত্তর দিন"
              >
                <Send size={14} />
                <span className="sm:inline hidden">উত্তর</span>
              </button>
            )}
            {!s.is_read && (
              <button onClick={() => onMarkRead(s.id)} className="text-gold hover:text-gold/80 p-1 text-xs flex items-center gap-1" title="পড়া হয়েছে">
                <Eye size={14} />
                <span className="sm:inline hidden">পড়া হয়েছে</span>
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => onDelete(s.id)} className="text-destructive hover:text-destructive/80 p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

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

export default Admin;
