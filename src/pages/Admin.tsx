import React, { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import PremiumLoader from "@/components/PremiumLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImage } from "@/utils/imageCompression";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSection from "@/components/admin/AdminSection";
import type { Tables } from "@/integrations/supabase/types";


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
  const [authLoading, setAuthLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);



  const [notices, setNotices] = useState<Tables<"notices">[]>([]);
  const [submissions, setSubmissions] = useState<Tables<"submissions">[]>([]);
  const [gallery, setGallery] = useState<Tables<"gallery">[]>([]);
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
      const credentials = method === "email" 
        ? { email: identifier, password: pass }
        : { phone: identifier, password: pass };
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (!error && data?.user) {
        toast({ title: "প্রবেশাধিকার মঞ্জুর", description: "লগইন সফল হয়েছে।" });
        return;
      }

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

  return (
    <div className="py-12 md:py-20 islamic-pattern min-h-screen">
      <div className="container mx-auto px-4 max-w-[1400px] space-y-8">
        <div className="relative bg-card/60 backdrop-blur-xl rounded-2xl border border-gold/20 p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gold to-amber-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
              <div className="w-16 h-16 rounded-full overflow-hidden bg-background relative border-2 border-gold/40 flex items-center justify-center">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=tasinskder"
                  alt="Admin avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
            </div>
            
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-2 mb-1 justify-center sm:justify-start">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream">
                  স্বাগতম, {user?.email?.split('@')[0] ?? 'Admin'}
                </h2>
                <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-[10px] font-bold text-gold">
                  🛡️ সুপার এডমিন
                </span>
              </div>
              <p className="text-sm text-gold/60 font-medium">চন্দনাইশ দরবার শরীফ ড্যাশবোর্ড প্যানেল</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold-gradient hover:text-primary-foreground px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm shadow-md"
            >
              🔄 রিফ্রেশ
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm shadow-md"
            >
              🚪 লগআউট
            </button>
          </div>
        </div>

        <Tabs defaultValue="notices" className="space-y-8">
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <TabsList className="bg-card/40 backdrop-blur-md border border-gold/20 w-max min-w-full flex h-auto p-1.5 rounded-2xl shadow-xl">
              <TabsTrigger value="notices" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">নোটিশ</TabsTrigger>
              <TabsTrigger value="donations" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-32 px-4 py-3 rounded-xl transition-all font-bold">হাদিয়া ও নজরানা</TabsTrigger>
              <TabsTrigger value="submissions" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-28 px-4 py-3 rounded-xl transition-all font-bold">প্রশ্ন ও অভিযোগ</TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">গ্যালারি</TabsTrigger>
              <TabsTrigger value="finance" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-28 px-4 py-3 rounded-xl transition-all font-bold">আয়-ব্যয়</TabsTrigger>
              <TabsTrigger value="committee" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">কমিটি</TabsTrigger>
              <TabsTrigger value="voting" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">ভোটিং</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-24 px-4 py-3 rounded-xl transition-all font-bold">সেটিংস</TabsTrigger>
              <TabsTrigger value="broadcast" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground min-w-32 px-4 py-3 rounded-xl transition-all font-bold text-premium-gold shadow-lg shadow-gold/10 ml-2">বার্তা পাঠান 📢</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notices">
          <AdminSection title="নোটিশ">
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
          <AdminSection title="দান">
            <Suspense fallback={<PremiumLoader />}>
              <DonationManager />
            </Suspense>
          </AdminSection>
        </TabsContent>

          <TabsContent value="submissions">
          <AdminSection title="প্রশ্ন ও অভিযোগ">
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
          <AdminSection title="গ্যালারি">
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
          <AdminSection title="কমিটি">
            <Suspense fallback={<PremiumLoader />}>
              <CommitteeManager />
            </Suspense>
          </AdminSection>
        </TabsContent>

        <TabsContent value="finance">
          <AdminSection title="আয়-ব্যয়">
            <Suspense fallback={<PremiumLoader />}>
              <FinanceManager />
            </Suspense>
          </AdminSection>
        </TabsContent>

        <TabsContent value="voting">
          <AdminSection title="ভোটিং">
            <Suspense fallback={<PremiumLoader />}>
              <VoteTopicManager />
            </Suspense>
          </AdminSection>
        </TabsContent>

        <TabsContent value="broadcast">
          <AdminSection title="বার্তা পাঠান">
            <Suspense fallback={<PremiumLoader />}>
              <CommitteeBroadcast />
            </Suspense>
          </AdminSection>
        </TabsContent>

        <TabsContent value="settings">
          <AdminSection title="সেটিংস">
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
