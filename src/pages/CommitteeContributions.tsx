import React, { useState, useEffect, FormEvent, useRef } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, AlertCircle, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  History, Settings, Users, PieChart as PieChartIcon, ChevronRight, Calculator, FileSpreadsheet, Printer, Loader2
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
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  
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
    setPdfLoading(c.id);
    try {
      const doc = new jsPDF();
      
      // Header Section
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("CHANDANISH DARBAR SHARIF", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text("OFFICIAL MONEY RECEIPT", 105, 30, { align: "center" });

      // Body Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Receipt ID: ${c.id.toUpperCase().slice(0, 10)}`, 20, 55);
      doc.text(`Date: ${new Date(c.created_at).toLocaleDateString()}`, 150, 55);

      const tableData = [
        ["Member Name", c.name],
        ["Resident Area", c.area || "N/A"],
        ["Target Month", c.target_month || "N/A"],
        ["Amount", `${c.amount.toLocaleString()} BDT`],
        ["Payment Method", c.payment_method || "Cash"],
        ["Transaction ID", c.transaction_id || "N/A"],
        ["Note", c.note || "-"]
      ];

      // @ts-ignore
      doc.autoTable({
        startY: 65,
        body: tableData,
        theme: 'grid',
        styles: { cellPadding: 5, fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [250, 250, 250], width: 50 } },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 40;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, finalY, 70, finalY);
      doc.text("Member Signature", 30, finalY + 5);
      
      doc.line(140, finalY, 190, finalY);
      doc.text("Authorized Signature", 150, finalY + 5);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This is an official computer-generated receipt for Chandanish Darbar Sharif.", 105, 280, { align: "center" });

      doc.save(`Receipt_${c.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("রসিদ ডাউনলোড হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("পিডিএফ রসিদ তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };

  const handleDownloadReport = () => {
    setPdfLoading("report");
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("CHANDANISH DARBAR SHARIF", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text("COMMITTEE FINANCIAL STATEMENT", 105, 30, { align: "center" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Period: ${filterMonth || "All History"}`, 20, 55);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 150, 55);

      const statsData = [
        ["Total Collection", `${monthTotal.toLocaleString()} BDT`],
        ["Total Expense", `${monthExpense.toLocaleString()} BDT`],
        ["Net Balance", `${(monthTotal - monthExpense).toLocaleString()} BDT`]
      ];

      // @ts-ignore
      doc.autoTable({
        startY: 65,
        body: statsData,
        theme: 'plain',
        styles: { fontSize: 12, fontStyle: 'bold', cellPadding: 3 },
      });

      const tableData = filteredByMonth.map(c => [
        new Date(c.created_at).toLocaleDateString(),
        c.name,
        c.area || "-",
        c.target_month || "-",
        `${c.amount} BDT`
      ]);

      // @ts-ignore
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Date', 'Member Name', 'Area', 'Month', 'Amount']],
        body: tableData,
        headStyles: { fillColor: [212, 175, 55], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });

      doc.save(`Financial_Report_${filterMonth || "Full"}.pdf`);
      toast.success("রিপোর্ট ডাউনলোড হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("পিডিএফ রিপোর্ট তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
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
    const id = crypto.randomUUID();
    const { error } = await supabase.from("committee_contributions").insert([{
      id, name, amount: Number(amount), area: area || null, note,
      target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null,
    }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else {
      toast.success("কালেকশন সফল! রসিদ জেনারেট হচ্ছে...");
      const newEntry = { id, name, amount: Number(amount), area: area || null, note, created_at: new Date().toISOString(), target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null };
      handleDownloadSingleReceipt(newEntry);
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

  // Chart Data
  const getMonthlyChartData = () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7);
    }).reverse();
    return months.map(m => ({ name: m, total: contributions.filter(c => c.target_month === m || c.created_at.startsWith(m)).reduce((s, c) => s + c.amount, 0) }));
  };

  const getAreaPieData = () => {
    const areaStats = contributions.reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>);
    return Object.entries(areaStats).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground islamic-pattern pb-20">
      <SEO title="কমিটি অর্থ সংগ্রহ" description="স্বচ্ছ ও আধুনিক কমিটি ফান্ড ব্যবস্থাপনা।" />

      {/* Header Section */}
      <header className="bg-gold-gradient text-primary-foreground py-12 shadow-2xl relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                <Wallet className="w-10 h-10" /> অর্থ সংগ্রহ ও ব্যবস্থাপনা
              </h1>
              <p className="text-gold-foreground/80 font-medium text-lg tracking-wide uppercase tracking-widest text-xs">স্বচ্ছতা ও সুন্দর ব্যবস্থাপনার জন্য আধুনিক ডিজিটাল রসিদ সিস্টেম</p>
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
        <div className="bg-card/95 backdrop-blur-xl border border-gold/20 p-2 rounded-2xl shadow-2xl flex flex-wrap gap-2 justify-center md:justify-start">
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
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all duration-300 ${
                activeTab === tab.id ? "bg-gold text-primary-foreground shadow-lg scale-105" : "hover:bg-gold/10 text-muted-foreground opacity-70 hover:opacity-100"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 mt-12">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              {/* Financial Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -5 }} className="bg-card p-10 rounded-[2.5rem] border border-gold/20 shadow-xl relative overflow-hidden group">
                  <h3 className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] mb-2">মোট সংগ্রহ</h3>
                  <p className="text-5xl font-black text-gold">৳{monthTotal.toLocaleString()}</p>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-card p-10 rounded-[2.5rem] border border-red-500/10 shadow-xl relative overflow-hidden group">
                  <h3 className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] mb-2">মোট খরচ</h3>
                  <p className="text-5xl font-black text-red-500">৳{monthExpense.toLocaleString()}</p>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-card p-10 rounded-[2.5rem] border border-green-500/10 shadow-xl relative overflow-hidden group">
                  <h3 className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] mb-2">অবশিষ্ট ব্যালেন্স</h3>
                  <p className="text-5xl font-black text-green-500">৳{(monthTotal - monthExpense).toLocaleString()}</p>
                </motion.div>
              </div>

              {/* Goal Progress */}
              <div className="bg-card p-10 rounded-[2.5rem] border border-gold/10 shadow-2xl overflow-hidden relative">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gold flex items-center gap-4">
                      <Target className="w-10 h-10" /> বার্ষিক লক্ষ্যমাত্রা ({currentYear})
                    </h2>
                    <p className="text-muted-foreground font-medium mt-1">২০২৬ সালের নির্ধারিত কালেকশন প্রগ্রেস</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-xs text-muted-foreground font-black uppercase mb-1 tracking-widest">বর্তমানে সংগৃহীত</p>
                    <p className="text-3xl font-black text-gold tracking-tight">৳{currentYearTotal.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">/ ৳{YEARLY_GOAL.toLocaleString()}</span></p>
                  </div>
                </div>
                <div className="relative h-8 bg-secondary rounded-full overflow-hidden border border-gold/20 mb-4 shadow-inner p-1">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${goalPercentage}%` }} 
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gold-gradient rounded-full shadow-[0_0_30px_rgba(212,175,55,0.6)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase text-primary-foreground tracking-tighter mix-blend-overlay">
                    {goalPercentage.toFixed(1)}% Goal Achieved
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-card p-10 rounded-[2.5rem] border border-gold/10 shadow-xl">
                  <h3 className="text-2xl font-black text-gold mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <TrendingUp className="text-gold" /> মাসিক কালেকশন গ্রাফ
                  </h3>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMonthlyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D4AF3710" />
                        <XAxis dataKey="name" stroke="#D4AF37" fontSize={10} fontStyle="bold" />
                        <YAxis stroke="#D4AF37" fontSize={10} fontStyle="bold" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '15px' }} />
                        <Bar dataKey="total" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card p-10 rounded-[2.5rem] border border-gold/10 shadow-xl">
                  <h3 className="text-2xl font-black text-gold mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <PieChartIcon className="text-gold" /> এলাকা ভিত্তিক পরিসংখ্যান
                  </h3>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAreaPieData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getAreaPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-12 rounded-[3rem] border-2 border-gold/20 shadow-2xl text-center relative overflow-hidden group">
                <div className="w-24 h-24 bg-gold/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gold shadow-2xl">
                  <UserIcon size={40} />
                </div>
                <h2 className="text-4xl font-black text-gold mb-3 tracking-tighter">নিজের জমার হিসাব ও রসিদ</h2>
                <p className="text-muted-foreground mb-10 text-xl font-medium opacity-80 uppercase tracking-widest text-sm">আপনার নাম বা আইডি লিখে রসিদ ডাউনলোড করুন</p>
                
                <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                  <input
                    type="text"
                    placeholder="উদা: আব্দুল লতিফ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-background border-2 border-gold/10 rounded-[1.5rem] px-8 py-5 outline-none focus:border-gold font-black shadow-inner"
                  />
                  <button onClick={() => { handleMemberSearch(); fetchData(); }} className="bg-gold-gradient text-primary-foreground px-12 py-5 rounded-[1.5rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest uppercase"><Search size={22} /> খুঁজুন</button>
                </div>
              </div>

              {searchResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="bg-card rounded-[2.5rem] border border-gold/10 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-gold/5 text-gold text-[10px] font-black uppercase tracking-widest border-b border-gold/20">
                        <tr>
                          <th className="p-8">তারিখ</th>
                          <th className="p-8">মাসের জন্য</th>
                          <th className="p-8 text-right">পরিমাণ</th>
                          <th className="p-8 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {searchResult.map(c => (
                          <tr key={c.id} className="hover:bg-gold/5 transition-all duration-300">
                            <td className="p-8 font-black text-muted-foreground opacity-80">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-8 text-muted-foreground uppercase text-[10px] font-black tracking-widest bg-gold/5">{c.target_month || "-"}</td>
                            <td className="p-8 text-right font-black text-3xl text-gold">৳{c.amount.toLocaleString()}</td>
                            <td className="p-8 text-center">
                              <button 
                                onClick={() => handleDownloadSingleReceipt(c)} 
                                disabled={pdfLoading === c.id}
                                className="w-14 h-14 bg-gold/10 text-gold rounded-2xl hover:bg-gold hover:text-white transition-all shadow-lg flex items-center justify-center mx-auto disabled:opacity-50"
                              >
                                {pdfLoading === c.id ? <Loader2 className="animate-spin" /> : <Printer size={24} />}
                              </button>
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

          {activeTab === "transparency" && (
            <motion.div key="transparency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                <div>
                  <h2 className="text-5xl font-black text-gold mb-3 tracking-tighter flex items-center gap-5"><TrendingDown className="text-red-500 w-12 h-12" /> খরচের স্বচ্ছ বিবরণী</h2>
                </div>
                <div className="bg-card p-2 rounded-2xl border border-gold/10 shadow-2xl flex items-center gap-4">
                  <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-background border-2 border-gold/10 rounded-xl px-6 py-3 outline-none focus:border-gold transition-all text-sm font-black" />
                </div>
              </div>

              <div className="bg-card rounded-[3rem] border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest border-b-2 border-red-500/10">
                    <tr>
                      <th className="p-8 text-left">তারিখ</th>
                      <th className="p-8 text-left">খাত / বিবরণ</th>
                      <th className="p-8 text-right">টাকার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id} className="hover:bg-red-500/5 transition-all">
                        <td className="p-8 font-black text-muted-foreground opacity-60">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-8 font-black text-2xl tracking-tighter uppercase">{e.title}</td>
                        <td className="p-8 text-right font-black text-4xl text-red-500 tracking-tighter">৳{e.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto space-y-10">
              <div className="text-center mb-16">
                <h2 className="text-6xl font-black text-gold mb-4 tracking-tighter">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
              </div>

              <div className="grid gap-6">
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
                    className="bg-card p-8 rounded-[2.5rem] border border-gold/10 flex justify-between items-center shadow-2xl"
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-4xl ${idx === 0 ? "bg-gold text-white" : "bg-gold/10 text-gold"}`}>
                        {idx + 1}
                      </div>
                      <h4 className="text-3xl font-black tracking-tighter uppercase">{areaName}</h4>
                    </div>
                    <p className="text-4xl font-black text-gold tracking-tighter">৳{total.toLocaleString()}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-16">
              <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-gold rounded-[2rem] shadow-2xl"><Shield className="text-primary-foreground w-10 h-10" /></div>
                  <h2 className="text-5xl font-black text-gold uppercase tracking-tighter">অ্যাডমিন কন্ট্রোল</h2>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <button 
                    onClick={handleDownloadReport} 
                    disabled={pdfLoading === "report"}
                    className="flex items-center gap-3 bg-gold text-primary-foreground px-8 py-4 rounded-2xl font-black text-sm shadow-2xl disabled:opacity-50"
                  >
                    {pdfLoading === "report" ? <Loader2 className="animate-spin" /> : <FileText size={20} />} পূর্ণাঙ্গ রিপোর্ট (PDF)
                  </button>
                  <button onClick={handleExportCSV} className="flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"><FileSpreadsheet size={20} /> এক্সেল (CSV)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Forms are here */}
                <div className="bg-card p-12 rounded-[3.5rem] border-2 border-gold/20 shadow-2xl">
                  <h3 className="text-3xl font-black text-gold mb-10 flex items-center gap-4 uppercase tracking-tighter"><TrendingUp size={32} /> নতুন চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-4 tracking-[0.2em]">সদস্যের নাম *</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-6 py-5 outline-none focus:border-gold font-black shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-4 tracking-[0.2em]">টাকার পরিমাণ (৳) *</label>
                        <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-6 py-5 outline-none focus:border-gold font-black shadow-inner" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-4 tracking-[0.2em]">টার্গেট মাস *</label>
                        <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-6 py-5 outline-none focus:border-gold font-black shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gold ml-4 tracking-[0.2em]">এলাকা</label>
                        <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-6 py-5 outline-none focus:border-gold font-black shadow-inner cursor-pointer">
                          <option value="">নির্বাচন করুন</option>
                          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-6 rounded-3xl font-black text-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.3em]">ডাটা সেভ করুন ও রসিদ দিন</button>
                  </form>
                </div>

                {/* Add Expense */}
                <div className="bg-card p-12 rounded-[3.5rem] border-2 border-red-500/20 shadow-2xl">
                  <h3 className="text-3xl font-black text-red-500 mb-10 flex items-center gap-4 uppercase tracking-tighter"><TrendingDown size={32} /> নতুন খরচের এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-red-500 ml-4 tracking-[0.2em]">খরচের টাইটেল *</label>
                      <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-6 py-5 outline-none focus:border-red-500 font-black shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-red-500 ml-4 tracking-[0.2em]">পরিমাণ (৳) *</label>
                        <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-6 py-5 outline-none focus:border-red-500 font-black shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-red-500 ml-4 tracking-[0.2em]">তারিখ *</label>
                        <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-6 py-5 outline-none focus:border-red-500 font-black shadow-inner" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.3em]">খরচ রেকর্ড করুন</button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CommitteeContributions;
