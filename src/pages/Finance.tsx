import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { Payment, Expense, Member } from '@/types/finance';
import { fetchMembers, fetchPayments, fetchExpenses, fetchTargets, fetchSettings } from '@/lib/api';
import { toBanglaNumber } from '@/lib/bangla';
import { monthName, BANGLA_MONTHS } from '@/lib/months';
import {
  buildMonthlyStatement, calculateDues, downloadAnnualStatementPDF,
  downloadOrgMonthlyReportPDF, downloadOrgAnnualReportPDF,
  downloadOrgAllMonthsCombinedPDF,
  downloadOrgMonthlyReportCSV, downloadOrgAnnualReportCSV,
  downloadAreaRankingPDF,
  computeOrgMonthlyTotals, computeOrgAnnualTotals,
  downloadAreaReportPDF, computeAreaSummaries,
  formatBDT,
  type OrgMonthlyTotals, type OrgAnnualTotals,
} from '@/lib/statement';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  LayoutGrid, UserSearch, AlertOctagon, PieChart as PieIcon, Trophy, Settings,
  Wallet, TrendingUp, TrendingDown, Users, FileText, Printer, Database,
  RefreshCcw, ShieldCheck, Receipt, Save, Search, Download, Plus, Eye, CalendarDays, Upload,
  FileSpreadsheet, CreditCard, MapPin, Target, Pencil, Trash2, Check, ChevronsUpDown, Clock
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type TabKey = 'summary' | 'personal' | 'dues' | 'transparency' | 'ranking' | 'admin' | 'audit';


const paymentSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  for_year: z.coerce.number().int(),
  for_month: z.coerce.number().int().min(1).max(12),
  method: z.enum(['bkash', 'nagad', 'rocket', 'bank', 'cash', 'other']),
  transaction_ref: z.string().trim().max(100).optional(),
});

