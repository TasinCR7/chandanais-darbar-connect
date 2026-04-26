import React, { useState, useEffect, FormEvent, useCallback, useMemo } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  FileText, Shield, User as UserIcon, Search, Download, Target, 
  Award, TrendingDown, TrendingUp, Wallet, LayoutGrid, 
  Settings, PieChart as PieChartIcon, Calculator, FileSpreadsheet, Printer, Loader2, RefreshCw, AlertCircle, Share2, Database
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
  const [expenseApprovedBy, setExpenseApprovedBy] = useState("");

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
          const isMaster = ["chandanaishdarbarsharif@gmail.com", "tasinskder@gmail.com", "tasinbook@gmail.com"].includes(session.user.email || "");
          const isMasterPhone = ["+8801714338533", "+8801819614444", "+8801835674454", "+8801622721996"].includes(session.user.phone || "");
          
          if (isMaster || isMasterPhone) {
            setIsAdmin(true);
            fetchData(); // Only fetch if admin
          } else {
            const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
            setIsAdmin(!!data);
            if (data) fetchData();
          }
        } else {
          // If not admin, maybe fetch limited data for public view
          // But for this private committee page, we should probably redirect or show error
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err) { 
        console.error(err); 
        setLoading(false);
        setRefreshing(false);
      }
    };
    checkAuth();
  }, [fetchData]);

  const fetchData = useCallback(async () => {
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
    setLoading(false);
  }, []);

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
    
    // Page Background - White
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Header Navy Blue Block
    doc.setFillColor(10, 37, 64); // #0A2540
    doc.rect(0, 0, W, 45, "F");
    
    // Teal Accent line
    doc.setFillColor(0, 212, 200); // #00D4C8
    doc.rect(0, 45, W, 2, "F");
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("চন্দনাইশ দরবার শরীফ", W / 2, 22, { align: "center" });
    
    // Subtext
    doc.setTextColor(150, 160, 175);
    doc.setFontSize(9);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | info@chandanaishdarbar.org", W / 2, 30, { align: "center" });
    
    // Subtitle Badge
    doc.setFillColor(0, 212, 200);
    doc.roundedRect(W / 2 - 35, 36, 70, 8, 4, 4, "F");
    doc.setTextColor(10, 37, 64);
    doc.setFontSize(11);
    doc.setFont("NotoSansBengali", "normal");
    doc.text(subtitle, W / 2, 42, { align: "center" });
  };

  const addPdfFooter = (doc: jsPDF) => {
    const W = 210;
    const H = 297;
    doc.setDrawColor(230, 235, 241);
    doc.setLineWidth(0.5);
    doc.line(15, H - 20, W - 15, H - 20);
    doc.setFontSize(8);
    doc.setTextColor(150, 160, 175);
    doc.setFont("NotoSansBengali", "normal");
    doc.text("অফিসিয়াল ডকুমেন্ট • চন্দনাইশ দরবার শরীফ ফিন্যান্স সিস্টেম", 15, H - 14);
    doc.text("জেনারেট করা হয়েছে: " + new Date().toLocaleString("bn-BD"), W - 15, H - 14, { align: "right" });
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    setPdfLoading(c.id);
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "অফিসিয়াল পেমেন্ট রসিদ");

      // Receipt meta
      const rid = c.id.slice(0, 8).toUpperCase();
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("ইনভয়েস নম্বর:", 20, 65);
      doc.text("#" + rid, 20, 71);
      
      doc.text("ইস্যু তারিখ:", W - 20, 65, { align: "right" });
      doc.text(new Date(c.created_at).toLocaleDateString("bn-BD"), W - 20, 71, { align: "right" });

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
        startY: 85,
        body: rows,
        theme: "grid",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 11, cellPadding: 8, lineColor: [230, 235, 241], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 50, textColor: [100, 110, 125], fillColor: [248, 250, 252] },
          1: { textColor: [10, 37, 64], fontStyle: "normal" },
        },
        margin: { left: 20, right: 20 }
      });

      let curY = (doc as any).lastAutoTable.finalY + 15;

      // Highlighted amount box
      doc.setDrawColor(0, 212, 200);
      doc.setLineWidth(0.5);
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(20, curY, W - 40, 24, 3, 3, "FD");
      
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(12);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("মোট পরিশোধিত টাকা:", 30, curY + 15);
      
      doc.setTextColor(0, 160, 150);
      doc.setFontSize(20);
      doc.text(c.amount.toLocaleString("bn-BD") + " /-", W - 30, curY + 16, { align: "right" });
      
      curY += 45;

      // Signatures
      doc.setTextColor(100, 110, 125);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.setDrawColor(200, 210, 220);
      doc.line(25, curY, 85, curY);
      doc.text("সদস্যের স্বাক্ষর", 55, curY + 6, { align: "center" });
      
      doc.line(W - 85, curY, W - 25, curY);
      doc.text("কর্তৃপক্ষের স্বাক্ষর ও সিল", W - 55, curY + 6, { align: "center" });

      // Paid Stamp
      doc.setTextColor(230, 245, 245);
      doc.setFontSize(60);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("PAID", W / 2, 180, { align: "center", angle: 30 });

      addPdfFooter(doc);
      doc.save("Invoice_" + rid + ".pdf");
      toast.success("রসিদ ডাউনলোড হয়েছে");
    } catch (e) {
      console.error("PDF Error:", e);
      toast.error("পিডিএফ তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };

  const handleWhatsAppShare = (c: Contribution) => {
    const text = `আসসালামু আলাইকুম, ${c.name}।\nআপনার ${formatMonthBn(c.target_month)} মাসের চাঁদা ৳${c.amount} সফলভাবে জমা হয়েছে।\nধন্যবাদ।`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownloadReport = () => {
    setPdfLoading("report");
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "সাধারণ আর্থিক প্রতিবেদন");

      // Meta
      doc.setTextColor(100, 110, 125);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("প্রতিবেদনের মাস: " + (filterMonth ? formatMonthBn(filterMonth) : "সকল সময়"), 15, 65);
      doc.text("তৈরির তারিখ: " + new Date().toLocaleDateString("bn-BD"), W - 15, 65, { align: "right" });

      // Summary stats cards
      const balance = monthTotal - monthExpense;
      const stats = [
        { label: "মোট সংগ্রহ", value: monthTotal.toLocaleString("bn-BD") },
        { label: "মোট খরচ", value: monthExpense.toLocaleString("bn-BD") },
        { label: "বর্তমান ব্যালেন্স", value: balance.toLocaleString("bn-BD") },
        { label: "লক্ষ্যমাত্রা", value: goalPercentage.toFixed(1) + "%" }
      ];

      stats.forEach((s, i) => {
        const x = 15 + (i * 46);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, 75, 42, 24, 3, 3, "FD");
        doc.setFontSize(9);
        doc.setTextColor(100, 110, 125);
        doc.text(s.label, x + 21, 84, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(10, 37, 64);
        doc.text(s.value, x + 21, 94, { align: "center" });
      });

      // Detail header
      let detailY = 115;
      doc.setFontSize(14);
      doc.setTextColor(10, 37, 64);
      doc.text("সংগ্রহের বিস্তারিত তালিকা", 15, detailY);
      detailY += 6;

      // Full detail table
      const detailRows = filteredByMonth.map((c, i) => [
        (i + 1).toLocaleString("bn-BD"),
        new Date(c.created_at).toLocaleDateString("bn-BD"),
        c.name,
        c.area || "-",
        formatMonthBn(c.target_month),
        c.amount.toLocaleString("bn-BD"),
        c.payment_method || "ক্যাশ",
      ]);
      autoTable(doc, {
        startY: detailY,
        head: [["#", "তারিখ", "নাম", "এলাকা", "মাস", "পরিমাণ", "পেমেন্ট"]],
        body: detailRows,
        theme: "grid",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 8, cellPadding: 4, lineColor: [230, 235, 241], lineWidth: 0.1 },
        headStyles: { fillColor: [10, 37, 64], textColor: [255, 255, 255], fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 10 }, 5: { halign: "right" } },
        margin: { left: 15, right: 15 },
        didDrawPage: () => { addPdfFooter(doc); },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Premium Summary Footer
      if (finalY < 250) {
        doc.setFillColor(10, 37, 64);
        doc.roundedRect(15, finalY, W - 30, 25, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(`সর্বমোট আয়: ৳${monthTotal.toLocaleString("bn-BD")}`, 25, finalY + 10);
        doc.text(`বর্তমান ব্যালেন্স: ৳${balance.toLocaleString("bn-BD")}`, 25, finalY + 18);
        
        // Mini Progress line
        doc.setFillColor(0, 212, 200);
        const barWidth = (W - 140);
        const progress = Math.min(goalPercentage / 100, 1) * barWidth;
        doc.rect(W - 15 - barWidth - 10, finalY + 14, barWidth, 2, "F");
        doc.setFillColor(255, 255, 255);
        doc.rect(W - 15 - barWidth - 10, finalY + 14, progress, 2, "F");
        doc.setFontSize(10);
        doc.text(`লক্ষ্যমাত্রা: ${goalPercentage.toFixed(1)}%`, W - 25, finalY + 10, { align: "right" });
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

      doc.setTextColor(100, 110, 125);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("তৈরির তারিখ: " + new Date().toLocaleDateString("bn-BD"), W - 15, 65, { align: "right" });
      doc.text("মোট এলাকা: " + AREAS.length.toLocaleString("bn-BD"), 15, 65);

      let finalY = 75;
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
          registerBengaliFont(doc);
          doc.setFont("NotoSansBengali", "normal");
          finalY = 20;
        }

        // Area header bar
        doc.setFillColor(10, 37, 64);
        doc.roundedRect(15, finalY, W - 30, 14, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(areaIndex.toLocaleString("bn-BD") + ". " + areaName, 20, finalY + 9);
        doc.setFontSize(10);
        doc.setTextColor(0, 212, 200);
        doc.text("মোট: ৳" + areaTotal.toLocaleString("bn-BD"), W - 20, finalY + 9, { align: "right" });
        finalY += 18;

        const rows = ac.map((c, i) => [
          (i + 1).toLocaleString("bn-BD"),
          new Date(c.created_at).toLocaleDateString("bn-BD"),
          c.name,
          formatMonthBn(c.target_month),
          c.amount.toLocaleString("bn-BD"),
          c.payment_method || "ক্যাশ",
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [["#", "তারিখ", "নাম", "মাস", "টাকা", "পেমেন্ট"]],
          body: rows,
          theme: "grid",
          styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 8, cellPadding: 4, lineColor: [230, 235, 241], lineWidth: 0.1 },
          headStyles: { fillColor: [248, 250, 252], textColor: [10, 37, 64], fontSize: 9 },
          columnStyles: { 0: { cellWidth: 10 }, 4: { halign: "right", textColor: [10, 37, 64] } },
          margin: { left: 15, right: 15 },
        });

        const subY = (doc as any).lastAutoTable.finalY;
        doc.setFillColor(248, 250, 252);
        doc.rect(15, subY, W - 30, 8, "F");
        doc.setTextColor(10, 37, 64);
        doc.setFontSize(9);
        doc.text(`সাবটোটাল (${areaName}): ৳${areaTotal.toLocaleString("bn-BD")}`, W - 20, subY + 6, { align: "right" });
        
        finalY = subY + 15;
      });

      // Grand total
      if (finalY > 260) { 
        addPdfFooter(doc); 
        doc.addPage(); 
        registerBengaliFont(doc);
        doc.setFont("NotoSansBengali", "normal");
        finalY = 20; 
      }
      doc.setFillColor(0, 212, 200);
      doc.roundedRect(15, finalY, W - 30, 18, 4, 4, "F");
      doc.setTextColor(10, 37, 64);
      doc.setFontSize(14);
      doc.text("সর্বমোট সংগ্রহ (সকল এলাকা): ৳" + grandTotal.toLocaleString("bn-BD"), W / 2, finalY + 12, { align: "center" });

      addPdfFooter(doc);
      doc.save("Area_Report_" + new Date().toISOString().slice(0, 10) + ".pdf");
      toast.success("এলাকা ভিত্তিক রিপোর্ট ডাউনলোড হয়েছে");
    } catch (e) {
      console.error(e);
      toast.error("রিপোর্ট তৈরিতে সমস্যা হয়েছে!");
    }
    setPdfLoading(null);
  };
  
  const handleDownloadDuesReport = () => {
    setPdfLoading("dues-report");
    try {
      const doc = new jsPDF();
      const W = 210;
      addPdfHeader(doc, "বকেয়া চাঁদা (Dues) তালিকা");
      
      const monthLabel = filterMonth ? formatMonthBn(filterMonth) : "সকল সময়";
      const dues = getDuesForMonth(filterMonth);
      
      doc.setTextColor(100, 110, 125);
      doc.setFontSize(10);
      doc.setFont("NotoSansBengali", "normal");
      doc.text("প্রতিবেদনের মাস: " + monthLabel, 15, 65);
      doc.text("মোট বকেয়া সদস্য: " + dues.length.toLocaleString("bn-BD"), W - 15, 65, { align: "right" });

      const rows = dues.map((m, i) => [
        (i + 1).toLocaleString("bn-BD"),
        m.name,
        m.area || "-",
        m.phone || "-",
        "বকেয়া"
      ]);

      autoTable(doc, {
        startY: 75,
        head: [["#", "সদস্যের নাম", "এলাকা", "মোবাইল", "স্ট্যাটাস"]],
        body: rows,
        theme: "grid",
        styles: { font: "NotoSansBengali", fontStyle: "normal", fontSize: 9, cellPadding: 5, lineColor: [230, 235, 241], lineWidth: 0.1 },
        headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontSize: 10 },
        alternateRowStyles: { fillColor: [255, 241, 242] },
        columnStyles: { 0: { cellWidth: 12 }, 4: { textColor: [225, 29, 72], fontStyle: "normal" } },
        margin: { left: 15, right: 15 },
        didDrawPage: () => { addPdfFooter(doc); }
      });

      addPdfFooter(doc);
      doc.save(`Dues_Report_${filterMonth}.pdf`);
      toast.success("বকেয়া রিপোর্ট ডাউনলোড হয়েছে");
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

  const handleDownloadBackup = async () => {
    const masterKey = prompt("সিস্টেম ব্যাকআপ নিতে এডমিন 'মাস্টার কী' প্রদান করুন:");
    if (masterKey !== "CD1996") {
      toast.error("ভুল মাস্টার কী! ব্যাকআপ নিতে অনুমতি নেই।");
      return;
    }
    setRefreshing(true);
    try {
      const { data: cData } = await supabase.from("committee_contributions").select("*");
      const { data: eData } = await supabase.from("committee_expenses").select("*");
      const { data: mData } = await supabase.from("committee_members").select("*");
      const backup = {
        timestamp: new Date().toISOString(),
        contributions: cData,
        expenses: eData,
        members: mData
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chandanaish_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      toast.success("সফলভাবে ডাটা ব্যাকআপ ডাউনলোড হয়েছে");
    } catch (e) {
      toast.error("ব্যাকআপ নিতে সমস্যা হয়েছে");
    }
    setRefreshing(false);
  };

  const handleSubmitContribution = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount < 50) {
      toast.error("সর্বনিম্ন ৫০ টাকা হাদিয়া প্রদান করতে হবে।");
      return;
    }
    const id = crypto.randomUUID();
    const { error } = await supabase.from("committee_contributions").insert([{
      id, name, amount: numAmount, area: area || null, note,
      target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null,
    }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else {
      toast.success("সফল হয়েছে!");
      const newEntry = { id, name, amount: numAmount, area: area || null, note, created_at: new Date().toISOString(), target_month: targetMonth, payment_method: paymentMethod, transaction_id: transactionId || null };
      handleDownloadSingleReceipt(newEntry);
      setName(""); setAmount(""); setArea(""); setNote(""); setTransactionId(""); setPaymentMethod("ক্যাশ (Cash)"); fetchData();
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    const finalNote = expenseApprovedBy ? `[অনুমোদন: ${expenseApprovedBy}] ${expenseNote}` : expenseNote;
    const { error } = await supabase.from("committee_expenses").insert([{ title: expenseTitle, amount: Number(expenseAmount), date: expenseDate, note: finalNote }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("সফল!"); setExpenseTitle(""); setExpenseAmount(""); setExpenseApprovedBy(""); setExpenseNote(""); fetchData(); }
  };

  const handleSubmitMember = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_members").insert([{ name: newMemberName, area: newMemberArea, phone: newMemberPhone, designation: newMemberDesignation }]);
    if (error) { toast.error("ত্রুটি: " + error.message); } 
    else { toast.success("সদস্য যুক্ত হয়েছে!"); setNewMemberName(""); setNewMemberPhone(""); setNewMemberDesignation(""); fetchData(); }
  };

  const handleDeleteContribution = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই এন্ট্রিটি মুছতে চান?")) return;
    const { error } = await supabase.from("committee_contributions").delete().eq("id", id);
    if (error) toast.error("মুছতে সমস্যা হয়েছে: " + error.message);
    else { toast.success("সফলভাবে মুছে ফেলা হয়েছে"); fetchData(); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই খরচটি মুছতে চান?")) return;
    const { error } = await supabase.from("committee_expenses").delete().eq("id", id);
    if (error) toast.error("মুছতে সমস্যা হয়েছে: " + error.message);
    else { toast.success("সফলভাবে মুছে ফেলা হয়েছে"); fetchData(); }
  };

  const getDuesForMonth = (month: string) => {
    const paidMemberNames = new Set(contributions.filter(c => c.target_month === month).map(c => c.name.toLowerCase()));
    return members.filter(m => !paidMemberNames.has(m.name.toLowerCase()));
  };

  const duesData = useMemo(() => {
    const paid = new Set(contributions.filter(c => c.target_month === filterMonth).map(c => c.name.toLowerCase()));
    const unpaid = members.filter(m => !paid.has(m.name.toLowerCase()));
    return {
      total: members.length,
      paidCount: members.length - unpaid.length,
      dueCount: unpaid.length,
      list: unpaid
    };
  }, [members, contributions, filterMonth]);

  const currentYear = new Date().getFullYear().toString();
  const currentYearTotal = useMemo(() => contributions.filter(c => c.created_at.startsWith(currentYear)).reduce((s, c) => s + c.amount, 0), [contributions, currentYear]);
  const goalPercentage = Math.min((currentYearTotal / YEARLY_GOAL) * 100, 100);
  const filteredByMonth = useMemo(() => contributions.filter(c => !filterMonth || (c.target_month === filterMonth || c.created_at.startsWith(filterMonth))), [contributions, filterMonth]);
  const monthTotal = useMemo(() => filteredByMonth.reduce((s, c) => s + c.amount, 0), [filteredByMonth]);
  const monthExpense = useMemo(() => expenses.filter(e => e.date.startsWith(filterMonth)).reduce((s, e) => s + e.amount, 0), [expenses, filterMonth]);

  const monthlyChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); }).reverse();
    return months.map(m => ({ name: m, total: contributions.filter(c => c.target_month === m || c.created_at.startsWith(m)).reduce((s, c) => s + c.amount, 0) }));
  }, [contributions]);

  const areaPieData = useMemo(() => {
    const areaStats = contributions.reduce((acc, c) => { const a = c.area || "অন্যান্য"; acc[a] = (acc[a] || 0) + c.amount; return acc; }, {} as Record<string, number>);
    return Object.entries(areaStats).map(([name, value]) => ({ name, value }));
  }, [contributions]);

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

      <main className="container mx-auto px-4 mt-12 min-h-[60vh]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-32 bg-card rounded-2xl animate-pulse" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-32 bg-card rounded-2xl animate-pulse" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-32 bg-card rounded-2xl animate-pulse" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-32 bg-card rounded-2xl animate-pulse" />
            <div className="lg:col-span-4 h-64 bg-card rounded-2xl animate-pulse" />
          </div>
        ) : (
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
                  <h3 className="text-md font-bold text-gold mb-4 flex items-center gap-2"><BarChart size={18} /> সংগ্রহ প্রবাহ (বিগত ৬ মাস)</h3>
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-lg h-[300px]">
                  <h3 className="text-md font-bold text-gold mb-4 flex items-center gap-2"><PieChartIcon size={18} /> এলাকা ভিত্তিক ডাটা</h3>
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={areaPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">{areaPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-gold/10 shadow-xl overflow-hidden">
                <div className="bg-gold/5 p-4 border-b border-gold/10 flex justify-between items-center">
                  <h3 className="font-bold text-gold flex items-center gap-2"><RefreshCw size={16} /> সাম্প্রতিক চাঁদা প্রদান</h3>
                  <button onClick={() => setActiveTab("search")} className="text-xs text-gold font-bold hover:underline">সব দেখুন</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gold/5 text-gold font-bold uppercase text-[10px] tracking-widest">
                      <tr><th className="p-4">নাম</th><th className="p-4">এলাকা</th><th className="p-4">মাস</th><th className="p-4 text-right">পরিমাণ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gold/5">
                      {contributions.slice(0, 5).map(c => (
                        <tr key={c.id} className="hover:bg-gold/5 transition-colors">
                          <td className="p-4 font-bold">{c.name}</td>
                          <td className="p-4 text-muted-foreground">{c.area || "-"}</td>
                          <td className="p-4 text-xs font-bold text-muted-foreground uppercase">{formatMonthBn(c.target_month)}</td>
                          <td className="p-4 text-right font-black text-emerald-600">৳{c.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleDownloadSingleReceipt(c)} disabled={pdfLoading === c.id} className="p-2 bg-gold/10 text-gold rounded-full hover:bg-gold hover:text-white transition-all" title="ডাউনলোড">
                                {pdfLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              </button>
                              <button onClick={() => handleWhatsAppShare(c)} className="p-2 bg-emerald-500/10 text-emerald-600 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="WhatsApp এ শেয়ার">
                                <Share2 size={14} />
                              </button>
                            </div>
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
                <div>
                  <h2 className="text-2xl font-bold text-gold flex items-center gap-3"><AlertCircle className="text-red-500" /> বকেয়া তালিকা</h2>
                  <p className="text-xs text-muted-foreground mt-1">যারা এখনো {formatMonthBn(filterMonth)} মাসের চাঁদা দেননি</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-card border border-gold/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-gold" />
                  <button onClick={handleDownloadDuesReport} disabled={pdfLoading === "dues-report"} className="bg-red-500 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-red-600 transition-all">
                    {pdfLoading === "dues-report" ? <Loader2 className="animate-spin" /> : <Download size={16} />} ডাউনলোড বকেয়া তালিকা
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-gold/10 shadow-lg text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">মোট সদস্য</p>
                  <p className="text-2xl font-black text-gold">{duesData.total.toLocaleString("bn-BD")}</p>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-emerald-500/20 shadow-lg text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">পরিশোধ করেছেন</p>
                  <p className="text-2xl font-black text-emerald-600">{duesData.paidCount.toLocaleString("bn-BD")}</p>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-red-500/20 shadow-lg text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">বকেয়া আছে</p>
                  <p className="text-2xl font-black text-red-600">{duesData.dueCount.toLocaleString("bn-BD")}</p>
                </div>
              </div>

              <div className="bg-card rounded-3xl border border-gold/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-gold/5 border-b border-gold/10">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">নাম</th>
                      <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">এলাকা</th>
                      <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest">পদবী</th>
                      <th className="p-4 text-xs font-bold text-gold uppercase tracking-widest text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {duesData.list.map((m) => (
                      <tr key={m.id} className="hover:bg-gold/5 transition-colors group">
                        <td className="p-4 font-bold">{m.name}</td>
                        <td className="p-4 text-muted-foreground">{m.area || "-"}</td>
                        <td className="p-4 text-xs font-bold text-muted-foreground uppercase">{m.designation || "-"}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">বকেয়া</span>
                            <a 
                              href={`https://wa.me/${m.phone?.replace(/\+/g, '')}?text=${encodeURIComponent(`আসসালামু আলাইকুম, ${m.name}। চন্দনাইশ দরবার শরীফ কমিটি ফান্ডের ${formatMonthBn(filterMonth)} মাসের চাঁদা বকেয়া আছে। অনুগ্রহ করে জমা দিন।`)}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="p-2 bg-emerald-500/10 text-emerald-600 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              title="WhatsApp এ স্মরণ করিয়ে দিন"
                            >
                              <MessageCircle size={16} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {duesData.list.length === 0 && (
                      <tr><td colSpan={4} className="p-10 text-center text-muted-foreground italic">সবাই পরিশোধ করেছেন! মাশাআল্লাহ।</td></tr>
                    )}
                  </tbody>
                </table>
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
                  <button onClick={handleDownloadBackup} disabled={refreshing} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2"><Database size={16} /> ডাটা ব্যাকআপ</button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-xl">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-amber-500 font-bold text-[10px] uppercase">চাঁদার নিয়মাবলী:</p>
                      <p className="text-xs text-amber-500/80">প্রতি মাসের ১০ তারিখের মধ্যে সর্বনিম্ন ৫০ টাকা।</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><TrendingUp size={22} /> চাঁদা এন্ট্রি</h3>
                  <form onSubmit={handleSubmitContribution} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <select value={name} onChange={e => {
                          const val = e.target.value;
                          setName(val);
                          const member = members.find(m => m.name === val);
                          if (member?.area) setArea(member.area);
                        }} className="w-full bg-background border border-gold/10 rounded-xl px-4 py-3 outline-none focus:border-gold text-sm cursor-pointer appearance-none">
                          <option value="">দাতার নাম নির্বাচন করুন *</option>
                          {members.map(m => <option key={m.id} value={m.name}>{m.name} ({m.area || "এলাকা নাই"})</option>)}
                          <option value="custom">--- নতুন নাম লিখুন ---</option>
                        </select>
                        {name === "custom" && (
                          <input type="text" autoFocus placeholder="নতুন নাম লিখুন..." onBlur={e => setName(e.target.value)} className="absolute inset-0 bg-background border border-gold rounded-xl px-4 py-3 outline-none text-sm" />
                        )}
                      </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" value={expenseApprovedBy} onChange={e => setExpenseApprovedBy(e.target.value)} placeholder="অনুমোদনকারী (ঐচ্ছিক)" className="w-full bg-background border border-red-500/5 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm" />
                      <input type="text" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="মন্তব্য (ঐচ্ছিক)" className="w-full bg-background border border-red-500/5 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-sm" />
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
                
                <div className="bg-card p-6 rounded-2xl border border-gold/10 shadow-xl lg:col-span-2">
                  <h3 className="text-lg font-bold text-gold mb-6 flex items-center gap-2"><LayoutGrid size={22} /> সাম্প্রতিক এন্ট্রি ব্যবস্থাপনা</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gold/5 text-gold font-bold">
                        <tr><th className="p-3">তারিখ</th><th className="p-3">নাম/টাইটেল</th><th className="p-3">ধরন</th><th className="p-3 text-right">পরিমাণ</th><th className="p-3 text-center">অ্যাকশন</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gold/5">
                        {contributions.slice(0, 5).map(c => (
                          <tr key={c.id}>
                            <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-3 font-bold">{c.name}</td>
                            <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">চাঁদা</span></td>
                            <td className="p-3 text-right font-bold">৳{c.amount}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteContribution(c.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><TrendingDown size={14} /></button>
                            </td>
                          </tr>
                        ))}
                        {expenses.slice(0, 5).map(e => (
                          <tr key={e.id}>
                            <td className="p-3">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="p-3 font-bold">{e.title}</td>
                            <td className="p-3"><span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full">খরচ</span></td>
                            <td className="p-3 text-right font-bold">৳{e.amount}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleDeleteExpense(e.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"><TrendingDown size={14} /></button>
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
      <div className="fixed bottom-10 right-10 z-[100]"><button className="bg-gold text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all flex items-center gap-3 font-bold group border-2 border-white/20"><Calculator className="w-7 h-7" /><span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-500 whitespace-nowrap text-sm">হিসাব সহকারী</span></button></div>
    </div>
  );
};

export default CommitteeContributions;
