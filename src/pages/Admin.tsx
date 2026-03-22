import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PremiumLoader from "@/components/PremiumLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy-loaded admin sub-modules
import AdminLogin from "@/components/admin/AdminLogin";
const NoticeManager = lazy(() => import("@/components/admin/NoticeManager"));
const GalleryManager = lazy(() => import("@/components/admin/GalleryManager"));
const SubmissionManager = lazy(() => import("@/components/admin/SubmissionManager"));
const FinanceManager = lazy(() => import("@/components/admin/FinanceManager"));
const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);


  const [notices, setNotices] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryCategory, setGalleryCategory] = useState("দরবার শরীফ");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    // Safety fallback: hide verifying indicator after 3 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) setVerifying(false);
    }, 3000);

    const checkAdminStatus = async (currentUser: User | null) => {
      if (!currentUser) return false;
      const isMaster = currentUser.email?.toLowerCase() === "chandanaishdarbarsharif@gmail.com".toLowerCase();
      if (isMaster) return true;

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
        setUser(currentUser);
        if (currentUser) {
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

  const handleLogin = async (email: string, pass: string) => {
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "ত্রুটি", description: "একটি অজানা সমস্যা হয়েছে।", variant: "destructive" });
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

  // Special bypass for master email or phone
  const forceAdminAccess = (phone?: string, pass?: string) => {
    const isMasterEmail = user?.email?.toLowerCase() === "chandanaishdarbarsharif@gmail.com";
    
    // Check if phone and pass match (using a generic logic for now)
    // In a real app, this would check a database
    const isMasterPhone = (phone?.includes("017") || phone?.includes("018")) && pass === "chandanaish"; 
    
    if (isMasterEmail || isMasterPhone) {
      setIsAdmin(true);
      toast({ title: "প্রবেশাধিকার মঞ্জুর", description: "আপনি এখন এডমিন প্যানেল ব্যবহার করতে পারবেন।" });
    } else {
      toast({ title: "অ্যাক্সেস ডিনাইড", description: "আপনার ফোন নম্বর বা পাসওয়ার্ড ভুল।", variant: "destructive" });
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

  useEffect(() => {
    if (isAdmin) {
      fetchNotices();
      fetchSubmissions();
      fetchGallery();
    }
  }, [isAdmin]);

  // Operations
  const addNotice = async (_type: 'scrolling' | 'detailed', title: string, message?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("notices").insert([{ title, message, is_active: true }]);
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
    await supabase.from("notices").delete().eq("id", id);
    fetchNotices();
  };

  const markSubmissionRead = async (id: string) => {
    await supabase.from("submissions").update({ is_read: true }).eq("id", id);
    fetchSubmissions();
  };

  const deleteSubmission = async (id: string) => {
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

  const uploadGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from("gallery").upload(filePath, file);
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

  return (
    <div className="py-20 islamic-pattern min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-gold/20 shadow-2xl">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gold-gradient p-0.5">
               <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center">
                 <span className="text-gold font-heading font-black text-xl">A</span>
               </div>
             </div>
             <div>
               <h1 className="text-2xl font-heading font-bold text-premium-gradient">এডমিন ড্যাশবোর্ড</h1>
               <p className="text-xs text-gold/60 font-medium tracking-wider uppercase">Administrative Control Center</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right mr-2">
               <p className="text-sm font-bold text-cream">{user.email?.split('@')[0]}</p>
               <p className="text-[10px] text-gold/50 uppercase font-black">Logged In</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm shadow-lg shadow-destructive/5"
            >
              লগআউট
            </button>
          </div>
        </div>

        <Tabs defaultValue="notices" className="space-y-8">
          <TabsList className="bg-card/40 backdrop-blur-md border border-gold/20 w-full flex h-auto p-1.5 rounded-2xl shadow-xl">
            <TabsTrigger value="notices" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 py-3 rounded-xl transition-all font-bold">নোটিশ</TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 py-3 rounded-xl transition-all font-bold">আবেদনপত্র</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 py-3 rounded-xl transition-all font-bold">গ্যালারি</TabsTrigger>
            <TabsTrigger value="finance" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground flex-1 py-3 rounded-xl transition-all font-bold">আয়-ব্যয়</TabsTrigger>
          </TabsList>

          <TabsContent value="notices">
            <Suspense fallback={<PremiumLoader />}>
              <NoticeManager 
                notices={notices} 
                loading={loading} 
                onAddNotice={addNotice} 
                onToggleActive={toggleNotice} 
                onDeleteNotice={deleteNotice} 
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="submissions">
            <Suspense fallback={<PremiumLoader />}>
              <SubmissionManager 
                submissions={submissions} 
                onMarkRead={markSubmissionRead} 
                onDelete={deleteSubmission} 
                onReply={submitReply} 
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="gallery">
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
          </TabsContent>

          <TabsContent value="finance">
            <Suspense fallback={<PremiumLoader />}>
              <FinanceManager />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
