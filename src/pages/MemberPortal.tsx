import React, { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, AlertCircle, CheckCircle, Wallet, Loader2, LogIn, CreditCard, Send, LogOut, Users } from "lucide-react";
import PremiumLoader from "@/components/PremiumLoader";
import { calculateDues, downloadAnnualStatementPDF, type MemberLite, type PaymentLite } from "@/lib/statement";
import SEO from "@/components/SEO";
import { toBanglaNumber } from "@/lib/bangla";
import { monthName, BANGLA_MONTHS } from "@/lib/months";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Member, Payment } from "@/types/finance";

const MemberPortal = () => {
  const [authQuery, setAuthQuery] = useState({ code: "", phone: "" });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentBusy, setPaymentBusy] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = authQuery.phone.trim();
    if (!phone) {
      toast({ title: "তথ্য দিন", description: "আপনার ফোন নম্বর প্রদান করুন।", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('search_member', { 
          p_phone: phone, 
          p_code: authQuery.code.trim() ? authQuery.code.trim().toUpperCase() : null 
        })
        .maybeSingle();
        
      if (error) throw error;
      if (!data) {
        toast({ title: "তথ্য পাওয়া যায়নি", description: "এই ফোন নম্বরে কোনো সদস্য নিবন্ধিত নেই।", variant: "destructive" });
        setLoading(false);
        return;
      }

      setMember(data);
      const { data: pData } = await supabase
        .rpc('get_member_payments', { p_member_id: data.id });
      
      setPayments(pData || []);
      setIsLoggedIn(true);
      toast({ title: "স্বাগতম", description: `${data.full_name}, আপনার পোর্টালে স্বাগতম।` });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setMember(null);
    setPayments([]);
    setAuthQuery({ code: "", phone: "" });
  };

  const duesData = useMemo(() => {
    if (!member) return null;
    const liteMember: MemberLite = {
      member_code: member.member_code,
      full_name: member.full_name,
      phone: member.phone,
      joined_date: member.joined_date,
      monthly_rate: Number(member.monthly_rate)
    };
    const litePayments: PaymentLite[] = payments
      .filter(p => p.status === 'approved' || !p.status)
      .map(p => ({
        amount: Number(p.amount),
        for_year: p.for_year,
        for_month: p.for_month,
        payment_date: p.payment_date,
        method: p.method,
        transaction_ref: p.transaction_ref
      }));
    return calculateDues(liteMember, litePayments);
  }, [member, payments]);

  const handleSubmitPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!member) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const month = Number(fd.get("for_month"));
    const method = fd.get("method") as string;
    const ref = fd.get("transaction_ref") as string;

    if (!amount || amount <= 0) return;

    setPaymentBusy(true);
    try {
      const { error } = await supabase.rpc('submit_member_payment', {
        p_member_id: member.id,
        p_amount: amount,
        p_for_month: month,
        p_for_year: new Date().getFullYear(),
        p_method: method,
        p_transaction_ref: ref,
        p_note: 'সদস্য নিজে এন্ট্রি করেছেন (Online)'
      });

      if (error) throw error;
      toast({ title: "পেমেন্ট জমা হয়েছে", description: "অ্যাডমিন অনুমোদনের পর এটি আপনার স্টেটমেন্টে যোগ হবে।" });
      e.currentTarget.reset();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setPaymentBusy(false);
    }
  };

  if (loading && !isLoggedIn) return <div className="min-h-screen flex items-center justify-center"><PremiumLoader /></div>;

  return (
    <div className="min-h-screen bg-background pb-20 font-bengali">
      <SEO title="সদস্য পোর্টাল - চন্দনাইশ দরবার শরীফ" description="চাঁদার বিবরণী ও অনলাইন পেমেন্ট" />
      
      {!isLoggedIn ? (
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="card-gold p-5 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl border border-primary/20">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-premium-gradient">সদস্য পোর্টাল লগইন</h1>
              <p className="text-sm text-muted-foreground mt-2">আপনার প্রোফাইল দেখতে তথ্য দিন</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ফোন নম্বর *</Label>
                <Input 
                  type="tel"
                  placeholder="যেমন: ০১৭..." 
                  value={authQuery.phone}
                  onChange={(e) => setAuthQuery({...authQuery, phone: e.target.value})}
                  className="h-12 bg-background/50 border-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">সদস্য কোড (ঐচ্ছিক)</Label>
                <Input 
                  placeholder="যেমন: CDS-001" 
                  value={authQuery.code}
                  onChange={(e) => setAuthQuery({...authQuery, code: e.target.value.toUpperCase()})}
                  className="h-12 bg-background/50 border-primary/20 focus:border-primary font-mono"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
                লগইন করুন
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 pt-10 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-heading font-bold gold-text">আমার ড্যাশবোর্ড</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" /> লগআউট
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Member Info & Stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card-gold p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Users size={120} />
                </div>
                <div className="relative z-10">
                  <p className="text-primary font-mono text-sm tracking-widest">{member.member_code}</p>
                  <h2 className="text-3xl font-heading font-bold gold-text mt-1">{member.full_name}</h2>
                  <div className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><CreditCard size={16} /></div>
                      <span>মাসিক চাঁদা: ৳ {toBanglaNumber(member.monthly_rate)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Search size={16} /></div>
                      <span>এলাকা: {member.area || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {duesData && (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="card-gold p-5 rounded-2xl border-emerald-500/10">
                    <p className="text-xs text-muted-foreground font-bangla">মোট জমা</p>
                    <p className="text-2xl font-display text-emerald-600 mt-1">৳ {toBanglaNumber(duesData.totalPaid.toFixed(0))}</p>
                  </div>
                  <div className="card-gold p-5 rounded-2xl border-rose-500/10">
                    <p className="text-xs text-muted-foreground font-bangla">মোট বকেয়া</p>
                    <p className="text-2xl font-display text-rose-600 mt-1">৳ {toBanglaNumber(duesData.dues.toFixed(0))}</p>
                    <p className="text-[10px] text-rose-500/60 font-bangla mt-1">{toBanglaNumber(duesData.dueMonths)} মাস বাকি</p>
                  </div>
                  <div className="card-gold p-5 rounded-2xl border-primary/10">
                    <p className="text-xs text-muted-foreground font-bangla">প্রত্যাশিত মোট</p>
                    <p className="text-2xl font-display gold-text mt-1">৳ {toBanglaNumber(duesData.totalExpected.toFixed(0))}</p>
                  </div>
                </div>
              )}

              {/* Monthly Grid */}
              <div className="card-gold p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg gold-text">মাসিক বিবরণী</h3>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-32 h-9 bg-background/50 border-primary/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={String(new Date().getFullYear() - i)}>
                          {toBanglaNumber(new Date().getFullYear() - i)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BANGLA_MONTHS.map((name, i) => {
                    const row = duesData?.rows.find(r => r.year === selectedYear && r.month === i + 1);
                    const isPaid = row?.status === 'paid';
                    const isPartial = row?.status === 'partial';
                    return (
                      <div key={i} className={`p-3 rounded-xl border text-center transition-all ${
                        isPaid ? 'bg-emerald-500/10 border-emerald-500/30' : 
                        isPartial ? 'bg-amber-500/10 border-amber-500/30' : 
                        'bg-muted/30 border-border/50 opacity-60'
                      }`}>
                        <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">{name}</p>
                        <p className={`text-sm font-bold mt-1 ${isPaid ? 'text-emerald-600' : isPartial ? 'text-amber-600' : ''}`}>
                          {row ? `৳ ${toBanglaNumber(row.paid)}` : '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-gold text-primary-foreground font-bold"
                    onClick={() => downloadAnnualStatementPDF({
                      member_code: member.member_code,
                      full_name: member.full_name,
                      phone: member.phone,
                      joined_date: member.joined_date,
                      monthly_rate: member.monthly_rate
                    }, payments, selectedYear)}
                  >
                    <Download className="h-4 w-4 mr-2" /> বার্ষিক PDF রিপোর্ট
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Pay Online */}
            <div className="space-y-6">
              <div className="card-gold p-6 rounded-3xl bg-primary/5 border-primary/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary">অনলাইন পেমেন্ট</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">Submit Monthly Contribution</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitPayment} className="space-y-4 font-bangla">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">মাস নির্বাচন করুন</Label>
                    <Select name="for_month" defaultValue={String(new Date().getMonth() + 1)} required>
                      <SelectTrigger className="bg-background/50 border-primary/20 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BANGLA_MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m} {toBanglaNumber(new Date().getFullYear())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">টাকার পরিমাণ (৳)</Label>
                    <Input name="amount" type="number" defaultValue={member.monthly_rate} required className="bg-background/50 border-primary/20 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">পেমেন্ট মাধ্যম</Label>
                    <Select name="method" defaultValue="bkash" required>
                      <SelectTrigger className="bg-background/50 border-primary/20 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">বিকাশ (bKash)</SelectItem>
                        <SelectItem value="nagad">নগদ (Nagad)</SelectItem>
                        <SelectItem value="rocket">রকেট (Rocket)</SelectItem>
                        <SelectItem value="bank">ব্যাংক ট্রান্সফার</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">TrxID / রেফারেন্স</Label>
                    <Input name="transaction_ref" placeholder="যেমন: AX782S..." className="bg-background/50 border-primary/20 h-10" />
                  </div>

                  <div className="pt-2">
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 text-[10px] text-primary/80 leading-relaxed italic">
                      চাঁদা পাঠানোর পর আপনার ট্রানজেকশন আইডি দিয়ে এখানে সাবমিট করুন। অ্যাডমিন ভেরিফাই করে অ্যাপ্রুভ করলে আপনার হিসেবে যোগ হবে।
                    </div>
                    <Button disabled={paymentBusy} className="w-full bg-gradient-gold text-primary-foreground font-bold h-12 shadow-lg shadow-primary/10">
                      {paymentBusy ? <Loader2 className="animate-spin h-5 w-5" /> : 'চাঁদা সাবমিট করুন'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Pending Approvals */}
              {payments.some(p => p.status === 'pending') && (
                <div className="card-gold p-5 rounded-2xl border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-amber-600 uppercase">Pending Approvals</h4>
                  </div>
                  <div className="space-y-2">
                    {payments.filter(p => p.status === 'pending').slice(0, 3).map(p => (
                      <div key={p.id} className="flex justify-between items-center text-[11px] border-b border-amber-500/10 pb-2 last:border-0">
                        <span className="font-bangla">{monthName(p.for_month)} {toBanglaNumber(p.for_year)}</span>
                        <span className="font-bold">৳ {toBanglaNumber(p.amount)}</span>
                        <span className="text-amber-600 italic">অপেক্ষমাণ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPortal;
