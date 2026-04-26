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
import { registerBengaliFont } from "../fonts/bengaliFont";

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

  const formatMonthBn = (m: string | null | undefined) => {
    if (!m) return "-";
    try {
      return new Date(m + "-01").toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
    } catch {
      return m;
    }
  };

  const addPdfHeader = (doc: jsPDF, subtitle: string) => {
    registerBengaliFont(doc);
    const W = 210;
    const H = 297;
    
    // Page Background / Frame
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.rect(10, 10, W - 20, H - 20); // Outer gold border
    doc.setLineWidth(0.2);
    doc.rect(12, 12, W - 24, H - 24); // Inner thin line
    
    // Header Block
    doc.setFillColor(33, 33, 33);
    doc.rect(10, 10, W - 20, 45, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(10, 55, W - 20, 2, "F");
    
    // Corner Accents
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1.5);
    // Top Left
    doc.line(10, 10, 25, 10); doc.line(10, 10, 10, 25);
    // Top Right
    doc.line(W-10, 10, W-25, 10); doc.line(W-10, 10, W-10, 25);
    // Bottom Left
    doc.line(10, H-10, 25, H-10); doc.line(10, H-10, 10, H-25);
    // Bottom Right
    doc.line(W-10, H-10, W-25, H-10); doc.line(W-10, H-10, W-10, H-25);

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(24);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("চন্দনাইশ দরবার শরীফ", W / 2, 25, { align: "center" });
    
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | chandanaishdarbarsharif@gmail.com", W / 2, 34, { align: "center" });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("NotoSansBengali", "normal");
    doc.text(subtitle, W / 2, 48, { align: "center" });
  };

  const addPdfFooter = (doc: jsPDF) => {
    const W = 210;
    const H = 297;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(20, H - 22, W - 20, H - 22);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("এটি একটি কম্পিউটার জেনারেটেড ডকুমেন্ট। ডিজিটাল কপির জন্য কোনো স্বাক্ষর প্রয়োজন নেই।", W / 2, H - 16, { align: "center" });
    doc.text("চন্দনাইশ দরবার শরীফ কমিটি | তৈরির সময়: " + new Date().toLocaleString("bn-BD"), W / 2, H - 11, { align: "center" });
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    setPdfLoading(c.id);
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "অফিসিয়াল পেমেন্ট রসিদ");

      // Watermark
      doc.setTextColor(248, 248, 248);
      doc.setFontSize(60);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("পরিশোধিত", W / 2, 170, { align: "center", angle: 35 });

      // Circular Stamp
      doc.setDrawColor(212, 175, 55, 0.4);
      doc.setLineWidth(1);
      doc.circle(W - 45, 170, 20);
      doc.circle(W - 45, 170, 18);
      doc.setFontSize(8);
      doc.setTextColor(212, 175, 55, 0.6);
      doc.text("VERIFIED", W - 45, 168, { align: "center" });
      doc.text("COMMITTEE", W - 45, 173, { align: "center" });

      // Receipt meta
      const rid = c.id.slice(0, 8).toUpperCase();
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("রসিদ নম্বর: #" + rid, 20, 68);
      doc.text("তারিখ: " + new Date(c.created_at).toLocaleDateString("bn-BD"), W - 20, 68, { align: "right" });

      // Main table
      const rows = [
        ["দাতার নাম", c.name || "-"],
        ["এলাকা/অবস্থান", c.area || "N/A"],
        ["সংগ্রহের মাস", formatMonthBn(c.target_month)],
        ["টাকার পরিমাণ", c.amount.toLocaleString("bn-BD") + " BDT"],
        ["পেমেন্ট মাধ্যম", c.payment_method || "ক্যাশ"],
        ["ট্রানজেকশন আইডি", c.transaction_id || "N/A"],
        ["বিশেষ মন্তব্য", c.note || "-"],
      ];
      autoTable(doc, {
        startY: 75,
        body: rows,
        theme: "plain",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 11, cellPadding: 8, lineColor: [230, 230, 230], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 50, textColor: [100, 100, 100] },
          1: { fontStyle: "normal", textColor: [20, 20, 20] },
        },
        margin: { left: 20, right: 20 },
        didDrawCell: (data) => {
           if (data.row.index === 3 && data.column.index === 1) {
             doc.setFont("NotoSansBengali", "normal");
             doc.setTextColor(180, 140, 0);
           }
        }
      });

      let curY = (doc as any).lastAutoTable.finalY + 15;

      // Highlighted amount box
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.setFillColor(255, 252, 240);
      doc.roundedRect(20, curY, W - 40, 20, 2, 2, "FD");
      
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(12);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("মোট পরিশোধিত টাকা:", 30, curY + 12);
      
      doc.setTextColor(180, 140, 0);
      doc.setFontSize(18);
      doc.text(c.amount.toLocaleString("bn-BD") + " /-", W - 30, curY + 13, { align: "right" });
      
      curY += 45;

      // Signatures
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont("NotoSansBengali", "normal");
      doc.line(25, curY, 85, curY);
      doc.text("সদস্যের স্বাক্ষর", 55, curY + 6, { align: "center" });
      
      doc.line(W - 85, curY, W - 25, curY);
      doc.text("কর্তৃপক্ষের স্বাক্ষর ও সিল", W - 55, curY + 6, { align: "center" });

      addPdfFooter(doc);
      doc.save("Receipt_" + rid + ".pdf");
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch (e) {
      console.error("PDF Error:", e);
      toast.error("পিডিএফ তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };

  const handleDownloadReport = () => {
    setPdfLoading("report");
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "সাধারণ আর্থিক প্রতিবেদন");

      // Meta
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("প্রতিবেদনের মাস: " + (filterMonth ? formatMonthBn(filterMonth) : "সকল সময়"), 20, 62);
      doc.text("তৈরির তারিখ: " + new Date().toLocaleDateString("bn-BD"), W - 20, 62, { align: "right" });
      doc.text("মোট এন্ট্রি: " + filteredByMonth.length.toLocaleString("bn-BD"), 20, 68);

      // Summary stats cards
      const balance = monthTotal - monthExpense;
      const stats = [
        { label: "মোট সংগ্রহ", value: monthTotal.toLocaleString("bn-BD") },
        { label: "মোট খরচ", value: monthExpense.toLocaleString("bn-BD") },
        { label: "বর্তমান ব্যালেন্স", value: balance.toLocaleString("bn-BD") },
        { label: "লক্ষ্যমাত্রা", value: goalPercentage.toFixed(1) + "%" }
      ];

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(230, 230, 230);
      
      stats.forEach((s, i) => {
        const x = 15 + (i * 46);
        doc.roundedRect(x, 75, 42, 22, 2, 2, "FD");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(s.label, x + 21, 82, { align: "center" });
        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        doc.setFont("NotoSansBengali", "normal");
        doc.text(s.value, x + 21, 91, { align: "center" });
        doc.setFont("NotoSansBengali", "normal");
      });

      // Yearly Progress Bar
      doc.setDrawColor(212, 175, 55, 0.3);
      doc.line(15, 105, W-15, 105);
      doc.setFontSize(8);
      doc.text("বার্ষিক লক্ষ্যমাত্রা অগ্রগতি: " + currentYearTotal.toLocaleString("bn-BD") + " / " + YEARLY_GOAL.toLocaleString("bn-BD") + " টাকা", 15, 102);

      // Detail header
      let detailY = 115;
      doc.setFontSize(12);
      doc.setFont("NotoSansBengali", "normal");
      doc.setTextColor(33, 33, 33);
      doc.text("সংগ্রহের বিস্তারিত তালিকা", 15, detailY);
      detailY += 5;

      // Full detail table
      const detailRows = filteredByMonth.map((c, i) => [
        (i + 1).toLocaleString("bn-BD"),
        new Date(c.created_at).toLocaleDateString("bn-BD"),
        c.name,
        c.area || "-",
        formatMonthBn(c.target_month),
        c.amount.toLocaleString("bn-BD"),
        c.payment_method || "ক্যাশ",
        c.transaction_id || "-",
      ]);
      autoTable(doc, {
        startY: detailY,
        head: [["#", "তারিখ", "নাম", "এলাকা", "মাস", "পরিমাণ", "পেমেন্ট", "TrxID"]],
        body: detailRows,
        theme: "grid",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 7.5, cellPadding: 3 },
        headStyles: { font: "NotoSansBengali", fontStyle: "normal", fillColor: [33, 33, 33], textColor: [212, 175, 55], fontSize: 8 },
        columnStyles: { 0: { cellWidth: 8 }, 5: { halign: "right" } },
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
        doc.setFont("NotoSansBengali", "normal");
        doc.text("সর্বমোট আয়: " + monthTotal.toLocaleString("bn-BD") + " টাকা | বর্তমান ব্যালেন্স: " + balance.toLocaleString("bn-BD") + " টাকা", W / 2, gtY + 10, { align: "center" });
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
      addPdfHeader(doc, "এলাকা ভিত্তিক অর্থ সংগ্রহ প্রতিবেদন");

      // Meta
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("তৈরির তারিখ: " + new Date().toLocaleDateString("bn-BD"), W - 20, 62, { align: "right" });
      doc.text("মোট এলাকা: " + AREAS.length.toLocaleString("bn-BD") + " | মোট এন্ট্রি: " + contributions.length.toLocaleString("bn-BD"), 20, 62);

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
        doc.setFont("NotoSansBengali", "normal");
        doc.text(areaIndex.toLocaleString("bn-BD") + ". " + areaName, 20, finalY + 8);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(ac.length.toLocaleString("bn-BD") + " টি এন্ট্রি | মোট: " + areaTotal.toLocaleString("bn-BD") + " টাকা", W - 20, finalY + 8, { align: "right" });
        finalY += 16;

        const rows = ac.map((c, i) => [
          (i + 1).toLocaleString("bn-BD"),
          new Date(c.created_at).toLocaleDateString("bn-BD"),
          c.name,
          formatMonthBn(c.target_month),
          c.amount.toLocaleString("bn-BD"),
          c.payment_method || "ক্যাশ",
          c.transaction_id || "-",
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [["#", "তারিখ", "নাম", "মাস", "টাকা", "পেমেন্ট", "TrxID"]],
          body: rows,
          theme: "grid",
          styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 7.5, cellPadding: 3 },
          headStyles: { font: "NotoSansBengali", fontStyle: "normal", fillColor: [212, 175, 55], textColor: [33, 33, 33], fontSize: 8 },
          columnStyles: { 0: { cellWidth: 8 }, 4: { halign: "right" } },
          margin: { left: 15, right: 15 },
        });

        // Area subtotal
        const subY = (doc as any).lastAutoTable.finalY;
        doc.setFillColor(255, 248, 220);
        doc.rect(15, subY, W - 30, 8, "F");
        doc.setTextColor(80, 60, 0);
        doc.setFontSize(9);
        doc.setFont("NotoSansBengali", "normal");
        doc.text("সাবটোটাল (" + areaName + "): " + areaTotal.toLocaleString("bn-BD") + " টাকা", W - 20, subY + 6, { align: "right" });
        finalY = subY + 18;
      });

      // Grand total
      if (finalY > 260) { addPdfFooter(doc); doc.addPage(); finalY = 20; }
      doc.setFillColor(33, 33, 33);
      doc.roundedRect(15, finalY, W - 30, 16, 3, 3, "F");
      doc.setFont("NotoSansBengali", "normal");
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(13);
      doc.text("সর্বমোট সংগ্রহ (সকল এলাকা): " + grandTotal.toLocaleString("bn-BD") + " টাকা", W / 2, finalY + 11, { align: "center" });

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
    const headers = ["তারিখ", "নাম", "এলাকা", "মাস", "টাকার পরিমাণ (টাকা)", "পেমেন্ট পদ্ধতি", "ট্রানজেকশন আইডি", "মন্তব্য"];
    const rows = contributions.map(c => [
      new Date(c.created_at).toLocaleDateString("bn-BD"),
      `"${c.name}"`,
      c.area || "",
      formatMonthBn(c.target_month),
      c.amount,
      c.payment_method || "ক্যাশ",
      c.transaction_id || "",
      `"${c.note || ""}"`
    ]);
    const totalRow = ["", "", "", "সর্বমোট", contributions.reduce((s, c) => s + c.amount, 0), "", "", ""];
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
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "মোট সংগ্রহ", value: monthTotal, icon: <TrendingUp className="text-emerald-500" />, border: "border-emerald-500/20", text: "text-emerald-500" },
                  { label: "মোট খরচ", value: monthExpense, icon: <TrendingDown className="text-red-500" />, border: "border-red-500/20", text: "text-red-500" },
                  { label: "বর্তমান ব্যালেন্স", value: monthTotal - monthExpense, icon: <Wallet className="text-gold" />, border: "border-gold/20", text: "text-gold" },
                  { label: "লক্ষ্যমাত্রা", value: `${goalPercentage.toFixed(1)}%`, icon: <Target className="text-blue-500" />, border: "border-blue-500/20", text: "text-blue-500" }
                ].map((stat, i) => (
                  <div key={i} className={`bg-card p-5 rounded-2xl border ${stat.border} shadow-lg relative overflow-hidden group`}>
                    <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">{stat.icon}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg bg-background border ${stat.border}`}>{stat.icon}</div>
                      <h3 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{stat.label}</h3>
                    </div>
                    <p className={`text-2xl font-black ${stat.text}`}>
                      {typeof stat.value === "number" ? `৳${stat.value.toLocaleString()}` : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-card p-1 rounded-2xl border border-gold/10 shadow-xl overflow-hidden">
                <div className="bg-gold-gradient p-6 text-primary-foreground flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><Target size={24} /> বার্ষিক লক্ষ্যমাত্রা ({currentYear})</h2>
                    <p className="text-xs opacity-80 mt-0.5">সংগ্রহ: ৳{currentYearTotal.toLocaleString()} / ৳{YEARLY_GOAL.toLocaleString()}</p>
                  </div>
                  <button onClick={handleDownloadAreaReport} disabled={pdfLoading === "area-report"} className="bg-white text-gold px-6 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2 text-sm whitespace-nowrap">
                    {pdfLoading === "area-report" ? <Loader2 className="animate-spin" /> : <Printer size={16} />} এলাকা ভিত্তিক রিপোর্ট
                  </button>
                </div>
                <div className="p-1.5 bg-background/50">
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden border border-gold/10">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${goalPercentage}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-lg h-[300px]">
                  <h3 className="text-md font-bold text-gold mb-4">মাসিক গ্রাফ</h3>
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={getMonthlyChartData()}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-lg h-[300px]">
                  <h3 className="text-md font-bold text-gold mb-4">এলাকা ভিত্তিক ডাটা</h3>
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getAreaPieData()} cx="50%" cy="50%" outerRadius={70} dataKey="value">{getAreaPieData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
              <div className="bg-card p-6 rounded-2xl border border-gold/20 shadow-xl text-center">
                <h2 className="text-xl font-bold text-gold mb-4">রসিদ ডাউনলোড করুন</h2>
                <div className="flex flex-col md:flex-row gap-2">
                  <input type="text" placeholder="নাম বা আইডি..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleMemberSearch()} className="flex-1 bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                  <button onClick={handleMemberSearch} disabled={refreshing} className="bg-gold text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">{refreshing ? <Loader2 className="animate-spin" /> : <Search size={18} />} খুঁজুন</button>
                </div>
              </div>
              {searchResult && (
                <div className="bg-card rounded-2xl border border-gold/10 overflow-hidden shadow-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gold/5 text-gold font-bold"><tr><th className="p-4">তারিখ</th><th className="p-4">মাস</th><th className="p-4 text-right">পরিমাণ</th><th className="p-4 text-center">রসিদ</th></tr></thead>
                    <tbody className="divide-y divide-gold/10">
                      {searchResult.map(c => (
                        <tr key={c.id} className="hover:bg-gold/5">
                          <td className="p-4">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="p-4 font-bold text-muted-foreground uppercase text-[10px]">{formatMonthBn(c.target_month)}</td>
                          <td className="p-4 text-right font-bold text-gold">৳{c.amount.toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDownloadSingleReceipt(c)} disabled={pdfLoading === c.id} className="p-2 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all">
                              {pdfLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
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
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gold flex items-center gap-3"><Award size={32} /> এলাকা ভিত্তিক র‍্যাঙ্কিং</h2>
                <button onClick={handleDownloadAreaReport} disabled={pdfLoading === "area-report"} className="text-xs bg-gold/10 text-gold px-4 py-2 rounded-xl font-bold hover:bg-gold hover:text-white transition-all flex items-center gap-2">
                  <Download size={14} /> PDF রিপোর্ট
                </button>
              </div>
              {Object.entries(contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth))).reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).map(([name, total], idx) => (
                <div key={name} className="bg-card p-6 rounded-3xl border border-gold/10 flex justify-between items-center shadow-xl hover:shadow-gold/5 hover:scale-[1.02] transition-all relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 w-1 h-full ${idx === 0 ? "bg-gold" : "bg-gold/20"}`} />
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? "bg-gold text-primary-foreground" : "bg-gold/10 text-gold"}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-lg block">{name}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">{idx === 0 ? "শীর্ষ এলাকা" : "সক্রিয় এলাকা"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-2xl text-gold block">৳{total.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">মোট সংগ্রহ</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "admin" && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gold flex items-center gap-2"><Shield size={24} /> অ্যাডমিন প্যানেল</h2>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownloadReport} disabled={pdfLoading === "report"} className="bg-gold text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">{pdfLoading === "report" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} জেনারেল রিপোর্ট</button>
                  <button onClick={handleDownloadAreaReport} disabled={pdfLoading === "area-report"} className="bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">{pdfLoading === "area-report" ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} এলাকা রিপোর্ট</button>
                  <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2"><FileSpreadsheet size={16} /> সিএসভি</button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-xl">
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><TrendingUp size={22} /> চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="নাম *" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                      <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="পরিমাণ *" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="month" required value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                      <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm cursor-pointer">
                        <option value="">এলাকা</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm cursor-pointer">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="TrxID (ঐচ্ছিক)" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                    </div>
                    <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-xl uppercase tracking-widest">সেভ ও রশিদ</button>
                  </form>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-red-500/10 shadow-xl">
                  <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2"><TrendingDown size={22} /> খরচ এন্ট্রি</h3>
                  <form onSubmit={handleSubmitExpense} className="space-y-4">
                    <input type="text" required value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="টাইটেল *" className="w-full bg-background border border-red-500/5 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="number" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="পরিমাণ *" className="w-full bg-background border border-red-500/5 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm" />
                      <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border border-red-500/5 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm" />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl uppercase tracking-widest">রেকর্ড করুন</button>
                  </form>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-xl lg:col-span-2">
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><UserIcon size={22} /> সদস্য যোগ করুন</h3>
                  <form onSubmit={handleSubmitMember} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="নাম *" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                    <select value={newMemberArea} onChange={e => setNewMemberArea(e.target.value)} className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm cursor-pointer">
                      <option value="">এলাকা</option>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <input type="text" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)} placeholder="ফোন" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                    <input type="text" value={newMemberDesignation} onChange={e => setNewMemberDesignation(e.target.value)} placeholder="পদবী" className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm" />
                    <button type="submit" className="md:col-span-2 lg:col-span-4 bg-gold text-primary-foreground py-3 rounded-xl font-bold text-md shadow-lg uppercase tracking-widest">সদস্য যুক্ত করুন</button>
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
