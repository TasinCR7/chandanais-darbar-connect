import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  Settings, PieChart as PieChartIcon, Calculator, FileSpreadsheet, Printer, Loader2, RefreshCw, AlertCircle
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

interface Member {
  id: string;
  name: string;
  designation?: string;
  area?: string;
  phone?: string;
  is_active: boolean;
}

const AREAS = ["চন্দনাইশ", "পটিয়া", "আনোয়ারা", "সাতকানিয়া", "লোহাগাড়া", "বাঁশখালী", "বোয়ালখালী", "অন্যান্য"];
const PAYMENT_METHODS = ["ক্যাশ (Cash)", "বিকাশ (bKash)", "নগদ (Nagad)", "রকেট (Rocket)", "ব্যাংক (Bank)"];
const YEARLY_GOAL = 1000000;
const COLORS = ["#D4AF37", "#C0C0C0", "#CD7F32", "#FFD700", "#FF4500", "#1E90FF", "#32CD32", "#8A2BE2"];

const CommitteeContributions = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  
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

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Contribution[] | null>(null);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberArea, setNewMemberArea] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberDesignation, setNewMemberDesignation] = useState("");

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
      } catch (err) { console.error(err); }
      setLoading(false);
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
      const { data: mData } = await supabase.from("committee_members").select("*").eq("is_active", true).order("name");
      if (mData) setMembers(mData as Member[]);
    } catch (err) { toast.error("তথ্য লোড করতে সমস্যা হয়েছে"); }
    setRefreshing(false);
  };

  const addPdfHeader = (doc: jsPDF, subtitle: string) => {
    const W = 210;
    doc.setFillColor(33, 33, 33);
    doc.rect(0, 0, W, 50, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 50, W, 3, "F");
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CHANDANISH DARBAR SHARIF", W / 2, 18, { align: "center" });
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Chandanish, Chattogram, Bangladesh | chandanaishdarbarsharif@gmail.com", W / 2, 28, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(subtitle, W / 2, 42, { align: "center" });
  };

  const addPdfFooter = (doc: jsPDF) => {
    const W = 210;
    const H = 297;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(20, H - 22, W - 20, H - 22);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer-generated document. No physical signature is required for digital copies.", W / 2, H - 16, { align: "center" });
    doc.text("Chandanish Darbar Sharif Committee | Generated: " + new Date().toLocaleString(), W / 2, H - 11, { align: "center" });
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    setPdfLoading(c.id);
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "OFFICIAL PAYMENT RECEIPT");

      // Watermark
      doc.setTextColor(245, 245, 245);
      doc.setFontSize(65);
      doc.setFont("helvetica", "bold");
      doc.text("PAID", W / 2, 170, { align: "center", angle: 35 });

      // Receipt meta
      const rid = c.id.slice(0, 8).toUpperCase();
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Receipt No: #" + rid, 20, 64);
      doc.text("Date: " + new Date(c.created_at).toLocaleDateString(), W - 20, 64, { align: "right" });

      // Main table with all fields
      const rows = [
        ["Member Name / Donor", c.name || "-"],
        ["Area / Location", c.area || "N/A"],
        ["Contribution Month", c.target_month || "N/A"],
        ["Amount Paid", c.amount.toLocaleString() + " BDT"],
        ["Payment Method", c.payment_method || "Cash"],
        ["Transaction ID", c.transaction_id || "N/A"],
        ["Note / Remarks", c.note || "-"],
      ];
      autoTable(doc, {
        startY: 72,
        body: rows,
        theme: "striped",
        styles: { fontSize: 11, cellPadding: 6, lineColor: [212, 175, 55], lineWidth: 0.15 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 60, fillColor: [255, 248, 220], textColor: [80, 60, 0] },
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { left: 20, right: 20 },
      });

      let curY = (doc as any).lastAutoTable.finalY + 12;

      // Highlighted amount box
      doc.setFillColor(212, 175, 55);
      doc.roundedRect(20, curY, W - 40, 16, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Total Paid: " + c.amount.toLocaleString() + " BDT", W / 2, curY + 11, { align: "center" });
      curY += 30;

      // Signatures
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(20, curY + 12, 80, curY + 12);
      doc.text("Member Signature", 50, curY + 18, { align: "center" });
      doc.line(130, curY + 12, 190, curY + 12);
      doc.text("Authorized Signature & Seal", 160, curY + 18, { align: "center" });

      addPdfFooter(doc);
      doc.save("Receipt_" + rid + ".pdf");
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch (e) {
      console.error("PDF Error:", e);
      toast.error("পিডিএফ তৈরিতে সমস্যা হয়েছে! ব্রাউজার রিফ্রেশ করুন।");
    }
    setPdfLoading(null);
  };

  const handleDownloadReport = () => {
    setPdfLoading("report");
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "COMMITTEE FINANCIAL REPORT");

      // Meta
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Report Period: " + (filterMonth || "All Time"), 20, 62);
      doc.text("Generated: " + new Date().toLocaleDateString(), W - 20, 62, { align: "right" });
      doc.text("Total Entries: " + filteredByMonth.length, 20, 68);

      // Summary stats
      const balance = monthTotal - monthExpense;
      const summaryRows = [
        ["Total Collection (Income)", monthTotal.toLocaleString() + " BDT"],
        ["Total Expenses", monthExpense.toLocaleString() + " BDT"],
        ["Net Balance", balance.toLocaleString() + " BDT"],
        ["Yearly Goal Progress", currentYearTotal.toLocaleString() + " / " + YEARLY_GOAL.toLocaleString() + " BDT (" + goalPercentage.toFixed(1) + "%)"],
      ];
      autoTable(doc, {
        startY: 75,
        body: summaryRows,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [255, 248, 220], textColor: [80, 60, 0], cellWidth: 70 },
          1: { fontStyle: "bold" },
        },
        margin: { left: 20, right: 20 },
      });

      // Detail header
      let detailY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text("Contribution Details", 20, detailY);
      detailY += 4;

      // Full detail table
      const detailRows = filteredByMonth.map((c, i) => [
        String(i + 1),
        new Date(c.created_at).toLocaleDateString(),
        c.name,
        c.area || "-",
        c.target_month || "-",
        c.amount.toLocaleString(),
        c.payment_method || "Cash",
        c.transaction_id || "-",
      ]);
      autoTable(doc, {
        startY: detailY,
        head: [["#", "Date", "Name", "Area", "Month", "Amount", "Payment", "TrxID"]],
        body: detailRows,
        theme: "grid",
        headStyles: { fillColor: [33, 33, 33], textColor: [212, 175, 55], fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 8 }, 5: { fontStyle: "bold", halign: "right" } },
        margin: { left: 15, right: 15 },
        didDrawPage: () => { addPdfFooter(doc); },
      });

      // Grand total bar
      const gtY = (doc as any).lastAutoTable.finalY + 8;
      if (gtY < 270) {
        doc.setFillColor(212, 175, 55);
        doc.roundedRect(15, gtY, W - 30, 14, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Grand Total: " + monthTotal.toLocaleString() + " BDT | Balance: " + balance.toLocaleString() + " BDT", W / 2, gtY + 10, { align: "center" });
      }

      addPdfFooter(doc);
      doc.save("Financial_Report_" + (filterMonth || "all") + ".pdf");
      toast.success("রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("পিডিএফ রিপোর্ট তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };

  const handleDownloadAreaReport = () => {
    setPdfLoading("area-report");
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "AREA-WISE CONTRIBUTION REPORT");

      // Meta
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Generated: " + new Date().toLocaleDateString(), W - 20, 62, { align: "right" });
      doc.text("Total Areas: " + AREAS.length + " | Total Entries: " + contributions.length, 20, 62);

      let finalY = 72;
      let grandTotal = 0;
      let areaIndex = 0;

      AREAS.forEach((areaName) => {
        const ac = contributions.filter(c => c.area === areaName);
        if (ac.length === 0) return;
        areaIndex++;
        const areaTotal = ac.reduce((sum, c) => sum + c.amount, 0);
        grandTotal += areaTotal;

        if (finalY > 230) {
          addPdfFooter(doc);
          doc.addPage();
          finalY = 20;
        }

        // Area header bar
        doc.setFillColor(33, 33, 33);
        doc.roundedRect(15, finalY, W - 30, 12, 2, 2, "F");
        doc.setTextColor(212, 175, 55);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(areaIndex + ". " + areaName, 20, finalY + 8);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(ac.length + " entries | Total: " + areaTotal.toLocaleString() + " BDT", W - 20, finalY + 8, { align: "right" });
        finalY += 16;

        const rows = ac.map((c, i) => [
          String(i + 1),
          new Date(c.created_at).toLocaleDateString(),
          c.name,
          c.target_month || "-",
          c.amount.toLocaleString(),
          c.payment_method || "Cash",
          c.transaction_id || "-",
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [["#", "Date", "Name", "Month", "Amount (BDT)", "Payment", "TrxID"]],
          body: rows,
          theme: "grid",
          headStyles: { fillColor: [212, 175, 55], textColor: [33, 33, 33], fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 8 }, 4: { fontStyle: "bold", halign: "right" } },
          margin: { left: 15, right: 15 },
        });

        // Area subtotal
        const subY = (doc as any).lastAutoTable.finalY;
        doc.setFillColor(255, 248, 220);
        doc.rect(15, subY, W - 30, 8, "F");
        doc.setTextColor(80, 60, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Subtotal (" + areaName + "): " + areaTotal.toLocaleString() + " BDT", W - 20, subY + 6, { align: "right" });
        finalY = subY + 18;
      });

      // Grand total
      if (finalY > 260) { addPdfFooter(doc); doc.addPage(); finalY = 20; }
      doc.setFillColor(33, 33, 33);
      doc.roundedRect(15, finalY, W - 30, 16, 3, 3, "F");
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total (All Areas): " + grandTotal.toLocaleString() + " BDT", W / 2, finalY + 11, { align: "center" });

      addPdfFooter(doc);
      doc.save("Area_Report_" + new Date().toISOString().slice(0, 10) + ".pdf");
      toast.success("এলাকা ভিত্তিক রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("রিপোর্ট তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };

  const handleMemberSearch = async () => {
    if (!searchQuery.trim()) { toast.error("আপনার নাম লিখুন"); return; }
    setRefreshing(true);
    await fetchData();
    const results = contributions.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()));
    setSearchResult(results);
    if (results.length === 0) toast.info("কোনো তথ্য পাওয়া যায়নি");
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Name", "Area", "Month", "Amount (BDT)", "Payment Method", "Transaction ID", "Note"];
    const rows = contributions.map(c => [
      new Date(c.created_at).toLocaleDateString(),
      `"${c.name}"`,
      c.area || "",
      c.target_month || "",
      c.amount,
      c.payment_method || "Cash",
      c.transaction_id || "",
      `"${c.note || ""}"`
    ]);
    const totalRow = ["", "", "", "TOTAL", contributions.reduce((s, c) => s + c.amount, 0), "", "", ""];
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n") + "\n" + totalRow.join(",");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Contributions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
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
      setName(""); setAmount(""); setArea(""); setNote(""); setTransactionId(""); fetchData();
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_expenses").insert([{ title: expenseTitle, amount: Number(expenseAmount), date: expenseDate, note: expenseNote }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("সফল!"); setExpenseTitle(""); setExpenseAmount(""); fetchData(); }
  };

  const handleSubmitMember = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_members").insert([{ name: newMemberName, area: newMemberArea, phone: newMemberPhone, designation: newMemberDesignation }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("সদস্য যুক্ত হয়েছে!"); setNewMemberName(""); setNewMemberPhone(""); setNewMemberDesignation(""); fetchData(); }
  };

  const getDuesForMonth = (month: string) => {
    const paidMemberNames = new Set(contributions.filter(c => c.target_month === month).map(c => c.name.toLowerCase()));
    return members.filter(m => !paidMemberNames.has(m.name.toLowerCase()));
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
    <div className="min-h-screen bg-background pb-20">
      <SEO title="কমিটি অর্থ সংগ্রহ" description="কমিটি ফান্ড ব্যবস্থাপনা।" />

      <header className="bg-gold-gradient text-primary-foreground py-10 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Wallet className="w-9 h-9" /> অর্থ সংগ্রহ ও ব্যবস্থাপনা
            </h1>
            <p className="text-sm opacity-90">চন্দনাইশ দরবার শরীফ কমিটি ফান্ড</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all ${refreshing ? "animate-spin" : ""}`}>
              <RefreshCw size={20} />
            </button>
            {isAdmin && <div className="bg-white/20 px-4 py-2 rounded-xl border border-white/30 font-bold text-xs uppercase tracking-widest">অ্যাডমিন মোড</div>}
          </div>
        </div>
      </header>

      <nav className="container mx-auto px-4 -mt-8">
        <div className="bg-card border border-gold/10 p-2 rounded-2xl shadow-xl flex flex-wrap gap-2 justify-center md:justify-start">
          {[
            { id: "overview", label: "সারসংক্ষেপ", icon: <LayoutGrid size={18} /> }, 
            { id: "search", label: "ব্যক্তিগত হিসাব", icon: <UserIcon size={18} /> }, 
            { id: "dues", label: "বকেয়া (Dues)", icon: <AlertCircle size={18} /> },
            { id: "transparency", label: "স্বচ্ছতা", icon: <PieChartIcon size={18} /> }, 
            { id: "leaderboard", label: "র‍্যাঙ্কিং", icon: <Award size={18} /> }, 
            ...(isAdmin ? [{ id: "admin", label: "অ্যাডমিন", icon: <Settings size={18} /> }] : [])
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? "bg-gold text-primary-foreground shadow-lg" : "hover:bg-gold/5 text-muted-foreground"}`}>{tab.icon} {tab.label}</button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-4 mt-12">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg"><h3 className="text-muted-foreground text-xs font-bold uppercase mb-2">মোট সংগ্রহ</h3><p className="text-4xl font-bold text-gold">৳{monthTotal.toLocaleString()}</p></div>
                <div className="bg-card p-8 rounded-3xl border border-red-500/10 shadow-lg"><h3 className="text-muted-foreground text-xs font-bold uppercase mb-2">মোট খরচ</h3><p className="text-4xl font-bold text-red-500">৳{monthExpense.toLocaleString()}</p></div>
                <div className="bg-card p-8 rounded-3xl border border-green-500/10 shadow-lg"><h3 className="text-muted-foreground text-xs font-bold uppercase mb-2">ব্যালেন্স</h3><p className="text-4xl font-bold text-green-600">৳{(monthTotal - monthExpense).toLocaleString()}</p></div>
              </div>
              <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-xl">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gold flex items-center gap-3"><Target size={30} /> লক্ষ্যমাত্রা ({currentYear})</h2><p className="text-xl font-bold text-gold">৳{currentYearTotal.toLocaleString()} / ৳{YEARLY_GOAL.toLocaleString()}</p></div>
                <div className="h-6 bg-secondary rounded-full overflow-hidden border border-gold/10"><motion.div initial={{ width: 0 }} animate={{ width: `${goalPercentage}%` }} transition={{ duration: 1 }} className="h-full bg-gold" /></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg h-[350px]">
                  <h3 className="text-lg font-bold text-gold mb-6">মাসিক গ্রাফ</h3>
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={getMonthlyChartData()}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-gold/10 shadow-lg h-[350px]">
                  <h3 className="text-lg font-bold text-gold mb-6">এলাকা ভিত্তিক ডাটা</h3>
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getAreaPieData()} cx="50%" cy="50%" outerRadius={80} dataKey="value">{getAreaPieData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: '11px' }} /></PieChart></ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
              <div className="bg-card p-10 rounded-3xl border border-gold/20 shadow-2xl text-center">
                <h2 className="text-3xl font-bold text-gold mb-4">রসিদ ডাউনলোড করুন</h2>
                <div className="flex flex-col md:flex-row gap-3">
                  <input type="text" placeholder="নাম বা আইডি..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleMemberSearch()} className="flex-1 bg-background border-2 border-gold/10 rounded-2xl px-6 py-4 outline-none focus:border-gold" />
                  <button onClick={handleMemberSearch} disabled={refreshing} className="bg-gold text-primary-foreground px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2">{refreshing ? <Loader2 className="animate-spin" /> : <Search size={20} />} খুঁজুন</button>
                </div>
              </div>
              {searchResult && (
                <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-gold/5 text-gold font-bold"><tr><th className="p-6">তারিখ</th><th className="p-6">মাস</th><th className="p-6 text-right">পরিমাণ</th><th className="p-6 text-center">রসিদ</th></tr></thead>
                    <tbody className="divide-y divide-gold/10">
                      {searchResult.map(c => (
                        <tr key={c.id} className="hover:bg-gold/5">
                          <td className="p-6">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-6 font-bold text-muted-foreground uppercase text-xs">{c.target_month || "-"}</td>
                          <td className="p-6 text-right font-bold text-gold">৳{c.amount.toLocaleString()}</td>
                          <td className="p-6 text-center">
                            <button onClick={() => handleDownloadSingleReceipt(c)} disabled={pdfLoading === c.id} className="p-3 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all">
                              {pdfLoading === c.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {searchResult.length === 0 && <div className="p-20 text-center text-muted-foreground font-bold">রেকর্ড পাওয়া যায়নি।</div>}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "dues" && (
            <motion.div key="dues" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gold flex items-center gap-3"><AlertCircle className="text-orange-500" /> বকেয়া তালিকা</h2>
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border border-gold/10 rounded-xl px-4 py-2 text-sm font-bold" />
              </div>
              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-orange-500/5 text-orange-500 font-bold border-b border-gold/10">
                    <tr><th className="p-6">সদস্যের নাম</th><th className="p-6">এলাকা</th><th className="p-6">পদবী</th><th className="p-6 text-right">স্ট্যাটাস</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {getDuesForMonth(filterMonth).map(m => (
                      <tr key={m.id} className="hover:bg-orange-500/5">
                        <td className="p-6 font-bold">{m.name}</td>
                        <td className="p-6 text-muted-foreground">{m.area || "-"}</td>
                        <td className="p-6 text-muted-foreground">{m.designation || "-"}</td>
                        <td className="p-6 text-right"><span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold">বকেয়া</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getDuesForMonth(filterMonth).length === 0 && <div className="p-20 text-center text-green-500 font-bold">সবাই এই মাসের চাঁদা প্রদান করেছেন!</div>}
              </div>
            </motion.div>
          )}

          {activeTab === "transparency" && (
            <motion.div key="transparency" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-2xl font-bold text-gold flex items-center gap-3"><TrendingDown className="text-red-500" /> খরচের বিবরণী</h2><input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border border-gold/10 rounded-xl px-4 py-2 text-sm font-bold" /></div>
              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-red-500/5 text-red-500 font-bold border-b border-gold/10"><tr><th className="p-6">তারিখ</th><th className="p-6">বিবরণ</th><th className="p-6 text-right">পরিমাণ</th></tr></thead>
                  <tbody className="divide-y divide-gold/5">
                    {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                      <tr key={e.id} className="hover:bg-red-500/5"><td className="p-6 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td><td className="p-6 font-bold">{e.title}</td><td className="p-6 text-right font-bold text-red-500">৳{e.amount.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-gold text-center mb-8">এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
              {Object.entries(contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth))).reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).map(([name, total], idx) => (
                <div key={name} className="bg-card p-6 rounded-2xl border border-gold/10 flex justify-between items-center shadow-md hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-5"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${idx === 0 ? "bg-gold text-white" : "bg-gold/10 text-gold"}`}>{idx + 1}</div><span className="font-bold text-lg">{name}</span></div>
                  <span className="font-bold text-xl text-gold">৳{total.toLocaleString()}</span>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <h2 className="text-3xl font-bold text-gold flex items-center gap-3"><Shield size={32} /> অ্যাডমিন প্যানেল</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleDownloadReport} disabled={pdfLoading === "report"} className="bg-gold text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2">{pdfLoading === "report" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} জেনারেল রিপোর্ট</button>
                  <button onClick={handleDownloadAreaReport} disabled={pdfLoading === "area-report"} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2">{pdfLoading === "area-report" ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} এলাকা ভিত্তিক রিপোর্ট</button>
                  <button onClick={handleExportCSV} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2"><FileSpreadsheet size={18} /> এক্সেল (CSV)</button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-card p-10 rounded-3xl border-2 border-gold/20 shadow-2xl">
                  <h3 className="text-2xl font-bold text-gold mb-8 flex items-center gap-3"><TrendingUp size={28} /> চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="নাম *" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                      <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="পরিমাণ *" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                      <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold cursor-pointer">
                        <option value="">এলাকা</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold cursor-pointer">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="ট্রানজেকশন আইডি (ঐচ্ছিক)" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-5 rounded-2xl font-bold text-xl shadow-2xl uppercase tracking-widest">সেভ ও রসিদ ডাউনলোড</button>
                  </form>
                </div>
                <div className="bg-card p-10 rounded-3xl border-2 border-red-500/20 shadow-2xl">
                  <h3 className="text-2xl font-bold text-red-500 mb-8 flex items-center gap-3"><TrendingDown size={28} /> খরচ এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-6">
                    <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="টাইটেল *" className="w-full bg-background border border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="পরিমাণ *" className="w-full bg-background border border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold" />
                      <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border border-red-500/10 rounded-2xl px-5 py-4 outline-none focus:border-red-500 font-bold" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-xl shadow-2xl uppercase tracking-widest">খরচ রেকর্ড করুন</button>
                  </form>
                </div>
                <div className="bg-card p-10 rounded-3xl border-2 border-gold/20 shadow-2xl lg:col-span-2">
                  <h3 className="text-2xl font-bold text-gold mb-8 flex items-center gap-3"><UserIcon size={28} /> নতুন সদস্য যোগ করুন</h3>
                  <form onSubmit={handleSubmitMember} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <input type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="নাম *" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                    <select value={newMemberArea} onChange={e => setNewMemberArea(e.target.value)} className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold cursor-pointer">
                      <option value="">এলাকা</option>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input type="text" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} placeholder="ফোন" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                    <input type="text" value={newMemberDesignation} onChange={e => setNewMemberDesignation(e.target.value)} placeholder="পদবী" className="w-full bg-background border border-gold/20 rounded-2xl px-5 py-4 outline-none focus:border-gold font-bold" />
                    <button type="submit" className="md:col-span-2 lg:col-span-4 bg-gold text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-xl uppercase tracking-widest">সদস্য যোগ করুন</button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <div className="fixed bottom-10 right-10 z-[100]"><button className="bg-gold text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-3 font-bold group border-2 border-white/20"><Calculator className="w-7 h-7" /><span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-500 whitespace-nowrap text-sm">হিসাব সহকারী</span></button></div>
    </div>
  );
};

export default CommitteeContributions;
