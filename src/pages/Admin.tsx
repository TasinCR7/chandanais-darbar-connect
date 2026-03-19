import { useState, useEffect, useRef } from "react";
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
import PremiumLoader from "@/components/PremiumLoader";

interface Notice {
  id: string;
  title: string;
  message: string | null;
  type: 'scrolling' | 'detailed';
  is_active: boolean;
  created_at: string;
}

interface GalleryItem {
  id: string;
  url: string;
  caption: string | null;
  category: string;
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
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [scrollingTitle, setScrollingTitle] = useState("");
  const [detailedTitle, setDetailedTitle] = useState("");
  const [detailedMessage, setDetailedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState("দরবার শরীফ");
  const [galleryCaption, setGalleryCaption] = useState("");
  const { toast } = useToast();

  // Auth listener
  const isInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;

    const syncAuth = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data, error } = await supabase.rpc("has_role", {
            _user_id: currentUser.id,
            _role: "admin",
          });
          if (mounted) setIsAdmin(!!data && !error);
        } else {
          if (mounted) setIsAdmin(false);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    syncAuth();

    // Safety timeout to ensure loading state clears NO MATTER WHAT
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setAuthLoading(current => {
          if (current) console.warn("Auth check timed out, forcing load completion");
          return false;
        });
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Always check admin status on auth state changes if we have a user
          const { data } = await supabase.rpc("has_role", {
            _user_id: currentUser.id,
            _role: "admin",
          });
          if (mounted) {
            setIsAdmin(!!data);
            setAuthLoading(false);
          }
        } else {
          setIsAdmin(false);
          setAuthLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
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
    setUser(null);
    setIsAdmin(false);
  };

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotices(data as unknown as Notice[]);
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
      fetchGallery();
    }
  }, [isAdmin]);

  const addNotice = async (type: 'scrolling' | 'detailed') => {
    const currentTitle = type === 'scrolling' ? scrollingTitle : detailedTitle;
    const currentMessage = type === 'scrolling' ? "" : detailedMessage;

    if (!currentTitle.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("notices").insert({
      title: currentTitle.trim(),
      message: currentMessage.trim() || null,
      type: type,
      is_active: true,
    });

    if (error) {
      toast({ 
        title: "ত্রুটি", 
        description: "নোটিশ যোগ করতে সমস্যা হয়েছে: " + error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "সফল ✅", 
        description: type === 'scrolling' ? "স্ক্রলিং নোটিশ সফলভাবে যোগ করা হয়েছে।" : "বিস্তারিত নোটিশ সফলভাবে যোগ করা হয়েছে।",
        className: "bg-green-500/10 border-green-500/50"
      });
      if (type === 'scrolling') setScrollingTitle("");
      else {
        setDetailedTitle("");
        setDetailedMessage("");
      }
      fetchNotices();
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("notices").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: "অবস্থা পরিবর্তন করতে সমস্যা হয়েছে।", variant: "destructive" });
    } else {
      toast({ title: current ? "নিষ্ক্রিয় করা হয়েছে" : "সক্রিয় করা হয়েছে", duration: 2000 });
      fetchNotices();
    }
  };

  const deleteNotice = async (id: string) => {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: "ডিলিট করতে সমস্যা হয়েছে।", variant: "destructive" });
    } else {
      toast({ title: "ডিলিট করা হয়েছে", variant: "destructive", duration: 2000 });
      fetchNotices();
    }
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

  const fetchGallery = async () => {
    const { data } = await supabase
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setGallery(data as GalleryItem[]);
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("gallery")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("gallery").insert({
        url: publicUrl,
        caption: galleryCaption.trim() || null,
        category: galleryCategory,
      });

      if (dbError) throw dbError;

      toast({ title: "সফল ✅", description: "ছবি আপলোড করা হয়েছে।" });
      setGalleryCaption("");
      fetchGallery();
    } catch (error: any) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteGalleryItem = async (id: string, url: string) => {
    // Extract filename from URL
    const fileName = url.split("/").pop();
    if (fileName) {
      await (supabase.storage.from("gallery" as any) as any).remove([fileName]);
    }
    await (supabase.from("gallery" as any) as any).delete().eq("id", id);
    fetchGallery();
  };

  const unreadCount = submissions.filter((s) => !s.is_read).length;
  const questions = submissions.filter((s) => s.type === "question");
  const complaints = submissions.filter((s) => s.type === "complaint");
  const doas = submissions.filter((s) => s.type === "doa");

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 islamic-pattern">
        <PremiumLoader />
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
                <TabsTrigger value="gallery" className="data-[state=active]:bg-gold/20 flex-1 text-xs sm:text-sm px-2 sm:px-3 py-2">
                  <Eye size={14} className="mr-1 sm:mr-2 shrink-0" />
                  <span className="truncate">গ্যালারি ({gallery.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Notices Tab */}
              <TabsContent value="notices" className="space-y-6">
                <div className="bg-card border border-gold/20 rounded-lg p-6 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-heading font-semibold text-gold flex items-center gap-2">
                       <Bell size={18} /> স্ক্রলিং নোটিশ (উপরে থাকবে)
                    </h2>
                    <p className="text-xs text-muted-foreground">এটি ওয়েবসাইটের একদম উপরে সরু লাইনে স্ক্রল করবে।</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="অল্প কথায় নোটিশটি লিখুন *"
                        value={scrollingTitle}
                        onChange={(e) => setScrollingTitle(e.target.value)}
                        className="border-gold/30 focus:border-gold flex-1 h-12"
                      />
                      <Button
                        onClick={() => addNotice('scrolling')}
                        disabled={loading || !scrollingTitle.trim()}
                        className="bg-gold-gradient text-primary-foreground shrink-0 h-12 px-6 font-bold"
                      >
                        {loading && <div className="mr-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        যোগ করুন
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gold/10 pt-6 space-y-4">
                    <h2 className="text-lg font-heading font-semibold text-gold flex items-center gap-2">
                       <Plus size={18} /> বিস্তারিত নোটিশ (বড় বক্স)
                    </h2>
                    <p className="text-xs text-muted-foreground">এটি হোমপেজে বড় বক্স আকারে বিস্তারিত দেখা যাবে।</p>
                    <Input
                      placeholder="বিস্তারিত নোটিশের শিরোনাম *"
                      value={detailedTitle}
                      onChange={(e) => setDetailedTitle(e.target.value)}
                      className="border-gold/30 focus:border-gold h-12"
                    />
                    <Textarea
                      placeholder="বিস্তারিত বার্তা লিখুন"
                      value={detailedMessage}
                      onChange={(e) => setDetailedMessage(e.target.value)}
                      className="border-gold/30 focus:border-gold min-h-[100px]"
                      rows={4}
                    />
                    <Button
                      onClick={() => addNotice('detailed')}
                      disabled={loading || !detailedTitle.trim()}
                      className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 font-bold"
                    >
                      {loading && <div className="mr-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      বিস্তারিত নোটিশ যোগ করুন
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                      <Bell size={20} className="text-gold" />
                      সকল নোটিশ ({notices.length})
                    </h2>
                  </div>
                  
                  {notices.length === 0 ? (
                    <div className="text-center py-12 bg-card/50 border border-gold/10 rounded-xl">
                      <Bell size={40} className="mx-auto text-gold/20 mb-3" />
                      <p className="text-muted-foreground text-sm font-medium">বর্তমানে কোনো নোটিশ নেই।</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {notices.map((n) => (
                        <motion.div 
                          key={n.id} 
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-card/50 backdrop-blur-sm border border-gold/20 rounded-xl p-5 hover:border-gold/40 transition-all group"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  n.type === 'scrolling' 
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                    : 'bg-gold/10 text-gold border border-gold/20'
                                }`}>
                                  {n.type === 'scrolling' ? 'স্ক্রলিং' : 'বিস্তারিত'}
                                </span>
                                <p className="font-bold text-foreground text-lg">{n.title}</p>
                              </div>
                              {n.message && (
                                <p className="text-sm text-muted-foreground leading-relaxed bg-black/20 p-3 rounded-lg border border-gold/5">
                                  {n.message}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                <span>ID: {n.id.slice(0, 8)}</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span>{new Date(n.created_at).toLocaleDateString("bn-BD", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0 pt-4 md:pt-0 md:border-l md:border-gold/10 md:pl-4">
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={n.is_active} 
                                  onCheckedChange={() => toggleActive(n.id, n.is_active)}
                                  className="data-[state=checked]:bg-gold"
                                />
                                <span className={`text-xs font-semibold ${n.is_active ? "text-gold" : "text-muted-foreground"}`}>
                                  {n.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                                </span>
                              </div>
                              <div className="w-px h-6 bg-gold/10 hidden md:block" />
                              <button 
                                onClick={() => deleteNotice(n.id)} 
                                className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-all"
                                title="ডিলিট করুন"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
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

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="space-y-6">
                <div className="bg-card border border-gold/20 rounded-lg p-6 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-heading font-semibold text-gold">নতুন ছবি আপলোড</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium">ক্যাপশন</label>
                         <Input 
                            value={galleryCaption} 
                            onChange={(e) => setGalleryCaption(e.target.value)}
                            placeholder="ছবির বর্ণনা..."
                            className="border-gold/30 focus:border-gold"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">ক্যাটেগরি</label>
                         <select 
                            value={galleryCategory} 
                            onChange={(e) => setGalleryCategory(e.target.value)}
                            className="w-full flex h-10 rounded-md border border-gold/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                         >
                            <option value="দরবার শরীফ">দরবার শরীফ</option>
                            <option value="ওরশ শরীফ">ওরশ শরীফ</option>
                            <option value="মাহফিল">মাহফিল</option>
                         </select>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gold/20 rounded-lg p-8 hover:border-gold/40 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={uploadImage}
                        disabled={uploading}
                        className="hidden"
                        id="image-upload"
                      />
                      <label 
                        htmlFor="image-upload" 
                        className={`cursor-pointer flex flex-col items-center gap-2 ${uploading ? 'opacity-50' : ''}`}
                      >
                         <Plus size={32} className="text-gold" />
                         <span className="font-medium text-gold">{uploading ? "আপলোড হচ্ছে..." : "ছবি সিলেক্ট করুন"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((item) => (
                    <div key={item.id} className="relative group rounded-lg overflow-hidden border border-gold/20 aspect-square">
                      <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <p className="text-white text-xs truncate mb-2">{item.caption || "কোনো বর্ণনা নেই"}</p>
                         <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 w-full"
                            onClick={() => deleteGalleryItem(item.id, item.url)}
                         >
                           <Trash2 size={14} className="mr-2" /> ডিলিট
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
