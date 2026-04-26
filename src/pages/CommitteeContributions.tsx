import React, { useState, useEffect, FormEvent } from "react";
import SEO from "../components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FileText, Shield, User as UserIcon, Search } from "lucide-react";

interface Contribution {
  id: string;
  name: string;
  amount: number;
  note?: string;
  created_at: string;
}

const CommitteeContributions = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>("");
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
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    const { data, error } = await supabase
      .from("committee_contributions")
      .select("id, name, amount, note, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setContributions(data as Contribution[]);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const id = uuidv4();
    const { error } = await supabase.from("committee_contributions").insert([
      {
        id,
        name,
        amount: Number(amount),
        note,
      },
    ]);
    if (error) {
      toast.error("সংগ্রহ সংরক্ষণে ত্রুটি: " + error.message);
    } else {
      toast.success("সংগ্রহ রেকর্ড করা হয়েছে!");
      setName("");
      setAmount("");
      setNote("");
      fetchContributions();
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

  const filtered = contributions.filter((c) => {
    if (!filterMonth) return true;
    const month = new Date(c.created_at).toISOString().slice(0, 7); // YYYY-MM
    return month === filterMonth;
  });

  const monthlyTotal = filtered.reduce((sum, c) => sum + c.amount, 0);

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(212, 175, 55);
    doc.text("Chandanish Darbar Sharif", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Committee Contributions Report", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Month: ${filterMonth || "All Time"}`, 20, 45);
    doc.text(`Total Amount: ${monthlyTotal} BDT`, 140, 45);

    const tableData = filtered.map(c => [
      new Date(c.created_at).toLocaleDateString(),
      c.name,
      `${c.amount} BDT`,
      c.note || "-"
    ]);

    // @ts-ignore
    doc.autoTable({
      startY: 55,
      head: [['Date', 'Name', 'Amount', 'Note']],
      body: tableData,
      headStyles: { fillColor: [212, 175, 55] },
    });

    doc.save(`Committee_Contributions_${filterMonth || "All"}.pdf`);
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
            <h1 className="text-3xl font-bold text-gold">কমিটি অর্থ সংগ্রহ</h1>
            <p className="text-muted-foreground">চাঁদা প্রদানের হিসাব ও নিকাশ</p>
          </div>
          {isAdmin && (
            <div className="bg-gold/10 px-4 py-2 rounded-lg border border-gold/20 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" />
              <span className="text-gold font-bold">অ্যাডমিন মোড</span>
            </div>
          )}
        </div>

        {/* Search for Members (Visible to all) */}
        <div className="bg-card p-6 rounded-lg shadow mb-8 border border-gold/10">
          <h2 className="text-xl font-semibold text-gold mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" /> নিজের হিসাব দেখুন
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="আপনার নাম বা ইউনিক আইডি লিখুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              onClick={handleMemberSearch}
              className="bg-gold-gradient text-primary-foreground px-6 py-2 rounded-md font-bold flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> খুঁজুন
            </button>
          </div>

          {searchResult && searchResult.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gold/20 text-gold">
                    <th className="p-2 text-left">তারিখ</th>
                    <th className="p-2 text-left">নাম</th>
                    <th className="p-2 text-left">পরিমাণ</th>
                    <th className="p-2 text-left">বিবরণ</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResult.map((c) => (
                    <tr key={c.id} className="border-b border-gold/10">
                      <td className="p-2">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{c.name}</td>
                      <td className="p-2">৳{c.amount}</td>
                      <td className="p-2">{c.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAdmin && (
          <>
            <h2 className="text-xl font-bold text-gold mb-4">নতুন সংগ্রহ এন্ট্রি (অ্যাডমিন)</h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-card p-6 rounded-lg shadow border-2 border-gold/20"
            >
              <div>
                <label className="block text-muted-foreground mb-1">নাম</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-muted-foreground mb-1">বিবরণ (ঐচ্ছিক)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gold/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <button
                type="submit"
                className="bg-gold-gradient text-primary-foreground px-4 py-2 rounded-md mt-2 md:mt-0 hover:opacity-90 font-bold"
              >
                রেকর্ড করুন
              </button>
            </form>

            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-muted-foreground">ফিল্টার মাস:</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="border border-gold/30 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  onClick={() => setFilterMonth("")}
                  className="text-gold hover:underline"
                >
                  সব দেখুন
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2 bg-gold/5 p-4 rounded-lg">
              <h2 className="text-2xl font-semibold text-gold">
                মোট সংগ্রহ: ৳{monthlyTotal.toLocaleString()}
              </h2>
              <button 
                onClick={handleDownloadReport} 
                className="flex items-center gap-2 bg-gold-gradient text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
              >
                <FileText className="w-4 h-4" /> রিপোর্ট ডাউনলোড
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gold text-primary-foreground">
                    <th className="p-2 text-left">তারিখ</th>
                    <th className="p-2 text-left">নাম</th>
                    <th className="p-2 text-left">টাকার পরিমাণ</th>
                    <th className="p-2 text-left">বিবরণ</th>
                    <th className="p-2 text-left">আইডি</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gold/20 hover:bg-gold/5 transition-colors">
                      <td className="p-2">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{c.name}</td>
                      <td className="p-2 font-bold">৳{c.amount.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground">{c.note}</td>
                      <td className="p-2 text-xs break-all text-muted-foreground">{c.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isAdmin && !loading && (
          <div className="mt-12 text-center p-12 bg-card rounded-xl border border-gold/10">
            <Shield className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="text-muted-foreground">সম্পূর্ণ তালিকা এবং মোট সংগ্রহ শুধুমাত্র অ্যাডমিন দেখতে পাবেন।</p>
            <p className="text-sm text-gold/60 mt-2">আপনার নিজের হিসাব দেখতে ওপরের সার্চ বক্স ব্যবহার করুন।</p>
          </div>
        )}
      </div>
    </>
  );
};

export default CommitteeContributions;
