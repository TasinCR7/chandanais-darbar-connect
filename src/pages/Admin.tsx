import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PremiumLoader from "@/components/PremiumLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Modular Components
import AdminLogin from "@/components/admin/AdminLogin";
import NoticeManager from "@/components/admin/NoticeManager";
import GalleryManager from "@/components/admin/GalleryManager";
import SubmissionManager from "@/components/admin/SubmissionManager";

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [notices, setNotices] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryCategory, setGalleryCategory] = useState("দরবার শরীফ");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const mountedRef = useRef(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    const syncAuth = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          console.log("Checking admin for:", currentUser.email);
          const { data, error } = await supabase.rpc("has_role", {
            _user_id: currentUser.id,
            _role: "admin",
          });
          // Master email bypass - robust case insensitive
          const isMaster = currentUser.email?.toLowerCase() === "chandanaishdarbarsharif@gmail.com".toLowerCase();
          console.log("Admin check result:", { data, error, isMaster });
          if (mountedRef.current) setIsAdmin((!!data && !error) || isMaster);
        } else {
          if (mountedRef.current) setIsAdmin(false);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
      } finally {
        if (mountedRef.current) setAuthLoading(false);
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          const { data } = await supabase.rpc("has_role", {
            _user_id: currentUser.id,
            _role: "admin",
          });
          const isMaster = currentUser.email?.toLowerCase() === "chandanaishdarbarsharif@gmail.com".toLowerCase();
          if (mountedRef.current) {
            setIsAdmin(!!data || isMaster);
            setAuthLoading(false);
          }
        } else {
          if (mountedRef.current) {
            setIsAdmin(false);
            setAuthLoading(false);
          }
        }
      }
    );

    return () => {
      mountedRef.current = false;
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
      if (mountedRef.current) setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
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
  const addNotice = async (type: 'scrolling' | 'detailed', title: string, message?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("notices").insert([{ title, message, type, is_active: true }]);
      if (!error) {
        toast({ title: "সফল", description: "নোটিশটি যোগ করা হয়েছে।" });
        fetchNotices();
      }
    } finally {
      if (mountedRef.current) setLoading(false);
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
      if (mountedRef.current) setUploading(false);
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

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 islamic-pattern">
        <PremiumLoader />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <AdminLogin 
        onLogin={handleLogin}
        loading={loginLoading}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onForceAccess={forceAdminAccess}
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
          </TabsList>

          <TabsContent value="notices">
             <NoticeManager 
                notices={notices} 
                loading={loading} 
                onAddNotice={addNotice} 
                onToggleActive={toggleNotice} 
                onDeleteNotice={deleteNotice} 
             />
          </TabsContent>

          <TabsContent value="submissions">
             <SubmissionManager 
                submissions={submissions} 
                onMarkRead={markSubmissionRead} 
                onDelete={deleteSubmission} 
                onReply={submitReply} 
             />
          </TabsContent>

          <TabsContent value="gallery">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
