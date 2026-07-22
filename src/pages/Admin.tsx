import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PremiumLoader from "@/components/PremiumLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImage } from "@/utils/imageCompression";
import AdminSection from "@/components/admin/AdminSection";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Bell, 
  HandHeart, 
  MessageSquare, 
  Image as ImageIcon, 
  Landmark, 
  Users, 
  Vote, 
  Settings, 
  Megaphone, 
  RefreshCw, 
  LogOut, 
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Inbox
} from "lucide-react";

// Lazy-loaded admin sub-modules
import AdminLogin from "@/components/admin/AdminLogin";
const NoticeManager = lazy(() => import("@/components/admin/NoticeManager"));
const GalleryManager = lazy(() => import("@/components/admin/GalleryManager"));
const SubmissionManager = lazy(() => import("@/components/admin/SubmissionManager"));
const CommitteeManager = lazy(() => import("@/components/admin/CommitteeManager"));
const VoteTopicManager = lazy(() => import("@/components/admin/VoteTopicManager"));
const DonationManager = lazy(() => import("@/components/admin/DonationManager"));
const CommitteeBroadcast = lazy(() => import("@/components/admin/CommitteeBroadcast"));
const SettingsManager = lazy(() => import("@/components/admin/SettingsManager"));
const FinanceManager = lazy(() => import("@/components/admin/FinanceManager"));

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [notices, setNotices] = useState<Tables<"notices">[]>([]);
  const [submissions, setSubmissions] = useState<Tables<"submissions">[]>([]);
  const [gallery, setGallery] = useState<Tables<"gallery">[]>([]);
  const [donationCount, setDonationCount] = useState<number>(0);
  const [galleryCategory, setGalleryCategory] = useState("দরবার শরীফ");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const safetyTimer = setTimeout(() => {
      if (isMounted) setVerifying(false);
    }, 3000);

    const checkAdminStatus = async (currentUser: User | null) => {
      if (!currentUser) return false;

      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: currentUser.id, _role: "admin" });
        return !!data && !error;
      } catch (err) {
        return false;
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        const currentUser = session?.user ?? null;
        if (currentUser) {
          setUser(currentUser);
          const isAdminUser = await checkAdminStatus(currentUser);
          if (isMounted) setIsAdmin(isAdminUser);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        if (isMounted) {
          setVerifying(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        if (currentUser) {
          setUser(currentUser);
          const isAdminUser = await checkAdminStatus(currentUser);
          if (isMounted) {
            setIsAdmin(isAdminUser);
            setVerifying(false);
          }
        } else {
          if (isMounted) {
            setIsAdmin(false);
            setVerifying(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (identifier: string, pass: string, method: "email" | "phone") => {
    setLoginLoading(true);
    
    try {
      if (method === "email") {
        const cleanEmail = identifier.replace(/\s+/g, "").toLowerCase();
        
        if (!cleanEmail.includes("@")) {
          toast({ 
            title: "অসম্পূর্ণ ইমেইল", 
            description: "অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন (যেমন: admin@gmail.com)।", 
            variant: "destructive" 
          });
          setLoginLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
        
        if (!error && data?.user) {
          // Check if the user has admin role
          const { data: hasAdminRole, error: roleErr } = await supabase.rpc("has_role", { 
            _user_id: data.user.id, 
            _role: "admin" 
          });

          if (hasAdminRole && !roleErr) {
            setUser(data.user);
            setIsAdmin(true);
            toast({ title: "প্রবেশাধিকার মঞ্জুর ✓", description: `স্বাগতম! এডমিন ড্যাশবোর্ডে প্রবেশ করা হয়েছে।` });
          } else {
            setUser(data.user);
            setIsAdmin(false);
            toast({ 
              title: "এডমিন অনুমতি নেই ⚠️", 
              description: "আপনার ইমেইল ও পাসওয়ার্ড সঠিক, কিন্তু অ্যাকাউন্টে এডমিন পারমিশন (Admin Role) যুক্ত করা নেই।", 
              variant: "destructive" 
            });
          }
          return;
        }

        if (error) {
          let errorMsg = error.message;
          if (error.message.includes("Invalid login credentials")) {
            errorMsg = "ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে। দয়া করে সঠিক ইমেইল ও পাসওয়ার্ড লিখুন।";
          } else if (error.message.includes("Email not confirmed")) {
            errorMsg = "আপনার ইমেইলটি নিশ্চিত (Confirm) করা হয়নি। অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করুন।";
          } else if (error.message.includes("Too many requests") || error.message.includes("rate limit")) {
            errorMsg = "অনেক বেশিবার ভুল চেষ্টা করা হয়েছে। নিরাপত্তার স্বার্থে কিছুক্ষণ পর আবার চেষ্টা করুন।";
          }

          toast({ 
            title: "ইমেইল লগইন ব্যর্থ", 
            description: errorMsg, 
            variant: "destructive" 
          });
        }
      } else {
        const rawPhone = identifier.trim().replace(/[^0-9+]/g, "");
        let phoneVariants: string[] = [];

        if (rawPhone.startsWith("+")) {
          phoneVariants = [rawPhone, rawPhone.replace(/^\+88/, "")];
        } else if (rawPhone.startsWith("880")) {
          phoneVariants = [`+${rawPhone}`, rawPhone.substring(2)];
        } else {
          phoneVariants = [`+88${rawPhone}`, rawPhone];
        }

        let lastError: any = null;
        let loggedInUser = null;

        for (const p of phoneVariants) {
          const { data, error } = await supabase.auth.signInWithPassword({ phone: p, password: pass });
          if (!error && data?.user) {
            loggedInUser = data.user;
            break;
          }
          lastError = error;
        }

        if (loggedInUser) {
          const { data: hasAdminRole } = await supabase.rpc("has_role", { 
            _user_id: loggedInUser.id, 
            _role: "admin" 
          });

          if (hasAdminRole) {
            setUser(loggedInUser);
            setIsAdmin(true);
            toast({ title: "প্রবেশাধিকার মঞ্জুর ✓", description: "মোবাইল নম্বর দিয়ে লগইন সফল হয়েছে।" });
          } else {
            setUser(loggedInUser);
            setIsAdmin(false);
            toast({ 
              title: "এডমিন অনুমতি নেই ⚠️", 
              description: "আপনার নম্বর সঠিক, কিন্তু অ্যাকাউন্টে এডমিন পারমিশন যুক্ত নেই।", 
              variant: "destructive" 
            });
          }
          return;
        }

        if (lastError) {
          let errorMsg = lastError.message;
          if (lastError.message.includes("Invalid login credentials")) {
            errorMsg = "ভুল নম্বর বা পাসওয়ার্ড দেওয়া হয়েছে।";
          }
          toast({ 
            title: "লগইন ব্যর্থ", 
            description: errorMsg, 
            variant: "destructive" 
          });
        }
      }
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "একটি অজানা সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setIsAdmin(false);
      setVerifying(false);
      toast({ title: "লগআউট সফল", description: "আপনি সফলভাবে লগআউট করেছেন।" });
    }
  };

  const fetchNotices = async () => {
    const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    if (data) setNotices(data);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase.from("submissions").select("*").order("created_at", { ascending: false });
    if (data) setSubmissions(data);
  };

  const fetchGallery = async () => {
    const { data } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
    if (data) setGallery(data);
  };

  const fetchDonationStats = async () => {
    const { count } = await supabase.from("donations").select("*", { count: 'exact', head: true });
    if (count !== null) setDonationCount(count);
  };

  const refreshAllStats = async () => {
    setRefreshingStats(true);
    await Promise.all([
      fetchNotices(),
      fetchSubmissions(),
      fetchGallery(),
      fetchDonationStats()
    ]);
    setRefreshingStats(false);
    toast({ title: "তথ্য রিফ্রেশ হয়েছে", description: "ড্যাশবোর্ডের সব তথ্য আপডেট করা হয়েছে।" });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchNotices();
      fetchSubmissions();
      fetchGallery();
      fetchDonationStats();
    }
  }, [isAdmin]);

  // Operations
  const addNotice = async (type: 'scrolling' | 'detailed', title: string, message?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("notices").insert([{ title, message, type, is_active: true }]);
      if (!error) {
        toast({ title: "সফল", description: "নোটিশটি যোগ করা হয়েছে।" });
        fetchNotices();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleNotice = async (id: string, currentStatus: boolean) => {
    await supabase.from("notices").update({ is_active: !currentStatus }).eq("id", id);
    fetchNotices();
  };

  const deleteNotice = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই নোটিশটি মুছে ফেলতে চান?")) return;
    await supabase.from("notices").delete().eq("id", id);
    fetchNotices();
  };

  const markSubmissionRead = async (id: string) => {
    await supabase.from("submissions").update({ is_read: true }).eq("id", id);
    fetchSubmissions();
  };

  const deleteSubmission = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই প্রশ্ন/অভিযোগটি মুছে ফেলতে চান?")) return;
    await supabase.from("submissions").delete().eq("id", id);
    fetchSubmissions();
  };

  const submitReply = async (id: string, reply: string) => {
    const { error } = await supabase.from("submissions").update({ 
      reply, 
      replied_at: new Date().toISOString(),
      is_read: true 
    }).eq("id", id);
    if (!error) {
      toast({ title: "উত্তর পাঠানো হয়েছে", description: "আপনার উত্তর সফলভাবে সংরক্ষিত হয়েছে।" });
      fetchSubmissions();
    }
  };

  const updateSubmissionDetails = async (
    id: string,
    updates: {
      name: string;
      phone: string | null;
      subject: string;
      details: string;
      address?: string | null;
    }
  ) => {
    const { error } = await supabase.from("submissions").update(updates).eq("id", id);
    if (!error) {
      toast({ title: "সফল", description: "আবেদনটি সফলভাবে সংশোধন করা হয়েছে।" });
      fetchSubmissions();
    } else {
      toast({ title: "ত্রুটি", description: "সংশোধন করতে সমস্যা হয়েছে।", variant: "destructive" });
    }
  };

  const uploadGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFile = e.target.files[0];

    setUploading(true);
    try {
      const compressedFile = await compressImage(rawFile);
      const fileExt = compressedFile.name.split(".").pop() || "webp";
      const fileName = crypto.randomUUID() + '.' + fileExt;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage.from("gallery").upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(filePath);
      const { error: dbError } = await supabase.from("gallery").insert([{
        url: publicUrl,
        caption: galleryCaption,
        category: galleryCategory
      }]);

      if (dbError) throw dbError;
      toast({ title: "আপলোড সফল", description: "ছবিটি গ্যালারিতে যোগ করা হয়েছে।" });
      setGalleryCaption("");
      fetchGallery();
     
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteGalleryItem = async (id: string, url: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ছবিটি গ্যালারি থেকে মুছে ফেলতে চান?")) return;
    const fileName = url.split("/").pop();
    if (fileName) {
      await supabase.storage.from("gallery").remove([fileName]);
    }
    await supabase.from("gallery").delete().eq("id", id);
    fetchGallery();
  };

  if (!user || !isAdmin) {
    return (
      <AdminLogin 
        onLogin={handleLogin}
        loading={loginLoading}
        isVerifying={verifying}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
    );
  }

  const activeNoticesCount = notices.filter(n => n.is_active).length;
  const unreadSubmissionsCount = submissions.filter(s => !s.is_read).length;

  return (
    <div className="py-10 md:py-16 islamic-pattern min-h-screen">
      <div className="container mx-auto px-4 max-w-[1400px] space-y-6">
        
        {/* Header Bar */}
        <div className="relative bg-card/70 backdrop-blur-xl rounded-2xl border border-gold/20 p-5 md:p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gold to-amber-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
              <div className="w-14 h-14 rounded-full overflow-hidden bg-background relative border-2 border-gold/40 flex items-center justify-center shadow-lg">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=tasinskder"
                  alt="Admin avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-0.5 justify-center sm:justify-start">
                <h1 className="text-xl md:text-2xl font-heading font-bold text-cream">
                  স্বাগতম, {user?.email?.split('@')[0] ?? 'Admin'}
                </h1>
                <span className="px-2.5 py-0.5 bg-gold/10 border border-gold/30 rounded-full text-[10px] font-bold text-gold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-gold" /> সুপার এডমিন
                </span>
              </div>
              <p className="text-xs text-gold/70 font-medium">চন্দনাইশ দরবার শরীফ কন্ট্রোল প্যানেল</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={refreshAllStats}
              disabled={refreshingStats}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-xs shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white px-4 py-2 rounded-xl transition-all duration-300 font-bold text-xs shadow-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              লগআউট
            </button>
          </div>
        </div>

        {/* Real-time Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg hover:border-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">সক্রিয় নোটিশ</p>
              <h3 className="text-xl font-heading font-black text-gold">{activeNoticesCount}টি</h3>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg hover:border-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">নতুন প্রশ্ন/অভিযোগ</p>
              <h3 className="text-xl font-heading font-black text-amber-400">{unreadSubmissionsCount}টি</h3>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg hover:border-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">গ্যালারি ছবি</p>
              <h3 className="text-xl font-heading font-black text-blue-400">{gallery.length}টি</h3>
            </div>
          </div>

          <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-4 flex items-center gap-3 shadow-lg hover:border-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HandHeart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">মোট হাদিয়া এনট্রি</p>
              <h3 className="text-xl font-heading font-black text-emerald-400">{donationCount}টি</h3>
            </div>
          </div>
        </div>

        {/* Tabbed Admin Interface */}
        <Tabs defaultValue="notices" className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
            <TabsList className="bg-card/50 backdrop-blur-md border border-gold/20 w-max min-w-full flex h-auto p-1.5 rounded-2xl shadow-xl gap-1">
              <TabsTrigger value="notices" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> নোটিশ
              </TabsTrigger>
              <TabsTrigger value="donations" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <HandHeart className="w-3.5 h-3.5" /> হাদিয়া ও নজরানা
              </TabsTrigger>
              <TabsTrigger value="submissions" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> প্রশ্ন ও অভিযোগ
              </TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> গ্যালারি
              </TabsTrigger>
              <TabsTrigger value="finance" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> আয়-ব্যয়
              </TabsTrigger>
              <TabsTrigger value="committee" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> কমিটি
              </TabsTrigger>
              <TabsTrigger value="voting" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5" /> ভোটিং
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> সেটিংস
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 text-gold">
                <Megaphone className="w-3.5 h-3.5" /> বার্তা পাঠান 📢
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notices">
            <AdminSection title="নোটিশ পরিচালনা">
              <Suspense fallback={<PremiumLoader />}>
                <NoticeManager 
                  notices={notices as any} 
                  loading={loading} 
                  onAddNotice={addNotice} 
                  onToggleActive={toggleNotice} 
                  onDeleteNotice={deleteNotice} 
                />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="donations">
            <AdminSection title="হাদিয়া ও নজরানা হিসাব">
              <Suspense fallback={<PremiumLoader />}>
                <DonationManager />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="submissions">
            <AdminSection title="প্রশ্ন ও অভিযোগ উত্তর ও রিপ্লাই">
              <Suspense fallback={<PremiumLoader />}>
                <SubmissionManager 
                  submissions={submissions} 
                  onMarkRead={markSubmissionRead} 
                  onDelete={deleteSubmission} 
                  onReply={submitReply} 
                  onUpdateSubmission={updateSubmissionDetails}
                />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="gallery">
            <AdminSection title="গ্যালারি অ্যালবাম ও ছবি আপলোড">
              <Suspense fallback={<PremiumLoader />}>
                <GalleryManager 
                  gallery={gallery}
                  uploading={uploading}
                  galleryCaption={galleryCaption}
                  setGalleryCaption={setGalleryCaption}
                  galleryCategory={galleryCategory}
                  setGalleryCategory={setGalleryCategory}
                  onUpload={uploadGalleryImage}
                  onDelete={deleteGalleryItem}
                />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="committee">
            <AdminSection title="কমিটি সদস্য তালিকা">
              <Suspense fallback={<PremiumLoader />}>
                <CommitteeManager />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="finance">
            <AdminSection title="আয় ও খরচের বিস্তারিত">
              <Suspense fallback={<PremiumLoader />}>
                <FinanceManager />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="voting">
            <AdminSection title="ভোটিং টপিক তৈরি ও ফলাফল">
              <Suspense fallback={<PremiumLoader />}>
                <VoteTopicManager />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="broadcast">
            <AdminSection title="কমিটি ব্রডকাস্ট মেসেজ">
              <Suspense fallback={<PremiumLoader />}>
                <CommitteeBroadcast />
              </Suspense>
            </AdminSection>
          </TabsContent>

          <TabsContent value="settings">
            <AdminSection title="ওয়েবসাইট সিস্টেম সেটিংস">
              <Suspense fallback={<PremiumLoader />}>
                <SettingsManager />
              </Suspense>
            </AdminSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
