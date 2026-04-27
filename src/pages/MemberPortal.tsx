import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, AlertCircle, CheckCircle, Wallet, Loader2 } from "lucide-react";
import PremiumLoader from "@/components/PremiumLoader";
import { calculateDues, downloadAnnualStatementPDF, type MemberLite, type PaymentLite } from "@/lib/statement";
import SEO from "@/components/SEO";
import { formatMonthBn } from "@/utils/dateHelpers";

const MemberPortal = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<MemberLite | null>(null);
  const [payments, setPayments] = useState<PaymentLite[]>([]);
  const [duesData, setDuesData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setMember(null);
    setPayments([]);
    
    try {
      // Fetch all active members to do a flexible match
      const { data: members, error: mError } = await supabase
        .from("committee_members")
        .select("*")
        .eq("is_active", true);
        
      if (mError) throw mError;
      
      const query = searchQuery.trim().toLowerCase();
      // Match by ID prefix, phone, or name
      const found = members?.find(m => 
        m.id.toLowerCase().startsWith(query) || 
        m.phone === query || 
        m.name.toLowerCase() === query
      );
      
      if (!found) {
        toast({ title: "সদস্য পাওয়া যায়নি", description: "সঠিক সদস্য কোড বা ফোন নম্বর দিন।", variant: "destructive" });
        setLoading(false);
        return;
      }
      
      const memberLite: MemberLite = {
        id: found.id,
        name: found.name,
        phone: found.phone || undefined,
        area: found.area || undefined,
        monthly_due: found.monthly_due ?? 100
      };
      
      setMember(memberLite);
      
      // Fetch contributions mapped by name
      const { data: contribs, error: cError } = await supabase
        .from("committee_contributions")
        .select("*")
        .eq("name", found.name)
        .order("created_at", { ascending: false });
        
      if (cError) throw cError;
      
      const mappedPayments: PaymentLite[] = (contribs || []).map(c => ({
        id: c.id,
        name: c.name,
        amount: c.amount || 0,
        target_month: c.target_month || "",
        payment_method: c.payment_method || "",
        transaction_id: c.transaction_id || "",
        created_at: c.created_at
      }));
      
      setPayments(mappedPayments);
      
      // Compute dues
      const dues = calculateDues(memberLite, mappedPayments);
      setDuesData(dues);
      
      toast({ title: "সদস্য তথ্য লোড হয়েছে", description: `${found.name} এর তথ্য সফলভাবে পাওয়া গেছে।` });
    } catch (err: unknown) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAnnual = () => {
    if (!member) return;
    downloadAnnualStatementPDF(member, payments, selectedYear);
  };

  return (
    <>
      <SEO title="সদস্য পোর্টাল - চন্দনাইশ দরবার শরীফ" description="চাঁদার পূর্ণ বিবরণী দেখুন" />
      <div className="py-20 min-h-screen bg-gold/5">
        <div className="container mx-auto px-4 max-w-4xl">
          
          <div className="text-center mb-10">
            <h1 className="text-xl md:text-2xl font-bold text-gold/80">আপনার সদস্য কোড লিখে চাঁদার পূর্ণ বিবরণী দেখুন — <span className="text-gold">login প্রয়োজন নেই</span></h1>
          </div>

          <form onSubmit={handleSearch} className="bg-card border border-gold/10 p-6 md:p-8 rounded-2xl mb-8 shadow-xl">
            <p className="text-muted-foreground mb-4 text-sm font-medium">সদস্য কোড দিন (যেমন: M-001 / CDS-001 / ফোন নম্বর)</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-background border border-gold/20 rounded-xl px-5 py-3.5 text-foreground focus:outline-none focus:border-gold/50 transition-colors" 
                placeholder="M-001" 
                required
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-gold text-black font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gold/90 transition-colors disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} 
                খুঁজুন
              </button>
            </div>
          </form>

          {loading && !member && (
            <div className="flex justify-center py-20"><PremiumLoader /></div>
          )}

          {member && duesData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Member Header */}
              <div className="bg-card border border-gold/10 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
                <div>
                  <p className="text-gold text-sm font-bold tracking-widest mb-1">{member.id.slice(0, 8).toUpperCase()}</p>
                  <h2 className="text-3xl font-bold text-foreground mb-2">{member.name}</h2>
                  <p className="text-muted-foreground text-sm flex flex-wrap gap-2">
                    <span>যোগদান: ২০২৬-০১-০১</span> 
                    <span className="text-gold/30">•</span> 
                    <span>মাসিক ৳ {(member.monthly_due || 0).toLocaleString("bn-BD")}</span>
                  </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-background border border-gold/20 text-foreground px-4 py-2.5 rounded-xl outline-none focus:border-gold/50"
                  >
                    {[...Array(5)].map((_, i) => {
                      const yr = new Date().getFullYear() - i;
                      return <option key={yr} value={yr}>{yr.toLocaleString("bn-BD", {useGrouping: false})}</option>;
                    })}
                  </select>
                  <button 
                    onClick={handleDownloadAnnual}
                    className="bg-gold text-black font-bold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gold/90 transition-all flex-1 md:flex-none"
                  >
                    <Download size={16} /> বার্ষিক PDF
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-gold/10 p-6 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group hover:border-gold/30 transition-colors">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-gold/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                  <Wallet className="text-gold/70" size={24} />
                  <p className="text-muted-foreground text-sm font-medium mt-2">মোট জমা</p>
                  <h3 className="text-3xl font-bold text-gold">৳ {duesData.totalPaid.toLocaleString("bn-BD")}</h3>
                </div>
                
                <div className="bg-card border border-red-500/10 p-6 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group hover:border-red-500/30 transition-colors">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                  <AlertCircle className="text-red-500/70" size={24} />
                  <p className="text-muted-foreground text-sm font-medium mt-2">বকেয়া</p>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-3xl font-bold text-red-500">৳ {duesData.dues.toLocaleString("bn-BD")}</h3>
                    <p className="text-xs text-red-500/60 font-medium">{duesData.dueMonths.toLocaleString("bn-BD")} মাস বাকি</p>
                  </div>
                </div>
                
                <div className="bg-card border border-emerald-500/10 p-6 rounded-2xl shadow-xl flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                  <CheckCircle className="text-emerald-500/70" size={24} />
                  <p className="text-muted-foreground text-sm font-medium mt-2">প্রত্যাশিত মোট</p>
                  <h3 className="text-3xl font-bold text-emerald-500">৳ {duesData.totalExpected.toLocaleString("bn-BD")}</h3>
                </div>
              </div>

              {/* Monthly Statement Table */}
              <div className="bg-card border border-gold/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gold/10">
                  <h3 className="text-lg font-bold text-gold">মাসিক বিবরণী (যোগদানের পর থেকে)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gold/5 text-muted-foreground">
                      <tr>
                        <th className="p-5 font-medium w-1/3">মাস / বছর</th>
                        <th className="p-5 font-medium w-1/3">প্রত্যাশিত</th>
                        <th className="p-5 font-medium w-1/3 text-right">পরিশোধিত অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/5">
                      {[...duesData.rows].reverse().filter(r => r.year === selectedYear).map((row: { year: number, month: number, isPaid: boolean, isAdvance: boolean, expected: number }, i) => {
                        const monthName = new Date(2000, row.month - 1).toLocaleDateString("bn-BD", { month: "long" });
                        const isPaid = row.status === 'paid';
                        const isPartial = row.status === 'partial';
                        const isDue = row.status === 'due';
                        
                        return (
                          <tr key={i} className="hover:bg-gold/5 transition-colors">
                            <td className="p-5 font-bold text-foreground">{monthName} {row.year.toLocaleString("bn-BD", {useGrouping: false})}</td>
                            <td className="p-5 text-muted-foreground">৳ {row.expected.toLocaleString("bn-BD")}</td>
                            <td className="p-5 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <span className={`font-bold ${isPaid ? 'text-gold' : isPartial ? 'text-orange-400' : 'text-red-500'}`}>
                                  ৳ {row.paid.toLocaleString("bn-BD")}
                                </span>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                  isPaid ? 'bg-gold/10 text-gold border border-gold/20' : 
                                  isPartial ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                                  'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                  {isPaid ? 'পরিশোধিত' : isPartial ? 'আংশিক' : 'বকেয়া'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {duesData.rows.filter((r:any) => r.year === selectedYear).length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-muted-foreground">এই বছরের কোনো রেকর্ড পাওয়া যায়নি।</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default MemberPortal;
