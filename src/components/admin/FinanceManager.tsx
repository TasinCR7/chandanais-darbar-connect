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
  const [editingId, setEditingId] = useState<string | null>(null);
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

    if (editingId) {
      const { error } = await supabase.from("finances").update({
        type: formType, category, amount: parseFloat(amount),
        description: description || null, date
      }).eq("id", editingId);
      if (!error) {
        toast({ title: "সফল", description: "লেনদেন আপডেট করা হয়েছে।" });
        resetForm();
        fetchFinances();
      } else {
        toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("finances").insert([{
        type: formType, category, amount: parseFloat(amount),
        description: description || null, date
      }]);
      if (!error) {
        toast({ title: "সফল", description: `${formType === "income" ? "আয়" : "ব্যয়"} যোগ করা হয়েছে।` });
        resetForm();
        fetchFinances();
      } else {
        toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCategory(""); setAmount(""); setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setFormType("income");
    setEditingId(null);
  };

  const startEdit = (f: Finance) => {
    setEditingId(f.id);
    setFormType(f.type as "income" | "expense");
    setCategory(f.category);
    setAmount(String(f.amount));
    setDescription(f.description || "");
    setDate(f.date);
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

    const catSummary = (type: "income" | "expense") => {
      const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      return cats
        .map(c => ({ name: c, total: filteredFinances.filter(f => f.type === type && f.category === c).reduce((s, f) => s + Number(f.amount), 0) }))
        .filter(c => c.total > 0);
    };

    const incomeCats = catSummary("income");
    const expenseCats = catSummary("expense");

    container.innerHTML = `
      <div style="padding:0;position:relative;">
        <!-- Watermark -->
        <div style="position:absolute;top:45%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:100px;font-weight:900;color:rgba(10,61,38,0.02);pointer-events:none;z-index:0;white-space:nowrap;letter-spacing:10px;">চন্দনাইশ দরবার</div>

        <!-- Top accent -->
        <div style="height:6px;background:linear-gradient(90deg,#0a3d26,#b8860b,#ffd700,#b8860b,#0a3d26);"></div>

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#071f15 0%,#0a3d26 30%,#145c3a 60%,#0d4a2e 100%);padding:44px 48px 38px;color:white;position:relative;overflow:hidden;">
          <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;border:1px solid rgba(255,215,0,0.06);"></div>
          <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;border:1px solid rgba(255,215,0,0.04);"></div>
          <div style="position:absolute;bottom:-80px;left:25%;width:300px;height:300px;border-radius:50%;border:1px solid rgba(255,255,255,0.02);"></div>
          <!-- Islamic pattern dots -->
          <div style="position:absolute;top:12px;left:48px;display:flex;gap:6px;">
            ${Array.from({length:8}).map(() => `<div style="width:4px;height:4px;border-radius:50%;background:rgba(255,215,0,0.15);"></div>`).join("")}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">
            <div>
              <div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;">
                <div style="width:56px;height:56px;background:linear-gradient(135deg,rgba(255,215,0,0.2),rgba(184,134,11,0.1));border:2px solid rgba(255,215,0,0.25);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 15px rgba(0,0,0,0.2);">☪</div>
                <div>
                  <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;text-shadow:0 2px 8px rgba(0,0,0,0.3);">চন্দনাইশ দরবার শরীফ</h1>
                  <p style="margin:4px 0 0;font-size:10px;opacity:0.5;letter-spacing:3px;font-weight:600;text-transform:uppercase;">Chandanaish Darbar Sharif</p>
                </div>
              </div>
              <p style="margin:6px 0 0 72px;font-size:12px;color:rgba(255,215,0,0.6);font-style:italic;font-weight:500;">সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
            </div>
            <div style="text-align:right;">
              <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(184,134,11,0.06));border:1.5px solid rgba(255,215,0,0.2);border-radius:14px;padding:16px 22px;backdrop-filter:blur(10px);">
                <p style="margin:0;font-size:9px;opacity:0.5;text-transform:uppercase;letter-spacing:2px;font-weight:700;">ইনভয়েস নং</p>
                <p style="margin:6px 0 2px;font-size:18px;font-weight:900;font-family:'Courier New',monospace;color:#ffd700;letter-spacing:1.5px;">${invoiceNo}</p>
                <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.3),transparent);margin:6px 0;"></div>
                <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);font-weight:500;">${today}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Report type strip -->
        <div style="background:linear-gradient(180deg,#f0f5f2,#f8faf9);padding:16px 48px;border-bottom:1.5px solid #dde8e0;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;gap:36px;align-items:center;">
            <div>
              <span style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:700;">রিপোর্ট</span>
              <p style="margin:2px 0 0;font-size:15px;font-weight:800;color:#0a3d26;">${title}</p>
            </div>
            <div style="width:1px;height:30px;background:#dde8e0;"></div>
            <div>
              <span style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:700;">মোট এন্ট্রি</span>
              <p style="margin:2px 0 0;font-size:15px;font-weight:800;color:#0a3d26;">${filteredFinances.length}টি</p>
            </div>
          </div>
          <div style="background:linear-gradient(135deg,#0a3d26,#145c3a);color:white;padding:6px 16px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">আর্থিক প্রতিবেদন</div>
        </div>

        <div style="padding:32px 48px;position:relative;z-index:1;">
          <!-- Summary Cards -->
          <div style="display:flex;gap:14px;margin-bottom:30px;">
            <div style="flex:1;background:linear-gradient(160deg,#f0faf3 0%,#dff0e4 100%);border:1.5px solid #b8dcc3;border-radius:18px;padding:24px 22px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:rgba(27,94,32,0.04);"></div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#4caf50;box-shadow:0 0 6px rgba(76,175,80,0.4);"></div>
                <p style="margin:0;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;font-weight:700;">মোট আয়</p>
              </div>
              <p style="margin:0;font-size:30px;font-weight:900;color:#1b5e20;letter-spacing:-1px;line-height:1;">৳${totalIncome.toLocaleString("bn-BD")}</p>
              <p style="margin:8px 0 0;font-size:11px;color:#66bb6a;font-weight:600;">${incomeItems.length}টি লেনদেন</p>
            </div>
            <div style="flex:1;background:linear-gradient(160deg,#fef5f5 0%,#fde5e5 100%);border:1.5px solid #f0bfbf;border-radius:18px;padding:24px 22px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:rgba(183,28,28,0.04);"></div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#ef5350;box-shadow:0 0 6px rgba(239,83,80,0.4);"></div>
                <p style="margin:0;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;font-weight:700;">মোট ব্যয়</p>
              </div>
              <p style="margin:0;font-size:30px;font-weight:900;color:#b71c1c;letter-spacing:-1px;line-height:1;">৳${totalExpense.toLocaleString("bn-BD")}</p>
              <p style="margin:8px 0 0;font-size:11px;color:#ef5350;font-weight:600;">${expenseItems.length}টি লেনদেন</p>
            </div>
            <div style="flex:1;background:linear-gradient(160deg,#fefaf0 0%,#fdf0d5 100%);border:1.5px solid #e8d5a0;border-radius:18px;padding:24px 22px;position:relative;overflow:hidden;">
              <div style="position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:rgba(184,134,11,0.04);"></div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#daa520;box-shadow:0 0 6px rgba(218,165,32,0.4);"></div>
                <p style="margin:0;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;font-weight:700;">নিট ব্যালেন্স</p>
              </div>
              <p style="margin:0;font-size:30px;font-weight:900;color:${balance >= 0 ? '#1b5e20' : '#b71c1c'};letter-spacing:-1px;line-height:1;">৳${balance.toLocaleString("bn-BD")}</p>
              <p style="margin:8px 0 0;font-size:11px;color:#999;font-weight:600;">আয় − ব্যয়</p>
            </div>
          </div>

          <!-- Category Summary -->
          <div style="display:flex;gap:14px;margin-bottom:30px;">
            <div style="flex:1;border:1.5px solid #c8e6c9;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#1b5e20,#2e7d32);padding:14px 20px;">
                <p style="margin:0;font-size:13px;font-weight:800;color:white;letter-spacing:0.3px;">আয়ের বিভাগ</p>
              </div>
              <div style="padding:8px 20px 14px;">
                ${incomeCats.length > 0 ? incomeCats.map((c, i) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < incomeCats.length - 1 ? 'border-bottom:1px solid #e8f5e9;' : ''}">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="width:6px;height:6px;border-radius:50%;background:#4caf50;"></div>
                      <span style="color:#444;font-size:12px;font-weight:600;">${c.name}</span>
                    </div>
                    <span style="font-weight:800;color:#1b5e20;font-size:13px;font-family:'Courier New',monospace;">৳${c.total.toLocaleString("bn-BD")}</span>
                  </div>
                `).join("") : `<p style="color:#ccc;font-size:12px;text-align:center;margin:18px 0;">কোনো তথ্য নেই</p>`}
              </div>
            </div>
            <div style="flex:1;border:1.5px solid #ffcdd2;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#b71c1c,#c62828);padding:14px 20px;">
                <p style="margin:0;font-size:13px;font-weight:800;color:white;letter-spacing:0.3px;">ব্যয়ের বিভাগ</p>
              </div>
              <div style="padding:8px 20px 14px;">
                ${expenseCats.length > 0 ? expenseCats.map((c, i) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i < expenseCats.length - 1 ? 'border-bottom:1px solid #ffebee;' : ''}">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div style="width:6px;height:6px;border-radius:50%;background:#ef5350;"></div>
                      <span style="color:#444;font-size:12px;font-weight:600;">${c.name}</span>
                    </div>
                    <span style="font-weight:800;color:#b71c1c;font-size:13px;font-family:'Courier New',monospace;">৳${c.total.toLocaleString("bn-BD")}</span>
                  </div>
                `).join("") : `<p style="color:#ccc;font-size:12px;text-align:center;margin:18px 0;">কোনো তথ্য নেই</p>`}
              </div>
            </div>
          </div>

          <!-- Transaction Table -->
          <div style="border:1.5px solid #d0ddd4;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <div style="background:linear-gradient(135deg,#071f15,#0a3d26,#145c3a);padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
              <p style="margin:0;font-size:15px;font-weight:800;color:white;">বিস্তারিত লেনদেন তালিকা</p>
              <span style="font-size:10px;color:rgba(255,215,0,0.6);font-weight:600;">${filteredFinances.length}টি রেকর্ড</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:linear-gradient(180deg,#f4f7f5,#edf2ee);">
                  <th style="padding:12px 18px;text-align:left;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">#</th>
                  <th style="padding:12px 18px;text-align:left;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">তারিখ</th>
                  <th style="padding:12px 18px;text-align:left;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">ধরন</th>
                  <th style="padding:12px 18px;text-align:left;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">বিভাগ</th>
                  <th style="padding:12px 18px;text-align:right;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">পরিমাণ</th>
                  <th style="padding:12px 18px;text-align:left;font-weight:800;color:#333;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #c8d6cc;">বিবরণ</th>
                </tr>
              </thead>
              <tbody>
                ${filteredFinances.length === 0 
                  ? `<tr><td colspan="6" style="padding:44px;text-align:center;color:#bbb;font-size:13px;font-style:italic;">কোনো লেনদেন পাওয়া যায়নি</td></tr>`
                  : filteredFinances.map((f, i) => `
                  <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faf9'};">
                    <td style="padding:12px 18px;color:#bbb;font-size:11px;font-weight:700;border-bottom:1px solid #eef2ef;">${String(i + 1).padStart(2, '0')}</td>
                    <td style="padding:12px 18px;font-weight:700;color:#222;border-bottom:1px solid #eef2ef;">${new Date(f.date).toLocaleDateString("bn-BD")}</td>
                    <td style="padding:12px 18px;border-bottom:1px solid #eef2ef;">
                      <span style="display:inline-block;background:${f.type === 'income' ? 'linear-gradient(135deg,#e8f5e9,#c8e6c9)' : 'linear-gradient(135deg,#ffebee,#ffcdd2)'};color:${f.type === 'income' ? '#1b5e20' : '#b71c1c'};padding:5px 14px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:0.5px;">
                        ${f.type === "income" ? "আয়" : "ব্যয়"}
                      </span>
                    </td>
                    <td style="padding:12px 18px;color:#444;font-weight:600;border-bottom:1px solid #eef2ef;">${f.category}</td>
                    <td style="padding:12px 18px;text-align:right;font-weight:900;font-family:'Courier New',monospace;border-bottom:1px solid #eef2ef;color:${f.type === 'income' ? '#1b5e20' : '#b71c1c'};font-size:13px;">৳${Number(f.amount).toLocaleString("bn-BD")}</td>
                    <td style="padding:12px 18px;color:#999;font-size:11px;border-bottom:1px solid #eef2ef;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.description || "—"}</td>
                  </tr>
                `).join("")}
              </tbody>
              ${filteredFinances.length > 0 ? `
              <tfoot>
                <tr style="background:linear-gradient(135deg,#071f15,#0a3d26);">
                  <td colspan="4" style="padding:16px 18px;text-align:right;font-size:12px;color:rgba(255,255,255,0.7);font-weight:700;letter-spacing:0.5px;">মোট সারাংশ:</td>
                  <td style="padding:16px 18px;text-align:right;font-size:14px;font-family:'Courier New',monospace;color:#ffd700;font-weight:900;">৳${balance.toLocaleString("bn-BD")}</td>
                  <td style="padding:16px 18px;color:rgba(255,255,255,0.5);font-size:10px;">আয় ৳${totalIncome.toLocaleString("bn-BD")} − ব্যয় ৳${totalExpense.toLocaleString("bn-BD")}</td>
                </tr>
              </tfoot>` : ""}
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:linear-gradient(135deg,#071f15,#0a3d26);padding:24px 48px;margin-top:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="margin:0;font-size:11px;color:rgba(255,215,0,0.6);font-weight:600;">চন্দনাইশ দরবার শরীফ</p>
              <p style="margin:4px 0 0;font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:0.5px;">স্বয়ংক্রিয়ভাবে তৈরি প্রতিবেদন • ম্যানেজমেন্ট সিস্টেম © ${new Date().getFullYear()}</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:10px;color:rgba(255,215,0,0.5);font-family:'Courier New',monospace;font-weight:600;">${invoiceNo}</p>
            </div>
          </div>
        </div>

        <!-- Bottom accent -->
        <div style="height:6px;background:linear-gradient(90deg,#0a3d26,#b8860b,#ffd700,#b8860b,#0a3d26);"></div>
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
      toast({ title: "✅ ডাউনলোড সফল", description: "প্রিমিয়াম PDF ইনভয়েস ডাউনলোড হয়েছে।" });
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

      {/* Add/Edit Form */}
      <div className={`bg-card border rounded-2xl p-6 ${editingId ? "border-amber-500/40" : "border-gold/20"}`}>
        <h3 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          {editingId ? (
            <>
              <Pencil size={20} className="text-amber-500" /> এন্ট্রি সম্পাদনা করুন
              <button onClick={resetForm} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted px-3 py-1.5 rounded-lg transition-colors">
                <X size={14} /> বাতিল
              </button>
            </>
          ) : (
            <><Plus size={20} className="text-gold" /> নতুন এন্ট্রি যোগ করুন</>
          )}
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
            className={`rounded-xl px-4 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 ${editingId ? "bg-amber-500 text-white" : "bg-gold-gradient text-primary-foreground"}`}>
            {loading ? "প্রক্রিয়া..." : editingId ? "আপডেট করুন" : "যোগ করুন"}
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
                  <td className="p-3 flex items-center gap-1">
                    <button onClick={() => startEdit(f)} className="text-amber-500/60 hover:text-amber-500 transition-colors">
                      <Pencil size={16} />
                    </button>
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
