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
        backgroundColor: "#0a0a0a"
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

      {/* Hidden Invoice Template for PDF Generation */}
      <div className="hidden">
        <div ref={invoiceRef} className="p-10 bg-[#0a0a0a] text-white w-[800px] font-bengali">
          <div className="text-center mb-10 border-b border-gold/30 pb-6">
            <h1 className="text-3xl font-bold text-gold mb-2">চন্দনাইশ দরবার শরীফ</h1>
            <p className="text-sm text-gold/60">সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
            <div className="mt-4 inline-block px-4 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-bold">
              {viewMode === "monthly" ? `মাসিক আয়-ব্যয় রিপোর্ট: ${selectedMonth}` : `বার্ষিক আয়-ব্যয় রিপোর্ট: ${selectedMonth.slice(0, 4)}`}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-[#111] p-4 rounded-xl border border-emerald-500/20">
              <p className="text-xs text-muted-foreground mb-1">মোট আয়</p>
              <p className="text-xl font-bold text-emerald-500">৳{totalIncome.toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">মোট ব্যয়</p>
              <p className="text-xl font-bold text-red-500">৳{totalExpense.toLocaleString("bn-BD")}</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gold/20">
              <p className="text-xs text-muted-foreground mb-1">ব্যালেন্স</p>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>৳{balance.toLocaleString("bn-BD")}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-gold text-left">
                <th className="py-3 px-2">তারিখ</th>
                <th className="py-3 px-2">ধরন</th>
                <th className="py-3 px-2">বিভাগ</th>
                <th className="py-3 px-2 text-right">পরিমাণ (৳)</th>
                <th className="py-3 px-2">বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              {filteredFinances.map((f, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-3 px-2 whitespace-nowrap">{new Date(f.date).toLocaleDateString("bn-BD")}</td>
                  <td className="py-3 px-2">
                    <span className={f.type === "income" ? "text-emerald-400" : "text-red-400"}>
                      {f.type === "income" ? "আয়" : "ব্যয়"}
                    </span>
                  </td>
                  <td className="py-3 px-2">{f.category}</td>
                  <td className="py-3 px-2 text-right font-bold">
                    {Number(f.amount).toLocaleString("bn-BD")}
                  </td>
                  <td className="py-3 px-2 text-gray-400 max-w-[200px] truncate">{f.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 flex justify-between items-end border-t border-gold/20 pt-10">
            <div className="text-xs text-gray-500">
              <p>রিপোর্ট তৈরির তারিখ: {new Date().toLocaleDateString("bn-BD")}</p>
              <p>এটি একটি কম্পিউটার জেনারেটেড রিপোর্ট।</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-gray-600 mb-2"></div>
              <p className="text-sm font-bold text-gold">খাজা এনায়েত উল্লাহ</p>
              <p className="text-[10px] text-gray-500">তত্ত্বাবধায়ক, চন্দনাইশ দরবার শরীফ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceManager;
