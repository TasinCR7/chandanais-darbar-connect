import React, { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, AlertCircle, CheckCircle, Wallet, Loader2, LogIn, CreditCard, Send, LogOut, Users, FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import PremiumLoader from "@/components/PremiumLoader";
import { calculateDues, downloadContributionStatementPDF, downloadAnnualStatementPDF, type MemberLite, type PaymentLite } from "@/lib/statement";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Member, Payment } from "@/types/finance";

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
      toast({ title: "Missing Information", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase.from("members").select("*").eq("phone", phone);
      if (authQuery.code.trim()) {
        query = query.eq("member_code", authQuery.code.trim().toUpperCase());
      }

      const { data, error } = await query.maybeSingle();
        
      if (error) throw error;
      if (!data) {
        toast({ title: "Member Not Found", description: "No member registered with this phone number.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setMember(data);
      const { data: pData } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", data.id)
        .order("payment_date", { ascending: false });
      
      setPayments(pData || []);
      setIsLoggedIn(true);
      toast({ title: "Welcome", description: `${data.full_name}, welcome to your portal.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      monthly_rate: Number(member.monthly_rate),
      area: member.area,
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

  const recentTransactions = useMemo(() => {
    return payments
      .filter(p => p.status === 'approved' || !p.status)
      .slice(0, 8);
  }, [payments]);

  const handleDownloadStatement = async (reportType: 'monthly' | 'yearly') => {
    if (!member || !duesData) return;
    const liteMember: MemberLite = {
      member_code: member.member_code,
      full_name: member.full_name,
      phone: member.phone,
      joined_date: member.joined_date,
      monthly_rate: Number(member.monthly_rate),
      area: member.area,
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
    await downloadContributionStatementPDF(liteMember, litePayments, {
      year: selectedYear,
      reportType,
      month: new Date().getMonth() + 1,
    });
    toast({ title: "Statement Downloaded", description: `Your ${reportType} contribution statement has been downloaded.` });
  };

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
      const { error } = await supabase.from("payments").insert({
        member_id: member.id,
        amount,
        for_month: month,
        for_year: new Date().getFullYear(),
        method,
        transaction_ref: ref,
        status: 'pending',
        note: 'Submitted by member (Online)'
      } as any);

      if (error) throw error;
      toast({ title: "Payment Submitted", description: "Your payment will be added to your statement after admin approval." });
      e.currentTarget.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPaymentBusy(false);
    }
  };

  if (loading && !isLoggedIn) return <div className="min-h-screen flex items-center justify-center"><PremiumLoader /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Member Portal — Chandanaish Darbar Sharif" description="View your contribution history, download statements, and submit payments online." />
      
      {!isLoggedIn ? (
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="card-gold p-8 rounded-3xl w-full max-w-md shadow-2xl border border-primary/20">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-heading font-bold text-premium-gradient">Member Portal Login</h1>
              <p className="text-sm text-muted-foreground mt-2">Enter your details to access your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                <Input 
                  type="tel"
                  placeholder="e.g. 017..." 
                  value={authQuery.phone}
                  onChange={(e) => setAuthQuery({...authQuery, phone: e.target.value})}
                  className="h-12 bg-background/50 border-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member Code (Optional)</Label>
                <Input 
                  placeholder="e.g. CDS-001" 
                  value={authQuery.code}
                  onChange={(e) => setAuthQuery({...authQuery, code: e.target.value.toUpperCase()})}
                  className="h-12 bg-background/50 border-primary/20 focus:border-primary font-mono"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-gradient-gold text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
                Login
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 pt-10 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-heading font-bold gold-text">My Dashboard</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" /> Logout
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
                  <p className="text-primary font-mono text-sm tracking-widest">{member!.member_code}</p>
                  <h2 className="text-3xl font-heading font-bold gold-text mt-1">{member!.full_name}</h2>
                  <div className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><CreditCard size={16} /></div>
                      <span>Monthly Rate: BDT {Number(member!.monthly_rate).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Search size={16} /></div>
                      <span>Area: {member!.area || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {duesData && (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="card-gold p-5 rounded-2xl border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-emerald-600" /><p className="text-xs text-muted-foreground">Total Paid</p></div>
                    <p className="text-2xl font-display text-emerald-600">BDT {duesData.totalPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="card-gold p-5 rounded-2xl border-rose-500/10">
                    <div className="flex items-center gap-2 mb-2"><TrendingDown className="h-4 w-4 text-rose-600" /><p className="text-xs text-muted-foreground">Total Due</p></div>
                    <p className="text-2xl font-display text-rose-600">BDT {duesData.dues.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-rose-500/60 mt-1">{duesData.dueMonths} month(s) outstanding</p>
                  </div>
                  <div className="card-gold p-5 rounded-2xl border-primary/10">
                    <div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Total Expected</p></div>
                    <p className="text-2xl font-display gold-text">BDT {duesData.totalExpected.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              )}

              {/* Monthly Status Grid */}
              <div className="card-gold p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg gold-text flex items-center gap-2"><Calendar className="h-5 w-5" /> Monthly Status</h3>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-32 h-9 bg-background/50 border-primary/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={String(new Date().getFullYear() - i)}>
                          {new Date().getFullYear() - i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MONTHS_EN.map((name, i) => {
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
                          {row ? `BDT ${Number(row.paid).toLocaleString('en-IN')}` : '—'}
                        </p>
                        <p className={`text-[9px] mt-0.5 font-semibold ${isPaid ? 'text-emerald-500' : isPartial ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {isPaid ? 'Paid' : isPartial ? 'Partial' : row ? 'Due' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 bg-gradient-gold text-primary-foreground font-bold"
                    onClick={() => handleDownloadStatement('yearly')}
                  >
                    <Download className="h-4 w-4 mr-2" /> Yearly Statement PDF
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10 font-bold"
                    onClick={() => handleDownloadStatement('monthly')}
                  >
                    <FileText className="h-4 w-4 mr-2" /> Monthly Statement PDF
                  </Button>
                </div>
              </div>

              {/* Recent Transactions */}
              {recentTransactions.length > 0 && (
                <div className="card-gold p-6 rounded-3xl">
                  <h3 className="font-display text-lg gold-text mb-4 flex items-center gap-2"><FileText className="h-5 w-5" /> Recent Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary/20 text-left text-muted-foreground text-xs">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Month</th>
                          <th className="py-2 pr-3 text-right">Amount</th>
                          <th className="py-2 pr-3">Method</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((p, idx) => (
                          <tr key={p.id || idx} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                            <td className="py-2.5 pr-3 text-muted-foreground text-xs">{p.payment_date}</td>
                            <td className="py-2.5 pr-3 font-medium">{MONTHS_EN[p.for_month - 1]} {p.for_year}</td>
                            <td className="py-2.5 pr-3 text-right font-bold text-primary">BDT {Number(p.amount).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 pr-3 capitalize text-xs">{p.method}</td>
                            <td className="py-2.5">
                              <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                                p.status === 'approved' || !p.status
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : p.status === 'pending'
                                  ? 'bg-amber-500/15 text-amber-600'
                                  : 'bg-rose-500/15 text-rose-600'
                              }`}>
                                {p.status === 'approved' || !p.status ? 'Approved' : p.status === 'pending' ? 'Pending' : 'Rejected'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Submit Payment */}
            <div className="space-y-6">
              <div className="card-gold p-6 rounded-3xl bg-primary/5 border-primary/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-primary">Submit Payment</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">Monthly Contribution</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">Select Month</Label>
                    <Select name="for_month" defaultValue={String(new Date().getMonth() + 1)} required>
                      <SelectTrigger className="bg-background/50 border-primary/20 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS_EN.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m} {new Date().getFullYear()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">Amount (BDT)</Label>
                    <Input name="amount" type="number" defaultValue={member!.monthly_rate} required className="bg-background/50 border-primary/20 h-10" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">Payment Method</Label>
                    <Select name="method" defaultValue="bkash" required>
                      <SelectTrigger className="bg-background/50 border-primary/20 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="rocket">Rocket</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground ml-1">TrxID / Reference</Label>
                    <Input name="transaction_ref" placeholder="e.g. AX782S..." className="bg-background/50 border-primary/20 h-10" />
                  </div>

                  <div className="pt-2">
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 text-[10px] text-primary/80 leading-relaxed italic">
                      After sending your contribution, submit the Transaction ID here. Your payment will be added to your statement once verified by an administrator.
                    </div>
                    <Button disabled={paymentBusy} className="w-full bg-gradient-gold text-primary-foreground font-bold h-12 shadow-lg shadow-primary/10">
                      {paymentBusy ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit Payment'}
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
                        <span>{MONTHS_EN[p.for_month - 1]} {p.for_year}</span>
                        <span className="font-bold">BDT {Number(p.amount).toLocaleString('en-IN')}</span>
                        <span className="text-amber-600 italic">Awaiting</span>
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
