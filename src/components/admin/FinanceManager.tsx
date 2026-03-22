import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
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
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    setLoading(true);
    try {
      // Create a temporary clone for higher quality
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${selectedMonth}.pdf`);
      toast({ title: "ডাউনলোড সফল", description: "ইনভয়েস PDF ডাউনলোড হয়েছে।" });
    } catch (err) {
      toast({ title: "ত্রুটি", description: "PDF তৈরিতে সমস্যা হয়েছে।", variant: "destructive" });
    }
    setLoading(false);
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

      {/* Hidden Ultra-Premium Invoice Template for PDF */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <div ref={invoiceRef} className="bg-white text-slate-900 w-[794px] min-h-[1123px] font-bengali relative flex flex-col shadow-none box-border">
          
          {/* Top Letterhead Bar */}
          <div className="h-6 w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]" />
          <div className="h-2 w-full bg-slate-900" />

          {/* Majestic Watermark (Islamic Geometric Star SVG) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0 overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-[600px] h-[600px] text-slate-900" fill="currentColor">
              <path d="M50 0 L55 35 L90 20 L65 50 L90 80 L55 65 L50 100 L45 65 L10 80 L35 50 L10 20 L45 35 Z" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="w-full relative z-20 flex-1 flex flex-col px-14 py-12">
            
            {/* Ultra Premium Header */}
            <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
              <div className="flex-1">
                <h2 className="font-arabic text-xl text-slate-600 mb-3 tracking-widest pl-1">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</h2>
                <h1 className="text-4xl font-black text-slate-900 mb-2 font-heading tracking-tight leading-none">চন্দনাইশ দরবার শরীফ</h1>
                <p className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase">সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
                
                <div className="mt-6">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">ঠিকানা</p>
                  <p className="text-sm font-medium text-slate-700 leading-tight mt-1">
                    চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ<br/>
                    ইমেইল: info@chandanaishdarbar.org<br/>
                    ফোন: +880 1700-000000
                  </p>
                </div>
              </div>
              
              <div className="text-right w-64">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm">
                  <h3 className="text-slate-900 font-bold text-lg mb-1 tracking-wide">ফাইন্যান্সিয়াল রিপোর্ট</h3>
                  <p className="text-[#D4AF37] font-bold text-sm">
                    {viewMode === "monthly" ? selectedMonth : selectedMonth.slice(0, 4)}
                  </p>
                  <div className="w-full h-px bg-slate-200 my-3" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">ইস্যু তারিখ</p>
                  <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString("bn-BD")}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-2">Ref: CDS-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-0 mb-12 border-2 border-slate-900 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-white p-6 relative border-r border-slate-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">মোট আয়</p>
                <p className="text-2xl font-black text-slate-900 font-mono">৳ {totalIncome.toLocaleString("bn-BD")}</p>
              </div>
              <div className="bg-white p-6 relative border-r border-slate-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">মোট ব্যয়</p>
                <p className="text-2xl font-black text-slate-900 font-mono">৳ {totalExpense.toLocaleString("bn-BD")}</p>
              </div>
              <div className="bg-slate-50 p-6 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
                <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest mb-1">অবশিষ্ট ব্যালেন্স</p>
                <p className={`text-2xl font-black font-mono ${balance >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  ৳ {balance.toLocaleString("bn-BD")}
                </p>
              </div>
            </div>

            {/* Transaction Matrix */}
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest mb-3 pr-4 flex items-center">
                <span className="w-4 h-4 bg-[#D4AF37] mr-2 inline-block"></span>
                লেনদেন বিবরণী
                <span className="flex-1 ml-4 border-t border-dashed border-slate-300"></span>
              </h3>
              <table className="w-full text-sm border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider border-r border-slate-700">তারিখ</th>
                    <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider border-r border-slate-700">ধরন</th>
                    <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider border-r border-slate-700">বিভাগ/খাত</th>
                    <th className="py-3 px-4 text-left font-bold uppercase text-xs tracking-wider border-r border-slate-700 w-[250px]">বিবরণ</th>
                    <th className="py-3 px-4 text-right font-bold uppercase text-xs tracking-wider">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFinances.map((f, i) => (
                    <tr key={i} className="border-b border-slate-200 last:border-0 odd:bg-white even:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-700 font-medium border-r border-slate-200">
                        {new Date(f.date).toLocaleDateString("bn-BD")}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200">
                        <span className={`font-bold ${f.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {f.type === "income" ? "আয়" : "ব্যয়"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium border-r border-slate-200">{f.category}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs max-w-[250px] border-r border-slate-200">
                        {f.description || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                        {Number(f.amount).toLocaleString("bn-BD")}
                      </td>
                    </tr>
                  ))}
                  {filteredFinances.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                        কোনো লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* End of Report Bar */}
              <div className="mt-4 border-t-2 border-slate-900 flex justify-between items-center pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End of Report</p>
                <p className="text-xs font-bold text-slate-900 font-mono">Total Valid Entries: {filteredFinances.length}</p>
              </div>
            </div>

            {/* Official Footer with SVG Stamp */}
            <div className="mt-auto pt-12 flex justify-between items-end">
              <div className="text-xs text-slate-500 leading-relaxed font-medium">
                <p className="font-bold text-slate-800 mb-1">গুরুত্বপূর্ণ নোটিশ:</p>
                <p>১. এটি একটি স্বয়ংক্রিয় কম্পিউটার জেনারেটেড রিপোর্ট।</p>
                <p>২. উল্লিখিত হিসেবে কোনো অসংগতি থাকলে কতৃপক্ষের সাথে যোগাযোগ করুন।</p>
                <p className="mt-2 text-[10px] text-slate-400">&copy; {new Date().getFullYear()} Chandanaish Darbar Sharif.</p>
              </div>
              
              <div className="text-center w-64 relative">
                {/* SVG Official Stamp (slight rotation for realism) */}
                <div className="absolute -top-16 -left-8 -rotate-12 opacity-80 mix-blend-multiply select-none">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 text-rose-600/90" fill="none" stroke="currentColor">
                    <circle cx="50" cy="50" r="45" strokeWidth="2" strokeDasharray="4 2" />
                    <circle cx="50" cy="50" r="40" strokeWidth="1" />
                    <circle cx="50" cy="50" r="30" strokeWidth="0.5" />
                    <path d="M20 50 Q50 30 80 50" strokeWidth="1" />
                    <text x="50" y="35" fontSize="12" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" transform="rotate(-15 50 25)">APPROVED</text>
                    <text x="50" y="65" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">OFFICIAL</text>
                    <text x="50" y="75" fontSize="8" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">SEAL</text>
                  </svg>
                </div>
                
                {/* Signature Line */}
                <div className="border-t-2 border-slate-800 pt-3 relative z-10">
                  <p className="text-lg font-black text-slate-900 font-heading">খাজা এনায়েত উল্লাহ</p>
                  <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mt-1">তত্ত্বাবধায়ক</p>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* Bottom Border Accent */}
          <div className="absolute bottom-0 left-0 w-full h-8 bg-slate-900 flex items-center justify-center">
             <div className="h-0.5 w-1/3 bg-[#D4AF37]/50" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
