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
  History, Settings, Users, PieChart as PieChartIcon, ChevronRight, Calculator, FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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
const COLORS = ["#D4AF37", "#C0C0C0", "#CD7F32", "#FFD700", "#FF4500", "#1E90FF", "#32CD32", "#8A2BE2"];

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
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(212, 175, 55);
    doc.text("CHANDANISH DARBAR SHARIF", 105, 25, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Silsila-e-Tarikaye Maizvanderia", 105, 32, { align: "center" });

    // Body
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("OFFICIAL MONEY RECEIPT", 105, 50, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Receipt ID: ${c.id.toUpperCase().slice(0, 10)}`, 20, 65);
    doc.text(`Issue Date: ${new Date(c.created_at).toLocaleDateString()}`, 140, 65);

    const receiptData = [
      ["Member Name", c.name],
      ["Area", c.area || "N/A"],
      ["Contribution Month", c.target_month || "N/A"],
      ["Amount", `${c.amount} BDT`],
      ["Payment Method", c.payment_method || "Cash"],
      ["Transaction ID", c.transaction_id || "N/A"],
      ["Note", c.note || "N/A"]
    ];

    // @ts-ignore
    doc.autoTable({
      startY: 75,
      body: receiptData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.line(20, finalY, 70, finalY);
    doc.text("Member Signature", 30, finalY + 5);
    
    doc.line(140, finalY, 190, finalY);
    doc.text("Authorized Signature", 145, finalY + 5);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This is a computer generated receipt. No physical signature required for validation.", 105, 285, { align: "center" });

    doc.save(`Receipt_${c.name.replace(/\s+/g, '_')}_${c.id.slice(0, 5)}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Name", "Area", "Month", "Amount", "Method", "Transaction ID", "Note"];
    const rows = contributions.map(c => [
      new Date(c.created_at).toLocaleDateString(),
      c.name,
      c.area || "",
      c.target_month || "",
      c.amount,
      c.payment_method || "",
      c.transaction_id || "",
      c.note || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Committee_Contributions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      toast.success("কালেকশন সফল! রসিদ জেনারেট হচ্ছে...");
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

  // Chart Data Preparation
  const getMonthlyChartData = () => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();

    return last6Months.map(m => ({
      name: m,
      total: contributions.filter(c => c.target_month === m || c.created_at.startsWith(m)).reduce((s, c) => s + c.amount, 0)
    }));
  };

  const getAreaPieData = () => {
    const areaStats = contributions.reduce((acc, c) => {
      const a = c.area || "অন্যান্য";
      acc[a] = (acc[a] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(areaStats).map(([name, value]) => ({ name, value }));
  };

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
              <p className="text-gold-foreground/80 font-medium text-lg tracking-wide">স্বচ্ছতা ও ডিজিটাল হিসাব ব্যবস্থাপনায় আমরা প্রতিজ্ঞাবদ্ধ</p>
            </div>
            {isAdmin && (
              <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 flex items-center gap-3 shadow-xl">
                <Shield className="w-6 h-6 animate-pulse" />
                <span className="font-black uppercase tracking-widest text-sm">অ্যাডমিন মোড সক্রিয়</span>
              </div>
            )}
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
      </header>

      {/* Navigation Tabs */}
      <nav className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-card/90 backdrop-blur-xl border border-gold/20 p-2 rounded-2xl shadow-2xl flex flex-wrap gap-2 justify-center md:justify-start">
          {[
            { id: "overview", label: "সারসংক্ষেপ", icon: <LayoutGrid size={18} /> },
            { id: "search", label: "ব্যক্তিগত হিসাব", icon: <UserIcon size={18} /> },
            { id: "transparency", label: "স্বচ্ছতা (খরচ)", icon: <PieChartIcon size={18} /> },
            { id: "leaderboard", label: "এলাকা র‍্যাঙ্কিং", icon: <Award size={18} /> },
            ...(isAdmin ? [{ id: "admin", label: "অ্যাডমিন প্যানেল", icon: <Settings size={18} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 ${
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
                <motion.div whileHover={{ y: -5 }} className="bg-card p-8 rounded-3xl border border-gold/20 shadow-lg relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gold/10 rounded-2xl text-gold"><TrendingUp size={24} /></div>
                    <div className="text-[10px] bg-gold/10 text-gold px-2 py-1 rounded-full font-bold uppercase tracking-widest">{filterMonth || "সব সময়"}</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">মোট সংগ্রহ</h3>
                  <p className="text-4xl font-black text-gold">৳{monthTotal.toLocaleString()}</p>
                  <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={80} /></div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-card p-8 rounded-3xl border border-red-500/10 shadow-lg relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><TrendingDown size={24} /></div>
                    <div className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-bold uppercase tracking-widest">{filterMonth || "সব সময়"}</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">মোট খরচ</h3>
                  <p className="text-4xl font-black text-red-500">৳{monthExpense.toLocaleString()}</p>
                  <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingDown size={80} /></div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-card p-8 rounded-3xl border border-green-500/10 shadow-lg relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-500/10 rounded-2xl text-green-500"><Wallet size={24} /></div>
                    <div className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-bold uppercase tracking-widest">ফান্ড স্থিতি</div>
                  </div>
                  <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-1">অবশিষ্ট ব্যালেন্স</h3>
                  <p className="text-4xl font-black text-green-500">৳{(monthTotal - monthExpense).toLocaleString()}</p>
                  <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={80} /></div>
                </motion.div>
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
                <div className="relative h-6 bg-secondary rounded-full overflow-hidden border border-gold/20 mb-3 shadow-inner">
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

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg">
                  <h3 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> মাসিক সংগ্রহের গ্রাফ
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMonthlyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D4AF3710" />
                        <XAxis dataKey="name" stroke="#D4AF37" fontSize={10} />
                        <YAxis stroke="#D4AF37" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37' }} />
                        <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg">
                  <h3 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" /> এলাকা ভিত্তিক পরিসংখ্যান
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAreaPieData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getAreaPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-10 rounded-3xl border border-gold/20 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-50" />
                <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gold shadow-lg">
                  <UserIcon size={36} />
                </div>
                <h2 className="text-3xl font-black text-gold mb-2">নিজের জমার হিসাব ও রসিদ</h2>
                <p className="text-muted-foreground mb-8 text-lg font-medium">আপনার নাম বা আইডি লিখে খুঁজুন</p>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="উদা: আব্দুল লতিফ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-background border-2 border-gold/20 rounded-2xl px-6 py-4 outline-none focus:border-gold focus:ring-4 focus:ring-gold/10 transition-all text-lg font-bold"
                  />
                  <button onClick={() => { handleMemberSearch(); fetchData(); }} className="bg-gold-gradient text-primary-foreground px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest"><Search size={20} /> খুঁজুন</button>
                </div>
              </div>

              {searchResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-6 rounded-2xl border border-gold/10 text-center shadow-lg">
                      <h4 className="text-xs font-black uppercase text-muted-foreground mb-2 tracking-widest">আপনার সর্বমোট অনুদান</h4>
                      <p className="text-4xl font-black text-gold">৳{searchResult.reduce((s,c)=>s+c.amount,0).toLocaleString()}</p>
                    </div>
                    <div className="bg-card p-6 rounded-2xl border border-gold/10 text-center shadow-lg">
                      <h4 className="text-xs font-black uppercase text-muted-foreground mb-2 tracking-widest">মোট জমার সংখ্যা</h4>
                      <p className="text-4xl font-black text-gold">{searchResult.length} বার</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-gold/5 text-gold text-xs font-black uppercase tracking-widest border-b border-gold/20">
                        <tr>
                          <th className="p-6">তারিখ</th>
                          <th className="p-6">মাসের জন্য</th>
                          <th className="p-6 text-right">পরিমাণ</th>
                          <th className="p-6">ডাউনলোড</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {searchResult.map(c => (
                          <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                            <td className="p-6 font-bold text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-6 text-muted-foreground uppercase text-[10px] font-black tracking-widest">{c.target_month || "-"}</td>
                            <td className="p-6 text-right font-black text-2xl text-gold">৳{c.amount.toLocaleString()}</td>
                            <td className="p-6">
                              <button onClick={() => handleDownloadSingleReceipt(c)} className="flex items-center gap-2 text-[10px] font-black uppercase bg-gold/10 px-4 py-2.5 rounded-xl text-gold hover:bg-gold hover:text-white transition-all shadow-sm"><Download size={14} /> রসিদ</button>
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
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                  <h2 className="text-4xl font-black text-gold mb-2 flex items-center gap-4"><TrendingDown className="text-red-500 w-10 h-10" /> খরচের স্বচ্ছ বিবরণী</h2>
                  <p className="text-muted-foreground text-lg font-medium">ফান্ডের প্রতিটি টাকার সঠিক হিসাব ও স্বচ্ছতা</p>
                </div>
                <div className="flex items-center gap-4 bg-card p-2 rounded-2xl border border-gold/10 shadow-lg">
                  <label className="text-[10px] font-black uppercase text-gold ml-4 tracking-widest">ফিল্টার:</label>
                  <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-background border-2 border-gold/10 rounded-xl px-5 py-2.5 outline-none focus:border-gold transition-all text-sm font-black" />
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest border-b border-gold/10">
                    <tr>
                      <th className="p-6 text-left">তারিখ</th>
                      <th className="p-6 text-left">খাত / বিবরণ</th>
                      <th className="p-6 text-right">টাকার পরিমাণ</th>
                      <th className="p-6 text-left">বিস্তারিত</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id} className="hover:bg-red-500/5 transition-colors">
                        <td className="p-6 font-bold text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-6 font-black text-xl tracking-tight">{e.title}</td>
                        <td className="p-6 text-right font-black text-3xl text-red-500">৳{e.amount.toLocaleString()}</td>
                        <td className="p-6 text-xs text-muted-foreground font-medium italic opacity-80">{e.note || "কোনো অতিরিক্ত তথ্য নেই"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && <div className="p-32 text-center text-muted-foreground font-black tracking-[0.2em] uppercase opacity-40">কোনো খরচের রেকর্ড পাওয়া যায়নি</div>}
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black text-gold mb-3 tracking-tighter">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
                <p className="text-muted-foreground text-lg font-medium uppercase tracking-widest">সবচেয়ে বেশি সংগ্রহের ভিত্তিতে সাজানো</p>
              </div>

              <div className="grid gap-5">
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
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                    className="bg-card p-6 rounded-3xl border border-gold/10 flex justify-between items-center shadow-xl hover:shadow-gold/5 hover:scale-[1.02] transition-all cursor-default relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gold/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform ${
                        idx === 0 ? "bg-gold text-primary-foreground scale-110" : 
                        idx === 1 ? "bg-slate-300 text-slate-800" : 
                        idx === 2 ? "bg-amber-600 text-amber-50" : "bg-gold/10 text-gold"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black tracking-tight">{areaName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <PieChartIcon size={12} className="text-gold opacity-50" />
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] opacity-60">ফান্ড কালেকশন</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                      <p className="text-3xl font-black text-gold">৳{total.toLocaleString()}</p>
                      <div className="w-40 h-2 bg-secondary rounded-full mt-3 overflow-hidden shadow-inner">
                        <div className="h-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" style={{ width: `${(total / (contributions.length > 0 ? contributions.reduce((s,c)=>s+c.amount,0) : 1)) * 100}%` }} />
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
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gold rounded-2xl shadow-xl shadow-gold/20"><Shield className="text-primary-foreground w-8 h-8" /></div>
                  <h2 className="text-4xl font-black text-gold uppercase tracking-tighter">অ্যাডমিন কন্ট্রোল</h2>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-green-700 transition-all"><FileSpreadsheet size={18} /> এক্সেল ডাউনলোড</button>
                  <button onClick={fetchData} className="flex items-center gap-2 bg-gold/10 text-gold px-6 py-3 rounded-xl font-black text-sm border border-gold/30 hover:bg-gold/20 transition-all">রিফ্রেশ ডাটা</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Add Contribution */}
                <div className="bg-card p-10 rounded-[2.5rem] border-2 border-gold/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16" />
                  <h3 className="text-2xl font-black text-gold mb-8 flex items-center gap-3 uppercase tracking-tighter"><TrendingUp size={28} /> নতুন চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">সদস্যের নাম *</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="উদা: আব্দুল করিম" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">টাকার পরিমাণ (৳) *</label>
                        <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="৳ ৫০০" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-black shadow-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">টার্গেট মাস *</label>
                        <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-black shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">এলাকা</label>
                        <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-sm cursor-pointer">
                          <option value="">নির্বাচন করুন</option>
                          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">পেমেন্ট মাধ্যম</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-sm cursor-pointer">
                          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">ট্রানজেকশন আইডি</label>
                        <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="উদা: T12345" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gold ml-3 tracking-widest">সংক্ষিপ্ত নোট</label>
                      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="অতিরিক্ত কোনো তথ্য থাকলে..." className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-medium shadow-sm" />
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-5 rounded-2xl font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em]">ডাটা সেভ করুন ও রসিদ দিন</button>
                  </form>
                </div>

                {/* Add Expense */}
                <div className="bg-card p-10 rounded-[2.5rem] border-2 border-red-500/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
                  <h3 className="text-2xl font-black text-red-500 mb-8 flex items-center gap-3 uppercase tracking-tighter"><TrendingDown size={28} /> নতুন খরচের এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-red-500 ml-3 tracking-widest">খরচের টাইটেল *</label>
                      <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="উদা: মিলাদ সামগ্রী ক্রয়" className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-red-500 ml-3 tracking-widest">পরিমাণ (৳) *</label>
                        <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-black shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-red-500 ml-3 tracking-widest">তারিখ *</label>
                        <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-black shadow-sm cursor-pointer" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-red-500 ml-3 tracking-widest">বিস্তারিত বিবরণ</label>
                      <textarea value={expenseNote} onChange={e => setExpenseNote(e.target.value)} rows={3} placeholder="খরচের বিস্তারিত এখানে লিখুন..." className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-medium shadow-sm" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em]">খরচ রেকর্ড করুন</button>
                  </form>
                </div>
              </div>

              {/* Collection Logs */}
              <div className="mt-20">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black text-gold uppercase tracking-tighter">সদস্য সংগ্রহের পূর্ণাঙ্গ লগ</h3>
                  <div className="bg-card p-1.5 rounded-xl border border-gold/20 flex gap-1">
                    <button onClick={() => setFilterMonth("")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${!filterMonth ? "bg-gold text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-gold/10"}`}>All Time</button>
                    <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-background border border-gold/10 rounded-lg px-3 py-1.5 text-xs font-black outline-none" />
                  </div>
                </div>
                <div className="bg-card rounded-[2rem] border border-gold/20 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gold text-primary-foreground text-[10px] font-black uppercase tracking-widest border-b-2 border-gold/20">
                        <tr>
                          <th className="p-6">তারিখ</th>
                          <th className="p-6">নাম ও এলাকা</th>
                          <th className="p-6">টার্গেট মাস</th>
                          <th className="p-6 text-right">পরিমাণ ও মাধ্যম</th>
                          <th className="p-6 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {filteredByMonth.map(c => (
                          <tr key={c.id} className="hover:bg-gold/5 transition-all duration-300">
                            <td className="p-6 font-bold text-muted-foreground text-sm whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-6">
                              <div className="font-black text-gold text-lg tracking-tight">{c.name}</div>
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60"><ChevronRight size={10} className="text-gold" /> {c.area || "N/A"}</div>
                            </td>
                            <td className="p-6 font-black text-xs text-muted-foreground tracking-widest uppercase opacity-80">{c.target_month || "-"}</td>
                            <td className="p-6 text-right">
                              <div className="font-black text-2xl text-gold">৳{c.amount.toLocaleString()}</div>
                              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{c.payment_method}</div>
                            </td>
                            <td className="p-6 text-center">
                              <button onClick={() => handleDownloadSingleReceipt(c)} className="w-12 h-12 bg-gold/10 text-gold rounded-2xl hover:bg-gold hover:text-white hover:rotate-12 hover:scale-110 transition-all flex items-center justify-center shadow-sm" title="রসিদ ডাউনলোড"><Download size={20} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <motion.button 
          whileHover={{ scale: 1.1, rotate: -5 }} 
          whileTap={{ scale: 0.9 }}
          className="bg-gold text-primary-foreground p-5 rounded-3xl shadow-[0_20px_50px_rgba(212,175,55,0.4)] hover:shadow-gold/60 transition-all flex items-center gap-3 font-black uppercase tracking-widest group border-2 border-white/20"
        >
          <Calculator className="w-7 h-7" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[250px] transition-all duration-500 whitespace-nowrap text-sm">হিসাব সহকারী</span>
        </motion.button>
      </div>
    </div>
  );
};

export default CommitteeContributions;
