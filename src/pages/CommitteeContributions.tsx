import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, AlertCircle, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  Settings, PieChart as PieChartIcon, ChevronRight, Calculator, FileSpreadsheet, Printer, Loader2
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
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 210, 35, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("CHANDANISH DARBAR SHARIF", 105, 18, { align: "center" });
      doc.setFontSize(11);
      doc.text("OFFICIAL MONEY RECEIPT", 105, 28, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Receipt ID: ${c.id.toUpperCase().slice(0, 10)}`, 20, 50);
      doc.text(`Date: ${new Date(c.created_at).toLocaleDateString()}`, 150, 50);
      const tableData = [
        ["Member Name", c.name],
        ["Area", c.area || "N/A"],
        ["For Month", c.target_month || "N/A"],
        ["Amount", `${c.amount.toLocaleString()} BDT`],
        ["Method", c.payment_method || "Cash"],
        ["Txn ID", c.transaction_id || "-"]
      ];
      // @ts-ignore
      doc.autoTable({
        startY: 60,
        body: tableData,
        theme: 'grid',
        styles: { cellPadding: 4, fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', width: 40 } },
      });
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      doc.line(20, finalY, 70, finalY);
      doc.text("Member Sign", 35, finalY + 5, { align: "center" });
      doc.line(140, finalY, 190, finalY);
      doc.text("Auth Sign", 165, finalY + 5, { align: "center" });
      doc.save(`Receipt_${c.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("রসিদ ডাউনলোড হয়েছে!");
    } catch (e) { toast.error("পিডিএফ তৈরিতে সমস্যা হয়েছে!"); }
    setPdfLoading(null);
  };

  const handleDownloadReport = () => {
    setPdfLoading("report");
    try {
      const doc = new jsPDF();
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 210, 35, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("CHANDANISH DARBAR SHARIF", 105, 18, { align: "center" });
      doc.setFontSize(11);
      doc.text("FINANCIAL STATEMENT", 105, 28, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Period: ${filterMonth || "All"}`, 20, 50);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 50);
      const stats = [["Total Collection", `${monthTotal} BDT`], ["Total Expense", `${monthExpense} BDT`], ["Net Balance", `${monthTotal - monthExpense} BDT`]];
      // @ts-ignore
      doc.autoTable({ startY: 60, body: stats, theme: 'plain', styles: { fontStyle: 'bold' } });
      const tableData = filteredByMonth.map(c => [new Date(c.created_at).toLocaleDateString(), c.name, c.area || "-", c.target_month || "-", `${c.amount} BDT`]);
      // @ts-ignore
      doc.autoTable({ startY: (doc as any).lastAutoTable.finalY + 10, head: [['Date', 'Name', 'Area', 'Month', 'Amount']], body: tableData, headStyles: { fillColor: [212, 175, 55] } });
      doc.save("Financial_Report.pdf");
      toast.success("রিপোর্ট ডাউনলোড হয়েছে!");
    } catch (e) { toast.error("রিপোর্ট তৈরিতে সমস্যা হয়েছে!"); }
    setPdfLoading(null);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Name", "Area", "Month", "Amount", "Method"];
    const rows = contributions.map(c => [new Date(c.created_at).toLocaleDateString(), c.name, c.area || "", c.target_month || "", c.amount, c.payment_method || ""]);
    const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", "Contributions.csv"); link.click();
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
      toast.success("সফল হয়েছে!");
      const newEntry = { id, name, amount: Number(amount), area: area || null, note, created_at: new Date().toISOString(), target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null };
      handleDownloadSingleReceipt(newEntry);
      setName(""); setAmount(""); setArea(""); setNote(""); fetchData();
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_expenses").insert([{ title: expenseTitle, amount: Number(expenseAmount), date: expenseDate, note: expenseNote }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("সফল!"); setExpenseTitle(""); setExpenseAmount(""); fetchData(); }
  };

  const currentYear = new Date().getFullYear().toString();
  const currentYearTotal = contributions.filter(c => c.created_at.startsWith(currentYear)).reduce((s, c) => s + c.amount, 0);
  const goalPercentage = Math.min((currentYearTotal / YEARLY_GOAL) * 100, 100);
  const filteredByMonth = contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth)));
  const monthTotal = filteredByMonth.reduce((s, c) => s + c.amount, 0);
  const monthExpense = expenses.filter(e => e.date.startsWith(filterMonth)).reduce((s, e) => s + e.amount, 0);

  const getMonthlyChartData = () => {
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); }).reverse();
    return months.map(m => ({ name: m, total: contributions.filter(c => c.target_month === m || c.created_at.startsWith(m)).reduce((s, c) => s + c.amount, 0) }));
  };

  const getAreaPieData = () => {
    const areaStats = contributions.reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>);
    return Object.entries(areaStats).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <SEO title="কমিটি অর্থ সংগ্রহ" description="কমিটি ফান্ড ব্যবস্থাপনা।" />

      <header className="bg-gold-gradient text-primary-foreground py-8 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Wallet className="w-8 h-8" /> অর্থ সংগ্রহ ও ব্যবস্থাপনা
            </h1>
            <p className="text-sm opacity-80">স্বচ্ছ ডিজিটাল হিসাব ব্যবস্থাপনা</p>
          </div>
          {isAdmin && (
            <div className="bg-white/20 px-4 py-2 rounded-lg border border-white/30 flex items-center gap-2 text-sm">
              <Shield className="w-5 h-5" />
              <span className="font-bold">অ্যাডমিন মোড</span>
            </div>
          )}
        </div>
      </header>

      <nav className="container mx-auto px-4 -mt-6">
        <div className="bg-card border border-gold/10 p-1.5 rounded-xl shadow-lg flex flex-wrap gap-1 justify-center md:justify-start overflow-x-auto">
          {[
            { id: "overview", label: "সারসংক্ষেপ", icon: <LayoutGrid size={16} /> },
            { id: "search", label: "ব্যক্তিগত হিসাব", icon: <UserIcon size={16} /> },
            { id: "transparency", label: "স্বচ্ছতা", icon: <PieChartIcon size={16} /> },
            { id: "leaderboard", label: "র‍্যাঙ্কিং", icon: <Award size={16} /> },
            ...(isAdmin ? [{ id: "admin", label: "অ্যাডমিন", icon: <Settings size={16} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id ? "bg-gold text-primary-foreground shadow-md" : "hover:bg-gold/5 text-muted-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-sm">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase mb-1">মোট সংগ্রহ</h3>
                  <p className="text-3xl font-bold text-gold">৳{monthTotal.toLocaleString()}</p>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-red-500/10 shadow-sm">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase mb-1">মোট খরচ</h3>
                  <p className="text-3xl font-bold text-red-500">৳{monthExpense.toLocaleString()}</p>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-green-500/10 shadow-sm">
                  <h3 className="text-muted-foreground text-xs font-bold uppercase mb-1">ব্যালেন্স</h3>
                  <p className="text-3xl font-bold text-green-600">৳{(monthTotal - monthExpense).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gold flex items-center gap-2"><Target size={20} /> লক্ষ্যমাত্রা ({currentYear})</h2>
                  <span className="text-sm font-bold">৳{currentYearTotal.toLocaleString()} / ৳{YEARLY_GOAL.toLocaleString()}</span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden border border-gold/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${goalPercentage}%` }} className="h-full bg-gold" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-sm h-[300px]">
                  <h3 className="text-md font-bold text-gold mb-4">মাসিক সংগ্রহের গ্রাফ</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMonthlyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-sm h-[300px]">
                  <h3 className="text-md font-bold text-gold mb-4">এলাকা ভিত্তিক ডাটা</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={getAreaPieData()} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {getAreaPieData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
              <div className="bg-card p-8 rounded-2xl border border-gold/10 shadow-md text-center">
                <h2 className="text-xl font-bold text-gold mb-4">নিজের জমার হিসাব দেখুন</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="আপনার নাম লিখুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-background border border-gold/20 rounded-lg px-4 py-2.5 outline-none focus:border-gold"
                  />
                  <button onClick={handleMemberSearch} className="bg-gold text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm">খুঁজুন</button>
                </div>
              </div>

              {searchResult && (
                <div className="bg-card rounded-2xl border border-gold/10 overflow-hidden shadow-md">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gold/5 text-gold font-bold">
                      <tr>
                        <th className="p-4">তারিখ</th>
                        <th className="p-4">মাস</th>
                        <th className="p-4 text-right">পরিমাণ</th>
                        <th className="p-4 text-center">রসিদ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/5">
                      {searchResult.map(c => (
                        <tr key={c.id}>
                          <td className="p-4">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-4 uppercase text-[10px] font-bold text-muted-foreground">{c.target_month || "-"}</td>
                          <td className="p-4 text-right font-bold">৳{c.amount}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDownloadSingleReceipt(c)} disabled={!!pdfLoading} className="text-gold p-2 hover:bg-gold/10 rounded-full">
                              {pdfLoading === c.id ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "transparency" && (
            <motion.div key="transparency" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gold flex items-center gap-2"><TrendingDown className="text-red-500" /> খরচের বিবরণী</h2>
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border border-gold/10 rounded-lg px-3 py-2 text-xs font-bold" />
              </div>
              <div className="bg-card rounded-2xl border border-gold/10 overflow-hidden shadow-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-red-500/5 text-red-500 font-bold border-b border-gold/10">
                    <tr>
                      <th className="p-4">তারিখ</th>
                      <th className="p-4">বিবরণ</th>
                      <th className="p-4 text-right">পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id}>
                        <td className="p-4 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-4 font-bold">{e.title}</td>
                        <td className="p-4 text-right font-bold text-red-500">৳{e.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-xl font-bold text-gold text-center mb-6">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
              {Object.entries(
                contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth)))
                .reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([name, total], idx) => (
                <div key={name} className="bg-card p-4 rounded-xl border border-gold/10 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-gold text-white" : "bg-gold/10 text-gold"}`}>{idx + 1}</div>
                    <span className="font-bold text-sm">{name}</span>
                  </div>
                  <span className="font-bold text-gold">৳{total.toLocaleString()}</span>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gold flex items-center gap-2"><Shield size={20} /> অ্যাডমিন কন্ট্রোল</h2>
                <div className="flex gap-2">
                  <button onClick={handleDownloadReport} className="bg-gold text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                    {pdfLoading === "report" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} রিপোর্ট
                  </button>
                  <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-1"><FileSpreadsheet size={14} /> এক্সেল</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-gold/20 shadow-lg">
                  <h3 className="text-md font-bold text-gold mb-4">নতুন চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="নাম" className="bg-background border border-gold/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" />
                      <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="পরিমাণ" className="bg-background border border-gold/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-gold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="bg-background border border-gold/10 rounded-lg px-3 py-2 text-sm outline-none" />
                      <select value={area} onChange={e => setArea(e.target.value)} className="bg-background border border-gold/10 rounded-lg px-3 py-2 text-sm outline-none">
                        <option value="">এলাকা</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-gold text-white py-2.5 rounded-lg font-bold text-sm shadow-md">এন্ট্রি করুন</button>
                  </form>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-red-500/10 shadow-lg">
                  <h3 className="text-md font-bold text-red-500 mb-4">নতুন খরচ এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-4">
                    <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="টাইটেল" className="w-full bg-background border border-red-500/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="পরিমাণ" className="bg-background border border-red-500/10 rounded-lg px-3 py-2 text-sm outline-none" />
                      <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="bg-background border border-red-500/10 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-md">খরচ রেকর্ড করুন</button>
                  </form>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-gold/10 overflow-hidden shadow-lg overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead className="bg-gold text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">তারিখ</th>
                      <th className="p-4">নাম</th>
                      <th className="p-4">এলাকা</th>
                      <th className="p-4 text-right">পরিমাণ</th>
                      <th className="p-4 text-center">রসিদ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {filteredByMonth.map(c => (
                      <tr key={c.id} className="hover:bg-gold/5">
                        <td className="p-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-4 font-bold">{c.name}</td>
                        <td className="p-4 text-xs font-bold text-muted-foreground">{c.area || "-"}</td>
                        <td className="p-4 text-right font-bold">৳{c.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDownloadSingleReceipt(c)} className="text-gold p-2 hover:bg-gold/10 rounded-full"><Download size={16} /></button>
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

      <div className="fixed bottom-6 right-6">
        <button className="bg-gold text-white p-3 rounded-full shadow-xl hover:scale-110 transition-all flex items-center gap-2 font-bold text-xs">
          <Calculator className="w-5 h-5" />
          <span>সহকারী</span>
        </button>
      </div>
    </div>
  );
};

export default CommitteeContributions;
