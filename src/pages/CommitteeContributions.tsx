import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, AlertCircle, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  History, Settings, Users, PieChart, ChevronRight, Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Contribution {
  id: string;
  name: string;
  amount: number;
  area?: string | null;
  note?: string;
  created_at: string;
  target_month?: string | null;
  payment_method?: string | null;
  transaction_id?: string | null;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string;
}

interface CommitteeMember {
  id: string;
  name: string;
}

const AREAS = [
  "চন্দনাইশ", "পটিয়া", "আনোয়ারা", "সাতকানিয়া", 
  "লোহাগাড়া", "বাঁশখালী", "বোয়ালখালী", "অন্যান্য"
];

const PAYMENT_METHODS = ["ক্যাশ (Cash)", "বিকাশ (bKash)", "নগদ (Nagad)", "রকেট (Rocket)", "ব্যাংক (Bank)"];
const YEARLY_GOAL = 1000000;

const CommitteeContributions = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paymentMethod, setPaymentMethod] = useState("ক্যাশ (Cash)");
  const [transactionId, setTransactionId] = useState("");

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNote, setExpenseNote] = useState("");

  // Data States
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Contribution[] | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isMaster = ["chandanaishdarbarsharif@gmail.com", "tasinskder@gmail.com"].includes(session.user.email || "");
        const isMasterPhone = ["+8801714338533", "+8801819614444", "+8801835674454"].includes(session.user.phone || "");
        if (isMaster || isMasterPhone) {
          setIsAdmin(true);
        } else {
          const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
          setIsAdmin(!!data);
        }
      }
      setLoading(false);
    };
    checkAuth();
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: cData } = await supabase.from("committee_contributions").select("*").order("created_at", { ascending: false });
    if (cData) setContributions(cData as Contribution[]);
    
    const { data: eData } = await supabase.from("committee_expenses").select("*").order("date", { ascending: false });
    if (eData) setExpenses(eData as Expense[]);
    
    const { data: mData } = await supabase.from("committee_members").select("id, name");
    if (mData) setCommitteeMembers(mData);
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55);
    doc.text("Chandanish Darbar Sharif", 105, 20, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Contribution Receipt", 105, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${c.id.slice(0, 8)}`, 20, 50);
    doc.text(`Date: ${new Date(c.created_at).toLocaleDateString()}`, 20, 60);
    doc.text(`Name: ${c.name}`, 20, 70);
    doc.text(`Area: ${c.area || "N/A"}`, 20, 80);
    doc.text(`Target Month: ${c.target_month || "N/A"}`, 20, 90);
    doc.text(`Amount: ${c.amount} BDT`, 20, 100);
    doc.text(`Payment Method: ${c.payment_method || "Cash"}`, 20, 110);
    if (c.transaction_id) doc.text(`Transaction ID: ${c.transaction_id}`, 20, 120);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your contribution to Chandanish Darbar Sharif.", 105, 140, { align: "center" });
    doc.save(`Receipt_${c.name}_${new Date().getTime()}.pdf`);
  };

  const handleSubmitContribution = async (e: FormEvent) => {
    e.preventDefault();
    const id = uuidv4();
    const { error } = await supabase.from("committee_contributions").insert([{
      id, name, amount: Number(amount), area: area || null, note,
      target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null,
    }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else {
      toast.success("কালেকশন সফল! রসিদ ডাউনলোড হচ্ছে...");
      handleDownloadSingleReceipt({ id, name, amount: Number(amount), area: area || null, note, created_at: new Date().toISOString(), target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null });
      setName(""); setAmount(""); setArea(""); setNote(""); setTransactionId(""); fetchData();
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_expenses").insert([{ title: expenseTitle, amount: Number(expenseAmount), date: expenseDate, note: expenseNote }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("খরচ রেকর্ড সফল!"); setExpenseTitle(""); setExpenseAmount(""); setExpenseNote(""); fetchData(); }
  };

  const currentYear = new Date().getFullYear().toString();
  const currentYearTotal = contributions.filter(c => c.created_at.startsWith(currentYear)).reduce((s, c) => s + c.amount, 0);
  const goalPercentage = Math.min((currentYearTotal / YEARLY_GOAL) * 100, 100);
  
  const filteredByMonth = contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth)));
  const monthTotal = filteredByMonth.reduce((s, c) => s + c.amount, 0);
  const monthExpense = expenses.filter(e => e.date.startsWith(filterMonth)).reduce((s, e) => s + e.amount, 0);

  const stats = searchResult && searchResult.length > 0 ? {
    total: searchResult.reduce((s, c) => s + c.amount, 0),
    yearly: searchResult.filter(c => c.created_at.startsWith(currentYear)).reduce((s, c) => s + c.amount, 0),
    count: searchResult.length
  } : null;

  return (
    <div className="min-h-screen bg-background text-foreground islamic-pattern pb-20">
      <SEO title="কমিটি অর্থ সংগ্রহ" description="স্বচ্ছ ও আধুনিক কমিটি ফান্ড ব্যবস্থাপনা।" />

      {/* Header Section */}
      <header className="bg-gold-gradient text-primary-foreground py-12 shadow-2xl relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                <Wallet className="w-10 h-10" /> অর্থ সংগ্রহ ও ব্যবস্থাপনা
              </h1>
              <p className="text-gold-foreground/80 font-medium text-lg">চন্দনাইশ দরবার শরীফ কমিটি ফান্ড ট্র্যাকিং সিস্টেম</p>
            </div>
            {isAdmin && (
              <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-sm">অ্যাডমিন ড্যাশবোর্ড</span>
              </div>
            )}
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </header>

      {/* Navigation Tabs */}
      <nav className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-card/80 backdrop-blur-xl border border-gold/20 p-2 rounded-2xl shadow-xl flex flex-wrap gap-2 justify-center md:justify-start">
          {[
            { id: "overview", label: "সারসংক্ষেপ", icon: <LayoutGrid size={18} /> },
            { id: "search", label: "ব্যক্তিগত হিসাব", icon: <UserIcon size={18} /> },
            { id: "transparency", label: "স্বচ্ছতা (খরচ)", icon: <PieChart size={18} /> },
            { id: "leaderboard", label: "এলাকা র‍্যাঙ্কিং", icon: <Award size={18} /> },
            ...(isAdmin ? [{ id: "admin", label: "অ্যাডমিন প্যানেল", icon: <Settings size={18} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id ? "bg-gold text-primary-foreground shadow-lg scale-105" : "hover:bg-gold/10 text-muted-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 mt-12">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              {/* Financial Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-8 rounded-3xl border border-gold/20 shadow-lg group hover:border-gold transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gold/10 rounded-2xl text-gold"><TrendingUp size={24} /></div>
                    <div className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded-full font-bold uppercase">{filterMonth || "সব সময়"}</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">মোট সংগ্রহ</h3>
                  <p className="text-4xl font-black text-gold">৳{monthTotal.toLocaleString()}</p>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-red-500/10 shadow-lg group hover:border-red-500/40 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><TrendingDown size={24} /></div>
                    <div className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-bold uppercase">{filterMonth || "সব সময়"}</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">মোট খরচ</h3>
                  <p className="text-4xl font-black text-red-500">৳{monthExpense.toLocaleString()}</p>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-green-500/10 shadow-lg group hover:border-green-500/40 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-500/10 rounded-2xl text-green-500"><Wallet size={24} /></div>
                    <div className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-bold uppercase tracking-widest">ফান্ড স্থিতি</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">অবশিষ্ট ব্যালেন্স</h3>
                  <p className="text-4xl font-black text-green-500">৳{(monthTotal - monthExpense).toLocaleString()}</p>
                </div>
              </div>

              {/* Goal Progress */}
              <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-xl overflow-hidden relative">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gold flex items-center gap-3">
                      <Target className="w-8 h-8" /> বার্ষিক লক্ষ্যমাত্রা ({currentYear})
                    </h2>
                    <p className="text-muted-foreground">২০২৬ সালের জন্য নির্ধারিত অনুদান লক্ষ্যমাত্রা</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">বর্তমানে সংগৃহীত</p>
                    <p className="text-2xl font-black text-gold">৳{currentYearTotal.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">/ ৳{YEARLY_GOAL.toLocaleString()}</span></p>
                  </div>
                </div>
                <div className="relative h-6 bg-secondary rounded-full overflow-hidden border border-gold/20 mb-3">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${goalPercentage}%` }} 
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="absolute top-0 left-0 h-full bg-gold-gradient shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-primary-foreground tracking-tighter mix-blend-overlay">
                    {goalPercentage.toFixed(1)}% Completed
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <span>০% শুরু</span>
                  <span>১০০% টার্গেট</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-10 rounded-3xl border border-gold/20 shadow-2xl text-center">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gold">
                  <UserIcon size={32} />
                </div>
                <h2 className="text-3xl font-black text-gold mb-2">আপনার চাঁদার বিবরণ দেখুন</h2>
                <p className="text-muted-foreground mb-8">নিজের নাম বা ইউনিক আইডি লিখে সার্চ করুন</p>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="আপনার নাম বা আইডি টাইপ করুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-background border-2 border-gold/20 rounded-2xl px-6 py-4 outline-none focus:border-gold transition-all text-lg font-medium"
                  />
                  <button onClick={() => { handleMemberSearch(); fetchData(); }} className="bg-gold-gradient text-primary-foreground px-10 py-4 rounded-2xl font-black text-lg shadow-lg hover:scale-105 active:scale-95 transition-all">খুঁজুন</button>
                </div>
              </div>

              {searchResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: "মোট জমাকৃত অর্থ", value: `৳${stats.total.toLocaleString()}`, color: "text-gold" },
                        { label: "এ বছরের জমা", value: `৳${stats.yearly.toLocaleString()}`, color: "text-gold" },
                        { label: "মোট এন্ট্রি", value: `${stats.count} বার`, color: "text-muted-foreground" }
                      ].map((s, i) => (
                        <div key={i} className="bg-card p-6 rounded-2xl border border-gold/10 text-center shadow-md">
                          <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">{s.label}</h4>
                          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                      <thead className="bg-gold/5 text-gold text-xs font-black uppercase tracking-widest">
                        <tr>
                          <th className="p-5">তারিখ</th>
                          <th className="p-5">মাসের জন্য</th>
                          <th className="p-5 text-right">পরিমাণ</th>
                          <th className="p-5">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {searchResult.map(c => (
                          <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                            <td className="p-5 font-medium">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-5 text-muted-foreground uppercase text-xs font-bold">{c.target_month || "-"}</td>
                            <td className="p-5 text-right font-black text-gold">৳{c.amount.toLocaleString()}</td>
                            <td className="p-5">
                              <button onClick={() => handleDownloadSingleReceipt(c)} className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-gold/10 px-3 py-2 rounded-lg text-gold hover:bg-gold hover:text-white transition-all"><Download size={12} /> রসিদ</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Transparency Tab */}
          {activeTab === "transparency" && (
            <motion.div key="transparency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gold mb-1 flex items-center gap-3"><TrendingDown className="text-red-500" /> খরচের বিস্তারিত হিসাব</h2>
                  <p className="text-muted-foreground font-medium">ফান্ডের স্বচ্ছতা নিশ্চিত করতে সকল খরচের রেকর্ড</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground">ফিল্টার:</label>
                  <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border-2 border-gold/20 rounded-xl px-4 py-2 outline-none focus:border-gold transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest border-b border-gold/10">
                    <tr>
                      <th className="p-6 text-left">তারিখ</th>
                      <th className="p-6 text-left">খাত / বিবরণ</th>
                      <th className="p-6 text-right">টাকার পরিমাণ</th>
                      <th className="p-6 text-left">বিস্তারিত নোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id} className="hover:bg-red-500/5 transition-colors">
                        <td className="p-6 font-bold text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-6 font-black text-lg">{e.title}</td>
                        <td className="p-6 text-right font-black text-2xl text-red-500">৳{e.amount.toLocaleString()}</td>
                        <td className="p-6 text-xs text-muted-foreground italic">{e.note || "কোনো নোট নেই"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && <div className="p-20 text-center text-muted-foreground font-bold tracking-widest uppercase">কোনো খরচের রেকর্ড পাওয়া যায়নি</div>}
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-4xl font-black text-gold mb-2">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
                <p className="text-muted-foreground">কোন এলাকা থেকে সবচেয়ে বেশি চাঁদা সংগ্রহ হচ্ছে</p>
              </div>

              <div className="space-y-4">
                {Object.entries(
                  contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth)))
                  .reduce((acc, c) => {
                    const a = c.area || "অন্যান্য";
                    acc[a] = (acc[a] || 0) + c.amount;
                    return acc;
                  }, {} as Record<string, number>)
                )
                .sort((a, b) => b[1] - a[1])
                .map(([areaName, total], idx) => (
                  <motion.div 
                    key={areaName} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.1 }}
                    className="bg-card p-6 rounded-2xl border border-gold/10 flex justify-between items-center shadow-lg hover:scale-[1.02] transition-all cursor-default"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner ${
                        idx === 0 ? "bg-gold text-primary-foreground" : 
                        idx === 1 ? "bg-slate-300 text-slate-700" : 
                        idx === 2 ? "bg-amber-600 text-amber-50" : "bg-gold/10 text-gold"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xl font-black">{areaName}</h4>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">টোটাল কালেকশন</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gold">৳{total.toLocaleString()}</p>
                      <div className="w-32 h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gold" style={{ width: `${(total / (contributions.length > 0 ? contributions.reduce((s,c)=>s+c.amount,0) : 1)) * 100}%` }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Admin Tab */}
          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Add Contribution */}
                <div className="bg-card p-8 rounded-3xl border-2 border-gold/20 shadow-2xl space-y-6">
                  <h3 className="text-2xl font-black text-gold flex items-center gap-3 uppercase tracking-tighter"><TrendingUp /> নতুন চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">নাম (সদস্য)</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">টাকার পরিমাণ</label>
                        <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">টার্গেট মাস</label>
                        <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">এলাকা</label>
                        <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold">
                          <option value="">নির্বাচন করুন</option>
                          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">পেমেন্ট মাধ্যম</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold">
                          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">ট্রানজেকশন আইডি</label>
                        <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="বিকাশ/নগদ এর জন্য" className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">সংক্ষিপ্ত নোট</label>
                      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full bg-background border border-gold/20 rounded-xl px-4 py-3 outline-none focus:border-gold" />
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-4 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">এন্ট্রি করুন ও রসিদ দিন</button>
                  </form>
                </div>

                {/* Add Expense */}
                <div className="bg-card p-8 rounded-3xl border-2 border-red-500/20 shadow-2xl space-y-6">
                  <h3 className="text-2xl font-black text-red-500 flex items-center gap-3 uppercase tracking-tighter"><TrendingDown /> নতুন খরচ (Expense) এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">খরচের শিরোনাম</label>
                      <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="উদা: মিলাদ মাহফিল খরচ" className="w-full bg-background border border-red-500/20 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">পরিমাণ (৳)</label>
                        <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full bg-background border border-red-500/20 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">তারিখ</label>
                        <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border border-red-500/20 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">খরচের নোট / বিবরণ</label>
                      <textarea value={expenseNote} onChange={e => setExpenseNote(e.target.value)} rows={3} className="w-full bg-background border border-red-500/20 rounded-xl px-4 py-3 outline-none focus:border-red-500" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">খরচ সেভ করুন</button>
                  </form>
                </div>
              </div>

              {/* Detailed Lists Summary */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-black text-gold uppercase tracking-tighter">কালেকশন লগ ({filterMonth || "সব সময়"})</h3>
                  <button onClick={fetchData} className="text-[10px] font-black uppercase text-gold hover:underline">রিফ্রেশ করুন</button>
                </div>
                <div className="bg-card rounded-3xl border border-gold/20 overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-gold text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="p-5">তারিখ</th>
                        <th className="p-5">নাম ও এলাকা</th>
                        <th className="p-5">মাস</th>
                        <th className="p-5 text-right">পরিমাণ</th>
                        <th className="p-5">রসিদ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10">
                      {filteredByMonth.map(c => (
                        <tr key={c.id} className="hover:bg-gold/5 transition-colors text-sm">
                          <td className="p-5 font-bold text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-5">
                            <div className="font-black text-gold">{c.name}</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">{c.area || "N/A"}</div>
                          </td>
                          <td className="p-5 text-xs font-black text-muted-foreground uppercase">{c.target_month || "-"}</td>
                          <td className="p-5 text-right">
                            <div className="font-black text-lg">৳{c.amount.toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase">{c.payment_method}</div>
                          </td>
                          <td className="p-5">
                            <button onClick={() => handleDownloadSingleReceipt(c)} className="p-3 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all"><Download size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button for Help or Contact */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <button className="bg-gold text-primary-foreground p-4 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-2 font-bold group">
          <Calculator className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all whitespace-nowrap">হিসাব সহকারী</span>
        </button>
      </div>
    </div>
  );
};

export default CommitteeContributions;
