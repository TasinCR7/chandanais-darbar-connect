import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PremiumLoader from "@/components/PremiumLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImage } from "@/utils/imageCompression";


// Lazy-loaded admin sub-modules
import AdminLogin from "@/components/admin/AdminLogin";
const NoticeManager = lazy(() => import("@/components/admin/NoticeManager"));
const GalleryManager = lazy(() => import("@/components/admin/GalleryManager"));
const SubmissionManager = lazy(() => import("@/components/admin/SubmissionManager"));
const CommitteeManager = lazy(() => import("@/components/admin/CommitteeManager"));
const VoteTopicManager = lazy(() => import("@/components/admin/VoteTopicManager"));
const DonationManager = lazy(() => import("@/components/admin/DonationManager"));
const CommitteeBroadcast = lazy(() => import("@/components/admin/CommitteeBroadcast"));
const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const isMasterSessionRef = useRef(false);


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notices, setNotices] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissions, setSubmissions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const isMasterEmail = [
        "chandanaishdarbarsharif@gmail.com",
        "tasinskder@gmail.com",
        "tasinbook@gmail.com"
      ].some(email => currentUser.email?.toLowerCase() === email.toLowerCase());
      
      const isMasterPhone = [
        "+8801714338533", // User's phone number
        "+8801819614444", // Placeholder for other admin phone
        "+8801835674454", // New admin phone number
        "+8801622721996"  // Added new admin phone
      ].some(phone => currentUser.phone === phone);

      if (isMasterEmail || isMasterPhone) return true;

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
        } else if (!isMasterSessionRef.current) {
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
    
    // Master Bypass Logic for designated Admin users
    const cleanId = identifier.replace(/\D/g, "");
    const masterNums = ["01622721996", "01714338533"]; // Designated master numbers
    const isMasterPhone = masterNums.some(num => cleanId.endsWith(num));
    const isMasterEmail = ["chandanaishdarbarsharif@gmail.com", "tasinskder@gmail.com"].includes(identifier.toLowerCase());
    
    // Only allow master bypass with a specific secure key or via standard auth
    // Note: In production, hardcoded passwords should be replaced by proper vault/env checks
    const isMasterPass = pass.trim() === "Admin2026@Darbar"; 
    
    if ((isMasterPhone || isMasterEmail) && isMasterPass) {
      isMasterSessionRef.current = true;
      setIsAdmin(true);
      setUser({ 
        id: "master-admin", 
        email: identifier.includes("@") ? identifier : "admin@chandanaishdarbar.com",
        phone: isMasterPhone ? (identifier.startsWith("+") ? identifier : `+88${identifier}`) : ""
      } as any);
      setLoginLoading(false);
      toast({ title: "প্রবেশাধিকার মঞ্জুর", description: "মাস্টার এডমিন হিসেবে লগইন সফল হয়েছে।" });
      return;
    }

    try {
      const credentials = method === "email" 
        ? { email: identifier, password: pass }
        : { phone: identifier, password: pass };
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "ত্রুটি", description: "একটি অজানা সমস্যা হয়েছে।", variant: "destructive" });
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
      isMasterSessionRef.current = false;
      setVerifying(false);
      toast({ title: "লগআউট সফল", description: "আপনি সফলভাবে লগআউট করেছেন।" });
    }
  };

  // Special bypass for master email or phone
  const forceAdminAccess = (phone?: string, pass?: string) => {
    const isMasterEmail = [
      "chandanaishdarbarsharif@gmail.com",
      "tasinskder@gmail.com"
    ].some(email => user?.email?.toLowerCase() === email.toLowerCase());
    
    // Check if phone and pass match (using a generic logic for now)
    // In a real app, this would check a database
    const isMasterPhone = [
      "+8801714338533",
      "01714338533",
      "8801714338533",
      "+8801835674454",
      "01835674454",
      "8801835674454",
      "+8801622721996",
      "01622721996"
    ].some(p => phone?.includes(p)) && (pass === "Admin2026" || pass === "12345"); 
    
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
    const rawFile = e.target.files[0];

    setUploading(true);
    try {
      const compressedFile = await compressImage(rawFile);
      const fileExt = compressedFile.name.split(".").pop() || "webp";
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

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
      <div className="container mx-auto px-4 max-w-[1400px]">
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
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <TabsList className="bg-card/40 backdrop-blur-md border border-gold/20 w-max min-w-full flex h-auto p-1.5 rounded-2xl shadow-xl">
              <TabsTrigger value="notices" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">নোটিশ</TabsTrigger>
              <TabsTrigger value="donations" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-32 px-4 py-3 rounded-xl transition-all font-bold">হাদিয়া ও নজরানা</TabsTrigger>
              <TabsTrigger value="submissions" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-28 px-4 py-3 rounded-xl transition-all font-bold">আবেদনপত্র</TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">গ্যালারি</TabsTrigger>
              <TabsTrigger value="committee" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">কমিটি</TabsTrigger>
              <TabsTrigger value="voting" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">ভোটিং</TabsTrigger>
              <TabsTrigger value="broadcast" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-32 px-4 py-3 rounded-xl transition-all font-bold text-premium-gold shadow-lg shadow-gold/10 ml-2">বার্তা পাঠান 📢</TabsTrigger>
            </TabsList>
          </div>

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

          <TabsContent value="donations">
            <Suspense fallback={<PremiumLoader />}>
              <DonationManager />
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


          <TabsContent value="committee">
            <Suspense fallback={<PremiumLoader />}>
              <CommitteeManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="voting">
            <Suspense fallback={<PremiumLoader />}>
              <VoteTopicManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="broadcast">
            <Suspense fallback={<PremiumLoader />}>
              <CommitteeBroadcast />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
