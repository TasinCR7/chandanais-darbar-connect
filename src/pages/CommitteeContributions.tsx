import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, AlertCircle, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  Settings, PieChart as PieChartIcon, ChevronRight, Calculator, FileSpreadsheet, Printer, Loader2, RefreshCw
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
  const [refreshing, setRefreshing] = useState(false);
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
      try {
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
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const { data: cData } = await supabase.from("committee_contributions").select("*").order("created_at", { ascending: false });
      if (cData) setContributions(cData as Contribution[]);
      
      const { data: eData } = await supabase.from("committee_expenses").select("*").order("date", { ascending: false });
      if (eData) setExpenses(eData as Expense[]);
      
      const { data: mData } = await supabase.from("committee_members").select("id, name");
      if (mData) setCommitteeMembers(mData);
    } catch (err) {
      toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    setPdfLoading(c.id);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("CHANDANISH DARBAR SHARIF", 105, 18, { align: "center" });
      
      doc.setFontSize(10);
      doc.text("Pachuria, Chandanaish, Chattogram", 105, 25, { align: "center" });
      doc.setFontSize(12);
      doc.text("OFFICIAL MONEY RECEIPT", 105, 33, { align: "center" });

      // Body
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Receipt ID: ${c.id.toUpperCase().slice(0, 10)}`, 20, 55);
      doc.text(`Date: ${new Date(c.created_at).toLocaleDateString()}`, 150, 55);

      const tableData = [
        ["Member Name", c.name],
        ["Resident Area", c.area || "N/A"],
        ["Contribution Month", c.target_month || "N/A"],
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
        styles: { cellPadding: 5, fontSize: 10, font: "helvetica" },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [250, 250, 250], width: 50 } },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 40;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, finalY, 70, finalY);
      doc.setFontSize(9);
      doc.text("Member Signature", 45, finalY + 5, { align: "center" });
      
      doc.line(140, finalY, 190, finalY);
      doc.text("Authorized Signature", 165, finalY + 5, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This is an official computer-generated receipt for Chandanish Darbar Sharif Committee Fund.", 105, 280, { align: "center" });

      doc.save(`Receipt_${c.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("রসিদ ডাউনলোড হয়েছে!");
    } catch (e) {
      console.error(e);
      toast.error("পিডিএফ তৈরিতে সমস্যা হয়েছে!");
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

  const handleMemberSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম বা আইডি লিখুন");
      return;
    }
    setRefreshing(true);
    await fetchData(); // Ensure latest data
    const results = contributions.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResult(results);
    if (results.length === 0) {
      toast.info("কোনো তথ্য পাওয়া যায়নি");
    } else {
      toast.success(`${results.length}টি রেকর্ড পাওয়া গিয়েছে`);
    }
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    try {
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
    } catch (err) {
      toast.error("এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে");
    }
  };

  const handleSubmitContribution = async (e: FormEvent) => {
    e.preventDefault();
    if (Number(amount) <= 0) {
      toast.error("সঠিক পরিমাণ লিখুন");
      return;
    }
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
    if (Number(expenseAmount) <= 0) {
      toast.error("সঠিক পরিমাণ লিখুন");
      return;
    }
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
    <div className="min-h-screen bg-background pb-20">
      <SEO title="কমিটি অর্থ সংগ্রহ" description="স্বচ্ছ ও আধুনিক কমিটি ফান্ড ব্যবস্থাপনা।" />

      {/* Header Section */}
      <header className="bg-gold-gradient text-primary-foreground py-10 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center md:justify-start gap-3">
              <Wallet className="w-10 h-10" /> অর্থ সংগ্রহ ও ব্যবস্থাপনা
            </h1>
            <p className="text-sm opacity-90 font-medium tracking-wide">চন্দনাইশ দরবার শরীফ কমিটি ফান্ড ট্র্যাকিং সিস্টেম</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all ${refreshing ? "animate-spin" : ""}`} title="রিফ্রেশ">
              <RefreshCw size={20} />
            </button>
            {isAdmin && (
              <div className="bg-white/20 px-5 py-2.5 rounded-xl border border-white/30 flex items-center gap-2 shadow-lg">
                <Shield className="w-6 h-6 animate-pulse" />
                <span className="font-bold uppercase tracking-widest text-xs">অ্যাডমিন মোড</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-card border border-gold/10 p-2 rounded-2xl shadow-xl flex flex-wrap gap-2 justify-center md:justify-start">
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
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-8 rounded-3xl border border-gold/20 shadow-lg group hover:border-gold transition-colors">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">মোট সংগ্রহ ({filterMonth || "সব সময়"})</h3>
                  <p className="text-4xl font-bold text-gold">৳{monthTotal.toLocaleString()}</p>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-red-500/10 shadow-lg group hover:border-red-500/40 transition-colors">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">মোট খরচ ({filterMonth || "সব সময়"})</h3>
                  <p className="text-4xl font-bold text-red-500">৳{monthExpense.toLocaleString()}</p>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-green-500/10 shadow-lg group hover:border-green-500/40 transition-colors">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">অবশিষ্ট ফান্ড</h3>
                  <p className="text-4xl font-bold text-green-600">৳{(monthTotal - monthExpense).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gold flex items-center gap-3"><Target className="w-8 h-8" /> বার্ষিক লক্ষ্যমাত্রা ({currentYear})</h2>
                  <p className="text-xl font-bold text-gold">৳{currentYearTotal.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">/ ৳{YEARLY_GOAL.toLocaleString()}</span></p>
                </div>
                <div className="relative h-6 bg-secondary rounded-full overflow-hidden border border-gold/20 mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${goalPercentage}%` }} transition={{ duration: 1.5 }} className="h-full bg-gold" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase text-primary-foreground tracking-tighter mix-blend-overlay">{goalPercentage.toFixed(1)}% Completed</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg min-h-[350px]">
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><TrendingUp size={20} /> মাসিক সংগ্রহের গ্রাফ</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getMonthlyChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg min-h-[350px]">
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><PieChartIcon size={20} /> এলাকা ভিত্তিক পরিসংখ্যান</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={getAreaPieData()} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                          {getAreaPieData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-10 rounded-3xl border border-gold/20 shadow-2xl text-center">
                <h2 className="text-3xl font-bold text-gold mb-2">নিজের জমার হিসাব ও রসিদ</h2>
                <p className="text-muted-foreground mb-8">আপনার নাম বা আইডি লিখে সার্চ করুন</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="আপনার নাম বা আইডি লিখুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleMemberSearch()}
                    className="flex-1 bg-background border-2 border-gold/10 rounded-2xl px-6 py-4 outline-none focus:border-gold transition-all"
                  />
                  <button onClick={handleMemberSearch} disabled={refreshing} className="bg-gold text-primary-foreground px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {refreshing ? <Loader2 className="animate-spin" /> : <Search size={20} />} খুঁজুন
                  </button>
                </div>
              </div>

              {searchResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm md:text-base">
                      <thead className="bg-gold/5 text-gold font-bold">
                        <tr>
                          <th className="p-6">তারিখ</th>
                          <th className="p-6">মাসের জন্য</th>
                          <th className="p-6 text-right">পরিমাণ</th>
                          <th className="p-6 text-center">রসিদ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {searchResult.map(c => (
                          <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                            <td className="p-6">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-6 font-bold text-muted-foreground uppercase text-xs tracking-widest">{c.target_month || "-"}</td>
                            <td className="p-6 text-right font-bold text-gold">৳{c.amount.toLocaleString()}</td>
                            <td className="p-6 text-center">
                              <button onClick={() => handleDownloadSingleReceipt(c)} disabled={pdfLoading === c.id} className="p-3 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all shadow-sm">
                                {pdfLoading === c.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {searchResult.length === 0 && <div className="p-20 text-center text-muted-foreground font-bold">কোনো রেকর্ড পাওয়া যায়নি।</div>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Transparency Tab */}
          {activeTab === "transparency" && (
            <motion.div key="transparency" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gold flex items-center gap-3"><TrendingDown className="text-red-500" /> খরচের বিস্তারিত বিবরণী</h2>
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border border-gold/10 rounded-xl px-4 py-2 text-sm font-bold" />
              </div>
              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-sm md:text-base">
                  <thead className="bg-red-500/5 text-red-500 font-bold border-b border-gold/10">
                    <tr>
                      <th className="p-6">তারিখ</th>
                      <th className="p-6">খাত / বিবরণ</th>
                      <th className="p-6 text-right">টাকার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id} className="hover:bg-red-500/5 transition-colors">
                        <td className="p-6 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-6 font-bold">{e.title}</td>
                        <td className="p-6 text-right font-bold text-red-500">৳{e.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-muted-foreground font-bold">কোনো খরচের রেকর্ড পাওয়া যায়নি।</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-gold text-center mb-8 uppercase tracking-widest">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
              {Object.entries(
                contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth)))
                .reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([name, total], idx) => (
                <div key={name} className="bg-card p-6 rounded-2xl border border-gold/10 flex justify-between items-center shadow-md hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${idx === 0 ? "bg-gold text-white" : "bg-gold/10 text-gold"}`}>{idx + 1}</div>
                    <span className="font-bold text-lg">{name}</span>
                  </div>
                  <span className="font-bold text-xl text-gold">৳{total.toLocaleString()}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Admin Tab */}
          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <h2 className="text-3xl font-bold text-gold flex items-center gap-3 uppercase tracking-tighter"><Shield size={32} /> অ্যাডমিন কন্ট্রোল প্যানেল</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleDownloadReport} disabled={pdfLoading === "report"} className="bg-gold text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2">
                    {pdfLoading === "report" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} পূর্ণাঙ্গ রিপোর্ট (PDF)
                  </button>
                  <button onClick={handleExportCSV} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2">
                    <FileSpreadsheet size={18} /> এক্সেল (CSV)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-card p-10 rounded-3xl border-2 border-gold/20 shadow-2xl">
                  <h3 className="text-2xl font-bold text-gold mb-8 flex items-center gap-3"><TrendingUp size={28} /> নতুন চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="সদস্যের নাম *" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-inner" />
                      <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="টাকার পরিমাণ (৳) *" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                      <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold cursor-pointer">
                        <option value="">এলাকা নির্বাচন করুন</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="ট্রানজেকশন আইডি" className="w-full bg-background border-2 border-gold/10 rounded-2xl px-5 py-4 outline-none focus:border-gold shadow-inner" />
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-5 rounded-2xl font-bold text-xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">সেভ করুন ও রসিদ দিন</button>
                  </form>
                </div>

                <div className="bg-card p-10 rounded-3xl border-2 border-red-500/20 shadow-2xl">
                  <h3 className="text-2xl font-bold text-red-500 mb-8 flex items-center gap-3"><TrendingDown size={28} /> নতুন খরচের এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-6">
                    <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="খরচের টাইটেল / বিবরণ *" className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold shadow-inner" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="টাকার পরিমাণ (৳) *" className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold" />
                      <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border-2 border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest">খরচ রেকর্ড করুন</button>
                  </form>
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-gold text-primary-foreground font-bold uppercase tracking-widest">
                    <tr>
                      <th className="p-6">তারিখ</th>
                      <th className="p-6">নাম ও এলাকা</th>
                      <th className="p-6">টার্গেট মাস</th>
                      <th className="p-6 text-right">পরিমাণ</th>
                      <th className="p-6 text-center">রসিদ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {filteredByMonth.map(c => (
                      <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                        <td className="p-6 font-medium text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-6">
                          <div className="font-bold text-gold text-lg">{c.name}</div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">{c.area || "N/A"}</div>
                        </td>
                        <td className="p-6 font-bold text-muted-foreground uppercase text-xs">{c.target_month || "-"}</td>
                        <td className="p-6 text-right font-bold text-xl">৳{c.amount.toLocaleString()}</td>
                        <td className="p-6 text-center">
                          <button onClick={() => handleDownloadSingleReceipt(c)} className="p-3 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all"><Download size={20} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-10 z-[100]">
        <button className="bg-gold text-primary-foreground p-5 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-3 font-bold group border-2 border-white/20">
          <Calculator className="w-7 h-7" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-500 whitespace-nowrap text-sm">হিসাব সহকারী</span>
        </button>
      </div>
    </div>
  );
};

export default CommitteeContributions;