const expenseSchema = z.object({
  title: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  expense_date: z.string().min(1),
  category: z.string().optional(),
  approved_by: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

const Finance = () => {
  const { user, isStaff, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>('summary');
  const [adminMode, setAdminMode] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [targets, setTargets] = useState<{ id?: string, for_year: number, for_month: number, target_amount: number, note?: string }[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<'monthly' | 'annual' | 'combined'>('monthly');
  const [reportFilename, setReportFilename] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [duesFilter, setDuesFilter] = useState<'all' | '3plus'>('all');
  const [duesSearch, setDuesSearch] = useState('');
  const [areaScope, setAreaScope] = useState<'year' | 'month'>('year');
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [quickMemberOpen, setQuickMemberOpen] = useState(false);
  const ORG_NAME_SLUG = 'chandanaish-darbar';

  const loadAll = async () => {
    setBusy(true);
    try {
      const [m, p, e, t, s, al] = await Promise.all([
        fetchMembers(),
        fetchPayments(),
        fetchExpenses(),
        fetchTargets(),
        fetchSettings(),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      setMembers(m);
      setPayments(p);
      setExpenses(e);
      setTargets(t);
      setSettings(s);
      setAuditLogs(al.data || []);
      setPendingPayments(p.filter(pay => pay.status === 'pending'));
    } catch (err: unknown) {
      toast({ title: 'ডাটা লোড ব্যর্থ', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Aggregates - ONLY approved payments count towards income
  const totalIncome = useMemo(() => payments.filter(p => p.status === 'approved').reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const balance = totalIncome - totalExpense;
  const activeMembers = members.filter((m) => m.is_active).length;

  // Per-member dues / paid
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Optimized per-member dues / paid calculation
  const memberStats = useMemo(() => {
    const payMap = new Map<string, any[]>();
    // Only 'approved' payments reduce dues
    payments.filter(p => p.status === 'approved').forEach(p => {
      if (!payMap.has(p.member_id)) payMap.set(p.member_id, []);
      payMap.get(p.member_id)?.push({
        amount: Number(p.amount), for_year: p.for_year, for_month: p.for_month,
        payment_date: p.payment_date, method: p.method, transaction_ref: p.transaction_ref,
      });
    });

    return members.map((m) => {
      const memPays = payMap.get(m.id) || [];
      const stats = calculateDues(m, memPays);
      return { ...m, ...stats, memPays };
    });
  }, [members, payments]);

  const totalDues = useMemo(() => memberStats.reduce((s, m) => s + m.dues, 0), [memberStats]);

  const compareStats = useMemo(() => {
    return memberStats.filter(m => compareIds.includes(m.id));
  }, [memberStats, compareIds]);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'members' | 'payments') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const rows = lines.slice(1).map(l => {
        const values = l.split(',').map(v => v.replace(/"/g, ''));
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] }), {});
      });

      if (type === 'members') {
        const { error } = await supabase.from('members').insert(rows as any);
        if (error) throw error;
        toast({ title: `${rows.length} জন সদস্য যোগ হয়েছে` });
      } else {
        // Resolve member_code to member_id for convenience
        const resolvedRows = [];
        for (const row of rows as any) {
          if (row.member_code && !row.member_id) {
            const m = members.find(mem => mem.member_code === row.member_code);
            if (m) row.member_id = m.id;
          }
          if (row.member_id) resolvedRows.push(row);
        }
        const { error } = await supabase.from('payments').insert(resolvedRows as any);
        if (error) throw error;
        toast({ title: `${resolvedRows.length} টি পেমেন্ট যোগ হয়েছে` });
      }
      await loadAll();
    } catch (err: any) {
      toast({ title: 'আপলোড ব্যর্থ', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  // 6-month chart (income vs expense)
  const chart = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[`${d.getFullYear()}-${d.getMonth() + 1}`] = { income: 0, expense: 0 };
    }
    payments.filter(p => p.status !== 'rejected').forEach((p) => {
      const d = new Date(p.payment_date);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (buckets[k]) buckets[k].income += Number(p.amount);
    });
    expenses.forEach((e) => {
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (buckets[k]) buckets[k].expense += Number(e.amount);
    });
    return Object.entries(buckets).map(([k, v]) => ({
      label: monthName(Number(k.split('-')[1])).slice(0, 3),
      income: v.income, expense: v.expense,
      balance: v.income - v.expense,
    }));
  }, [payments, expenses]);

  // 12-month trend for current report year (income, expense, cumulative balance)
  const yearTrend = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      label: monthName(i + 1).slice(0, 3),
      income: 0, expense: 0, balance: 0, cumulative: 0,
    }));
    payments.filter(p => p.status === 'approved').forEach((p) => {
      const d = new Date(p.payment_date);
      if (d.getFullYear() === reportYear) rows[d.getMonth()].income += Number(p.amount);
    });
    expenses.forEach((e) => {
      const d = new Date(e.expense_date);
      if (d.getFullYear() === reportYear) rows[d.getMonth()].expense += Number(e.amount);
    });
    let cum = 0;
    rows.forEach((r) => { r.balance = r.income - r.expense; cum += r.balance; r.cumulative = cum; });
    return rows;
  }, [payments, expenses, reportYear]);

  // Cumulative dues trend over months — per month, sum of (expected so far − paid so far) for active members
  const duesTrend = useMemo(() => {
    const activeMembers = members.filter((m) => m.is_active !== false);
    const rows: { label: string; dues: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      let dueSum = 0;
      const cutoff = new Date(reportYear, m, 0); // last day of month
      for (const mem of activeMembers) {
        const join = new Date(mem.joined_date);
        if (join > cutoff) continue;
        // months expected from join to cutoff
        const months = (cutoff.getFullYear() - join.getFullYear()) * 12
          + (cutoff.getMonth() - join.getMonth()) + 1;
        const expected = months * Number(mem.monthly_rate || 0);
        const paid = payments
          .filter((p) => p.member_id === mem.id && p.status === 'approved')
          .filter((p) => {
            const py = p.for_year, pm = p.for_month;
            return py < reportYear || (py === reportYear && pm <= m);
          })
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        dueSum += Math.max(0, expected - paid);
      }
      rows.push({ label: monthName(m).slice(0, 3), dues: Math.round(dueSum) });
    }
    return rows;
  }, [members, payments, reportYear]);

  // Expense category breakdown for current year
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => new Date(e.expense_date).getFullYear() === reportYear)
      .forEach((e) => {
        const cat = (e.category || 'অন্যান্য').trim();
        map.set(cat, (map.get(cat) ?? 0) + Number(e.amount || 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, reportYear]);

  // Payment method breakdown for current year
  const methodBreakdown = useMemo(() => {
    const labels: Record<string, string> = {
      cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', rocket: 'রকেট', bank: 'ব্যাংক', other: 'অন্যান্য',
    };
    const map = new Map<string, number>();
    payments
      .filter((p) => new Date(p.payment_date).getFullYear() === reportYear)
      .forEach((p) => {
        const k = labels[p.method] || p.method || 'অন্যান্য';
        map.set(k, (map.get(k) ?? 0) + Number(p.amount || 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [payments, reportYear]);

  // Area-wise collection for current year
  const areaCollection = useMemo(() => {
    const memberArea = new Map<string, string>();
    members.forEach((m) => memberArea.set(m.id, (m.area || 'অজানা').trim() || 'অজানা'));
    const map = new Map<string, number>();
    payments
      .filter((p) => p.for_year === reportYear)
      .forEach((p) => {
        const a = memberArea.get(p.member_id) || 'অজানা';
        map.set(a, (map.get(a) ?? 0) + Number(p.amount || 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [payments, members, reportYear]);

  // Distinct areas (from members)
  const allAreas = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => { if (m.area && String(m.area).trim()) set.add(String(m.area).trim()); });
    return Array.from(set).sort();
  }, [members]);

  // Per-area summary for current report year (and optional month if scope=month)
  const areaSummaries = useMemo(() => computeAreaSummaries(
    members as any, payments as any, reportYear,
    { activeOnly, month: areaScope === 'month' ? reportMonth : undefined },
  ), [members, payments, reportYear, reportMonth, areaScope, activeOnly]);

  const downloadAreaPDF = async () => {
    setBusy(true);
    await downloadAreaReportPDF(members, payments, reportYear, {
      month: areaScope === 'month' ? reportMonth : undefined,
      activeOnly,
      filename: reportFilename,
    });
    setBusy(false);
  };
  
  const downloadAreaRanking = async () => {
    setBusy(true);
    await downloadAreaRankingPDF(areaSummaries, reportYear, areaScope === 'month' ? reportMonth : undefined);
    setBusy(false);
  };

  // Expense breakdown by category for selected year
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => new Date(e.expense_date).getFullYear() === reportYear)
      .forEach((e) => {
        const k = (e.category && String(e.category).trim()) || 'অন্যান্য / Other';
        map.set(k, (map.get(k) ?? 0) + Number(e.amount));
      });
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, reportYear]);

  // Net balance for selected year (income - expense filtered by payment_date / expense_date year)
  const yearIncome = useMemo(
    () => payments.filter((p) => p.status !== 'rejected' && new Date(p.payment_date).getFullYear() === reportYear)
      .reduce((s, p) => s + Number(p.amount), 0),
    [payments, reportYear],
  );
  const yearExpense = useMemo(
    () => expenses.filter((e) => new Date(e.expense_date).getFullYear() === reportYear)
      .reduce((s, e) => s + Number(e.amount), 0),
    [expenses, reportYear],
  );
  const yearBalance = yearIncome - yearExpense;

  // Targets — sum for the selected year + lookup for selected month
  const yearTargetTotal = useMemo(
    () => targets.filter((t) => t.for_year === reportYear).reduce((s, t) => s + Number(t.target_amount), 0),
    [targets, reportYear],
  );
  const monthTargetRow = useMemo(
    () => targets.find((t) => t.for_year === reportYear && t.for_month === reportMonth),
    [targets, reportYear, reportMonth],
  );
  const monthIncome = useMemo(
    () => payments.filter((p) => p.status !== 'rejected' && p.for_year === reportYear && p.for_month === reportMonth)
      .reduce((s, p) => s + Number(p.amount), 0),
    [payments, reportYear, reportMonth],
  );

  const todayIncome = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter(p => p.status === 'approved' && p.payment_date.startsWith(today)).reduce((s, p) => s + Number(p.amount), 0);
  }, [payments]);

  const todayExpense = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return expenses.filter(e => e.expense_date.startsWith(today)).reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);

  const targetAchievement = useMemo(() => {
    const target = Number(monthTargetRow?.target_amount ?? settings.default_monthly_rate ?? 0);
    if (target <= 0) return 100;
    return (monthIncome / target) * 100;
  }, [monthIncome, monthTargetRow, settings]);

  const approvePayment = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('payments').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      toast({ title: 'পেমেন্ট অনুমোদিত হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const rejectPayment = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('payments').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      toast({ title: 'পেমেন্ট বাতিল করা হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const found = members.find((m) => m.member_code.toLowerCase() === searchCode.trim().toLowerCase());
    setSelectedMember(found ?? null);
    if (!found && searchCode) toast({ title: 'কোড পাওয়া যায়নি', variant: 'destructive' });
  };

  const submitPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = paymentSchema.safeParse(fd);
    if (!parsed.success) {
      toast({ title: 'ত্রুটি', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('payments').insert({ ...parsed.data, recorded_by: user.id } as any);
    setBusy(false);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'চাঁদা রেকর্ড হয়েছে ✓' });
    (e.target as HTMLFormElement).reset();
    setSelectedMemberId("");
    loadAll();
  };

  const submitExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = expenseSchema.safeParse(fd);
    if (!parsed.success) {
      toast({ title: 'ত্রুটি', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('expenses').insert({ ...parsed.data, recorded_by: user.id } as any);
    setBusy(false);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'খরচ রেকর্ড হয়েছে ✓' });
    (e.target as HTMLFormElement).reset();
    loadAll();
  };

  // Reports
  const downloadGeneralReport = () => {
    const data = {
      generated: new Date().toISOString(),
      total_income: totalIncome,
      total_expense: totalExpense,
      balance,
      active_members: activeMembers,
      members: memberStats.map((m) => ({
        code: m.member_code, name: m.full_name, paid: m.totalPaid, dues: m.dues,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `general-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const printAreaReport = () => window.print();

  const exportCSV = () => {
    const rows = [['Member Code', 'Name', 'Phone', 'Joined', 'Monthly Rate', 'Total Paid', 'Dues', 'Due Months']];
    memberStats.forEach((m) => rows.push([
      m.member_code, m.full_name, m.phone ?? '', m.joined_date,
      String(m.monthly_rate), String(m.totalPaid), String(m.dues), String(m.dueMonths),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `members-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const dataBackup = async () => {
    const data = { members, payments, expenses, generated_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `darbar-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'ব্যাকআপ ডাউনলোড হয়েছে' });
  };

  // Default filename suggestions per kind — used as placeholder + fallback.
  const defaultFilename = (kind: 'monthly' | 'annual' | 'combined') => {
    const yy = reportYear;
    const mm = String(reportMonth).padStart(2, '0');
    if (kind === 'monthly') return `${ORG_NAME_SLUG}-monthly-${yy}-${mm}`;
    if (kind === 'combined') return `${ORG_NAME_SLUG}-monthly-combined-${yy}`;
    return `${ORG_NAME_SLUG}-annual-${yy}`;
  };

  const buildOpts = (kind: 'monthly' | 'annual' | 'combined') => ({
    activeOnly,
    filename: (reportFilename.trim() || defaultFilename(kind)),
  });

  const downloadOrgMonthly = () => {
    downloadOrgMonthlyReportPDF(members as any, payments as any, reportYear, reportMonth, buildOpts('monthly'));
    toast({ title: `${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)} এর মাসিক রিপোর্ট ডাউনলোড হয়েছে` });
  };

  const downloadOrgAnnual = () => {
    downloadOrgAnnualReportPDF(members as any, payments as any, reportYear, buildOpts('annual'));
    toast({ title: `${toBanglaNumber(reportYear)} এর বার্ষিক রিপোর্ট ডাউনলোড হয়েছে` });
  };

  const downloadOrgCombined = () => {
    downloadOrgAllMonthsCombinedPDF(members as any, payments as any, reportYear, buildOpts('combined'));
    toast({ title: `${toBanglaNumber(reportYear)} এর ১২ মাসের কম্বাইন্ড PDF ডাউনলোড হয়েছে` });
  };

  const downloadOrgEachMonth = () => {
    const base = reportFilename.trim() || `${ORG_NAME_SLUG}-monthly-${reportYear}`;
    for (let mo = 1; mo <= 12; mo++) {
      downloadOrgMonthlyReportPDF(members as any, payments as any, reportYear, mo, {
        activeOnly,
        filename: `${base}-${String(mo).padStart(2, '0')}`,
      });
    }
    toast({ title: `${toBanglaNumber(reportYear)} এর ১২টি আলাদা মাসিক PDF ডাউনলোড শুরু হয়েছে` });
  };

  const downloadCsvMonthly = () => {
    downloadOrgMonthlyReportCSV(members as any, payments as any, reportYear, reportMonth, {
      activeOnly,
      filename: reportFilename.trim() || defaultFilename('monthly'),
    });
    toast({ title: `${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)} CSV ডাউনলোড হয়েছে` });
  };

  const downloadCsvAnnual = () => {
    downloadOrgAnnualReportCSV(members as any, payments as any, reportYear, {
      activeOnly,
      filename: reportFilename.trim() || defaultFilename('annual'),
    });
    toast({ title: `${toBanglaNumber(reportYear)} বার্ষিক CSV ডাউনলোড হয়েছে` });
  };



  const saveMonthlyTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const for_year = Number(fd.get('for_year'));
    const for_month = Number(fd.get('for_month'));
    const target_amount = Number(fd.get('target_amount'));
    const note = (fd.get('note') as string) || null;
    setBusy(true);
    const { error } = await supabase
      .from('monthly_targets')
      .upsert({ for_year, for_month, target_amount, note } as any, { onConflict: 'for_year,for_month' });
    setBusy(false);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'লক্ষ্যমাত্রা সেভ হয়েছে ✓' });
    loadAll();
  };

  const deleteTarget = async (id: string) => {
    if (!confirm('এই লক্ষ্যমাত্রা মুছে ফেলবেন?')) return;
    const { error } = await supabase.from('monthly_targets').delete().eq('id', id);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'মুছে ফেলা হয়েছে' });
    loadAll();
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_by: user?.id ?? null } as any, { onConflict: 'key' });
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'সেটিংস সেভ হয়েছে ✓' });
    loadAll();
  };

  const openPreview = (kind: 'monthly' | 'annual' | 'combined') => {
    setPreviewKind(kind);
    setPreviewOpen(true);
  };

  const previewMonthlyTotals: OrgMonthlyTotals = useMemo(
    () => computeOrgMonthlyTotals(members as any, payments as any, reportYear, reportMonth, { activeOnly }),
    [members, payments, reportYear, reportMonth, activeOnly],
  );
  const previewAnnualTotals: OrgAnnualTotals = useMemo(
    () => computeOrgAnnualTotals(members as any, payments as any, reportYear, { activeOnly }),
    [members, payments, reportYear, activeOnly],
  );

  const confirmDownloadFromPreview = () => {
    if (previewKind === 'monthly') downloadOrgMonthly();
    else if (previewKind === 'annual') downloadOrgAnnual();
    else downloadOrgCombined();
    setPreviewOpen(false);
  };

  const confirmCsvFromPreview = () => {
    if (previewKind === 'monthly') downloadCsvMonthly();
    else downloadCsvAnnual();
    setPreviewOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  if (loading) return null;

  const TABS = [
    { key: 'summary', label: 'সারসংক্ষেপ', icon: LayoutGrid },
    { key: 'personal', label: 'ব্যক্তিগত হিসাব', icon: UserSearch },
    { key: 'dues', label: 'বকেয়া (Dues)', icon: AlertOctagon },
    { key: 'transparency', label: 'স্বচ্ছতা', icon: PieIcon },
    { key: 'ranking', label: 'র‍্যাঙ্কিং', icon: Trophy },
    ...(isStaff ? [
      { key: 'admin', label: 'অ্যাডমিন', icon: Settings },
      { key: 'audit', label: 'অডিট লগ', icon: Database }
    ] : []),
  ] as const;

  return (
    <div className={`min-h-screen pb-20 font-bengali transition-colors duration-500 ${isDark ? 'dark bg-neutral-950 text-neutral-100' : 'bg-background'}`}>
      <SEO
        title="অর্থব্যবস্থাপনা - চন্দনাইশ দরবার শরীফ"
        description="চন্দনাইশ দরবার শরীফ কমিটি ফান্ডের সম্পূর্ণ অর্থব্যবস্থাপনা ড্যাশবোর্ড। আয়-ব্যয় হিসাব, সদস্যদের বকেয়া, স্বচ্ছতা রিপোর্ট এবং PDF ডাউনলোড।"
      />
      {/* Gold gradient header */}
      <div className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gold-gradient opacity-15" />
        <div className="container mx-auto px-4 relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-background/20 flex items-center justify-center backdrop-blur">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl text-primary-foreground">অর্থ সংগ্রহ ও ব্যবস্থাপনা</h1>
              <p className="font-bangla text-sm text-primary-foreground/80">চন্দনাইশ দরবার শরীফ কমিটি ফান্ড</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsDark(!isDark)} 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9 rounded-full bg-background/20 hover:bg-background/30 text-primary-foreground" 
              title="ডার্ক মোড"
            >
              {isDark ? <Eye className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </Button>
            <Button onClick={loadAll} size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-background/20 hover:bg-background/30 text-primary-foreground" title="রিফ্রেশ">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {isStaff && (
              <Button
                onClick={() => setAdminMode((v) => !v)}
                className={`font-bangla ${adminMode ? 'bg-background text-foreground' : 'bg-background/20 text-primary-foreground hover:bg-background/30'}`}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                {adminMode ? 'অ্যাডমিন মোড: চালু' : 'অ্যাডমিন মোড'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tab pill bar */}
        <div className="bg-card/60 border border-primary/15 rounded-2xl p-2 flex flex-wrap gap-1 mb-8 backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const disabled = t.key === 'admin' && !adminMode;
            return (
              <button
                key={t.key}
                onClick={() => !disabled && setTab(t.key)}
                disabled={disabled}
                className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bangla text-sm transition-all
                  ${isActive ? 'bg-gradient-gold text-primary-foreground shadow-gold' :
                    disabled ? 'opacity-40 cursor-not-allowed text-muted-foreground' :
                    'text-foreground/75 hover:bg-primary/10 hover:text-primary'}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* SUMMARY */}
        {tab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <StatCard icon={<TrendingUp className="h-5 w-5" />} label="মোট আয়" value={`৳ ${toBanglaNumber(totalIncome.toFixed(0))}`} />
                {pendingPayments.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center animate-pulse border-2 border-background">
                    {toBanglaNumber(pendingPayments.length)}
                  </div>
                )}
              </div>
              <StatCard icon={<TrendingDown className="h-5 w-5" />} label="মোট খরচ" value={`৳ ${toBanglaNumber(totalExpense.toFixed(0))}`} tone="danger" />
              <StatCard icon={<Wallet className="h-5 w-5" />} label="ব্যালেন্স" value={`৳ ${toBanglaNumber(balance.toFixed(0))}`} tone={balance >= 0 ? 'gold' : 'danger'} />
              <StatCard icon={<Users className="h-5 w-5" />} label="সক্রিয় সদস্য" value={toBanglaNumber(activeMembers)} />
            </div>

            {/* Target Alert */}
            {targetAchievement < 50 && reportMonth === currentMonth && reportYear === currentYear && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertOctagon className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-rose-600">লক্ষ্যমাত্রা সতর্কতা!</h4>
                  <p className="font-bangla text-sm text-muted-foreground">চলতি মাসে লক্ষ্যমাত্রার মাত্র {toBanglaNumber(targetAchievement.toFixed(1))}% অর্জিত হয়েছে। কালেকশন বৃদ্ধি করা প্রয়োজন।</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">গত ৬ মাসের আয়-ব্যয়</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)' }} />
                      <Legend />
                      <Bar dataKey="income" fill="hsl(var(--primary))" name="আয়" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(var(--destructive))" name="খরচ" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-gold rounded-2xl p-6 flex flex-col">
                <h3 className="font-display text-lg gold-text mb-6 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" /> আজকের সারাংশ
                </h3>
                <div className="flex-1 space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bangla">আজকের আয়</p>
                    <p className="text-2xl font-display text-emerald-600">৳ {toBanglaNumber(todayIncome.toFixed(0))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bangla">আজকের খরচ</p>
                    <p className="text-2xl font-display text-rose-600">৳ {toBanglaNumber(todayExpense.toFixed(0))}</p>
                  </div>
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground font-bangla">নেট ক্যাশ ফ্লো</p>
                    <p className={`text-xl font-display mt-1 ${todayIncome - todayExpense >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                      ৳ {toBanglaNumber((todayIncome - todayExpense).toFixed(0))}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6 font-bangla w-full border border-primary/10" onClick={() => setTab('transparency')}>
                  বিস্তারিত দেখুন →
                </Button>
              </div>
            </div>

            {/* === Year trend (income/expense/cumulative balance) === */}
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text mb-4">
                {toBanglaNumber(reportYear)} বার্ষিক প্রবাহ — আয়, ব্যয় ও ক্রমপুঞ্জিত ব্যালেন্স
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearTrend}>
                    <defs>
                      <linearGradient id="incFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" fill="url(#incFill)" name="আয়" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#expFill)" name="খরচ" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--accent))" strokeWidth={2} name="ক্রমপুঞ্জিত" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* === Dues trend (cumulative bakeya by month) === */}
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text mb-4">
                {toBanglaNumber(reportYear)} মাসিক বকেয়া প্রবণতা
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={duesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--destructive) / 0.3)' }}
                      formatter={(v: number) => [`৳ ${Number(v).toLocaleString('en-IN')}`, 'বকেয়া']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="dues" stroke="hsl(var(--destructive))" strokeWidth={2.5} name="মোট বকেয়া" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="font-bangla text-xs text-muted-foreground mt-2">
                * প্রতি মাসের শেষে সক্রিয় সদস্যদের সম্মিলিত বকেয়া (যোগদান তারিখ থেকে গণনা)
              </p>
            </div>

            {/* === Two side-by-side donuts: expense category + payment method === */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">খরচের ক্যাটাগরি ({toBanglaNumber(reportYear)})</h3>
                <div className="h-72">
                  {categoryBreakdown.length === 0 ? (
                    <p className="font-bangla text-center text-muted-foreground py-12">এই বছরে কোন খরচ নেই</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          label={(e: { name: string, percent?: number }) => `${e.name}: ${toBanglaNumber(Math.round((e.percent ?? 0) * 100))}%`}
                        >
                          {categoryBreakdown.map((_, i) => (
                            <Cell key={i} fill={`hsl(${(i * 47) % 360} 70% 55%)`} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `৳ ${Number(v).toLocaleString('en-IN')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">পেমেন্ট পদ্ধতি ({toBanglaNumber(reportYear)})</h3>
                <div className="h-72">
                  {methodBreakdown.length === 0 ? (
                    <p className="font-bangla text-center text-muted-foreground py-12">এই বছরে কোন পেমেন্ট নেই</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methodBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          label={(e: { name: string, percent?: number }) => `${e.name}: ${toBanglaNumber(Math.round((e.percent ?? 0) * 100))}%`}
                        >
                          {methodBreakdown.map((_, i) => (
                            <Cell key={i} fill={`hsl(${(i * 67 + 200) % 360} 65% 55%)`} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `৳ ${Number(v).toLocaleString('en-IN')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* === Area-wise collection bars === */}
            {areaCollection.length > 0 && (
              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">এলাকা ভিত্তিক চাঁদা সংগ্রহ ({toBanglaNumber(reportYear)})</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaCollection} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={100} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)' }}
                        formatter={(v: number) => `৳ ${Number(v).toLocaleString('en-IN')}`}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="সংগ্রহ" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {(() => {
              const memberById = new Map<string, any>(members.map((m) => [m.id, m]));
              const areaOpts = Array.from(new Set(members.map((m) => (m.area ?? '').trim()).filter(Boolean))).sort();
              const matchArea = (area: string | null | undefined) =>
                areaFilter === 'all' ? true :
                areaFilter === '__none__' ? !((area ?? '').trim()) :
                (area ?? '').trim() === areaFilter;
              const filteredPayments = payments.filter((p) =>
                matchArea(p.members?.area ?? memberById.get(p.member_id)?.area));
              const expenseHasArea = expenses.some((e) => e.area);
              const filteredExpenses = expenses.filter((e) =>
                areaFilter === 'all' || !expenseHasArea ? true : matchArea(e.area));
              return (
                <>
                  <div className="card-gold rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 mb-2">
                    <p className="font-bangla text-sm text-muted-foreground">এলাকা ফিল্টার (সাম্প্রতিক রেকর্ডসমূহ)</p>
                    <div className="flex items-center gap-2">
                      <Select value={areaFilter} onValueChange={setAreaFilter}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">সব এলাকা</SelectItem>
                          <SelectItem value="__none__">— এলাকা বিহীন —</SelectItem>
                          {areaOpts.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {areaFilter !== 'all' && (
                        <Button size="sm" variant="ghost" onClick={() => setAreaFilter('all')} className="font-bangla">রিসেট</Button>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="card-gold rounded-2xl p-6">
                      <h3 className="font-display text-lg gold-text mb-4">
                        সাম্প্রতিক জমা {areaFilter !== 'all' && <span className="text-xs font-bangla text-muted-foreground">({areaFilter === '__none__' ? 'এলাকা বিহীন' : areaFilter})</span>}
                      </h3>
                      {filteredPayments.slice(0, 6).map((p) => (
                        <div key={p.id} className="flex justify-between border-b border-border/40 py-2 font-bangla text-sm">
                          <span>
                            {p.members?.full_name} <span className="text-xs text-muted-foreground">({p.members?.member_code})</span>
                            {(p.members?.area ?? memberById.get(p.member_id)?.area) && (
                              <span className="text-[11px] text-primary/70 ml-1">• {p.members?.area ?? memberById.get(p.member_id)?.area}</span>
                            )}
                          </span>
                          <span className="text-primary">৳ {toBanglaNumber(Number(p.amount).toFixed(0))}</span>
                        </div>
                      ))}
                      {filteredPayments.length === 0 && <p className="font-bangla text-center text-muted-foreground py-4">কোনো রেকর্ড নেই</p>}
                    </div>
                    <div className="card-gold rounded-2xl p-6">
                      <h3 className="font-display text-lg gold-text mb-4">সাম্প্রতিক খরচ</h3>
                      {filteredExpenses.slice(0, 6).map((e) => (
                        <div key={e.id} className="flex justify-between border-b border-border/40 py-2 font-bangla text-sm">
                          <span>{e.title} <span className="text-xs text-muted-foreground">({e.expense_date})</span></span>
                          <span className="text-destructive">৳ {toBanglaNumber(Number(e.amount).toFixed(0))}</span>
                        </div>
                      ))}
                      {filteredExpenses.length === 0 && <p className="font-bangla text-center text-muted-foreground py-4">কোনো রেকর্ড নেই</p>}
                      {areaFilter !== 'all' && !expenseHasArea && (
                        <p className="text-[11px] font-bangla text-muted-foreground mt-2 italic">খরচে এলাকা ফিল্ড নেই — সংস্থা-ব্যাপী দেখানো হচ্ছে</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* PERSONAL */}
        {tab === 'personal' && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="card-gold rounded-2xl p-6 max-w-2xl">
              <label className="font-bangla text-sm text-muted-foreground mb-2 block">সদস্য কোড দিন</label>
              <div className="flex gap-2">
                <Input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="CDS-001" className="font-mono" />
                <Button type="submit" className="bg-gradient-gold text-primary-foreground font-bangla">
                  <Search className="h-4 w-4 mr-1" /> খুঁজুন
                </Button>
              </div>
            </form>
            {selectedMember && <PersonalView member={selectedMember} payments={payments.filter((p) => p.member_id === selectedMember.id)} />}
          </div>
        )}

        {/* DUES */}
        {tab === 'dues' && (
          <div className="space-y-6">
            <div className="card-gold rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="সদস্যের নাম বা কোড দিয়ে খুঁজুন..." 
                    className="pl-9 h-10"
                    value={duesSearch}
                    onChange={(e) => setDuesSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={duesFilter === 'all' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setDuesFilter('all')}
                    className="font-bangla"
                  >
                    সব বকেয়া
                  </Button>
                  <Button 
                    variant={duesFilter === '3plus' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setDuesFilter('3plus')}
                    className="font-bangla border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                  >
                    ৩+ মাস বকেয়া
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bangla text-xs text-muted-foreground">মোট বকেয়া সদস্য</p>
                <p className="font-display text-xl gold-text">{toBanglaNumber(memberStats.filter(m => m.dues > 0).length)} জন</p>
              </div>
            </div>

            <div className="card-gold rounded-2xl p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">সদস্য</th><th>এলাকা</th><th className="text-right">মাসিক</th><th className="text-right">জমা</th><th className="text-right">বকেয়া</th><th>বকেয়া মাস</th><th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {memberStats
                    .filter(m => m.dues > 0)
                    .filter(m => {
                      if (duesFilter === '3plus') return m.dueMonths >= 3;
                      return true;
                    })
                    .filter(m => {
                      if (!duesSearch) return true;
                      const s = duesSearch.toLowerCase();
                      return m.full_name.toLowerCase().includes(s) || m.member_code.toLowerCase().includes(s);
                    })
                    .sort((a, b) => b.dues - a.dues)
                    .map((m) => (
                      <tr key={m.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                        <td className="py-3">
                          <span className="font-semibold block">{m.full_name}</span>
                          <span className="text-[10px] font-mono text-primary">{m.member_code}</span>
                        </td>
                        <td>{m.area || '-'}</td>
                        <td className="text-right">৳ {toBanglaNumber(m.monthly_rate)}</td>
                        <td className="text-right text-primary">৳ {toBanglaNumber(m.totalPaid.toFixed(0))}</td>
                        <td className="text-right text-rose-600 font-bold">৳ {toBanglaNumber(m.dues.toFixed(0))}</td>
                        <td>
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${m.dueMonths >= 3 ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}`}>
                            {toBanglaNumber(m.dueMonths)} মাস
                          </span>
                        </td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => {
                              const msg = `আসসালামু আলাইকুম ${m.full_name}, চন্দনাইশ দরবার শরীফ কমিটি ফান্ডে আপনার ${toBanglaNumber(m.dueMonths)} মাসের চাঁদা (৳${toBanglaNumber(m.dues.toFixed(0))}) বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ রইল।`;
                              window.open(`https://wa.me/88${m.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`);
                            }}
                          >
                            রিমাইন্ডার
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {memberStats.filter(m => m.dues > 0).length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground font-bangla">কোনো বকেয়া নেই 🎉</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRANSPARENCY */}
        {tab === 'transparency' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">আয় বনাম খরচ</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name: 'আয়', value: totalIncome }, { name: 'খরচ', value: totalExpense }]}
                        cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-4">পেমেন্ট পদ্ধতি</h3>
                <ul className="space-y-2 font-bangla text-sm">
                  {['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other'].map((m) => {
                    const sum = payments.filter((p) => p.method === m).reduce((s, p) => s + Number(p.amount), 0);
                    return (
                      <li key={m} className="flex justify-between border-b border-border/40 pb-2">
                        <span className="uppercase">{m}</span>
                        <span className="text-primary">৳ {toBanglaNumber(sum.toFixed(0))}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Heatmap */}
              <div className="card-gold rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg gold-text">কালেকশন হিটম্যাপ</h3>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>কম</span>
                    <div className="h-2 w-2 rounded-sm bg-primary/10" />
                    <div className="h-2 w-2 rounded-sm bg-primary/30" />
                    <div className="h-2 w-2 rounded-sm bg-primary/60" />
                    <div className="h-2 w-2 rounded-sm bg-primary" />
                    <span>বেশি</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {(() => {
                    const days = [];
                    const now = new Date();
                    for (let i = 59; i >= 0; i--) {
                      const d = new Date();
                      d.setDate(now.getDate() - i);
                      const dayStr = d.toISOString().split('T')[0];
                      const total = payments.filter(p => p.status === 'approved' && p.payment_date.startsWith(dayStr)).reduce((s, p) => s + Number(p.amount), 0);
                      days.push({ day: dayStr, total });
                    }
                    return days.map(d => (
                      <div 
                        key={d.day} 
                        className="aspect-square rounded-sm transition-all hover:scale-125 cursor-help"
                        style={{ 
                          backgroundColor: d.total === 0 ? 'rgba(180, 142, 73, 0.05)' :
                                          d.total < 1000 ? 'rgba(180, 142, 73, 0.3)' :
                                          d.total < 5000 ? 'rgba(180, 142, 73, 0.6)' :
                                          'rgba(180, 142, 73, 1)'
                        }}
                        title={`${d.day}: ৳${toBanglaNumber(d.total)}`}
                      />
                    ));
                  })()}
                </div>
                <p className="text-[10px] text-muted-foreground font-bangla mt-4 italic">বিগত ৬০ দিনের আদায় চিত্র (GitHub Style)</p>
              </div>

              {/* Donor Pyramid */}
              <div className="card-gold rounded-2xl p-6">
                <h3 className="font-display text-lg gold-text mb-6">ডোনার-পিরামিড (Contribution Analysis)</h3>
                <div className="space-y-4">
                  {(() => {
                    const sorted = [...memberStats].sort((a, b) => b.totalPaid - a.totalPaid);
                    const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1));
                    const top10Sum = sorted.slice(0, top10Count).reduce((s, m) => s + m.totalPaid, 0);
                    const top10Pct = totalIncome > 0 ? (top10Sum / totalIncome) * 100 : 0;
                    
                    return (
                      <>
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground font-bangla">শীর্ষ ১০% মেম্বারদের অবদান</p>
                            <p className="text-2xl font-display gold-text">{toBanglaNumber(Math.round(top10Pct))}%</p>
                          </div>
                          <Trophy className="h-8 w-8 text-amber-500 opacity-30" />
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-gold" style={{ width: `${top10Pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bangla">মোট সংগ্রহের {toBanglaNumber(Math.round(top10Pct))}% টাকা আসে সেরা {toBanglaNumber(top10Count)} জন সদস্যের কাছ থেকে।</p>
                      </>
                    );
                  })()}
                </div>
                <Button onClick={() => setSnapshotOpen(true)} className="w-full mt-6 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bangla text-xs">
                  <Eye className="h-3.5 w-3.5 mr-2" /> পাবলিক ট্রান্সপারেন্সি স্ন্যাপশট
                </Button>
              </div>

              {/* Member Comparison */}
              <div className="card-gold rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h3 className="font-display text-lg gold-text flex items-center gap-2">
                    <Users className="h-5 w-5" /> সদস্য বনাম সদস্য তুলনা
                  </h3>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="font-bangla border-primary/20 h-8">
                          <Plus className="h-3 w-3 mr-1" /> সদস্য যোগ করুন
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="end">
                        <Command className="font-bangla">
                          <CommandInput placeholder="নাম বা কোড..." />
                          <CommandList>
                            <CommandEmpty>পাওয়া যায়নি</CommandEmpty>
                            <CommandGroup>
                              {members.slice(0, 100).map(m => (
                                <CommandItem 
                                  key={m.id} 
                                  onSelect={() => {
                                    if (compareIds.length < 4 && !compareIds.includes(m.id)) {
                                      setCompareIds([...compareIds, m.id]);
                                    }
                                  }}
                                >
                                  {m.full_name} ({m.member_code})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" onClick={() => setCompareIds([])} className="h-8 text-xs font-bangla">রিসেট</Button>
                  </div>
                </div>

                {compareStats.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {compareStats.map(m => (
                      <div key={m.id} className="p-4 rounded-xl border border-primary/10 bg-background/40 relative group">
                        <button 
                          onClick={() => setCompareIds(compareIds.filter(id => id !== m.id))}
                          className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <p className="font-mono text-[10px] text-primary">{m.member_code}</p>
                        <p className="font-display font-bold text-sm truncate">{m.full_name}</p>
                        <div className="mt-4 space-y-2">
                          <div>
                            <div className="flex justify-between text-[10px] mb-1 font-bangla">
                              <span>মোট জমা</span>
                              <span>৳ {toBanglaNumber(m.totalPaid.toFixed(0))}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (m.totalPaid / (m.totalExpected || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1 font-bangla text-rose-500">
                              <span>বকেয়া</span>
                              <span>৳ {toBanglaNumber(m.dues.toFixed(0))}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (m.dues / (m.totalExpected || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-primary/20 rounded-xl bg-primary/5">
                    <p className="font-bangla text-sm text-muted-foreground">তুলনা করার জন্য উপর থেকে ২-৪ জন সদস্য নির্বাচন করুন</p>
                  </div>
                )}
                
                {compareStats.length > 0 && (
                  <div className="mt-8 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareStats.map(m => ({ name: m.full_name.split(' ')[0], জমা: m.totalPaid, বকেয়া: m.dues }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="জমা" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="বকেয়া" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RANKING */}
        {tab === 'ranking' && (
          <div className="space-y-6">
            <div className="card-gold rounded-2xl p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg gold-text">শীর্ষ দাতা র‍্যাঙ্কিং 🏆</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">র‍্যাঙ্ক</th><th>কোড</th><th>নাম</th><th className="text-right">মোট জমা</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {memberStats.slice().sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 20).map((m, i) => (
                    <tr key={m.id} className="border-b border-border/40">
                      <td className="py-2 font-bold gold-text">#{toBanglaNumber(i + 1)}</td>
                      <td className="font-mono text-primary">{m.member_code}</td>
                      <td>{m.full_name}</td>
                      <td className="text-right text-primary font-semibold">৳ {toBanglaNumber(m.totalPaid.toFixed(0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-gold rounded-2xl p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="font-display text-lg gold-text flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> এলাকা ভিত্তিক র‍্যাঙ্কিং 🌍
                </h3>
                <div className="flex items-center gap-2">
                  <Select value={areaScope} onValueChange={(v) => setAreaScope(v as any)}>
                    <SelectTrigger className="h-8 w-32 font-bangla"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">পূর্ণ বছর</SelectItem>
                      <SelectItem value="month">শুধু এই মাস</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={downloadAreaRanking} disabled={busy} size="sm" className="bg-gradient-gold text-primary-foreground font-bangla">
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF ডাউনলোড
                  </Button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">র‍্যাঙ্ক</th><th>এলাকা</th><th className="text-right">সদস্য</th><th className="text-right">মোট সংগ্রহ</th><th className="text-right">% অর্জন</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {areaSummaries.map((a, i) => (
                    <tr key={a.area} className="border-b border-border/40">
                      <td className="py-2 font-bold gold-text">#{toBanglaNumber(i + 1)}</td>
                      <td>{a.area}</td>
                      <td className="text-right">{toBanglaNumber(a.members)}</td>
                      <td className="text-right text-primary font-semibold">৳ {toBanglaNumber(a.paid.toFixed(0))}</td>
                      <td className="text-right text-muted-foreground">{a.expected > 0 ? `${toBanglaNumber(Math.round((a.paid / a.expected) * 100))}%` : '—'}</td>
                    </tr>
                  ))}
                  {areaSummaries.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">কোনো তথ্য নেই।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {tab === 'admin' && adminMode && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-2xl gold-text flex items-center gap-2">
                <ShieldCheck className="h-6 w-6" /> অ্যাডমিন প্যানেল
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadGeneralReport} className="bg-[hsl(43_45%_45%)] text-primary-foreground font-bangla">
                  <FileText className="h-4 w-4 mr-1" /> জেনারেল রিপোর্ট
                </Button>
                <Button onClick={printAreaReport} className="bg-orange-600 hover:bg-orange-700 text-white font-bangla">
                  <Printer className="h-4 w-4 mr-1" /> এলাকা রিপোর্ট
                </Button>
                <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white font-bangla">
                  <FileText className="h-4 w-4 mr-1" /> সিএসভি
                </Button>
                <Button onClick={dataBackup} className="bg-blue-600 hover:bg-blue-700 text-white font-bangla">
                  <Database className="h-4 w-4 mr-1" /> ডাটা ব্যাকআপ
                </Button>
              </div>
            </div>
            {/* ===== Pending Online Payments ===== */}
            {pendingPayments.length > 0 && (
              <div className="card-gold rounded-2xl p-6 mb-6 border-amber-500/30">
                <h3 className="font-display text-lg text-amber-600 flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5" /> অনুমোদনহীন পেমেন্ট ({toBanglaNumber(pendingPayments.length)} টি)
                </h3>
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-sm font-bangla">
                    <thead>
                      <tr className="border-b border-amber-500/10 text-left">
                        <th className="py-2">সদস্য</th><th>মাস</th><th>পরিমাণ</th><th>পদ্ধতি</th><th>রেফারেন্স</th><th className="text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((p) => (
                        <tr key={p.id} className="border-b border-amber-500/5">
                          <td className="py-3">
                            <span className="font-semibold">{p.members?.full_name}</span>
                            <span className="block text-[10px] text-muted-foreground">{p.members?.member_code}</span>
                          </td>
                          <td>{BANGLA_MONTHS[p.for_month - 1]} {toBanglaNumber(p.for_year)}</td>
                          <td className="font-bold">৳ {toBanglaNumber(p.amount)}</td>
                          <td className="uppercase text-[10px]">{p.method}</td>
                          <td className="font-mono text-[10px]">{p.transaction_ref || '-'}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => approvePayment(p.id)} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-[10px]">Approve</Button>
                              <Button size="sm" onClick={() => rejectPayment(p.id)} variant="destructive" className="h-7 text-[10px]">Reject</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== Bulk CSV Upload ===== */}
            <div className="card-gold rounded-2xl p-6 bg-primary/5 border-primary/20">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5" /> বাল্ক সিএসভি আপলোড (Bulk CSV Upload)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bangla">সদস্য তালিকা (CSV)</Label>
                  <Input type="file" accept=".csv" onChange={(e) => handleBulkUpload(e, 'members')} className="h-9 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Headers: full_name, member_code, phone, area, monthly_rate</p>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bangla">পেমেন্ট হিস্ট্রি (CSV)</Label>
                  <Input type="file" accept=".csv" onChange={(e) => handleBulkUpload(e, 'payments')} className="h-9 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Headers: member_code, amount, for_month, for_year, method, payment_date</p>
                </div>
              </div>
            </div>

            {/* Org-wide Monthly + Annual chanda PDF reports */}
            <div className="card-gold rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                <div>
                  <h3 className="font-display text-lg gold-text flex items-center gap-2">
                    <FileText className="h-5 w-5" /> চাঁদা হিসাব রিপোর্ট (PDF)
                  </h3>
                  <p className="font-bangla text-sm text-muted-foreground mt-1">
                    সব সদস্যের মাসিক বা বার্ষিক চাঁদার সম্পূর্ণ PDF রিপোর্ট তৈরি করুন।
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-background/40 border border-primary/20 rounded-lg px-3 py-2">
                  <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
                  <Label htmlFor="active-only" className="font-bangla text-sm cursor-pointer">
                    শুধু সক্রিয় সদস্য
                  </Label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end mb-4">
                <div>
                  <label className="font-bangla text-xs text-muted-foreground">বছর</label>
                  <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const y = currentYear - i;
                        return <SelectItem key={y} value={String(y)}>{toBanglaNumber(y)}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="font-bangla text-xs text-muted-foreground">মাস</label>
                  <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANGLA_MONTHS.map((mn, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openPreview('monthly')} variant="outline" className="font-bangla border-primary/40">
                  <Eye className="h-4 w-4 mr-1" /> মাসিক প্রিভিউ
                </Button>
                <Button onClick={() => openPreview('annual')} variant="outline" className="font-bangla border-primary/40">
                  <Eye className="h-4 w-4 mr-1" /> বার্ষিক প্রিভিউ
                </Button>
              </div>

              {/* Custom filename — applies to all PDF / CSV downloads from this card */}
              <div className="mb-4">
                <label htmlFor="report-filename" className="font-bangla text-xs text-muted-foreground">
                  ফাইলের নাম (ঐচ্ছিক)
                </label>
                <Input
                  id="report-filename"
                  value={reportFilename}
                  onChange={(e) => setReportFilename(e.target.value)}
                  placeholder={defaultFilename(previewKind)}
                  className="font-mono text-sm"
                />
                <p className="font-bangla text-[11px] text-muted-foreground mt-1">
                  খালি রাখলে স্বয়ংক্রিয় নাম ব্যবহার হবে।{' '}
                  <span className="text-primary">{`.pdf / .csv`}</span> এক্সটেনশন স্বয়ংক্রিয়ভাবে যুক্ত হবে।
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button onClick={downloadOrgMonthly} className="bg-gradient-gold text-primary-foreground font-bangla">
                  <Download className="h-4 w-4 mr-1" /> মাসিক চাঁদা PDF
                </Button>
                <Button onClick={downloadOrgAnnual} className="bg-[hsl(43_55%_40%)] hover:opacity-90 text-primary-foreground font-bangla">
                  <Download className="h-4 w-4 mr-1" /> বার্ষিক চাঁদা PDF
                </Button>
                <Button onClick={() => openPreview('combined')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bangla">
                  <CalendarDays className="h-4 w-4 mr-1" /> ১২ মাস কম্বাইন্ড PDF
                </Button>
                <Button onClick={downloadOrgEachMonth} variant="outline" className="font-bangla border-primary/40">
                  <Download className="h-4 w-4 mr-1" /> ১২ আলাদা PDF
                </Button>
              </div>

              {/* CSV exports */}
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <Button onClick={downloadCsvMonthly} variant="outline" className="font-bangla border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10">
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> মাসিক CSV
                </Button>
                <Button onClick={downloadCsvAnnual} variant="outline" className="font-bangla border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10">
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> বার্ষিক CSV
                </Button>
              </div>
            </div>


            {/* ===== এলাকা ভিত্তিক চাঁদা PDF ===== */}
            <div className="card-gold rounded-2xl p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="font-display text-lg gold-text flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> এলাকা ভিত্তিক চাঁদা PDF
                  </h3>
                  <p className="font-bangla text-sm text-muted-foreground mt-1">
                    সদস্যদের <span className="font-mono">area</span> ফিল্ড অনুযায়ী গ্রুপ করে রিপোর্ট।
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-background/40 border border-primary/20 rounded-lg px-3 py-2">
                  <span className="font-bangla text-xs text-muted-foreground">স্কোপ:</span>
                  <Select value={areaScope} onValueChange={(v) => setAreaScope(v as any)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">পূর্ণ বছর</SelectItem>
                      <SelectItem value="month">শুধু এই মাস</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-sm font-bangla">
                  <thead className="bg-muted/40"><tr className="text-left">
                    <th className="py-2 px-3">এলাকা</th>
                    <th className="text-right px-3">সদস্য</th>
                    <th className="text-right px-3">প্রত্যাশিত</th>
                    <th className="text-right px-3">জমা</th>
                    <th className="text-right px-3">বকেয়া</th>
                    <th className="text-right px-3">% সংগ্রহ</th>
                  </tr></thead>
                  <tbody>
                    {areaSummaries.map((a) => (
                      <tr key={a.area} className="border-t border-border/40">
                        <td className="py-2 px-3">{a.area}</td>
                        <td className="text-right px-3">{toBanglaNumber(a.members)}</td>
                        <td className="text-right px-3">৳ {toBanglaNumber(a.expected.toFixed(0))}</td>
                        <td className="text-right px-3 text-emerald-600">৳ {toBanglaNumber(a.paid.toFixed(0))}</td>
                        <td className="text-right px-3 text-rose-600">৳ {toBanglaNumber(a.due.toFixed(0))}</td>
                        <td className="text-right px-3">{a.expected > 0 ? `${Math.round((a.paid / a.expected) * 100)}%` : '—'}</td>
                      </tr>
                    ))}
                    {areaSummaries.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">কোনো এলাকা নেই — সদস্য এডিটে এলাকা যোগ করুন।</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button onClick={downloadAreaPDF} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bangla">
                  <Download className="h-4 w-4 mr-1" /> এলাকা PDF ডাউনলোড
                </Button>
              </div>
            </div>

            {/* ===== লক্ষ্যমাত্রা / Targets ===== */}
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <Target className="h-5 w-5" /> লক্ষ্যমাত্রা ও সেটিংস
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <div>
                  <label className="font-bangla text-xs text-muted-foreground">প্রতিষ্ঠানের নাম</label>
                  <Input defaultValue={typeof settings.org_name === 'string' ? settings.org_name : ''}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== settings.org_name) saveSetting('org_name', v); }} />
                </div>
                <div>
                  <label className="font-bangla text-xs text-muted-foreground">ডিফল্ট মাসিক রেট (৳)</label>
                  <Input type="number" defaultValue={Number(settings.default_monthly_rate ?? 500)}
                    onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== Number(settings.default_monthly_rate)) saveSetting('default_monthly_rate', v); }} />
                </div>
                <div>
                  <label className="font-bangla text-xs text-muted-foreground">বার্ষিক লক্ষ্যমাত্রা (৳)</label>
                  <Input type="number" defaultValue={Number(settings.default_annual_target ?? 0)}
                    onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== Number(settings.default_annual_target)) saveSetting('default_annual_target', v); }} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <ProgressCard label={`${toBanglaNumber(reportYear)} বার্ষিক অর্জন`} current={yearIncome} target={yearTargetTotal || Number(settings.default_annual_target ?? 0)} />
                <ProgressCard label={`${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)} মাসিক অর্জন`} current={monthIncome} target={Number(monthTargetRow?.target_amount ?? 0)} />
                <div className="rounded-xl border border-primary/20 bg-background/40 p-4">
                  <p className="font-bangla text-xs text-muted-foreground">নেট ব্যালেন্স ({toBanglaNumber(reportYear)})</p>
                  <p className={`font-display text-2xl mt-1 ${yearBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>৳ {toBanglaNumber(yearBalance.toFixed(0))}</p>
                  <p className="font-bangla text-[11px] text-muted-foreground mt-1">আয় ৳ {toBanglaNumber(yearIncome.toFixed(0))} − খরচ ৳ {toBanglaNumber(yearExpense.toFixed(0))}</p>
                </div>
              </div>
              <form onSubmit={saveMonthlyTarget} className="grid sm:grid-cols-5 gap-3 items-end mb-4">
                <div><label className="font-bangla text-xs text-muted-foreground">বছর</label><Input name="for_year" type="number" defaultValue={reportYear} required /></div>
                <div><label className="font-bangla text-xs text-muted-foreground">মাস</label>
                  <Select name="for_month" defaultValue={String(reportMonth)} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BANGLA_MONTHS.map((mn, i) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><label className="font-bangla text-xs text-muted-foreground">লক্ষ্যমাত্রা (৳)</label><Input name="target_amount" type="number" min="0" required /></div>
                <div><label className="font-bangla text-xs text-muted-foreground">নোট (ঐচ্ছিক)</label><Input name="note" /></div>
                <Button disabled={busy} className="bg-gradient-gold text-primary-foreground font-bangla"><Save className="h-4 w-4 mr-1" /> সেভ</Button>
              </form>
              {targets.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm font-bangla">
                    <thead className="bg-muted/40 text-left"><tr>
                      <th className="py-2 px-3">বছর</th><th className="px-3">মাস</th>
                      <th className="text-right px-3">লক্ষ্যমাত্রা</th><th className="px-3">নোট</th><th className="px-3 w-20"></th>
                    </tr></thead>
                    <tbody>
                      {targets.slice(0, 24).map((t) => (
                        <tr key={t.id} className="border-t border-border/40">
                          <td className="py-2 px-3">{toBanglaNumber(t.for_year)}</td>
                          <td className="px-3">{BANGLA_MONTHS[t.for_month - 1]}</td>
                          <td className="text-right px-3">৳ {toBanglaNumber(Number(t.target_amount).toFixed(0))}</td>
                          <td className="px-3 text-muted-foreground">{t.note ?? '-'}</td>
                          <td className="px-3"><Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-500/10" onClick={() => deleteTarget(t.id)} title="মুছে ফেলুন"><Trash2 className="h-4 w-4" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ===== Expense category breakdown ===== */}
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <PieIcon className="h-5 w-5" /> খরচ বিভাগ অনুযায়ী ({toBanglaNumber(reportYear)})
              </h3>
              {expenseByCategory.length === 0 ? (
                <p className="font-bangla text-center text-muted-foreground py-6">এই বছরের কোনো খরচ নেই</p>
              ) : (
                <div className="space-y-2">
                  {expenseByCategory.map((c) => {
                    const pct = yearExpense > 0 ? (c.total / yearExpense) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex justify-between text-sm font-bangla mb-1">
                          <span>{c.category}</span>
                          <span className="text-muted-foreground">৳ {toBanglaNumber(c.total.toFixed(0))} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-border/40 flex justify-between font-bangla text-sm">
                    <span className="font-semibold">মোট</span>
                    <span className="text-rose-600 font-semibold">৳ {toBanglaNumber(yearExpense.toFixed(0))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* চাঁদা এন্ট্রি */}
              <form onSubmit={submitPayment} className="card-gold rounded-2xl p-6 space-y-4">
                <div className="bg-orange-950/30 border border-orange-700/40 rounded-lg p-3 flex gap-2 text-sm">
                  <AlertOctagon className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="font-bangla">
                    <p className="font-semibold text-orange-400">চাঁদার নিয়মাবলী:</p>
                    <p className="text-muted-foreground">প্রতি মাসের ১০ তারিখের মধ্যে সর্বনিম্ন ৫০ টাকা।</p>
                  </div>
                </div>

                <h3 className="font-display text-lg gold-text flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> চাঁদা সংগ্রহ
                </h3>

                {selectedMemberId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                    {(() => {
                      const m = memberStats.find(ms => ms.id === selectedMemberId);
                      if (!m) return null;
                      return (
                        <div className="flex justify-between items-center text-sm font-bangla">
                          <div>
                            <p className="text-xs text-muted-foreground">বর্তমান বকেয়া</p>
                            <p className="text-lg font-bold text-rose-600">৳ {toBanglaNumber(m.dues.toFixed(0))}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">বকেয়া মাস</p>
                            <p className="text-lg font-bold text-amber-600">{toBanglaNumber(m.dueMonths)} মাস</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                  <div className="relative">
                    <input type="hidden" name="member_id" value={selectedMemberId} />
                    <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={memberSearchOpen}
                          className="w-full justify-between font-bangla font-normal h-10 px-3"
                        >
                          <span className="truncate">
                            {selectedMemberId
                              ? members.find((m) => m.id === selectedMemberId)?.full_name
                              : "সদস্য নির্বাচন করুন *"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command className="font-bangla">
                          <CommandInput placeholder="নাম বা কোড দিয়ে খুঁজুন..." />
                          <CommandList>
                            <CommandEmpty>কোনো সদস্য পাওয়া যায়নি।</CommandEmpty>
                            <CommandGroup>
                              {members.filter(m => m.is_active).map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={`${m.member_code} ${m.full_name}`}
                                  onSelect={() => {
                                    setSelectedMemberId(m.id);
                                    setMemberSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMemberId === m.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {m.member_code} — {m.full_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setQuickMemberOpen(true)}
                    title="নতুন সদস্য যোগ করুন"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>

                  <Input name="amount" type="number" placeholder="পরিমাণ *" required className="h-10" />
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {[50, 100, 500, 1000].map(amt => (
                    <Button 
                      key={amt} 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bangla border-primary/20 hover:bg-primary/10"
                      onClick={(e) => {
                        const input = (e.currentTarget.closest('form')?.querySelector('input[name="amount"]') as HTMLInputElement);
                        if (input) input.value = String(amt);
                      }}
                    >
                      ৳ {toBanglaNumber(amt)}
                    </Button>
                  ))}
                </div>

                {selectedMemberId && (
                  <div className="space-y-2 mb-4">
                    <p className="text-[10px] text-muted-foreground font-bangla uppercase tracking-wider">সাম্প্রতিক জমা</p>
                    {payments
                      .filter(p => p.member_id === selectedMemberId && p.status === 'approved')
                      .slice(0, 3)
                      .map(p => (
                        <div key={p.id} className="flex justify-between text-[11px] font-bangla border-b border-primary/5 pb-1 last:border-0">
                          <span className="text-muted-foreground">{BANGLA_MONTHS[p.for_month - 1]} {toBanglaNumber(p.for_year)}</span>
                          <span className="font-bold">৳ {toBanglaNumber(p.amount)}</span>
                        </div>
                      ))}
                    {payments.filter(p => p.member_id === selectedMemberId && p.status === 'approved').length === 0 && (
                      <p className="text-[10px] italic text-muted-foreground">কোনো জমা পাওয়া যায়নি</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Select name="for_month" defaultValue={String(currentMonth)} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANGLA_MONTHS.map((mn, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{mn} {toBanglaNumber(currentYear)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input name="for_year" type="hidden" defaultValue={currentYear} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Select name="method" defaultValue="cash" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">ক্যাশ (Cash)</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ</SelectItem>
                      <SelectItem value="rocket">রকেট</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                      <SelectItem value="other">অন্যান্য</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input name="transaction_ref" placeholder="TrxID (ঐচ্ছিক)" />
                </div>

                <Button disabled={busy} className="w-full bg-gradient-gold text-primary-foreground font-bangla h-11">
                  <Save className="h-4 w-4 mr-2" /> {busy ? 'অপেক্ষা...' : 'সেভ ও রশিদ'}
                </Button>
              </form>

              {/* খরচ এন্ট্রি */}
              <form onSubmit={submitExpense} className="card-gold rounded-2xl p-6 space-y-4">
                <h3 className="font-display text-lg text-destructive flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" /> খরচ এন্ট্রি
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bangla">টাইটেল *</Label>
                    <Input name="title" placeholder="টাইটেল *" required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bangla">পরিমাণ *</Label>
                      <div className="relative">
                        <Input 
                          name="amount" 
                          type="number" 
                          placeholder="পরিমাণ *" 
                          required 
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 10000) {
                              // Large expense visual cue
                              e.target.classList.add('border-rose-500');
                              e.target.classList.add('ring-rose-500');
                            } else {
                              e.target.classList.remove('border-rose-500');
                              e.target.classList.remove('ring-rose-500');
                            }
                          }}
                        />
                      </div>
                    </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bangla">বিভাগ (Category)</Label>
                      <Select name="category" defaultValue="অন্যান্য">
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="অনুষ্ঠান">অনুষ্ঠান</SelectItem>
                          <SelectItem value="আপ্যায়ন">আপ্যায়ন</SelectItem>
                          <SelectItem value="যাতায়াত">যাতায়াত</SelectItem>
                          <SelectItem value="মেরামত">মেরামত</SelectItem>
                          <SelectItem value="বেতন">বেতন</SelectItem>
                          <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bangla">তারিখ *</Label>
                      <Input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bangla">অনুমোদনকারী (ঐচ্ছিক)</Label>
                      <Input name="approved_by" placeholder="অনুমোদনকারী" className="h-10" />
                    </div>
                    <div>
                      <Label className="text-xs font-bangla">মন্তব্য (ঐচ্ছিক)</Label>
                      <Input name="note" placeholder="মন্তব্য" className="h-10" />
                    </div>
                  </div>
                </div>

                <Button disabled={busy} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bangla h-11">
                  <Plus className="h-4 w-4 mr-2" /> {busy ? 'অপেক্ষা...' : 'রেকর্ড করুন'}
                </Button>
              </form>
            </div>

            <div className="card-gold rounded-2xl p-6 overflow-x-auto">
              <h3 className="font-display text-lg gold-text mb-4">সদস্য তালিকা</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">কোড</th><th>নাম</th><th>ফোন</th>
                    <th className="text-right">মাসিক</th><th className="text-right">জমা</th><th className="text-right">বকেয়া</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {memberStats.map((m) => (
                    <tr key={m.id} className="border-b border-border/40">
                      <td className="py-2 font-mono text-primary">{m.member_code}</td>
                      <td>{m.full_name}</td>
                      <td className="text-muted-foreground">{m.phone ?? '-'}</td>
                      <td className="text-right">৳ {toBanglaNumber(m.monthly_rate)}</td>
                      <td className="text-right text-primary">৳ {toBanglaNumber(m.totalPaid.toFixed(0))}</td>
                      <td className="text-right text-destructive">৳ {toBanglaNumber(m.dues.toFixed(0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right">
                <Link to="/admin" className="text-sm font-bangla text-primary hover:underline">
                  সম্পূর্ণ অ্যাডমিন প্যানেল →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {tab === 'audit' && (
          <div className="card-gold rounded-2xl p-6">
            <h3 className="font-display text-lg gold-text mb-4">অডিট লগ (সাম্প্রতিক ১০০টি রেকর্ড)</h3>
            <div className="overflow-x-auto rounded-lg border border-primary/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground bg-primary/5">
                    <th className="py-3 px-4">সময়</th>
                    <th className="py-3 px-4">কর্তা (Who)</th>
                    <th className="py-3 px-4">অ্যাকশন</th>
                    <th className="py-3 px-4">টেবিল</th>
                    <th className="py-3 px-4">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                      <td className="py-3 px-4 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('bn-BD', { 
                          year: 'numeric', month: 'long', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="font-medium text-foreground">{log.actor_name || 'System'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === 'INSERT' ? 'bg-emerald-500/20 text-emerald-500' :
                          log.action === 'UPDATE' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-rose-500/20 text-rose-500'
                        }`}>
                          {log.action === 'INSERT' ? 'যোগ' : log.action === 'UPDATE' ? 'আপডেট' : 'মুছে ফেলা'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-primary/70">{log.table_name}</td>
                      <td className="py-3 px-4 text-[12px]">
                        <div className="font-medium text-foreground mb-1">{log.summary || `ID: ${log.record_id?.slice(0,8)}...`}</div>
                        {log.details && (
                          <div className="text-[10px] text-muted-foreground mt-1 font-mono bg-background/50 p-2 rounded border border-primary/10 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(log.details, null, 2)}>
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">কোনো অডিট লগ পাওয়া যায়নি।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'admin' && !adminMode && (
          <div className="card-gold rounded-2xl p-12 text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="font-bangla text-lg">প্রবেশ করতে উপরের <span className="text-primary font-semibold">"অ্যাডমিন মোড"</span> বাটনে ক্লিক করুন</p>
          </div>
        )}
      </div>

      {/* Preview modal for org-wide PDF reports */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display gold-text">
              {previewKind === 'monthly'
                ? `মাসিক প্রিভিউ — ${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)}`
                : previewKind === 'annual'
                ? `বার্ষিক প্রিভিউ — ${toBanglaNumber(reportYear)}`
                : `১২ মাসের কম্বাইন্ড প্রিভিউ — ${toBanglaNumber(reportYear)}`}
            </DialogTitle>
            <DialogDescription className="font-bangla">
              ডাউনলোডের আগে রিপোর্টের সারসংক্ষেপ যাচাই করুন।{' '}
              {activeOnly ? '(শুধু সক্রিয় সদস্য)' : '(সব সদস্য)'}
            </DialogDescription>
          </DialogHeader>

          {previewKind === 'monthly' ? (
            <PreviewBlock
              members={previewMonthlyTotals.members}
              expected={previewMonthlyTotals.expected}
              paid={previewMonthlyTotals.paid}
              due={previewMonthlyTotals.due}
              statusRows={[
                { label: 'PAID', value: previewMonthlyTotals.paidCount, tone: 'paid' },
                { label: 'PARTIAL', value: previewMonthlyTotals.partialCount, tone: 'partial' },
                { label: 'DUE', value: previewMonthlyTotals.dueCount, tone: 'due' },
              ]}
              statusLabel="সদস্যের সংখ্যা"
            />
          ) : (
            <>
              <PreviewBlock
                members={previewAnnualTotals.members}
                expected={previewAnnualTotals.expected}
                paid={previewAnnualTotals.paid}
                due={previewAnnualTotals.due}
                statusRows={[
                  { label: 'PAID', value: previewAnnualTotals.monthsPaid, tone: 'paid' },
                  { label: 'PARTIAL', value: previewAnnualTotals.monthsPartial, tone: 'partial' },
                  { label: 'DUE', value: previewAnnualTotals.monthsDue, tone: 'due' },
                ]}
                statusLabel="মাসের সংখ্যা"
              />
              <MonthGridPreview rows={previewAnnualTotals.monthGrid} />
            </>
          )}

          <MethodBreakdownPreview
            breakdown={
              previewKind === 'monthly'
                ? previewMonthlyTotals.methodBreakdown
                : previewAnnualTotals.methodBreakdown
            }
          />

          {/* Filename input inside the modal as well, for last-minute edits */}
          <div className="border-t border-border/40 pt-3">
            <label htmlFor="preview-filename" className="font-bangla text-xs text-muted-foreground">
              ফাইলের নাম (ঐচ্ছিক)
            </label>
            <Input
              id="preview-filename"
              value={reportFilename}
              onChange={(e) => setReportFilename(e.target.value)}
              placeholder={defaultFilename(previewKind)}
              className="font-mono text-sm mt-1"
            />
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="font-bangla">
              বাতিল
            </Button>
            {previewKind !== 'combined' && (
              <Button
                variant="outline"
                onClick={confirmCsvFromPreview}
                className="font-bangla border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV ডাউনলোড
              </Button>
            )}
            <Button
              onClick={confirmDownloadFromPreview}
              className="bg-gradient-gold text-primary-foreground font-bangla"
            >
              <Download className="h-4 w-4 mr-1" /> PDF ডাউনলোড
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Member Dialog */}
      <Dialog open={quickMemberOpen} onOpenChange={setQuickMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display gold-text">নতুন সদস্য যোগ করুন</DialogTitle>
            <DialogDescription className="font-bangla">সদস্যের তথ্য দিয়ে তালিকায় যোগ করুন।</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            const { data, error } = await supabase.from('members').insert({
              full_name: fd.full_name,
              member_code: fd.member_code,
              phone: fd.phone,
              area: fd.area,
              monthly_rate: Number(fd.monthly_rate) || 500,
            } as any).select().single();
            setBusy(false);
            if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
            toast({ title: 'সদস্য যোগ হয়েছে' });
            setQuickMemberOpen(false);
            await loadAll();
            if (data) setSelectedMemberId(data.id);
          }} className="space-y-4 font-bangla">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">নাম *</Label><Input name="full_name" placeholder="যেমন: মোহাম্মদ করিম" required /></div>
              <div><Label className="text-xs">মেম্বার কোড *</Label><Input name="member_code" placeholder="যেমন: CDS-001" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">ফোন নম্বর</Label><Input name="phone" placeholder="০১৭..." /></div>
              <div><Label className="text-xs">এলাকা</Label><Input name="area" placeholder="যেমন: পটিয়া" /></div>
            </div>
            <div><Label className="text-xs">মাসিক চাঁদা (৳)</Label><Input name="monthly_rate" type="number" defaultValue={500} /></div>
            <Button disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">
              {busy ? 'অপেক্ষা...' : 'সদস্য নিশ্চিত করুন'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Public Snapshot Dialog */}
      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent className="sm:max-w-md font-bangla">
          <DialogHeader>
            <DialogTitle className="gold-text flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> পাবলিক স্বচ্ছতা কার্ড
            </DialogTitle>
            <DialogDescription>
              চন্দনাইশ দরবার শরীফ কমিটি ফান্ডের আর্থিক অবস্থার সারসংক্ষেপ।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground uppercase">মোট সংগ্রহ</p>
                <p className="text-xl font-display gold-text">৳ {toBanglaNumber(totalIncome.toFixed(0))}</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <p className="text-[10px] text-muted-foreground uppercase">মোট ব্যয়</p>
                <p className="text-xl font-display text-destructive">৳ {toBanglaNumber(totalExpense.toFixed(0))}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">বর্তমান ব্যালেন্স</p>
              <p className="text-3xl font-display text-emerald-600">৳ {toBanglaNumber(balance.toFixed(0))}</p>
            </div>
            <div className="text-[10px] text-center text-muted-foreground">
              আপডেট হয়েছে: {new Date().toLocaleDateString('bn-BD')} | সরাসরি ডাটাবেজ থেকে সংগৃহীত।
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSnapshotOpen(false)} className="w-full bg-gradient-gold text-primary-foreground font-bold">বন্ধ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone = 'gold' }: { icon: React.ReactNode; label: string; value: string; tone?: 'gold' | 'danger' }) => (
  <div className="card-gold rounded-2xl p-5">
    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${tone === 'danger' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
      {icon}
    </div>
    <p className="font-bangla text-xs text-muted-foreground">{label}</p>
    <p className={`font-display text-xl mt-1 ${tone === 'danger' ? 'text-destructive' : 'gold-text'}`}>{value}</p>
  </div>
);

const ProgressCard = ({ label, current, target }: { label: string; current: number; target: number }) => {
  const safeTarget = Number(target) || 0;
  const pct = safeTarget > 0 ? Math.min(100, Math.round((current / safeTarget) * 100)) : 0;
  const remaining = Math.max(0, safeTarget - current);
  const tone = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="card-gold rounded-2xl p-5">
      <p className="font-bangla text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl mt-1 gold-text">৳ {toBanglaNumber(Number(current).toFixed(0))}</p>
      <p className="font-bangla text-[11px] text-muted-foreground mt-1">
        লক্ষ্যমাত্রা ৳ {toBanglaNumber(safeTarget.toFixed(0))} • অবশিষ্ট ৳ {toBanglaNumber(remaining.toFixed(0))}
      </p>
      <div className="mt-3 h-2 w-full bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="font-bangla text-[11px] text-muted-foreground mt-1 text-right">{toBanglaNumber(pct)}%</p>
    </div>
  );
};

const PersonalView = ({ member, payments }: { member: Member; payments: Payment[] }) => {
  const memPays = payments.map((p) => ({
    amount: Number(p.amount), for_year: p.for_year, for_month: p.for_month,
    payment_date: p.payment_date, method: p.method, transaction_ref: p.transaction_ref,
  }));
  const stats = calculateDues(member, memPays);
  const monthly = buildMonthlyStatement(member, memPays).slice().reverse();

  return (
    <>
      <div className="card-gold rounded-2xl p-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-primary">{member.member_code}</p>
          <h3 className="font-display text-2xl gold-text mt-1">{member.full_name}</h3>
          <p className="font-bangla text-sm text-muted-foreground mt-1">
            যোগদান: {member.joined_date} • মাসিক ৳ {toBanglaNumber(member.monthly_rate)}
          </p>
        </div>
        <Button onClick={() => downloadAnnualStatementPDF(member, memPays)} className="bg-gradient-gold text-primary-foreground font-bangla">
          <Download className="h-4 w-4 mr-1" /> বার্ষিক PDF
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="মোট জমা" value={`৳ ${toBanglaNumber(stats.totalPaid.toFixed(0))}`} />
        <StatCard icon={<AlertOctagon className="h-5 w-5" />} label={`বকেয়া (${toBanglaNumber(stats.dueMonths)} মাস)`} value={`৳ ${toBanglaNumber(stats.dues.toFixed(0))}`} tone="danger" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="প্রত্যাশিত মোট" value={`৳ ${toBanglaNumber(stats.totalExpected.toFixed(0))}`} />
      </div>
      <div className="card-gold rounded-2xl p-6 overflow-x-auto">
        <h3 className="font-display text-lg gold-text mb-4">মাসিক বিবরণী</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
              <th className="py-2">মাস</th><th className="text-right">প্রত্যাশিত</th><th className="text-right">পরিশোধিত</th><th>অবস্থা</th>
            </tr>
          </thead>
          <tbody className="font-bangla">
            {monthly.map((r) => (
              <tr key={`${r.year}-${r.month}`} className="border-b border-border/40">
                <td className="py-2">{monthName(r.month)} {toBanglaNumber(r.year)}</td>
                <td className="text-right">৳ {toBanglaNumber(r.expected)}</td>
                <td className="text-right text-primary">৳ {toBanglaNumber(r.paid)}</td>
                <td>
                  <span className={
                    r.status === 'paid' ? 'text-xs px-2 py-1 rounded bg-primary/20 text-primary' :
                    r.status === 'partial' ? 'text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500' :
                    'text-xs px-2 py-1 rounded bg-destructive/20 text-destructive'
                  }>
                    {r.status === 'paid' ? 'পরিশোধিত' : r.status === 'partial' ? 'আংশিক' : 'বাকি'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

type PreviewTone = 'paid' | 'partial' | 'due';

const PreviewBlock = ({
  members, expected, paid, due, statusRows, statusLabel,
}: {
  members: number;
  expected: number;
  paid: number;
  due: number;
  statusRows: { label: string; value: number; tone: PreviewTone }[];
  statusLabel: string;
}) => {
  const toneClass = (t: PreviewTone) =>
    t === 'paid'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : t === 'partial'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-primary/20 bg-background/40 p-3">
          <p className="font-bangla text-xs text-muted-foreground">সদস্য সংখ্যা</p>
          <p className="font-display text-xl gold-text">{toBanglaNumber(members)}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-background/40 p-3">
          <p className="font-bangla text-xs text-muted-foreground">প্রত্যাশিত</p>
          <p className="font-display text-xl gold-text">{formatBDT(expected)}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="font-bangla text-xs text-muted-foreground">জমা হয়েছে</p>
          <p className="font-display text-xl text-emerald-600 dark:text-emerald-400">{formatBDT(paid)}</p>
        </div>
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
          <p className="font-bangla text-xs text-muted-foreground">বকেয়া</p>
          <p className="font-display text-xl text-rose-600 dark:text-rose-400">{formatBDT(due)}</p>
        </div>
      </div>
      <div>
        <p className="font-bangla text-xs text-muted-foreground mb-2">{statusLabel}</p>
        <div className="flex flex-wrap gap-2">
          {statusRows.map((s) => (
            <span key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-bold ${toneClass(s.tone)}`}>
              {s.label}: {toBanglaNumber(s.value)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const MONTH_GRID_LABELS = ['জা','ফে','মা','এ','মে','জু','জু','আ','সে','অ','ন','ডি'];

const MonthGridPreview = ({
  rows,
}: {
  rows: { month: number; paid: number; partial: number; due: number; inactive: number }[];
}) => {
  const dominant = (r: { paid: number; partial: number; due: number; inactive: number }) => {
    const active = r.paid + r.partial + r.due;
    if (active === 0) return 'inactive';
    if (r.due >= r.partial && r.due >= r.paid && r.due > 0) return 'due';
    if (r.partial >= r.paid && r.partial > 0) return 'partial';
    return 'paid';
  };
  const tone = (k: string) =>
    k === 'paid'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
      : k === 'partial'
      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
      : k === 'due'
      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700'
      : 'bg-muted text-muted-foreground border-border';
  return (
    <div className="border-t border-border/40 pt-3">
      <p className="font-bangla text-xs text-muted-foreground mb-2">
        ১২ মাসের অবস্থা (যে রঙ বেশি সেটাই ঐ মাসের সারাংশ)
      </p>
      <div className="grid grid-cols-12 gap-1.5">
        {rows.map((r) => {
          const k = dominant(r);
          return (
            <div
              key={r.month}
              className={`rounded-md border px-1 py-1.5 text-center ${tone(k)}`}
              title={`Paid: ${r.paid} • Partial: ${r.partial} • Due: ${r.due} • Inactive: ${r.inactive}`}
            >
              <div className="font-bangla text-[11px] leading-none">{MONTH_GRID_LABELS[r.month - 1]}</div>
              <div className="text-[10px] mt-1 leading-none font-mono">
                {r.paid}/{r.partial}/{r.due}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 font-mono text-right">
        cells = PAID / PARTIAL / DUE counts per month
      </p>
    </div>
  );
};

const MethodBreakdownPreview = ({
  breakdown,
}: {
  breakdown: { method: string; count: number; total: number }[];
}) => {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="border-t border-border/40 pt-3">
        <p className="font-bangla text-xs text-muted-foreground flex items-center gap-1">
          <CreditCard className="h-3.5 w-3.5" /> পেমেন্ট পদ্ধতি অনুযায়ী ব্রেকডাউন
        </p>
        <p className="font-bangla text-sm text-muted-foreground py-3 text-center">
          কোনো পেমেন্ট পাওয়া যায়নি।
        </p>
      </div>
    );
  }
  const grandTotal = breakdown.reduce((s, b) => s + b.total, 0) || 1;
  const top = breakdown.slice(0, 5);
  return (
    <div className="border-t border-border/40 pt-3">
      <p className="font-bangla text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <CreditCard className="h-3.5 w-3.5" /> শীর্ষ পেমেন্ট পদ্ধতি (Top {top.length})
      </p>
      <ul className="space-y-1.5">
        {top.map((b) => {
          const pct = Math.round((b.total / grandTotal) * 100);
          return (
            <li key={b.method}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono uppercase">{b.method}</span>
                <span className="font-bangla text-xs text-muted-foreground">
                  {b.count} টি · {formatBDT(b.total)} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Finance;
