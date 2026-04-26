import React, { useState, useEffect } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldCheck, PieChart, TrendingDown, TrendingUp, 
  Wallet, Calendar, Search, RefreshCw, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Contribution {
  amount: number;
  created_at: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string;
}

const FundTransparency = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [cRes, eRes] = await Promise.all([
        supabase.from("committee_contributions").select("amount, created_at"),
        supabase.from("committee_expenses").select("*").order("date", { ascending: false })
      ]);

      if (cRes.data) setContributions(cRes.data as Contribution[]);
      if (eRes.data) setExpenses(eRes.data as Expense[]);
    } catch (err) {
      console.error("Error fetching fund data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalCollection = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalCollection - totalExpense;

  const filteredExpenses = expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth));
  const monthExpense = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const getMonthlyStats = () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();

    return months.map(m => ({
      name: new Date(m + "-01").toLocaleDateString("bn-BD", { month: "short" }),
      total: contributions
        .filter(c => c.created_at.startsWith(m))
        .reduce((sum, c) => sum + Number(c.amount), 0)
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-20 font-bengali">
      <SEO 
        title="তহবিল স্বচ্ছতা - চন্দনাইশ দরবার শরীফ" 
        description="কমিটি ফান্ডের আয়-ব্যয় এবং স্বচ্ছতার বিস্তারিত বিবরণ।" 
      />

      {/* Hero Header */}
      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gold-gradient opacity-10" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-bold mb-6"
          >
            <ShieldCheck size={16} /> আর্থিক স্বচ্ছতা পোর্টাল
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-cream mb-6 tracking-tight">
            তহবিল <span className="text-gold">স্বচ্ছতা</span> ও জবাবদিহিতা
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            চন্দনাইশ দরবার শরীফ কমিটি ফান্ডের প্রতিটি আয় এবং ব্যয়ের হিসাব সবার জন্য উন্মুক্ত। আমরা বিশ্বাস করি স্বচ্ছতাই আস্থার মূল ভিত্তি।
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 -mt-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "মোট সংগ্রহ", value: totalCollection, icon: <Wallet />, color: "text-gold", bg: "bg-gold/5" },
            { label: "মোট খরচ", value: totalExpense, icon: <TrendingDown />, color: "text-red-500", bg: "bg-red-500/5" },
            { label: "বর্তমান ব্যালেন্স", value: balance, icon: <TrendingUp />, color: "text-green-500", bg: "bg-green-500/5" }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-card/50 backdrop-blur-xl border border-gold/10 p-8 rounded-3xl shadow-xl hover:border-gold/30 transition-all group`}
            >
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">{stat.label}</p>
              <p className={`text-4xl font-bold ${stat.color}`}>৳{stat.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card/50 backdrop-blur-xl border border-gold/10 p-8 rounded-3xl shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                  <PieChart size={22} /> সাম্প্রতিক সংগ্রহ (৬ মাস)
                </h2>
                <button onClick={fetchData} className={`p-2 rounded-xl bg-gold/10 text-gold transition-all ${refreshing ? "animate-spin" : ""}`}>
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyStats()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #D4AF37", borderRadius: "12px" }}
                      itemStyle={{ color: "#D4AF37" }}
                    />
                    <Bar dataKey="total" fill="#D4AF37" radius={[6, 6, 0, 0]} barSize={40}>
                      {getMonthlyStats().map((_, index) => (
                        <Cell key={`cell-${index}`} fillOpacity={0.8 + (index * 0.04)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense List */}
            <div className="bg-card/50 backdrop-blur-xl border border-gold/10 rounded-3xl shadow-xl overflow-hidden">
              <div className="p-8 border-b border-gold/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gold flex items-center gap-2">
                  <TrendingDown size={22} className="text-red-500" /> খরচের বিস্তারিত তালিকা
                </h2>
                <div className="flex items-center gap-3 bg-background/50 p-1.5 rounded-2xl border border-gold/10">
                  <Calendar size={18} className="text-gold ml-2" />
                  <input 
                    type="month" 
                    value={filterMonth} 
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-bold text-cream cursor-pointer"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gold/5 text-gold text-xs font-bold uppercase tracking-widest border-b border-gold/10">
                    <tr>
                      <th className="px-8 py-5">তারিখ</th>
                      <th className="px-8 py-5">বিবরণ</th>
                      <th className="px-8 py-5 text-right">পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/5">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gold/5 transition-colors group">
                          <td className="px-8 py-6">
                            <span className="text-sm text-muted-foreground group-hover:text-cream transition-colors">
                              {new Date(expense.date).toLocaleDateString("bn-BD")}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-cream mb-1">{expense.title}</p>
                            {expense.note && <p className="text-xs text-muted-foreground">{expense.note}</p>}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="text-lg font-bold text-red-500">৳{expense.amount.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-8 py-20 text-center">
                          <AlertCircle size={40} className="mx-auto text-gold/20 mb-4" />
                          <p className="text-muted-foreground font-bold">এই মাসে কোনো খরচের রেকর্ড পাওয়া যায়নি।</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-red-500/5 text-center">
                <p className="text-sm text-red-500 font-bold">এই মাসে মোট খরচ: ৳{monthExpense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-gold-gradient p-8 rounded-3xl shadow-xl text-primary-foreground">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ShieldCheck size={24} /> নিরাপদ অনুদান
              </h3>
              <p className="text-sm opacity-90 leading-relaxed mb-6">
                আপনার দেওয়া প্রতিটি পয়সা দরবার শরীফের উন্নয়ন এবং মানবতার সেবায় ব্যয় করা হয়। যেকোনো অসামঞ্জস্যতা নজরে আসলে আমাদের জানান।
              </p>
              <button className="w-full py-4 bg-white text-gold font-bold rounded-2xl hover:bg-cream transition-colors shadow-lg">
                যোগাযোগ করুন
              </button>
            </div>

            <div className="bg-card/50 backdrop-blur-xl border border-gold/10 p-8 rounded-3xl shadow-xl">
              <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                <Search size={20} /> অনুসন্ধান করুন
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                আপনি যদি কমিটি মেম্বার হয়ে থাকেন, তবে আপনার ব্যক্তিগত অনুদান এবং রসিদ দেখতে মেম্বার পোর্টালে লগইন করুন।
              </p>
              <a 
                href="/committee-login" 
                className="flex items-center justify-center gap-2 w-full py-3 border border-gold/20 rounded-xl text-gold font-bold hover:bg-gold/5 transition-all"
              >
                মেম্বার পোর্টাল
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FundTransparency;
