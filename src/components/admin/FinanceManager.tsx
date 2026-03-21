import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, TrendingUp, TrendingDown, Wallet, Calendar, Pencil, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Finance {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

const INCOME_CATEGORIES = ["হাদিয়া", "নজরানা", "দান", "চাঁদা", "অন্যান্য আয়"];
const EXPENSE_CATEGORIES = ["নির্মাণ", "খাবার", "বিদ্যুৎ", "পরিবহন", "বেতন", "মেরামত", "অন্যান্য খরচ"];
const CHART_COLORS = [
  "hsl(45, 93%, 47%)", "hsl(120, 40%, 45%)", "hsl(200, 70%, 50%)",
  "hsl(340, 65%, 50%)", "hsl(280, 55%, 55%)", "hsl(30, 80%, 50%)", "hsl(170, 60%, 40%)"
];

const FinanceManager = () => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { toast } = useToast();

  const fetchFinances = async () => {
    const { data } = await supabase
      .from("finances")
      .select("*")
      .order("date", { ascending: false });
    if (data) setFinances(data as Finance[]);
  };

  useEffect(() => { fetchFinances(); }, []);

  const addFinance = async () => {
    if (!category || !amount || !date) {
      toast({ title: "ত্রুটি", description: "সকল ফিল্ড পূরণ করুন।", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("finances").insert([{
      type: formType, category, amount: parseFloat(amount),
      description: description || null, date
    }]);
    if (!error) {
      toast({ title: "সফল", description: `${formType === "income" ? "আয়" : "ব্যয়"} যোগ করা হয়েছে।` });
      setCategory(""); setAmount(""); setDescription("");
      fetchFinances();
    } else {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const deleteFinance = async (id: string) => {
    await supabase.from("finances").delete().eq("id", id);
    fetchFinances();
  };

  // Filtered data
  const filteredFinances = finances.filter(f => {
    if (viewMode === "monthly") return f.date.startsWith(selectedMonth);
    return f.date.startsWith(selectedMonth.slice(0, 4));
  });

  const totalIncome = filteredFinances.filter(f => f.type === "income").reduce((s, f) => s + Number(f.amount), 0);
  const totalExpense = filteredFinances.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
  const balance = totalIncome - totalExpense;

  // Chart data
  const monthlyChartData = () => {
    const year = selectedMonth.slice(0, 4);
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = `${year}-${String(i + 1).padStart(2, "0")}`;
      const inc = finances.filter(f => f.type === "income" && f.date.startsWith(m)).reduce((s, f) => s + Number(f.amount), 0);
      const exp = finances.filter(f => f.type === "expense" && f.date.startsWith(m)).reduce((s, f) => s + Number(f.amount), 0);
      const monthNames = ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
      return { name: monthNames[i], আয়: inc, ব্যয়: exp };
    });
    return months;
  };

  const categoryPieData = (type: "income" | "expense") => {
    const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return cats.map(cat => ({
      name: cat,
      value: filteredFinances.filter(f => f.type === type && f.category === cat).reduce((s, f) => s + Number(f.amount), 0)
    })).filter(d => d.value > 0);
  };

  // PDF generation
  const generatePDF = async () => {
    const title = viewMode === "monthly"
      ? `মাসিক আয়-ব্যয় রিপোর্ট — ${selectedMonth}`
      : `বার্ষিক আয়-ব্যয় রিপোর্ট — ${selectedMonth.slice(0, 4)}`;
    
    const invoiceNo = `INV-${selectedMonth.replace("-", "")}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const today = new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:820px;background:#fff;color:#1a1a1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;";

    const incomeItems = filteredFinances.filter(f => f.type === "income");
    const expenseItems = filteredFinances.filter(f => f.type === "expense");

    // Category-wise summary
    const catSummary = (type: "income" | "expense") => {
      const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      return cats
        .map(c => ({ name: c, total: filteredFinances.filter(f => f.type === type && f.category === c).reduce((s, f) => s + Number(f.amount), 0) }))
        .filter(c => c.total > 0);
    };

    container.innerHTML = `
      <div style="padding:0;">
        <!-- Header with gradient -->
        <div style="background:linear-gradient(135deg, #0d4a2e 0%, #1a7a4a 50%, #0d4a2e 100%);padding:36px 44px;color:white;position:relative;overflow:hidden;">
          <div style="position:absolute;top:-30px;right:-30px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
          <div style="position:absolute;bottom:-40px;left:40%;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                <div style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">☪</div>
                <div>
                  <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">চন্দনাইশ দরবার শরীফ</h1>
                  <p style="margin:2px 0 0;font-size:12px;opacity:0.75;letter-spacing:1px;">CHANDANAISH DARBAR SHARIF</p>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 18px;">
                <p style="margin:0;font-size:10px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;">ইনভয়েস নম্বর</p>
                <p style="margin:2px 0 0;font-size:16px;font-weight:700;font-family:monospace;">${invoiceNo}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub header -->
        <div style="background:#f8faf9;padding:16px 44px;border-bottom:2px solid #e8ece9;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">রিপোর্ট টাইপ</span>
            <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#333;">${title}</p>
          </div>
          <div style="text-align:right;">
            <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;">তৈরির তারিখ</span>
            <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#333;">${today}</p>
          </div>
        </div>

        <div style="padding:28px 44px;">
          <!-- Summary Cards -->
          <div style="display:flex;gap:14px;margin-bottom:28px;">
            <div style="flex:1;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:14px;padding:20px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-10px;top:-10px;width:60px;height:60px;border-radius:50%;background:rgba(46,125,50,0.08);"></div>
              <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">মোট আয়</p>
              <p style="margin:6px 0 0;font-size:26px;font-weight:800;color:#2e7d32;">৳${totalIncome.toLocaleString("bn-BD")}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#66bb6a;">${incomeItems.length}টি লেনদেন</p>
            </div>
            <div style="flex:1;background:linear-gradient(135deg,#ffebee,#ffcdd2);border-radius:14px;padding:20px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-10px;top:-10px;width:60px;height:60px;border-radius:50%;background:rgba(198,40,40,0.08);"></div>
              <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">মোট ব্যয়</p>
              <p style="margin:6px 0 0;font-size:26px;font-weight:800;color:#c62828;">৳${totalExpense.toLocaleString("bn-BD")}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#ef5350;">${expenseItems.length}টি লেনদেন</p>
            </div>
            <div style="flex:1;background:linear-gradient(135deg,#fff8e1,#ffecb3);border-radius:14px;padding:20px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-10px;top:-10px;width:60px;height:60px;border-radius:50%;background:rgba(183,150,30,0.08);"></div>
              <p style="margin:0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;font-weight:600;">নিট ব্যালেন্স</p>
              <p style="margin:6px 0 0;font-size:26px;font-weight:800;color:${balance >= 0 ? '#2e7d32' : '#c62828'};">৳${balance.toLocaleString("bn-BD")}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#999;">${filteredFinances.length}টি মোট লেনদেন</p>
            </div>
          </div>

          <!-- Category Summary -->
          <div style="display:flex;gap:14px;margin-bottom:28px;">
            ${[{ type: "income" as const, label: "আয়ের বিভাগ", color: "#2e7d32", bg: "#f1f8e9" }, { type: "expense" as const, label: "ব্যয়ের বিভাগ", color: "#c62828", bg: "#fef2f2" }].map(({ type, label, color, bg }) => {
              const items = catSummary(type);
              return `<div style="flex:1;border:1.5px solid #e8ece9;border-radius:12px;padding:16px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${color};">📊 ${label}</p>
                ${items.length > 0 ? items.map(c => `
                  <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #eee;font-size:12px;">
                    <span style="color:#555;">${c.name}</span>
                    <span style="font-weight:700;color:${color};">৳${c.total.toLocaleString("bn-BD")}</span>
                  </div>
                `).join("") : `<p style="color:#bbb;font-size:12px;text-align:center;margin:10px 0;">তথ্য নেই</p>`}
              </div>`;
            }).join("")}
          </div>

          <!-- Transaction Table -->
          <div style="border:1.5px solid #e8ece9;border-radius:12px;overflow:hidden;">
            <div style="background:#f8faf9;padding:12px 16px;border-bottom:1.5px solid #e8ece9;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#333;">📋 বিস্তারিত লেনদেন তালিকা</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f0f4f1;">
                  <th style="padding:10px 14px;text-align:left;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">#</th>
                  <th style="padding:10px 14px;text-align:left;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">তারিখ</th>
                  <th style="padding:10px 14px;text-align:left;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">ধরন</th>
                  <th style="padding:10px 14px;text-align:left;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">বিভাগ</th>
                  <th style="padding:10px 14px;text-align:right;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">পরিমাণ</th>
                  <th style="padding:10px 14px;text-align:left;font-weight:700;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #dde3de;">বিবরণ</th>
                </tr>
              </thead>
              <tbody>
                ${filteredFinances.length === 0 
                  ? `<tr><td colspan="6" style="padding:30px;text-align:center;color:#bbb;font-size:13px;">কোনো লেনদেন পাওয়া যায়নি</td></tr>`
                  : filteredFinances.map((f, i) => `
                  <tr style="background:${i % 2 === 0 ? '#fff' : '#fafcfa'};">
                    <td style="padding:10px 14px;color:#aaa;font-size:11px;border-bottom:1px solid #f0f0f0;">${String(i + 1).padStart(2, '0')}</td>
                    <td style="padding:10px 14px;font-weight:500;border-bottom:1px solid #f0f0f0;">${new Date(f.date).toLocaleDateString("bn-BD")}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                      <span style="background:${f.type === 'income' ? '#e8f5e9' : '#ffebee'};color:${f.type === 'income' ? '#2e7d32' : '#c62828'};padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;">
                        ${f.type === "income" ? "আয়" : "ব্যয়"}
                      </span>
                    </td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${f.category}</td>
                    <td style="padding:10px 14px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid #f0f0f0;color:${f.type === 'income' ? '#2e7d32' : '#c62828'};">৳${Number(f.amount).toLocaleString("bn-BD")}</td>
                    <td style="padding:10px 14px;color:#888;border-bottom:1px solid #f0f0f0;">${f.description || "—"}</td>
                  </tr>
                `).join("")}
              </tbody>
              ${filteredFinances.length > 0 ? `
              <tfoot>
                <tr style="background:#f0f4f1;font-weight:700;">
                  <td colspan="4" style="padding:12px 14px;text-align:right;font-size:13px;border-top:2px solid #dde3de;">মোট:</td>
                  <td style="padding:12px 14px;text-align:right;font-size:14px;border-top:2px solid #dde3de;font-family:'Courier New',monospace;color:#1a5c2e;">
                    আয় ৳${totalIncome.toLocaleString("bn-BD")} | ব্যয় ৳${totalExpense.toLocaleString("bn-BD")}
                  </td>
                  <td style="padding:12px 14px;border-top:2px solid #dde3de;"></td>
                </tr>
              </tfoot>` : ""}
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f8faf9;padding:20px 44px;border-top:2px solid #e8ece9;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="margin:0;font-size:10px;color:#aaa;">এই ইনভয়েসটি স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে</p>
              <p style="margin:2px 0 0;font-size:10px;color:#ccc;">চন্দনাইশ দরবার শরীফ ম্যানেজমেন্ট সিস্টেম © ${new Date().getFullYear()}</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:10px;color:#aaa;">ইনভয়েস: ${invoiceNo}</p>
              <p style="margin:2px 0 0;font-size:10px;color:#ccc;">পৃষ্ঠা ১</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        let position = 0;
        while (position < pdfHeight) {
          pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, pdfHeight);
          position += pageHeight;
          if (position < pdfHeight) pdf.addPage();
        }
      }

      pdf.save(`invoice-${invoiceNo}.pdf`);
      toast({ title: "✅ ডাউনলোড সফল", description: "প্রফেশনাল PDF ইনভয়েস ডাউনলোড হয়েছে।" });
    } catch {
      toast({ title: "ত্রুটি", description: "PDF তৈরিতে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <span className="text-sm text-muted-foreground font-medium">মোট আয়</span>
          </div>
          <p className="text-2xl font-bold text-emerald-500">৳{totalIncome.toLocaleString("bn-BD")}</p>
        </div>
        <div className="bg-card border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="text-red-500" size={20} />
            </div>
            <span className="text-sm text-muted-foreground font-medium">মোট ব্যয়</span>
          </div>
          <p className="text-2xl font-bold text-red-500">৳{totalExpense.toLocaleString("bn-BD")}</p>
        </div>
        <div className="bg-card border border-gold/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Wallet className="text-gold" size={20} />
            </div>
            <span className="text-sm text-muted-foreground font-medium">ব্যালেন্স</span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            ৳{balance.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-card border border-gold/20 rounded-xl overflow-hidden">
          <button onClick={() => setViewMode("monthly")} className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "monthly" ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-gold"}`}>
            মাসিক
          </button>
          <button onClick={() => setViewMode("yearly")} className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "yearly" ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-gold"}`}>
            বার্ষিক
          </button>
        </div>
        <input
          type={viewMode === "monthly" ? "month" : "number"}
          value={viewMode === "monthly" ? selectedMonth : selectedMonth.slice(0, 4)}
          onChange={e => setSelectedMonth(viewMode === "monthly" ? e.target.value : `${e.target.value}-01`)}
          min={viewMode === "yearly" ? 2020 : undefined}
          max={viewMode === "yearly" ? 2030 : undefined}
          className="bg-card border border-gold/20 rounded-xl px-4 py-2 text-sm text-foreground"
        />
        <button onClick={generatePDF} className="ml-auto flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold hover:bg-gold hover:text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all">
          <Download size={16} /> ইনভয়েস ডাউনলোড
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-card border border-gold/20 rounded-2xl p-5">
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">মাসভিত্তিক আয়-ব্যয়</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="আয়" fill="hsl(120, 40%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ব্যয়" fill="hsl(0, 65%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Charts */}
        <div className="bg-card border border-gold/20 rounded-2xl p-5">
          <h3 className="text-lg font-heading font-bold text-foreground mb-4">বিভাগভিত্তিক বিশ্লেষণ</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["income", "expense"] as const).map(type => {
              const pieData = categoryPieData(type);
              return (
                <div key={type}>
                  <p className="text-xs text-center font-medium text-muted-foreground mb-1">
                    {type === "income" ? "আয়" : "ব্যয়"}
                  </p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" label={({ name }) => name} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `৳${v.toLocaleString("bn-BD")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">তথ্য নেই</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-card border border-gold/20 rounded-2xl p-6">
        <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <Plus size={20} className="text-gold" /> নতুন এন্ট্রি যোগ করুন
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={formType} onChange={e => { setFormType(e.target.value as "income" | "expense"); setCategory(""); }}
            className="bg-background border border-gold/20 rounded-xl px-3 py-2.5 text-sm">
            <option value="income">আয়</option>
            <option value="expense">ব্যয়</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-background border border-gold/20 rounded-xl px-3 py-2.5 text-sm">
            <option value="">বিভাগ নির্বাচন</option>
            {(formType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input type="number" placeholder="পরিমাণ (৳)" value={amount} onChange={e => setAmount(e.target.value)}
            className="bg-background border border-gold/20 rounded-xl px-3 py-2.5 text-sm" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-background border border-gold/20 rounded-xl px-3 py-2.5 text-sm" />
          <button onClick={addFinance} disabled={loading}
            className="bg-gold-gradient text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "যোগ হচ্ছে..." : "যোগ করুন"}
          </button>
        </div>
        <input type="text" placeholder="বিবরণ (ঐচ্ছিক)" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full mt-3 bg-background border border-gold/20 rounded-xl px-3 py-2.5 text-sm" />
      </div>

      {/* Transaction List */}
      <div className="bg-card border border-gold/20 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gold/10">
          <h3 className="text-lg font-heading font-bold text-foreground">লেনদেন তালিকা</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/10 text-muted-foreground">
                <th className="text-left p-3 font-medium">তারিখ</th>
                <th className="text-left p-3 font-medium">ধরন</th>
                <th className="text-left p-3 font-medium">বিভাগ</th>
                <th className="text-right p-3 font-medium">পরিমাণ</th>
                <th className="text-left p-3 font-medium">বিবরণ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredFinances.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">কোনো লেনদেন পাওয়া যায়নি।</td></tr>
              ) : filteredFinances.map(f => (
                <tr key={f.id} className="border-b border-gold/5 hover:bg-gold/5 transition-colors">
                  <td className="p-3 text-foreground">{new Date(f.date).toLocaleDateString("bn-BD")}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${f.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                      {f.type === "income" ? "আয়" : "ব্যয়"}
                    </span>
                  </td>
                  <td className="p-3 text-foreground">{f.category}</td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">৳{Number(f.amount).toLocaleString("bn-BD")}</td>
                  <td className="p-3 text-muted-foreground">{f.description || "-"}</td>
                  <td className="p-3">
                    <button onClick={() => deleteFinance(f.id)} className="text-red-500/60 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
