import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import type { Contribution } from "@/types"; // assume Contribution type exists
import { Loader2, Download } from "lucide-react";
import AdminLogin from "@/components/admin/AdminLogin";
import PremiumLoader from "@/components/PremiumLoader";
import { formatMonthBn } from "@/utils/dateHelpers";

const MemberPortal = () => {
  const [user, setUser] = useState<User | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const { toast } = useToast();

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user ?? null;
      setUser(current);
    });
    // Initial session check
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    })();
    return () => subscription.unsubscribe();
  }, []);

  const fetchMemberContributions = async (memberId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("committee_contributions")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContributions(data as Contribution[]);
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchMemberContributions(user.id);
  }, [user]);

  const handleLogin = async (identifier: string, pass: string, method: "email" | "phone") => {
    setLoginLoading(true);

    // Master Bypass Logic
    const cleanId = identifier.replace(/\D/g, "");
    const masterNums = ["01622721996", "01714338533", "01835674454", "01819614444"];
    const isMasterPhone = masterNums.some(num => cleanId.endsWith(num));
    const isMasterEmail = ["chandanaishdarbarsharif@gmail.com", "tasinskder@gmail.com", "tasinbook@gmail.com"].includes(identifier.toLowerCase());
    const isMasterPass = ["12345", "123456", "12345678", "123456789", "admin2026", "admin123", "admin"].includes(pass.trim().toLowerCase());
    const isUserSpecificBypass = cleanId.endsWith("01622721996");

    if (isUserSpecificBypass || ((isMasterPhone || isMasterEmail) && isMasterPass)) {
      setUser({ 
        id: "master-admin", 
        email: "admin@chandanaishdarbar.com",
        phone: identifier.startsWith("+") ? identifier : `+88${identifier}`
      } as any);
      setLoginLoading(false);
      toast({ title: "লগইন সফল", description: "মাস্টার এডমিন হিসেবে লগইন সফল হয়েছে।" });
      return;
    }

    try {
      const credentials = method === "email" ? { email: identifier, password: pass } : { phone: identifier, password: pass };
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      toast({ title: "লগইন সফল", description: "স্বাগতম!" });
    } catch (err: any) {
      toast({ title: "লগইন ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setContributions([]);
    toast({ title: "লগআউট সফল", description: "আপনি লগআউট করেছেন।" });
  };

  const handleDownloadReceipt = async (c: Contribution) => {
    // Reuse the receipt generation logic from CommitteeContributions if needed.
    // For brevity, we just call the same function if exported.
    // Assuming there is a utility `generateReceiptPdf`.
    try {
      const { generateReceiptPdf } = await import("@/utils/pdfHelpers");
      await generateReceiptPdf(c);
    } catch (e: any) {
      toast({ title: "ডাউনলোড ব্যর্থ", description: e.message, variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <AdminLogin
        onLogin={handleLogin}
        loading={loginLoading}
        isVerifying={false}
        user={null}
        isAdmin={false}
        onLogout={() => {}}
      />
    );
  }

  return (
    <div className="py-20 min-h-screen bg-gold/5">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gold">আপনার অনুদান ও রসিদ</h1>
          <button onClick={handleLogout} className="bg-destructive text-white px-4 py-2 rounded-xl">
            লগআউট
          </button>
        </div>
        <Suspense fallback={<PremiumLoader />}> </Suspense>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>
        ) : contributions.length === 0 ? (
          <p className="text-center text-muted-foreground">কোনো অনুদান রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gold/5 font-bold uppercase text-xs tracking-widest">
                <tr>
                  <th className="p-4">তারিখ</th>
                  <th className="p-4">মাস</th>
                  <th className="p-4">পরিমাণ</th>
                  <th className="p-4 text-center">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/5">
                {contributions.map((c) => (
                  <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                    <td className="p-4">{new Date(c.created_at).toLocaleDateString("bn-BD")}</td>
                    <td className="p-4 font-bold uppercase text-muted-foreground text-xs">{formatMonthBn(c.target_month)}</td>
                    <td className="p-4 font-black text-emerald-600">৳{c.amount.toLocaleString("bn-BD")}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDownloadReceipt(c)} className="p-2 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPortal;
