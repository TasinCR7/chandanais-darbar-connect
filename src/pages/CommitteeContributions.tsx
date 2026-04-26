import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FileText, Shield, User as UserIcon, Search, Download, Target, Award, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

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
  "চন্দনাইশ",
  "পটিয়া",
  "আনোয়ারা",
  "সাতকানিয়া",
  "লোহাগাড়া",
  "বাঁশখালী",
  "বোয়ালখালী",
  "অন্যান্য"
];

const PAYMENT_METHODS = ["ক্যাশ (Cash)", "বিকাশ (bKash)", "নগদ (Nagad)", "রকেট (Rocket)", "ব্যাংক (Bank)"];

const YEARLY_GOAL = 1000000; // 10 Lakhs BDT Example Goal

const CommitteeContributions = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State (Contributions)
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paymentMethod, setPaymentMethod] = useState("ক্যাশ (Cash)");
  const [transactionId, setTransactionId] = useState("");

  // Form State (Expenses)
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNote, setExpenseNote] = useState("");

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
        const isMaster = [
          "chandanaishdarbarsharif@gmail.com",
          "tasinskder@gmail.com"
        ].includes(session.user.email || "");
        
        const isMasterPhone = [
          "+8801714338533",
          "+8801819614444",
          "+8801835674454"
        ].includes(session.user.phone || "");

        if (isMaster || isMasterPhone) {
          setIsAdmin(true);
        } else {
          const { data } = await supabase.rpc("has_role", { 
            _user_id: session.user.id, 
            _role: "admin" 
          });
          setIsAdmin(!!data);
        }
      }
      setLoading(false);
    };
    checkAuth();
    fetchData();
  }, []);

  const fetchData = async () => {
    fetchContributions();
    fetchExpenses();
    fetchMembers();
  };

  const fetchContributions = async () => {
    const { data } = await supabase
      .from("committee_contributions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setContributions(data as Contribution[]);
  };

  const fetchExpenses = async () => {
    // In a real app, you'd have a committee_expenses table
    // For now, we'll try to fetch or use empty array if table doesn't exist
    const { data } = await supabase
      .from("committee_expenses")
      .select("*")
      .order("date", { ascending: false });
    if (data) setExpenses(data as Expense[]);
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("committee_members").select("id, name");
    if (data) setCommitteeMembers(data);
  };

  const handleDownloadSingleReceipt = (c: Contribution) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55);
    doc.text("Chandanish Darbar Sharif", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Contribution Receipt", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Receipt ID: ${c.id.slice(0, 8)}`, 20, 50);
    doc.text(`Date: ${new Date(c.created_at).toLocaleDateString()}`, 20, 60);
    doc.text(`Name: ${c.name}`, 20, 70);
    doc.text(`Area: ${c.area || "N/A"}`, 20, 80);
    doc.text(`Target Month: ${c.target_month || "N/A"}`, 20, 90);
    doc.text(`Amount: ${c.amount} BDT`, 20, 100);
    doc.text(`Payment Method: ${c.payment_method || "Cash"}`, 20, 110);
    if (c.transaction_id) doc.text(`Transaction ID: ${c.transaction_id}`, 20, 120);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your contribution to Chandanish Darbar Sharif.", 105, 140, { align: "center" });

    doc.save(`Receipt_${c.name}_${new Date().getTime()}.pdf`);
  };

  const handleSubmitContribution = async (e: FormEvent) => {
    e.preventDefault();
    const id = uuidv4();
    const { error } = await supabase.from("committee_contributions").insert([
      {
        id,
        name,
        amount: Number(amount),
        area: area || null,
        note,
        target_month: targetMonth,
        payment_method: paymentMethod,
        transaction_id: transactionId || null,
      },
    ]);
    if (error) {
      toast.error("সংগ্রহ সংরক্ষণে ত্রুটি: " + error.message);
    } else {
      toast.success("সংগ্রহ রেকর্ড করা হয়েছে! রসিদ জেনারেট হচ্ছে...");
      
      handleDownloadSingleReceipt({
        id, name, amount: Number(amount), area: area || null, note, 
        created_at: new Date().toISOString(), target_month: targetMonth, 
        payment_method: paymentMethod, transaction_id: transactionId || null
      });

      setName("");
      setAmount("");
      setArea("");
      setNote("");
      setTransactionId("");
      fetchContributions();
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("committee_expenses").insert([
      {
        title: expenseTitle,
        amount: Number(expenseAmount),
        date: expenseDate,
        note: expenseNote,
      },
    ]);
    if (error) {
      toast.error("খরচের হিসাব সংরক্ষণে ত্রুটি: " + error.message);
    } else {
      toast.success("খরচের হিসাব রেকর্ড করা হয়েছে!");
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseNote("");
      fetchExpenses();
    }
  };

  const handleMemberSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম বা আইডি লিখুন");
      return;
    }
    const results = contributions.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResult(results);
    if (results.length === 0) {
      toast.info("কোনো তথ্য পাওয়া যায়নি");
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear().toString();

  const getMemberStats = () => {
    if (!searchResult || searchResult.length === 0) return null;
    const total = searchResult.reduce((sum, c) => sum + c.amount, 0);
    const yearly = searchResult
      .filter((c) => c.created_at.startsWith(currentYear))
      .reduce((sum, c) => sum + c.amount, 0);
    const monthly = searchResult
      .filter((c) => (c.target_month === currentMonth || c.created_at.startsWith(currentMonth)))
      .reduce((sum, c) => sum + c.amount, 0);
    return { total, yearly, monthly };
  };

  const memberStats = getMemberStats();

  const filtered = contributions.filter((c) => {
    if (!filterMonth) return true;
    const month = c.target_month || new Date(c.created_at).toISOString().slice(0, 7);
    return month === filterMonth;
  });

  const monthlyTotal = filtered.reduce((sum, c) => sum + c.amount, 0);
  const monthlyExpense = expenses.filter(e => e.date.startsWith(filterMonth)).reduce((sum, e) => sum + e.amount, 0);
  
  const currentYearContributions = contributions.filter(c => c.created_at.startsWith(currentYear)).reduce((sum, c) => sum + c.amount, 0);
  const goalPercentage = Math.min((currentYearContributions / YEARLY_GOAL) * 100, 100);

  const getDueMembers = () => {
    if (!filterMonth || committeeMembers.length === 0) return [];
    const contributorsThisMonth = new Set(
      filtered.map(c => c.name.toLowerCase().trim())
    );
    return committeeMembers.filter(m => !contributorsThisMonth.has(m.name.toLowerCase().trim()));
  };
  const dueMembers = getDueMembers();

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55);
    doc.text("Chandanish Darbar Sharif", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Financial Statement Report", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Period: ${filterMonth || "All Time"}`, 20, 45);
    doc.text(`Total Collection: ${monthlyTotal} BDT`, 20, 52);
    doc.text(`Total Expense: ${monthlyExpense} BDT`, 120, 52);

    const tableData = filtered.map(c => [
      new Date(c.created_at).toLocaleDateString(),
      c.name,
      c.target_month || "-",
      `${c.amount} BDT`,
      c.payment_method || "-"
    ]);

    // @ts-ignore
    doc.autoTable({
      startY: 65,
      head: [['Date', 'Name', 'Target Month', 'Amount', 'Method']],
      body: tableData,
      headStyles: { fillColor: [212, 175, 55] },
    });

    doc.save(`Financial_Report_${filterMonth || "All"}.pdf`);
  };

  return (
    <>
      <SEO
        title="কমিটি অর্থ সংগ্রহ"
        description="কমিটি সদস্যদের মাসিক অর্থ সংগ্রহ রেকর্ড এবং বিবরণ।"
        keywords="কমিটি, অর্থ, সংগ্রহ, মাসিক, প্রবেশ, Darbar"
        canonical="/committee-contributions"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gold">কমিটি অর্থ সংগ্রহ ও হিসাব</h1>
            <p className="text-muted-foreground">স্বচ্ছতা ও সুন্দর ব্যবস্থাপনার জন্য আধুনিক সিস্টেম</p>
          </div>
          {isAdmin && (
            <div className="bg-gold/10 px-4 py-2 rounded-lg border border-gold/20 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" />
              <span className="text-gold font-bold">অ্যাডমিন মোড</span>
            </div>
          )}
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-gold/20 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-16 h-16 text-gold" />
            </div>
            <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">মোট কালেকশন ({filterMonth || "সব সময়"})</h3>
            <p className="text-3xl font-black text-gold">৳{monthlyTotal.toLocaleString()}</p>
          </div>
          
          <div className="bg-card p-6 rounded-xl border border-red-500/20 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown className="w-16 h-16 text-red-500" />
            </div>
            <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">মোট খরচ ({filterMonth || "সব সময়"})</h3>
            <p className="text-3xl font-black text-red-500">৳{monthlyExpense.toLocaleString()}</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-green-500/20 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">অবশিষ্ট ফান্ড</h3>
            <p className="text-3xl font-black text-green-500">৳{(monthlyTotal - monthlyExpense).toLocaleString()}</p>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="bg-card p-6 rounded-lg shadow mb-8 border border-gold/10">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gold flex items-center gap-2">
              <Target className="w-5 h-5" /> বার্ষিক লক্ষ্যমাত্রা ({currentYear})
            </h2>
            <span className="font-bold text-muted-foreground">৳{currentYearContributions.toLocaleString()} / ৳{YEARLY_GOAL.toLocaleString()}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-4 mb-2 overflow-hidden border border-gold/20">
            <div 
              className="bg-gold-gradient h-4 rounded-full transition-all duration-1000" 
              style={{ width: `${goalPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-right text-muted-foreground">{goalPercentage.toFixed(1)}% পূরন হয়েছে</p>
        </div>

        {/* Member Search Section */}
        <div className="bg-card p-6 rounded-lg shadow mb-8 border border-gold/10">
          <h2 className="text-xl font-semibold text-gold mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" /> নিজের হিসাব ও রসিদ দেখুন
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="আপনার নাম বা ইউনিক আইডি লিখুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold bg-background"
            />
            <button
              onClick={handleMemberSearch}
              className="bg-gold-gradient text-primary-foreground px-6 py-2 rounded-md font-bold flex items-center gap-2 shadow-lg hover:shadow-gold/20 transition-all"
            >
              <Search className="w-4 h-4" /> খুঁজুন
            </button>
          </div>

          {searchResult && searchResult.length > 0 && (
            <div className="mt-6">
              {memberStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gold/5 p-4 rounded-lg border border-gold/20 text-center">
                    <h3 className="text-muted-foreground text-sm">আপনার সর্বমোট জমা</h3>
                    <p className="text-2xl font-bold text-gold">৳{memberStats.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-gold/5 p-4 rounded-lg border border-gold/20 text-center">
                    <h3 className="text-muted-foreground text-sm">এই বছরে জমা ({currentYear})</h3>
                    <p className="text-xl font-bold text-gold">৳{memberStats.yearly.toLocaleString()}</p>
                  </div>
                  <div className="bg-gold/5 p-4 rounded-lg border border-gold/20 text-center">
                    <h3 className="text-muted-foreground text-sm">এই মাসের জমা</h3>
                    <p className="text-xl font-bold text-gold">৳{memberStats.monthly.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gold/10 text-gold">
                      <th className="p-3 text-left">জমাদানের তারিখ</th>
                      <th className="p-3 text-left">মাসের নাম</th>
                      <th className="p-3 text-left">পরিমাণ</th>
                      <th className="p-3 text-left">মাধ্যম</th>
                      <th className="p-3 text-left">রসিদ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.map((c) => (
                      <tr key={c.id} className="border-b border-gold/10">
                        <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-3">{c.target_month || "-"}</td>
                        <td className="p-3 font-bold">৳{c.amount}</td>
                        <td className="p-3 text-sm">{c.payment_method || "-"}</td>
                        <td className="p-3">
                          <button 
                            onClick={() => handleDownloadSingleReceipt(c)}
                            className="text-gold hover:text-gold/70 transition-colors flex items-center gap-1 font-bold text-sm"
                          >
                            <Download className="w-4 h-4" /> ডাউনলোড
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Statements and Rankings */}
        <div className="bg-card p-6 rounded-lg shadow mb-8 border border-gold/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-gold">আর্থিক বিবরণী ও এলাকা ভিত্তিক রিপোর্ট</h2>
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground text-sm">ফিল্টার মাস:</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="border border-gold/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold bg-background text-sm"
              />
              <button 
                onClick={handleDownloadReport} 
                className="flex items-center gap-2 bg-gold/10 text-gold px-4 py-1.5 rounded border border-gold/30 text-sm font-bold hover:bg-gold/20 transition-all"
              >
                <FileText className="w-4 h-4" /> PDF রিপোর্ট
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Area Leaderboard */}
            <div>
              <h3 className="text-lg font-bold text-gold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" /> সেরা এলাকা (সংগ্রহের ভিত্তিতে)
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  filtered.reduce((acc, c) => {
                    const a = c.area || "অজানা এলাকা";
                    acc[a] = (acc[a] || 0) + c.amount;
                    return acc;
                  }, {} as Record<string, number>)
                )
                .sort((a, b) => b[1] - a[1])
                .map(([a, total], idx) => (
                  <div key={a} className="bg-background border border-gold/20 p-3 rounded-lg flex justify-between items-center shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold">{idx + 1}</span>
                      <span className="font-semibold text-muted-foreground">{a}</span>
                    </div>
                    <span className="font-bold text-gold">৳{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Due List */}
            {filterMonth && dueMembers.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> বকেয়া সদস্য তালিকা ({filterMonth})
                </h3>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest font-bold">* যারা এই মাসে এখনো চাঁদা দেননি</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dueMembers.map(m => (
                      <div key={m.id} className="text-sm font-medium border-b border-red-500/10 pb-1 flex justify-between">
                        <span>{m.name}</span>
                        <span className="text-[10px] text-red-400 font-bold">বকেয়া</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expense List for Everyone */}
        <div className="bg-card p-6 rounded-lg shadow mb-12 border border-gold/10">
          <h2 className="text-xl font-semibold text-gold mb-6 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> খরচের বিস্তারিত হিসাব (স্বচ্ছতা)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-red-500/5 text-red-400 text-sm">
                  <th className="p-3 text-left">তারিখ</th>
                  <th className="p-3 text-left">খাত / বিবরণ</th>
                  <th className="p-3 text-right">পরিমাণ</th>
                  <th className="p-3 text-left">নোট</th>
                </tr>
              </thead>
              <tbody>
                {expenses.filter(e => !filterMonth || e.date.startsWith(filterMonth)).map(e => (
                  <tr key={e.id} className="border-b border-gold/5 text-sm">
                    <td className="p-3 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3 font-bold">{e.title}</td>
                    <td className="p-3 text-right font-black text-red-500">৳{e.amount.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground text-xs">{e.note || "-"}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">কোনো খরচের রেকর্ড পাওয়া যায়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Sections */}
        {isAdmin && (
          <div className="space-y-12 mt-20 border-t-4 border-gold pt-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-gold p-2 rounded-lg"><Shield className="text-primary-foreground" /></div>
              <h2 className="text-3xl font-black text-gold uppercase tracking-tighter">অ্যাডমিন কন্ট্রোল প্যানেল</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contribution Form */}
              <div className="bg-card p-6 rounded-xl border-2 border-gold/20 shadow-2xl">
                <h3 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> নতুন চাঁদা কালেকশন এন্ট্রি
                </h3>
                <form onSubmit={handleSubmitContribution} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">নাম *</label>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background focus:ring-2 focus:ring-gold outline-none" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">পরিমাণ (৳) *</label>
                      <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background focus:ring-2 focus:ring-gold outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">কোন মাসের চাঁদা? *</label>
                      <input type="month" required value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background outline-none" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">এলাকা</label>
                      <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background outline-none">
                        <option value="">নির্বাচন করুন</option>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">মাধ্যম</label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background outline-none">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">ট্রানজেকশন আইডি</label>
                      <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full border border-gold/30 rounded px-3 py-2 bg-background outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">নোট / বিবরণ</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full border border-gold/30 rounded px-3 py-2 bg-background outline-none" />
                  </div>
                  <button type="submit" className="w-full bg-gold-gradient text-primary-foreground py-3 rounded-lg font-black shadow-lg hover:shadow-gold/20 transition-all uppercase tracking-widest">কালেকশন সেভ করুন ও রসিদ দিন</button>
                </form>
              </div>

              {/* Expense Form */}
              <div className="bg-card p-6 rounded-xl border-2 border-red-500/20 shadow-2xl">
                <h3 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" /> নতুন খরচের এন্ট্রি (Expense)
                </h3>
                <form onSubmit={handleSubmitExpense} className="space-y-4">
                  <div>
                    <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">খরচের খাত / টাইটেল *</label>
                    <input type="text" required value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="উদা: ডেকোরেশন খরচ" className="w-full border border-red-500/30 rounded px-3 py-2 bg-background focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">টাকার পরিমাণ *</label>
                      <input type="number" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full border border-red-500/30 rounded px-3 py-2 bg-background focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">তারিখ *</label>
                      <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full border border-red-500/30 rounded px-3 py-2 bg-background outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-xs font-bold uppercase mb-1">নোট / বিবরণ</label>
                    <textarea value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} rows={2} className="w-full border border-red-500/30 rounded px-3 py-2 bg-background outline-none" />
                  </div>
                  <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-black shadow-lg hover:bg-red-700 transition-all uppercase tracking-widest">খরচের হিসাব রেকর্ড করুন</button>
                </form>
              </div>
            </div>

            {/* Detailed Collection List for Admins */}
            <div className="mt-12">
              <h3 className="text-xl font-bold text-gold mb-6">কালেকশন মেম্বার লিস্ট (বিস্তারিত)</h3>
              <div className="overflow-x-auto bg-card rounded-xl border border-gold/20 shadow-xl">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gold text-primary-foreground text-xs uppercase">
                      <th className="p-4 text-left">তারিখ</th>
                      <th className="p-4 text-left">নাম ও এলাকা</th>
                      <th className="p-4 text-left">মাস</th>
                      <th className="p-4 text-left">পরিমাণ ও মাধ্যম</th>
                      <th className="p-4 text-left">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                        <td className="p-4 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="font-bold text-gold">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{c.area || "অজানা"}</div>
                        </td>
                        <td className="p-4 font-medium">{c.target_month || "-"}</td>
                        <td className="p-4">
                          <div className="font-black">৳{c.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">{c.payment_method}</div>
                        </td>
                        <td className="p-4">
                          <button onClick={() => handleDownloadSingleReceipt(c)} className="p-2 hover:bg-gold/20 rounded-full transition-colors text-gold" title="ডাউনলোড রসিদ">
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!isAdmin && !loading && (
          <div className="mt-20 text-center p-16 bg-card/50 rounded-2xl border border-gold/10 backdrop-blur-sm">
            <Shield className="w-16 h-16 text-gold/20 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gold mb-2">অ্যাডমিন অ্যাক্সেস প্রয়োজন</h3>
            <p className="text-muted-foreground max-w-md mx-auto">নতুন এন্ট্রি করা বা পূর্ণাঙ্গ অ্যাডমিন রিপোর্ট দেখার ক্ষমতা শুধুমাত্র অনুমোদিত ব্যক্তিদের জন্য সংরক্ষিত।</p>
            <p className="text-sm text-gold/60 mt-4 italic">আপনার নিজের হিসাব দেখতে ওপরের সার্চ বক্সটি ব্যবহার করুন।</p>
          </div>
        )}
      </div>
    </>
  );
};

export default CommitteeContributions;
