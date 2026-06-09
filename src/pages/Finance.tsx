import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  downloadMemberBankStatementPDF, downloadOrganizationStatementPDF,
  downloadOrgMonthlyReportPDF, downloadOrgAnnualReportPDF,
  downloadOrgAllMonthsCombinedPDF,
  downloadOrgMonthlyReportCSV, downloadOrgAnnualReportCSV,
  downloadAreaRankingPDF,
  downloadAreaPaymentsPDF,
  computeOrgMonthlyTotals, computeOrgAnnualTotals,
  downloadAreaReportPDF, computeAreaSummaries,
  downloadReceiptPDF,
  downloadConsolidatedReceiptPDF,
  formatBDT,
  type OrgMonthlyTotals, type OrgAnnualTotals, type PaymentLite, type MemberLite,
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
  FileSpreadsheet, CreditCard, MapPin, Target, Pencil, Edit, Trash2, Check, ChevronsUpDown, Clock,
  Bell, Filter, ChevronRight, Menu, X, ReceiptText
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type TabKey = 'summary' | 'personal' | 'dues' | 'transparency' | 'ranking' | 'admin' | 'audit' | 'settings';


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
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [quickMemberOpen, setQuickMemberOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [targetFormYear, setTargetFormYear] = useState<number>(new Date().getFullYear());
  const [targetFormMonth, setTargetFormMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [targetFormAmount, setTargetFormAmount] = useState<string>("");
  const [targetFormNote, setTargetFormNote] = useState<string>("");
  const ORG_NAME_SLUG = 'chandanaish-darbar';

  useEffect(() => {
    setTargetFormYear(reportYear);
    setTargetFormMonth(String(reportMonth));
    const currentTarget = targets.find(t => t.for_year === reportYear && t.for_month === reportMonth);
    if (currentTarget) {
      setTargetFormAmount(String(currentTarget.target_amount));
      setTargetFormNote(currentTarget.note || "");
    } else {
      setTargetFormAmount("");
      setTargetFormNote("");
    }
  }, [reportYear, reportMonth, targets]);

  const loadAll = async () => {
    setBusy(true);
    try {
      const [m, p, e, t, s, al] = await Promise.all([
        fetchMembers(),
        fetchPayments(),
        fetchExpenses(),
        fetchTargets(),
        fetchSettings(),
        isStaff ? supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] })
      ]);
      setMembers(m);
      setPayments(p);
      setExpenses(e);
      setTargets(t);
      setSettings(s);
      setAuditLogs(al.data || []);
      setPendingPayments(p.filter(pay => pay.status === 'pending'));
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : 'ডাটা লোড ব্যর্থ', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  // Aggregates - ONLY approved and pending payments count towards income
  const totalIncome = useMemo(() => payments.filter(p => p.status !== 'rejected').reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const balance = totalIncome - totalExpense;
  const activeMembers = members.filter((m) => m.is_active).length;

  // Per-member dues / paid
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Optimized per-member dues / paid calculation
  const memberStats = useMemo(() => {
    const payMap = new Map<string, PaymentLite[]>();
    // Count all payments except rejected
    payments.filter(p => p.status !== 'rejected').forEach(p => {
      if (!payMap.has(p.member_id)) payMap.set(p.member_id, []);
      payMap.get(p.member_id)?.push({
        amount: Number(p.amount), for_year: p.for_year, for_month: p.for_month,
        payment_date: p.payment_date, method: p.method, transaction_ref: p.transaction_ref,
      });
    });

    return members.map((m) => {
      const memPays = payMap.get(m.id) || [];
      const stats = calculateDues(m as unknown as MemberLite, memPays);
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
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
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
      toast({ title: 'আপলোড ব্যর্থ', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
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
    payments.filter(p => p.status !== 'rejected').forEach((p) => {
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
        if (!mem.joined_date) continue;
        const join = new Date(mem.joined_date);
        if (isNaN(join.getTime())) continue;
        if (join > cutoff) continue;
        // months expected from join to cutoff
        const months = (cutoff.getFullYear() - join.getFullYear()) * 12
          + (cutoff.getMonth() - join.getMonth()) + 1;
        const expected = months * Number(mem.monthly_rate || 0);
        const paid = payments
          .filter((p) => p.member_id === mem.id && p.status !== 'rejected')
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
    (members as Member[]).forEach((m) => memberArea.set(m.id, (m.area || 'অজানা').trim() || 'অজানা'));
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

  // Per-area member breakdown for expandable details
  const areaMembers = useMemo(() => {
    const endMonth = reportYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const map = new Map<string, { id: string; code: string; name: string; phone: string; expected: number; paid: number; due: number; status: string }[]>();
    const list = activeOnly ? members.filter((m) => (m as any).is_active !== false) : members;
    for (const m of list) {
      const area = ((m as any).area ?? '').trim() || 'অজানা / Unspecified';
      if (!(m as any).joined_date) continue;
      const join = new Date((m as any).joined_date);
      if (isNaN(join.getTime())) continue;
      const startMonth = join.getFullYear() < reportYear ? 1 : (join.getFullYear() === reportYear ? join.getMonth() + 1 : 13);
      if (startMonth > 12) continue;
      const rate = Number((m as any).monthly_rate) || 0;
      let expected = 0, paid = 0;
      if (areaScope === 'month') {
        if (reportMonth < startMonth) continue;
        expected = rate;
        paid = payments
          .filter((p) => (p as any).member_id === m.id && (p as any).for_year === reportYear && (p as any).for_month === reportMonth)
          .reduce((s, p) => s + Number(p.amount), 0);
      } else {
        expected = rate * Math.max(0, endMonth - startMonth + 1);
        paid = payments
          .filter((p) => (p as any).member_id === m.id && (p as any).for_year === reportYear && (p as any).for_month >= startMonth && (p as any).for_month <= endMonth)
          .reduce((s, p) => s + Number(p.amount), 0);
      }
      const due = Math.max(0, expected - paid);
      const status = paid >= expected ? 'পরিশোধিত' : paid > 0 ? 'আংশিক' : 'বাকি';
      const arr: { id: string; code: string; name: string; phone: string; expected: number; paid: number; due: number; status: string }[] = map.get(area) ?? [];
      arr.push({ 
        id: String((m as any).id || ''), 
        code: String((m as any).member_code || ''), 
        name: String((m as any).full_name || 'অজানা'), 
        phone: String((m as any).phone || '-'), 
        expected: Number(expected) || 0, 
        paid: Number(paid) || 0, 
        due: Number(due) || 0, 
        status: String(status || '') 
      });
      map.set(area, arr);
    }
    // Sort members within each area by paid amount descending
    for (const [, arr] of map) arr.sort((a, b) => b.paid - a.paid);
    return map;
  }, [members, payments, reportYear, reportMonth, areaScope, activeOnly]);

  const downloadAreaPDF = async () => {
    setBusy(true);
    await downloadAreaReportPDF(members as any, payments as any, reportYear, {
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
    return payments.filter(p => (p.status === 'approved' || !p.status) && p.payment_date.startsWith(today)).reduce((s, p) => s + Number(p.amount), 0);
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
      const { error } = await supabase.from('payments').update({ status: 'approved', recorded_by: user?.id } as any).eq('id', id);
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
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'পেমেন্ট বাতিল করা হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const deletePayment = async (id: string) => {
    if (!confirm('এই পেমেন্টটি মুছে ফেলবেন?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'পেমেন্ট মুছে ফেলা হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('সতর্কতা: এই সদস্যকে মুছে ফেললে তার সকল পেমেন্ট রেকর্ডও মুছে যেতে পারে। আপনি কি নিশ্চিত?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'সদস্য মুছে ফেলা হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleMemberStatus = async (id: string, currentStatus: boolean) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_active: !currentStatus } as any)
        .eq('id', id);
      if (error) throw error;
      toast({ title: `সদস্য ${!currentStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে` });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('এই খরচটি মুছে ফেলবেন?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'খরচ মুছে ফেলা হয়েছে' });
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const updatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPayment) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const { error } = await supabase.from('payments').update({
        amount: Number(fd.amount),
        for_year: Number(fd.for_year),
        for_month: Number(fd.for_month),
        method: fd.method as any,
        transaction_ref: fd.transaction_ref as string,
        payment_date: fd.payment_date as string,
      } as any).eq('id', editingPayment.id);
      if (error) throw error;
      toast({ title: 'পেমেন্ট আপডেট হয়েছে' });
      setEditingPayment(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const updateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const { error } = await supabase.from('expenses').update({
        title: fd.title as string,
        amount: Number(fd.amount),
        expense_date: fd.expense_date as string,
        category: fd.category as string,
        approved_by: fd.approved_by as string,
        note: fd.note as string,
      } as any).eq('id', editingExpense.id);
      if (error) throw error;
      toast({ title: 'খরচ আপডেট হয়েছে' });
      setEditingExpense(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const updateMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const { error } = await supabase.from('members').update({
        full_name: fd.full_name as string,
        phone: fd.phone as string,
        area: fd.area as string,
        monthly_rate: Number(fd.monthly_rate),
        joined_date: fd.joined_date as string,
      } as any).eq('id', editingMember.id);
      if (error) throw error;
      toast({ title: 'সদস্য আপডেট হয়েছে' });
      setEditingMember(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = searchCode.trim().toLowerCase();
    const found = members.find((m) => 
      m.member_code.toLowerCase() === query || 
      (m.phone && m.phone.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')))
    );
    setSelectedMember(found ?? null);
    if (!found && searchCode) toast({ title: 'সদস্য পাওয়া যায়নি', variant: 'destructive' });
  };

  const submitPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedMemberId) return;
    const fd = new FormData(e.currentTarget);
    const amountPerMonth = Number(fd.get('amount'));
    const method = fd.get('method') as any;
    const transaction_ref = fd.get('transaction_ref') as string;
    const for_year = Number(fd.get('for_year') || currentYear);
    const payment_date = (fd.get('payment_date') as string) || new Date().toISOString().split('T')[0];

    if (selectedMonths.length === 0) {
      toast({ title: 'মাস নির্বাচন করুন', variant: 'destructive' });
      return;
    }

    // Duplicate check: warn if any selected month already has a payment
    const existingMonths = selectedMonths.filter(month =>
      payments.some(p => p.member_id === selectedMemberId && p.for_year === for_year && p.for_month === month && (p.status === 'approved' || p.status === 'pending' || !p.status))
    );
    if (existingMonths.length > 0) {
      const monthNames = existingMonths.map(m => BANGLA_MONTHS[m - 1]).join(', ');
      if (!window.confirm(`⚠️ ${monthNames} মাসে ইতিমধ্যে পেমেন্ট আছে। আবারও যোগ করতে চান?`)) return;
    }

    setBusy(true);
    try {
      const inserts = selectedMonths.map(month => ({
        member_id: selectedMemberId,
        amount: amountPerMonth,
        for_year,
        for_month: month,
        method,
        transaction_ref,
        payment_date,
        recorded_by: user?.id,
      }));

      const { error } = await supabase.from('payments').insert(inserts as any);
      if (error) throw error;

      toast({ title: `${toBanglaNumber(selectedMonths.length)} মাসের চাঁদা রেকর্ড হয়েছে ✓` });

      // Auto-download consolidated receipt
      const receiptMember = members.find(m => m.id === selectedMemberId);
      if (receiptMember) {
        try {
          await downloadConsolidatedReceiptPDF(
            receiptMember as any,
            selectedMonths.map(month => ({
              amount: amountPerMonth,
              for_year,
              for_month: month,
              payment_date,
              method,
              transaction_ref
            }))
          );
        } catch { /* receipt generation failure shouldn't block the flow */ }
      }

      (e.target as HTMLFormElement).reset();
      setSelectedMemberId("");
      setSelectedMonths([new Date().getMonth() + 1]);
      loadAll();
    } catch (err: any) {
      toast({ title: 'ব্যর্থ', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
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
    const { error } = await supabase.from('expenses').insert({ ...parsed.data, recorded_by: user?.id } as any);
    setBusy(false);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'খরচ রেকর্ড হয়েছে ✓' });
    (e.target as HTMLFormElement).reset();
    loadAll();
  };

  // Reports
  const downloadGeneralReport = async () => {
    setBusy(true);
    try {
      await downloadOrganizationStatementPDF(payments as any, expenses as any, reportYear, reportMonth);
      toast({ title: 'জেনারেল রিপোর্ট ডাউনলোড হয়েছে' });
    } catch (err: any) {
      console.error("General Report Error:", err);
      toast({ title: 'রিপোর্ট তৈরি ব্যর্থ', description: err.stack || err.message || String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const printAreaReport = async () => {
    setBusy(true);
    try {
      await downloadAreaReportPDF(members as any, payments as any, reportYear, {
        month: areaScope === 'month' ? reportMonth : undefined,
        activeOnly,
        filename: reportFilename || `area-report-${reportYear}`,
      });
      toast({ title: 'এলাকা রিপোর্ট ডাউনলোড হয়েছে' });
    } catch (err: any) {
      console.error("Area Report Error:", err);
      toast({ title: 'রিপোর্ট তৈরি ব্যর্থ', description: err.stack || err.message || String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

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

  const deleteTarget = async (id: string | undefined) => {
    if (!id) return;
    if (!confirm('এই লক্ষ্যমাত্রা মুছে ফেলবেন?')) return;
    const { error } = await supabase.from('monthly_targets').delete().eq('id', id);
    if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
    toast({ title: 'মুছে ফেলা হয়েছে' });
    loadAll();
  };

  const saveSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value } as any, { onConflict: 'key' });
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

  const downloadSampleMembersCsv = () => {
    const csv = 'full_name,member_code,phone,area,monthly_rate\nAbdul Karim,CDS-001,01700000000,Dhaka,100';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sample_members.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSamplePaymentsCsv = () => {
    const csv = 'member_code,amount,for_month,for_year,method,payment_date\nCDS-001,100,1,2026,cash,2026-01-15';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sample_payments.csv'; a.click();
    URL.revokeObjectURL(url);
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
      { key: 'settings', label: 'সেটিংস', icon: Settings },
      { key: 'audit', label: 'অডিট লগ', icon: Database }
    ] : []),
  ] as const;

  return (
    <div className={`min-h-screen pb-20 font-bengali transition-colors duration-500 ${isDark ? 'dark bg-neutral-950 text-neutral-100' : 'bg-background'}`}>
      <SEO
        title="অর্থব্যবস্থাপনা - চন্দনাইশ দরবার শরীফ"
        description="চন্দনাইশ দরবার শরীফ কমিটি ফান্ডের সম্পূর্ণ অর্থব্যবস্থাপনা ড্যাশবোর্ড। আয়-ব্যয় হিসাব, সদস্যদের বকেয়া, স্বচ্ছতা রিপোর্ট এবং PDF ডাউনলোড।"
      />
      {/* Ultra-Premium Hero Section with Framer Motion */}
      <div className="relative pt-24 pb-20 overflow-hidden bg-[#050505]">
        {/* Animated Background Elements */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          className="absolute inset-0 islamic-pattern scale-[2] pointer-events-none"
        />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
        
        {/* Floating Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-gold/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 blur-[100px] rounded-full animate-pulse-slow" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left"
            >
              {/* Icon with Glowing Multi-Layered Glass */}
              <div className="relative">
                <div className="absolute inset-0 bg-gold blur-3xl opacity-30 animate-pulse" />
                <div className="relative h-24 w-24 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.1)] backdrop-blur-2xl group transition-transform duration-500 hover:scale-110">
                  <div className="absolute inset-2 border border-gold/20 rounded-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                  <Wallet className="h-12 w-12 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-white">
                  অর্থ সংগ্রহ ও <span className="relative inline-block">
                    <span className="gold-text-shimmer">ব্যবস্থাপনা</span>
                    <motion.span 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="absolute bottom-2 left-0 h-1 bg-gradient-to-r from-gold to-transparent rounded-full"
                    />
                  </span>
                </h1>
                <div className="flex items-center gap-4 justify-center md:justify-start">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-[#050505] bg-gold/20 backdrop-blur-sm" />
                    ))}
                  </div>
                  <p className="font-bangla text-lg md:text-xl text-white/60 font-light tracking-[0.2em] uppercase">
                    চন্দনাইশ দরবার শরীফ <span className="text-gold/80 font-bold">কমিটি ফান্ড</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats / Actions */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center gap-6"
            >
              <div className="hidden md:flex flex-col items-end gap-1">
                <p className="text-[10px] text-gold/50 font-bold uppercase tracking-widest">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-emerald-500 text-xs font-mono font-bold tracking-wider uppercase">Live Connection</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.03] p-2 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                <Button 
                  onClick={() => setIsDark(!isDark)} 
                  variant="ghost" 
                  className="h-14 w-14 rounded-xl hover:bg-gold/10 hover:text-gold text-white/40 transition-all duration-500" 
                >
                  {isDark ? <Eye className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </Button>
                <div className="w-[1px] h-8 bg-white/10" />
                <Button 
                  onClick={loadAll} 
                  variant="ghost" 
                  className="h-14 w-14 rounded-xl hover:bg-gold/10 hover:text-gold text-white/40 transition-all duration-500" 
                >
                  <RefreshCcw className="h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tab pill bar - Re-designed for Premium Feel */}
        <div className="bg-card/40 border border-gold/10 rounded-2xl p-1.5 flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-2 mb-10 backdrop-blur-md shadow-inner relative group snap-x snap-mandatory">
          <div className="absolute inset-0 bg-gold/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            const disabled = t.key === 'admin' && !isStaff;
            if (disabled) return null;
            
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key as TabKey)}
                className={`flex-1 min-w-[120px] snap-center relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-heading text-sm font-semibold transition-all duration-300
                  ${isActive 
                    ? 'bg-gold-gradient text-primary-foreground shadow-lg shadow-gold/20 scale-[1.02]' 
                    : 'text-muted-foreground hover:bg-gold/5 hover:text-gold hover:translate-y-[-1px]'
                  }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gold-gradient rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="font-bangla">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* SUMMARY */}
        {tab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="md:col-span-2 card-gold rounded-2xl p-4 sm:p-6">
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

              <div className="space-y-6">
                <div className="card-gold rounded-2xl p-4 sm:p-6 flex flex-col">
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
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground font-bangla">নেট ক্যাশ ফ্লো</p>
                          <p className={`text-xl font-display mt-1 ${todayIncome - todayExpense >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                            ৳ {toBanglaNumber((todayIncome - todayExpense).toFixed(0))}
                          </p>
                        </div>
                        <TrendingUp className={`h-8 w-8 opacity-10 ${todayIncome - todayExpense >= 0 ? 'text-primary' : 'text-rose-600'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-gold rounded-2xl p-4 sm:p-6">
                  <h3 className="font-display text-sm gold-text mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> রিসেন্ট অ্যাক্টিভিটি
                  </h3>
                  <div className="space-y-3">
                    {auditLogs.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex gap-3 items-start text-[11px] border-l-2 border-primary/20 pl-3 py-0.5">
                        <div className="flex-1">
                          <p className="font-bangla leading-tight">{log.action}</p>
                          <p className="text-muted-foreground mt-0.5">{new Date(log.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4 font-bangla">কোনো লগ নেই</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-4 text-[11px] font-bangla h-7" onClick={() => setTab('audit')}>সব অডিট লগ →</Button>
                </div>
              </div>
            </div>

            {/* === Year trend (income/expense/cumulative balance) === */}
            <div className="card-gold rounded-2xl p-4 sm:p-6">
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
            <div className="card-gold rounded-2xl p-4 sm:p-6">
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
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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

              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
              const memberById = new Map<string, Member>(members.map((m) => [m.id, m]));
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
                    <div className="card-gold rounded-2xl p-4 sm:p-6">
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
                    <div className="card-gold rounded-2xl p-4 sm:p-6">
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
            <form onSubmit={handleSearch} className="card-gold rounded-2xl p-4 sm:p-6 max-w-2xl">
              <label className="font-bangla text-sm text-muted-foreground mb-2 block">সদস্য কোড বা মোবাইল নম্বর দিন</label>
              <div className="flex gap-2">
                <Input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="CDS-001 বা ০১৭..." className="font-mono" />
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

            <div className="card-gold rounded-2xl p-4 sm:p-6">
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
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
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 font-bangla">
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
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-foreground">{m.full_name}</p>
                          <p className="text-[10px] font-mono text-primary">{m.member_code}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.dueMonths >= 3 ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}`}>
                          {toBanglaNumber(m.dueMonths)} মাস
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 py-2 border-y border-primary/5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">বকেয়া</p>
                          <p className="text-sm font-bold text-rose-600">৳ {toBanglaNumber(m.dues.toFixed(0))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">জমা</p>
                          <p className="text-sm font-bold text-emerald-600">৳ {toBanglaNumber(m.totalPaid.toFixed(0))}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <p className="text-[10px] text-muted-foreground italic">{m.area || 'এলাকা নেই'}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] border-emerald-500/30 text-emerald-600"
                          onClick={() => {
                            const msg = `আসসালামু আলাইকুম ${m.full_name}, চন্দনাইশ দরবার শরীফ কমিটি ফান্ডে আপনার ${toBanglaNumber(m.dueMonths)} মাসের চাঁদা (৳${toBanglaNumber(m.dues.toFixed(0))}) বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ রইল।`;
                            window.open(`https://wa.me/88${m.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`);
                          }}
                        >
                          রিমাইন্ডার (WhatsApp)
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>

              {memberStats.filter(m => m.dues > 0).length === 0 && (
                <p className="py-8 text-center text-muted-foreground font-bangla">কোনো বকেয়া নেই 🎉</p>
              )}
            </div>
          </div>
        )}

        {/* TRANSPARENCY */}
        {tab === 'transparency' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
                      const total = payments.filter(p => (p.status === 'approved' || !p.status) && p.payment_date.startsWith(dayStr)).reduce((s, p) => s + Number(p.amount), 0);
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
              <div className="card-gold rounded-2xl p-4 sm:p-6">
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
                <div className="space-y-3">
                  <Button onClick={() => setSnapshotOpen(true)} className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bangla text-xs">
                    <Eye className="h-3.5 w-3.5 mr-2" /> পাবলিক ট্রান্সপারেন্সি স্ন্যাপশট
                  </Button>
                  <Button onClick={() => downloadOrganizationStatementPDF(payments as any, expenses as any, reportYear, reportMonth)} className="w-full bg-primary text-primary-foreground font-bangla text-xs">
                    <ReceiptText className="h-3.5 w-3.5 mr-2" /> ব্যাংক স্টেটমেন্ট (PDF)
                  </Button>
                </div>
              </div>

              {/* Member Comparison */}
              <div className="card-gold rounded-2xl p-4 sm:p-6 md:col-span-2">
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
                
                {/* Collection Trend Chart */}
                <div className="mt-12">
                  <h4 className="font-display text-md gold-text mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> মাসিক কালেকশন ট্রেন্ড ({toBanglaNumber(reportYear)})
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1;
                        const income = payments.filter(p => p.for_year === reportYear && p.for_month === m && (p.status === 'approved' || !p.status)).reduce((s, p) => s + Number(p.amount), 0);
                        return { name: BANGLA_MONTHS[i], collection: income };
                      })}>
                        <defs>
                          <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="collection" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCol)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RANKING */}
        {tab === 'ranking' && (
          <div className="space-y-6">
            <div className="card-gold rounded-2xl p-4 sm:p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-display text-lg gold-text">শীর্ষ দাতা র‍্যাঙ্কিং 🏆</h3>
                <Button onClick={downloadAreaRanking} size="sm" variant="outline" className="h-8 font-bangla border-primary/40">
                  <Download className="h-4 w-4 mr-1" /> র‍্যাঙ্কিং PDF
                </Button>
              </div>
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">র‍্যাঙ্ক</th><th>কোড</th><th>নাম</th><th className="text-right">মোট জমা</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {memberStats.slice().sort((a, b) => (b.totalPaid || 0) - (a.totalPaid || 0)).slice(0, 20).map((m, i) => (
                    <tr key={m.id || i} className="border-b border-border/40">
                      <td className="py-2 font-bold gold-text">#{toBanglaNumber(i + 1)}</td>
                      <td className="font-mono text-primary">{m.member_code || 'N/A'}</td>
                      <td>{m.full_name || 'অজানা'}</td>
                      <td className="text-right text-primary font-semibold">৳ {toBanglaNumber((m.totalPaid || 0).toFixed(0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-gold rounded-2xl p-4 sm:p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="font-display text-lg gold-text flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> এলাকা ভিত্তিক চাঁদা হিসাব 🌍
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={areaScope} onValueChange={(v) => setAreaScope(v as any)}>
                    <SelectTrigger className="h-8 w-32 font-bangla"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">বার্ষিক হিসাব</SelectItem>
                      <SelectItem value="month">মাসিক হিসাব</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={downloadAreaRanking} disabled={busy} size="sm" className="bg-gradient-gold text-primary-foreground font-bangla">
                    <Download className="h-3.5 w-3.5 mr-1" /> র‍্যাঙ্কিং PDF
                  </Button>
                  <Button onClick={downloadAreaPDF} disabled={busy} size="sm" variant="outline" className="font-bangla border-primary/40 text-primary">
                    <FileText className="h-3.5 w-3.5 mr-1" /> বিস্তারিত PDF
                  </Button>
                </div>
              </div>

              <p className="font-bangla text-xs text-muted-foreground mb-3">
                {areaScope === 'year'
                  ? `📅 ${toBanglaNumber(reportYear)} সালের বার্ষিক হিসাব — ক্লিক করে সদস্যদের তথ্য দেখুন`
                  : `📅 ${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)} — মাসিক হিসাব`}
              </p>

              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                    <th className="py-2">র‍্যাঙ্ক</th><th>এলাকা</th><th className="text-right">সদস্য</th>
                    <th className="text-right">প্রত্যাশিত</th><th className="text-right">সংগ্রহ</th>
                    <th className="text-right">বকেয়া</th><th className="text-right">% অর্জন</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {areaSummaries.map((a, i) => (
                    <React.Fragment key={`area-frag-${a.area || i}`}>
                      <tr
                        className={`border-b border-border/40 cursor-pointer transition-colors hover:bg-primary/5 ${expandedArea === a.area ? 'bg-primary/10' : ''}`}
                        onClick={() => setExpandedArea(expandedArea === a.area ? null : a.area)}
                      >
                        <td className="py-2 font-bold gold-text">#{toBanglaNumber(i + 1)}</td>
                        <td className="flex items-center gap-1">
                          <span className={`transition-transform inline-block ${expandedArea === a.area ? 'rotate-90' : ''}`}>▶</span>
                          {a.area}
                        </td>
                        <td className="text-right">{toBanglaNumber(a.members)}</td>
                        <td className="text-right text-muted-foreground">৳ {toBanglaNumber((a.expected || 0).toFixed(0))}</td>
                        <td className="text-right text-primary font-semibold">৳ {toBanglaNumber((a.paid || 0).toFixed(0))}</td>
                        <td className="text-right text-destructive">{(a.due || 0) > 0 ? `৳ ${toBanglaNumber((a.due || 0).toFixed(0))}` : '—'}</td>
                        <td className="text-right">
                          {a.expected > 0 ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (a.paid / a.expected) >= 1 ? 'bg-emerald-500/20 text-emerald-500' :
                              (a.paid / a.expected) >= 0.5 ? 'bg-amber-500/20 text-amber-500' :
                              'bg-rose-500/20 text-rose-500'
                            }`}>
                              {toBanglaNumber(Math.round((a.paid / a.expected) * 100))}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                      {expandedArea === a.area && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="bg-background/60 border-l-4 border-primary/40 my-1 mx-2 rounded-lg overflow-hidden">
                              <table className="w-full text-xs whitespace-nowrap">
                                <thead>
                                  <tr className="bg-primary/10 text-muted-foreground font-bangla">
                                    <th className="py-1.5 px-3 text-left">কোড</th>
                                    <th className="py-1.5 px-3 text-left">নাম</th>
                                    <th className="py-1.5 px-3 text-left">ফোন</th>
                                    <th className="py-1.5 px-3 text-right">প্রত্যাশিত</th>
                                    <th className="py-1.5 px-3 text-right">জমা</th>
                                    <th className="py-1.5 px-3 text-right">বকেয়া</th>
                                    <th className="py-1.5 px-3 text-center">অবস্থা</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(areaMembers.get(a.area) ?? []).map((m, mi) => (
                                    <tr key={`member-${m.id || m.code || mi}`} className="border-b border-border/20 hover:bg-primary/5">
                                      <td className="py-1.5 px-3 font-mono text-primary">{m.code}</td>
                                      <td className="py-1.5 px-3">{m.name}</td>
                                      <td className="py-1.5 px-3 text-muted-foreground">{m.phone}</td>
                                      <td className="py-1.5 px-3 text-right">৳ {toBanglaNumber((m.expected || 0).toFixed(0))}</td>
                                      <td className="py-1.5 px-3 text-right text-primary font-semibold">৳ {toBanglaNumber((m.paid || 0).toFixed(0))}</td>
                                      <td className="py-1.5 px-3 text-right text-destructive">{(m.due || 0) > 0 ? `৳ ${toBanglaNumber((m.due || 0).toFixed(0))}` : '—'}</td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          m.status === 'পরিশোধিত' ? 'bg-emerald-500/20 text-emerald-500' :
                                          m.status === 'আংশিক' ? 'bg-amber-500/20 text-amber-500' :
                                          'bg-rose-500/20 text-rose-500'
                                        }`}>
                                          {m.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {(areaMembers.get(a.area) ?? []).length === 0 && (
                                    <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">কোনো সদস্য নেই</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {areaSummaries.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">কোনো তথ্য নেই।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {tab === 'admin' && isStaff && (
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
              <div className="card-gold rounded-2xl p-4 sm:p-6 mb-6 border-amber-500/30">
                <h3 className="font-display text-lg text-amber-600 flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5" /> অনুমোদনহীন পেমেন্ট ({toBanglaNumber(pendingPayments.length)} টি)
                </h3>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto rounded-lg">
                  <table className="w-full text-sm font-bangla whitespace-nowrap">
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 font-bangla">
                  {pendingPayments.map((p) => (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-foreground">{p.members?.full_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{p.members?.member_code}</p>
                        </div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase">{p.method}</p>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-y border-amber-500/10">
                        <p className="text-xs">{BANGLA_MONTHS[p.for_month - 1]} {toBanglaNumber(p.for_year)}</p>
                        <p className="text-lg font-black text-amber-600">৳ {toBanglaNumber(p.amount)}</p>
                      </div>

                      {p.transaction_ref && (
                        <p className="text-[10px] font-mono text-muted-foreground truncate">Trx: {p.transaction_ref}</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button onClick={() => approvePayment(p.id)} className="flex-1 h-9 bg-emerald-600 text-white text-xs">Approve</Button>
                        <Button onClick={() => rejectPayment(p.id)} variant="destructive" className="flex-1 h-9 text-xs">Reject</Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== সদস্য ব্যবস্থাপনা / Member Management ===== */}
            <div className="card-gold rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="font-display text-lg gold-text flex items-center gap-2">
                  <UserSearch className="h-5 w-5" /> সদস্য ব্যবস্থাপনা (Member Management)
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="সদস্য খুঁজুন..." 
                      className="pl-9 h-9 w-48 text-xs font-bangla"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setQuickMemberOpen(true)} size="sm" className="h-9 bg-primary text-primary-foreground font-bangla">
                    <Plus className="h-4 w-4 mr-1" /> নতুন সদস্য
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-border/40 relative">
                <table className="w-full text-sm font-bangla whitespace-nowrap">
                  <thead className="bg-muted text-left sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2 px-3">কোড</th>
                      <th className="px-3">নাম</th>
                      <th className="px-3">ফোন</th>
                      <th className="px-3">এলাকা</th>
                      <th className="px-3">অবস্থা</th>
                      <th className="px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members
                      .filter(m => 
                        m.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        (m.member_code || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        (m.phone || '').includes(memberSearchQuery) ||
                        (m.area || '').toLowerCase().includes(memberSearchQuery.toLowerCase())
                      )
                      .slice()
                      .sort((a, b) => (a.member_code || '').localeCompare(b.member_code || ''))
                      .map((m) => (
                        <tr key={m.id} className="border-t border-border/40 hover:bg-primary/5 transition-colors">
                        <td className="py-2 px-3 font-mono text-primary">{m.member_code}</td>
                        <td className="px-3 font-semibold">{m.full_name}</td>
                        <td className="px-3 text-muted-foreground">{m.phone || '-'}</td>
                        <td className="px-3 text-[12px]">{m.area || '-'}</td>
                        <td className="px-3">
                          <button 
                            onClick={() => toggleMemberStatus(m.id, !!m.is_active)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                            }`}
                          >
                            {m.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </button>
                        </td>
                        <td className="px-3">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => {
                                setSelectedMember(m);
                                setTab('personal');
                              }}
                              title="বিস্তারিত দেখুন"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-blue-600 hover:bg-blue-500/10"
                              onClick={() => setEditingMember(m)}
                              title="এডিট করুন"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                              onClick={() => deleteMember(m.id)}
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== Bulk CSV Upload ===== */}
            <div className="card-gold rounded-2xl p-4 sm:p-6 bg-primary/5 border-primary/20">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5" /> বাল্ক সিএসভি আপলোড (Bulk CSV Upload)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bangla">সদস্য তালিকা (CSV)</Label>
                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={downloadSampleMembersCsv}>
                      <Download className="h-3 w-3 mr-1"/> টেমপ্লেট ডাউনলোড
                    </Button>
                  </div>
                  <Input type="file" accept=".csv" onChange={(e) => handleBulkUpload(e, 'members')} className="h-9 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Headers: full_name, member_code, phone, area, monthly_rate</p>
                </div>
                <div className="space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bangla">পেমেন্ট হিস্ট্রি (CSV)</Label>
                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px]" onClick={downloadSamplePaymentsCsv}>
                      <Download className="h-3 w-3 mr-1"/> টেমপ্লেট ডাউনলোড
                    </Button>
                  </div>
                  <Input type="file" accept=".csv" onChange={(e) => handleBulkUpload(e, 'payments')} className="h-9 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Headers: member_code, amount, for_month, for_year, method, payment_date</p>
                </div>
              </div>
            </div>

            {/* Org-wide Monthly + Annual chanda PDF reports            {/* ===== এলাকা ভিত্তিক চাঁদা PDF ===== */}
            <div className="card-gold rounded-2xl p-4 sm:p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h3 className="font-display text-lg gold-text flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> এলাকা ভিত্তিক চাঁদা PDF
                  </h3>
                  <p className="font-bangla text-sm text-muted-foreground mt-1">
                    সদস্যদের এলাকা (area) ফিল্ড অনুযায়ী গ্রুপ করে রিপোর্ট।
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
                <table className="w-full text-sm font-bangla whitespace-nowrap">
                  <thead className="bg-muted/40 text-left"><tr>
                    <th className="py-2 px-3">এলাকা</th>
                    <th className="text-right px-3">সদস্য</th>
                    <th className="text-right px-3">প্রত্যাশিত</th>
                    <th className="text-right px-3">জমা</th>
                    <th className="text-right px-3">বকেয়া</th>
                    <th className="text-right px-3">% সংগ্রহ</th>
                    <th className="text-right px-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {areaSummaries.map((a) => (
                      <tr key={a.area} className="border-t border-border/40">
                        <td className="py-2 px-3">{a.area}</td>
                        <td className="text-right px-3">{toBanglaNumber(a.members)}</td>
                        <td className="text-right px-3">৳ {toBanglaNumber(a.expected.toFixed(0))}</td>
                        <td className="text-right px-3 text-emerald-600 font-bold">৳ {toBanglaNumber(a.paid.toFixed(0))}</td>
                        <td className="text-right px-3 text-rose-600">৳ {toBanglaNumber(a.due.toFixed(0))}</td>
                        <td className="text-right px-3">{a.expected > 0 ? `${Math.round((a.paid / a.expected) * 100)}%` : '—'}</td>
                        <td className="px-3">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-primary"
                            onClick={() => downloadAreaReportPDF(members as any, payments as any, reportYear, {
                              month: areaScope === 'month' ? reportMonth : undefined,
                              activeOnly,
                              area: a.area,
                              filename: `collection-${a.area}-${reportYear}`
                            })}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={downloadAreaPDF} className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-bangla text-xs">
                  <Download className="h-4 w-4 mr-1" /> এলাকা রিপোর্ট PDF
                </Button>
                <Button onClick={downloadAreaRanking} variant="outline" className="font-bangla text-xs border-primary/20">
                  <Trophy className="h-4 w-4 mr-1" /> র‍্যাঙ্কিং রিপোর্ট
                </Button>
              </div>
            </div>

            {/* ===== লক্ষ্যমাত্রা / Targets ===== */}
            <div className="card-gold rounded-2xl p-4 sm:p-6">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <Target className="h-5 w-5" /> লক্ষ্যমাত্রা ও সেটিংস
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <ProgressCard label={`${toBanglaNumber(reportYear)} বার্ষিক অর্জন`} current={yearIncome} target={yearTargetTotal || Number(settings.default_annual_target || 0)} />
                <ProgressCard label={`${BANGLA_MONTHS[reportMonth - 1]} ${toBanglaNumber(reportYear)} মাসিক অর্জন`} current={monthIncome} target={Number(monthTargetRow?.target_amount || 0)} />
                <div className="rounded-xl border border-primary/20 bg-background/40 p-4">
                  <p className="font-bangla text-xs text-muted-foreground">নেট ব্যালেন্স ({toBanglaNumber(reportYear)})</p>
                  <p className={`font-display text-2xl mt-1 ${yearBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>৳ {toBanglaNumber(yearBalance.toFixed(0))}</p>
                  <p className="font-bangla text-[11px] text-muted-foreground mt-1">আয় ৳ {toBanglaNumber(yearIncome.toFixed(0))} − খরচ ৳ {toBanglaNumber(yearExpense.toFixed(0))}</p>
                </div>
              </div>
              <form onSubmit={saveMonthlyTarget} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end mb-4">
                <div className="col-span-1"><label className="font-bangla text-xs text-muted-foreground">বছর</label><Input name="for_year" type="number" value={targetFormYear} onChange={(e) => setTargetFormYear(Number(e.target.value))} required className="h-9" /></div>
                <div className="col-span-1"><label className="font-bangla text-xs text-muted-foreground">মাস</label>
                  <Select name="for_month" value={targetFormMonth} onValueChange={setTargetFormMonth} required>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{BANGLA_MONTHS.map((mn, i) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1"><label className="font-bangla text-xs text-muted-foreground">লক্ষ্যমাত্রা (৳)</label><Input name="target_amount" type="number" min="0" value={targetFormAmount} onChange={(e) => setTargetFormAmount(e.target.value)} required className="h-9" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="font-bangla text-xs text-muted-foreground">নোট</label><Input name="note" value={targetFormNote} onChange={(e) => setTargetFormNote(e.target.value)} className="h-9" /></div>
                <Button disabled={busy} className="bg-gradient-gold text-primary-foreground font-bangla h-9 col-span-2 sm:col-span-1"><Save className="h-4 w-4 mr-1" /> সেভ</Button>
              </form>

              {/* Monthly Targets Grid for Selected Year */}
              <div className="mt-6 pt-6 border-t border-primary/10">
                <h4 className="font-bangla text-sm font-semibold gold-text mb-3">
                  📅 {toBanglaNumber(targetFormYear)} সালের সকল মাসের লক্ষ্যমাত্রা
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 font-bangla">
                  {BANGLA_MONTHS.map((mn, idx) => {
                    const mNum = idx + 1;
                    const tgt = targets.find(t => t.for_year === targetFormYear && t.for_month === mNum);
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border text-center transition-all ${
                          tgt 
                            ? 'bg-gold/5 border-gold/30 hover:border-gold/60' 
                            : 'bg-background/40 border-primary/10 hover:border-primary/30'
                        }`}
                      >
                        <p className="text-xs text-muted-foreground font-semibold">{mn}</p>
                        <p className="text-sm font-bold mt-1 text-foreground">
                          {tgt ? `৳ ${toBanglaNumber(tgt.target_amount)}` : 'সেট করা নেই'}
                        </p>
                        {tgt?.note && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={tgt.note}>
                            {tgt.note}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 mt-2 text-[10px] text-gold hover:text-gold-light hover:bg-gold/10 w-full"
                          onClick={() => {
                            setTargetFormMonth(String(mNum));
                            setTargetFormAmount(tgt ? String(tgt.target_amount) : "");
                            setTargetFormNote(tgt?.note || "");
                            // Focus on target_amount input
                            const input = document.querySelector('input[name="target_amount"]') as HTMLInputElement;
                            if (input) {
                              input.focus();
                              input.select();
                            }
                          }}
                        >
                          {tgt ? 'এডিট করুন' : 'সেট করুন'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===== Expense category breakdown ===== */}
            <div className="card-gold rounded-2xl p-4 sm:p-6">
              <h3 className="font-display text-lg gold-text flex items-center gap-2 mb-4">
                <PieIcon className="h-5 w-5" /> খরচ বিভাগ অনুযায়ী ({toBanglaNumber(reportYear)})
              </h3>
              {expenseByCategory.length === 0 ? (
                <p className="font-bangla text-center text-muted-foreground py-6">এই বছরের কোনো খরচ নেই</p>
              ) : (
                <div className="space-y-3">
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
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* চাঁদা এন্ট্রি */}
              <form onSubmit={submitPayment} className="card-gold rounded-2xl p-4 sm:p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Wallet className="h-24 w-24" />
                </div>

                <div className="bg-orange-950/30 border border-orange-700/40 rounded-xl p-4 flex gap-3 text-sm">
                  <AlertOctagon className="h-5 w-5 text-orange-400 shrink-0" />
                  <div className="font-bangla">
                    <p className="font-bold text-orange-400">চাঁদার নিয়মাবলী:</p>
                    <p className="text-white/60 text-xs">প্রতি মাসের ১০ তারিখের মধ্যে চাঁদা জমা দেয়া বাঞ্ছনীয়।</p>
                  </div>
                </div>

                <h3 className="font-display text-xl gold-text flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" /> চাঁদা সংগ্রহ (Collection)
                </h3>

                {selectedMemberId && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gold/10 border border-gold/20 rounded-2xl p-4 shadow-inner"
                  >
                    {(() => {
                      const m = memberStats.find(ms => ms.id === selectedMemberId);
                      if (!m) return null;
                      return (
                        <div className="space-y-3 font-bangla">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <p className="text-[10px] text-gold/60 uppercase font-bold tracking-wider">বর্তমান বকেয়া</p>
                              <p className="text-2xl font-black text-rose-500">৳ {toBanglaNumber(m.dues.toFixed(0))}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-[10px] text-gold/60 uppercase font-bold tracking-wider">বকেয়া মাস</p>
                              <p className="text-2xl font-black text-amber-500">{toBanglaNumber(m.dueMonths)} মাস</p>
                            </div>
                          </div>
                          {m.dues > 0 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 mt-2 font-bangla"
                              onClick={() => {
                                const dueRows = m.rows.filter(r => r.year === reportYear && r.status !== 'paid');
                                if (dueRows.length > 0) {
                                  setSelectedMonths(dueRows.map(r => r.month));
                                  const input = document.querySelector('input[name="amount"]') as HTMLInputElement;
                                  if (input) {
                                    input.value = String(m.monthly_rate);
                                  }
                                  toast({ title: 'বকেয়া মাস এবং মাসিক হার স্বয়ংক্রিয়ভাবে সিলেক্ট করা হয়েছে ✓' });
                                } else {
                                  // If no dues in this reportYear, look for any other years or select all due months overall
                                  const allDueRows = m.rows.filter(r => r.status !== 'paid');
                                  if (allDueRows.length > 0) {
                                    setSelectedMonths(allDueRows.filter(r => r.year === reportYear || r.year === new Date().getFullYear()).map(r => r.month));
                                    const input = document.querySelector('input[name="amount"]') as HTMLInputElement;
                                    if (input) {
                                      input.value = String(m.monthly_rate);
                                    }
                                    toast({ title: 'বকেয়া মাস এবং মাসিক হার স্বয়ংক্রিয়ভাবে সিলেক্ট করা হয়েছে ✓' });
                                  } else {
                                    toast({ title: 'কোনো বকেয়া মাস নেই', description: 'এই সদস্যের সব চাঁদা পরিশোধিত আছে।' });
                                  }
                                }
                              }}
                            >
                              বকেয়া মাস ও পরিমাণ স্বয়ংক্রিয় সিলেক্ট করুন ⚡
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_50px] gap-2 items-end">
                    <div className="relative">
                      <Label className="text-xs font-bangla text-muted-foreground mb-1.5 block">সদস্য নির্বাচন করুন *</Label>
                      <input type="hidden" name="member_id" value={selectedMemberId} />
                      <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={memberSearchOpen}
                            className="w-full justify-between font-bangla font-normal h-12 px-3 bg-background/50 border-gold/20"
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
                                    value={`${m.member_code} ${m.full_name} ${m.phone || ''}`}
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
                                    <div className="flex flex-col">
                                      <span>{m.member_code} — {m.full_name}</span>
                                      <span className="text-[10px] text-muted-foreground">{m.phone} | {m.area}</span>
                                    </div>
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
                      variant="outline" 
                      className="h-12 w-full border-gold/20 bg-gold/5 text-gold hover:bg-gold/10"
                      onClick={() => setQuickMemberOpen(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bangla text-muted-foreground block">পরিমাণ (৳) *</Label>
                    <Input name="amount" type="number" placeholder="৳ ০.০০" required className="h-12 text-lg font-bold bg-background/50 border-gold/20" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[50, 100, 500, 1000].map(amt => (
                    <Button 
                      key={amt} 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[11px] font-bangla border-primary/20"
                      onClick={(e) => {
                        const input = (e.currentTarget.closest('form')?.querySelector('input[name="amount"]') as HTMLInputElement);
                        if (input) input.value = String(amt);
                      }}
                    >
                      ৳ {toBanglaNumber(amt)}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] text-muted-foreground font-bangla">মাসসমূহ নির্বাচন করুন (Multi-month)</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                        className="text-[10px] text-gold hover:underline font-bangla"
                      >
                        সব মাস
                      </button>
                      <span className="text-[10px] text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([])}
                        className="text-[10px] text-gold hover:underline font-bangla"
                      >
                        সব মুছুন
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-primary/10 bg-background/40">
                    {BANGLA_MONTHS.map((mn, i) => {
                      const mNum = i + 1;
                      const isSelected = selectedMonths.includes(mNum);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (isSelected) setSelectedMonths(selectedMonths.filter(m => m !== mNum));
                            else setSelectedMonths([...selectedMonths, mNum].sort((a, b) => a - b));
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bangla transition-all border ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                              : 'bg-background border-border hover:border-primary/40'
                          }`}
                        >
                          {mn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bangla text-muted-foreground">পদ্ধতি</Label>
                    <Select name="method" defaultValue="cash" required>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="rocket">Rocket</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bangla text-muted-foreground">তারিখ</Label>
                    <Input name="payment_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-10" />
                  </div>
                </div>

                <Input name="transaction_ref" placeholder="TrxID / রেফারেন্স (ঐচ্ছিক)" className="h-10" />

                <Button disabled={busy} className="w-full bg-gradient-gold text-primary-foreground font-bangla h-12 shadow-lg shadow-gold/20">
                  <Save className="h-4 w-4 mr-2" /> {busy ? 'অপেক্ষা...' : 'সেভ ও রশিদ ডাউনলোড'}
                </Button>
              </form>

              {/* খরচ এন্ট্রি */}
              <form onSubmit={submitExpense} className="card-gold rounded-2xl p-4 sm:p-6 space-y-6">
                <h3 className="font-display text-lg text-rose-500 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" /> খরচ এন্ট্রি (Expense)
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bangla text-muted-foreground">টাইটেল *</Label>
                    <Input name="title" placeholder="খরচের কারণ..." required className="h-10" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bangla text-muted-foreground">পরিমাণ *</Label>
                      <Input name="amount" type="number" placeholder="৳ ০.০০" required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bangla text-muted-foreground">তারিখ *</Label>
                      <Input name="expense_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bangla text-muted-foreground">বিভাগ</Label>
                      <Select name="category" defaultValue="অন্যান্য">
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="আপ্যায়ন">আপ্যায়ন</SelectItem>
                          <SelectItem value="যাতায়াত">যাতায়াত</SelectItem>
                          <SelectItem value="অনুষ্ঠান">অনুষ্ঠান</SelectItem>
                          <SelectItem value="মেরামত">মেরামত</SelectItem>
                          <SelectItem value="অন্যান্য">অন্যান্য</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bangla text-muted-foreground">অনুমোদনকারী</Label>
                      <Input name="approved_by" placeholder="নাম..." className="h-10" />
                    </div>
                  </div>
                </div>

                <Button disabled={busy} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bangla h-12">
                  <Plus className="h-4 w-4 mr-2" /> খরচ রেকর্ড করুন
                </Button>
              </form>
            </div>

            {/* Recent Financial Records */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {/* Recent Payments */}
              <div className="card-gold rounded-2xl p-4 sm:p-6">
                <h3 className="font-display text-lg gold-text mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> সাম্প্রতিক চাঁদা জমা
                </h3>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm font-bangla whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/40 text-left text-muted-foreground">
                        <th className="py-2">সদস্য</th>
                        <th className="py-2 text-right">পরিমাণ</th>
                        <th className="py-2 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 8).map((p) => (
                        <tr key={p.id} className="border-b border-border/20 last:border-0 hover:bg-primary/5 transition-colors">
                          <td className="py-3">
                            <div className="font-semibold">{(p as any).members?.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {BANGLA_MONTHS[p.for_month - 1]} {toBanglaNumber(p.for_year)} • {p.method}
                            </div>
                          </td>
                          <td className="text-right font-bold">৳ {toBanglaNumber(p.amount)}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setEditingPayment(p)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deletePayment(p.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 font-bangla">
                  {payments.slice(0, 8).map((p) => (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-bold">{(p as any).members?.full_name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{BANGLA_MONTHS[p.for_month - 1]} • {p.method}</p>
                        <p className="text-sm font-black text-emerald-600 mt-1">৳ {toBanglaNumber(p.amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setEditingPayment(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deletePayment(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="card-gold rounded-2xl p-4 sm:p-6">
                <h3 className="font-display text-lg text-rose-500 mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" /> সাম্প্রতিক খরচ
                </h3>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm font-bangla whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border/40 text-left text-muted-foreground">
                        <th className="py-2">টাইটেল</th>
                        <th className="py-2 text-right">পরিমাণ</th>
                        <th className="py-2 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 8).map((e) => (
                        <tr key={e.id} className="border-b border-border/20 last:border-0 hover:bg-rose-500/5 transition-colors">
                          <td className="py-3">
                            <div className="font-semibold">{e.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(e.expense_date).toLocaleDateString('bn-BD')} • {e.category}
                            </div>
                          </td>
                          <td className="text-right font-bold text-rose-600">৳ {toBanglaNumber(e.amount)}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setEditingExpense(e)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteExpense(e.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 font-bangla">
                  {expenses.slice(0, 8).map((e) => (
                    <motion.div 
                      key={e.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-bold">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{new Date(e.expense_date).toLocaleDateString('bn-BD')} • {e.category}</p>
                        <p className="text-sm font-black text-rose-600 mt-1">৳ {toBanglaNumber(e.amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setEditingExpense(e)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOGS */}
        {tab === 'audit' && (
          <div className="card-gold rounded-2xl p-4 sm:p-6">
            <h3 className="font-display text-lg gold-text mb-4">অডিট লগ (সাম্প্রতিক ১০০টি রেকর্ড)</h3>
            <div className="overflow-x-auto rounded-lg border border-primary/20">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground bg-primary/5">
                    <th className="py-3 px-4">সময়</th>
                    <th className="py-3 px-4">কর্তা</th>
                    <th className="py-3 px-4">অ্যাকশন</th>
                    <th className="py-3 px-4">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="font-bangla">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                      <td className="py-3 px-4 text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('bn-BD', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium">{log.actor_name || 'System'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === 'INSERT' ? 'bg-emerald-500/20 text-emerald-500' :
                          log.action === 'UPDATE' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-rose-500/20 text-rose-500'
                        }`}>
                          {log.action === 'INSERT' ? 'যোগ' : log.action === 'UPDATE' ? 'আপডেট' : 'মুছে ফেলা'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[12px]">{log.summary || log.table_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && isStaff && (
          <div className="space-y-6">
            <div className="card-gold rounded-2xl p-6">
              <h2 className="text-xl font-heading font-bold gold-text mb-6 flex items-center gap-2">
                <Settings className="h-5 w-5" /> সিস্টেম সেটিংস
              </h2>
              <div className="grid md:grid-cols-2 gap-8 font-bangla">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">নোটিশ শিরোনাম</Label>
                    <Input defaultValue={settings.global_notice_title} onBlur={(e) => saveSetting('global_notice_title', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">নোটিশ বার্তা</Label>
                    <Textarea defaultValue={settings.global_notice_message} onBlur={(e) => saveSetting('global_notice_message', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">লাল বার নোটিশ টেক্সট</Label>
                    <Input defaultValue={settings.global_notice_text} onBlur={(e) => saveSetting('global_notice_text', e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-gold/10">
                    <div>
                      <Label className="text-xs font-bold text-rose-500">লাল বার (নোটিশ) দেখান</Label>
                      <p className="text-[10px] text-muted-foreground">এটি অফ করলে উপরের লাল বারটি চলে যাবে</p>
                    </div>
                    <Switch checked={settings.show_maintenance_banner === 'true'} onCheckedChange={(v) => saveSetting('show_maintenance_banner', String(v))} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-gold/10">
                    <div>
                      <p className="font-bold text-rose-500">মেইনটেইনেন্স মোড</p>
                      <p className="text-[10px] text-muted-foreground">চালু থাকলে সাধারণ ভিজিটর ঢুকতে পারবে না</p>
                    </div>
                    <Switch checked={settings.maintenance_mode === 'true'} onCheckedChange={(v) => saveSetting('maintenance_mode', String(v))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">মেইনটেন্যান্স মোড বার্তা (স্ক্রিনে যা দেখাবে)</Label>
                    <Textarea defaultValue={settings.maintenance_text} onBlur={(e) => saveSetting('maintenance_text', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl font-bangla">
          <DialogHeader>
            <DialogTitle className="gold-text">রিপোর্ট প্রিভিউ</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <PreviewBlock
              members={previewKind === 'monthly' ? previewMonthlyTotals.members : previewAnnualTotals.members}
              expected={previewKind === 'monthly' ? previewMonthlyTotals.expected : previewAnnualTotals.expected}
              paid={previewKind === 'monthly' ? previewMonthlyTotals.paid : previewAnnualTotals.paid}
              due={previewKind === 'monthly' ? previewMonthlyTotals.due : previewAnnualTotals.due}
              statusRows={[]}
              statusLabel=""
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>বাতিল</Button>
              <Button onClick={confirmDownloadFromPreview} className="bg-gradient-gold text-primary-foreground font-bold">ডাউনলোড PDF</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quickMemberOpen} onOpenChange={setQuickMemberOpen}>
        <DialogContent className="max-w-md font-bangla">
          <DialogHeader>
            <DialogTitle className="gold-text">নতুন সদস্য যোগ করুন</DialogTitle>
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
              joined_date: fd.joined_date || new Date().toISOString().split('T')[0],
            } as any).select().single();
            setBusy(false);
            if (error) return toast({ title: 'ব্যর্থ', description: error.message, variant: 'destructive' });
            toast({ title: 'সদস্য যোগ হয়েছে' });
            setQuickMemberOpen(false);
            loadAll();
            if (data) setSelectedMemberId(data.id);
          }} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">নাম *</Label><Input name="full_name" required /></div>
              <div className="space-y-1.5"><Label className="text-xs">কোড *</Label><Input name="member_code" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">ফোন</Label><Input name="phone" /></div>
              <div className="space-y-1.5"><Label className="text-xs">এলাকা</Label><Input name="area" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">মাসিক চাঁদা</Label><Input name="monthly_rate" type="number" defaultValue={500} /></div>
              <div className="space-y-1.5"><Label className="text-xs">যোগদানের তারিখ</Label><Input name="joined_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            </div>
            <Button disabled={busy} className="w-full bg-gradient-gold text-primary-foreground font-bold h-11">সদস্য নিশ্চিত করুন</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent className="sm:max-w-md font-bangla">
          <DialogHeader>
            <DialogTitle className="gold-text flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> স্বচ্ছতা স্ন্যাপশট</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground">মোট সংগ্রহ</p>
                <p className="text-xl font-display gold-text">৳ {toBanglaNumber(totalIncome.toFixed(0))}</p>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-[10px] text-muted-foreground">মোট ব্যয়</p>
                <p className="text-xl font-display text-rose-500">৳ {toBanglaNumber(totalExpense.toFixed(0))}</p>
              </div>
            </div>
            <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[10px] text-muted-foreground">বর্তমান ব্যালেন্স</p>
              <p className="text-3xl font-display text-emerald-600">৳ {toBanglaNumber(balance.toFixed(0))}</p>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setSnapshotOpen(false)} className="w-full bg-gradient-gold text-primary-foreground">বন্ধ করুন</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialogs */}
      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent className="max-w-md font-bangla">
          <DialogHeader><DialogTitle>পেমেন্ট এডিট</DialogTitle></DialogHeader>
          {editingPayment && (
            <form onSubmit={updatePayment} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">পরিমাণ</Label><Input name="amount" type="number" defaultValue={editingPayment.amount} required /></div>
                <div className="space-y-1.5"><Label className="text-xs">তারিখ</Label><Input name="payment_date" type="date" defaultValue={editingPayment.payment_date} required /></div>
              </div>
              <Button disabled={busy} className="w-full bg-gradient-gold text-primary-foreground">পরিবর্তন সেভ করুন</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-md font-bangla">
          <DialogHeader><DialogTitle>খরচ এডিট</DialogTitle></DialogHeader>
          {editingExpense && (
            <form onSubmit={updateExpense} className="space-y-4 pt-4">
              <div className="space-y-1.5"><Label className="text-xs">টাইটেল</Label><Input name="title" defaultValue={editingExpense.title} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">পরিমাণ</Label><Input name="amount" type="number" defaultValue={editingExpense.amount} required /></div>
                <div className="space-y-1.5"><Label className="text-xs">তারিখ</Label><Input name="expense_date" type="date" defaultValue={editingExpense.expense_date} required /></div>
              </div>
              <Button disabled={busy} className="w-full bg-rose-600 text-white">পরিবর্তন সেভ করুন</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md font-bangla">
          <DialogHeader><DialogTitle>সদস্য এডিট</DialogTitle></DialogHeader>
          {editingMember && (
            <form onSubmit={updateMember} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">নাম *</Label><Input name="full_name" defaultValue={editingMember.full_name} required /></div>
                <div className="space-y-1.5"><Label className="text-xs">ফোন</Label><Input name="phone" defaultValue={editingMember.phone} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">এলাকা</Label><Input name="area" defaultValue={editingMember.area} /></div>
                <div className="space-y-1.5"><Label className="text-xs">মাসিক চাঁদা</Label><Input name="monthly_rate" type="number" defaultValue={editingMember.monthly_rate} required /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">যোগদানের তারিখ</Label><Input name="joined_date" type="date" defaultValue={editingMember.joined_date} required /></div>
              <Button disabled={busy} className="w-full bg-blue-600 text-white">সদস্য তথ্য আপডেট করুন</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone = 'gold' }: { icon: React.ReactNode; label: string; value: string; tone?: 'gold' | 'danger' }) => (
  <div className="card-gold rounded-2xl p-5">
    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${tone === 'danger' ? 'bg-rose-500/15 text-rose-500' : 'bg-primary/15 text-primary'}`}>
      {icon}
    </div>
    <p className="font-bangla text-xs text-muted-foreground">{label}</p>
    <p className={`font-display text-xl mt-1 ${tone === 'danger' ? 'text-rose-500' : 'gold-text'}`}>{value}</p>
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
      <div className="card-gold rounded-2xl p-4 sm:p-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-primary">{member.member_code}</p>
          <h3 className="font-display text-2xl gold-text mt-1">{member.full_name}</h3>
          <p className="font-bangla text-sm text-muted-foreground mt-1">
            যোগদান: {member.joined_date} • মাসিক ৳ {toBanglaNumber(member.monthly_rate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadMemberBankStatementPDF(member, memPays)} className="font-bangla border-primary/20 hover:bg-primary/10">
            <ReceiptText className="h-4 w-4 mr-1" /> ব্যাংক স্টেটমেন্ট
          </Button>
          <Button onClick={() => downloadAnnualStatementPDF(member, memPays)} className="bg-gradient-gold text-primary-foreground font-bangla">
            <Download className="h-4 w-4 mr-1" /> বার্ষিক PDF
          </Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="মোট জমা" value={`৳ ${toBanglaNumber(stats.totalPaid.toFixed(0))}`} />
        <StatCard icon={<AlertOctagon className="h-5 w-5" />} label={`বকেয়া (${toBanglaNumber(stats.dueMonths)} মাস)`} value={`৳ ${toBanglaNumber(stats.dues.toFixed(0))}`} tone="danger" />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="প্রত্যাশিত মোট" value={`৳ ${toBanglaNumber(stats.totalExpected.toFixed(0))}`} />
      </div>
      <div className="card-gold rounded-2xl p-4 sm:p-6 overflow-x-auto">
        <h3 className="font-display text-lg gold-text mb-4">মাসিক বিবরণী</h3>
        <table className="w-full text-sm whitespace-nowrap">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
