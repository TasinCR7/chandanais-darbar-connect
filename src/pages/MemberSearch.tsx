import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toBanglaNumber } from '@/lib/bangla';
import { monthName } from '@/lib/months';
import { Search, Download, AlertCircle, CheckCircle2, Wallet, FileText, Printer, FlaskConical, User } from 'lucide-react';
import { buildMonthlyStatement, downloadAnnualStatementPDF, calculateDues } from '@/lib/statement';
import { toast } from '@/hooks/use-toast';

interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string | null;
  joined_date: string;
  monthly_rate: number;
  is_active: boolean;
}

interface Payment {
  id: string;
  amount: number;
  for_year: number;
  for_month: number;
  payment_date: string;
  method: string;
  transaction_ref: string | null;
}

type SortKey = 'due-desc' | 'due-asc' | 'month-desc';

const STORAGE_KEY = 'member-search-prefs-v1';

const readPrefs = () => {
  try {
    const url = new URLSearchParams(window.location.search);
    const ls = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      year: Number(url.get('year') || ls.year || new Date().getFullYear()),
      sortKey: (url.get('sort') || ls.sortKey || 'due-desc') as SortKey,
      statusFilter: (url.get('status') || ls.statusFilter || 'all') as 'all' | 'paid' | 'partial' | 'due',
      code: url.get('code') || ls.code || '',
    };
  } catch {
    return { year: new Date().getFullYear(), sortKey: 'due-desc' as SortKey, statusFilter: 'all' as const, code: '' };
  }
};

const MemberSearch = () => {
  const initial = typeof window !== 'undefined' ? readPrefs() : { year: new Date().getFullYear(), sortKey: 'due-desc' as SortKey, statusFilter: 'all' as const, code: '' };
  const [code, setCode] = useState(initial.code);
  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [year, setYear] = useState<number>(initial.year);
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'due'>(initial.statusFilter);

  // Persist prefs to localStorage + URL whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ year, sortKey, statusFilter, code }));
      const url = new URL(window.location.href);
      url.searchParams.set('year', String(year));
      url.searchParams.set('sort', sortKey);
      url.searchParams.set('status', statusFilter);
      if (code) url.searchParams.set('code', code); else url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  }, [year, sortKey, statusFilter, code]);

  // Auto-search if code came from URL/localStorage
  useEffect(() => {
    if (initial.code && !searched) {
      void search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setSearched(true);
    const { data: m } = await supabase
      .rpc('search_member', { p_code: code.trim() })
      .maybeSingle();
    setMember(m as Member | null);
    if (m) {
      const { data: p } = await supabase
        .rpc('get_member_payments', { p_member_id: m.id });
      setPayments((p as Payment[]) ?? []);
    } else {
      setPayments([]);
    }
    setBusy(false);
  };

  const stats = member ? calculateDues(member, payments) : null;

  const monthly = useMemo(() => {
    if (!member) return [];
    const all = buildMonthlyStatement(member, payments);
    const filtered = statusFilter === 'all' ? all : all.filter((r) => r.status === statusFilter);
    return filtered.slice().sort((a, b) => {
      if (sortKey === 'due-desc') return (b.expected - b.paid) - (a.expected - a.paid);
      if (sortKey === 'due-asc') return (a.expected - a.paid) - (b.expected - b.paid);
      return (b.year - a.year) || (b.month - a.month);
    });
  }, [member, payments, sortKey, statusFilter]);

  const handleDownload = async () => {
    if (!member) return;
    try {
      await downloadAnnualStatementPDF(member, payments, year);
      toast({ title: 'PDF ডাউনলোড শুরু হয়েছে', description: `বছর: ${year} • সদস্য: ${member.member_code}` });
    } catch (err: unknown) {
      toast({ title: 'ত্রুটি', description: err.message, variant: 'destructive' });
    }
  };

  const handlePrint = () => window.print();

  /** PDF self-test: verifies row count, year filter, totals match expectation. */
  const handleSelfTest = () => {
    if (!member) return;
    const expected = Number(member.monthly_rate);
    const yearPayments = payments.filter((p) => p.for_year === year);
    const totalPaid = yearPayments.reduce((s, p) => s + Number(p.amount), 0);
    const yearExpected = expected * 12;
    const issues: string[] = [];

    // 1. month coverage
    const monthsCovered = new Set(yearPayments.map((p) => p.for_month));
    monthsCovered.forEach((m) => {
      if (m < 1 || m > 12) issues.push(`Invalid month: ${m}`);
    });

    // 2. year filter integrity
    const wrongYear = payments.filter((p) => p.for_year === year && (p.for_year !== year));
    if (wrongYear.length) issues.push(`Year filter broken: ${wrongYear.length}`);

    // 3. monthly rate sanity
    if (expected <= 0) issues.push('Monthly rate is zero/negative');

    const summary = [
      `✓ বছর: ${year}`,
      `✓ মোট ১২ মাসের সারি: 12`,
      `✓ Expected: BDT ${yearExpected}`,
      `✓ Paid (${year} এ): BDT ${totalPaid}`,
      `✓ Payment count: ${yearPayments.length}`,
      `✓ Months with payment: ${monthsCovered.size}`,
      issues.length ? `✗ Issues: ${issues.join(', ')}` : `✓ সব check pass`,
    ].join('\n');

    toast({
      title: issues.length ? 'টেস্ট: ইস্যু পাওয়া গেছে' : 'টেস্ট: সফল ✓',
      description: summary,
      variant: issues.length ? 'destructive' : 'default',
    });
    console.table({
      year, member: member.member_code, expected, totalPaid, yearExpected,
      paymentCount: yearPayments.length, monthsCovered: monthsCovered.size, issues,
    });
  };

  const years = member
    ? Array.from(
        new Set([
          ...payments.map((p) => p.for_year),
          new Date().getFullYear(),
          new Date(member.joined_date).getFullYear(),
        ]),
      ).sort((a, b) => b - a)
    : [];

  const statusBadge = (status: 'paid' | 'partial' | 'due') => {
    const map = {
      paid: 'bg-green-500/15 text-green-600 border-green-500/30',
      partial: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
      due: 'bg-red-500/15 text-red-600 border-red-500/30',
    };
    const label = { paid: 'পরিশোধিত', partial: 'আংশিক', due: 'বাকি' }[status];
    return (
      <span className={`text-xs px-2 py-1 rounded border font-bangla ${map[status]}`}>
        {label}
      </span>
    );
  };

  const rowBg = (status: 'paid' | 'partial' | 'due') => {
    if (status === 'paid') return 'bg-green-500/5';
    if (status === 'partial') return 'bg-yellow-500/5';
    return 'bg-red-500/5';
  };

  return (
    <div className="min-h-screen bg-background pb-20 font-bengali">
      <SEO
        title="সদস্য তালাশ - চন্দনাইশ দরবার শরীফ"
        description="আপনার সদস্য কোড লিখে চাঁদার পূর্ণ বিবরণী দেখুন। লগইন প্রয়োজন নেই।"
      />
      {/* Print-only styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          #print-area .pr-card { border: 1px solid #ccc !important; background: white !important; box-shadow: none !important; page-break-inside: avoid; break-inside: avoid; }
          #print-area table { width: 100%; border-collapse: collapse; }
          #print-area thead { display: table-header-group; }
          #print-area tfoot { display: table-footer-group; }
          #print-area tr { page-break-inside: avoid; break-inside: avoid; }
          #print-area th, #print-area td { border: 1px solid #ddd; padding: 6px 8px; }
          #print-area .pr-paid { background: #e7f5ec !important; color: #16753d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .pr-partial { background: #fdf3d6 !important; color: #a06800 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .pr-due { background: #fde2e2 !important; color: #b41818 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-area .print-cover { display: block !important; page-break-after: avoid; }
          #print-area .print-recon { background: #f7f1e2 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <header className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gold-gradient opacity-10" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <p className="font-arabic text-gold text-2xl mb-4">بَحث العُضو</p>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-cream mb-4">সদস্য <span className="text-gold">তালাশ</span></h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">আপনার সদস্য কোড লিখে চাঁদার পূর্ণ বিবরণী দেখুন — login প্রয়োজন নেই</p>
        </div>
      </header>

      <section className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">

          <form onSubmit={search} className="card-gold rounded-2xl p-6 mt-8 max-w-2xl mx-auto no-print">
            <label className="font-bangla text-sm text-muted-foreground mb-2 block">
              সদস্য কোড দিন (যেমন: M-001 / CDS-001)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="M-001"
                className="font-mono text-lg"
                autoFocus
              />
              <Button
                type="submit"
                disabled={busy}
                className="bg-gradient-gold text-primary-foreground font-bangla shrink-0 w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-1" /> {busy ? 'খুঁজছি...' : 'খুঁজুন'}
              </Button>
            </div>
          </form>

          {searched && !busy && !member && (
            <div className="card-gold rounded-2xl p-8 mt-6 text-center max-w-2xl mx-auto no-print">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="font-bangla">এই কোড দিয়ে কোনো সদস্য পাওয়া যায়নি</p>
            </div>
          )}

          {member && stats && (
            <div id="print-area">
              {/* Print header — visible only when printing */}
              <div className="hidden print:block print-cover mb-4 border-b-2 pb-3" style={{ borderColor: '#b48e49' }}>
                <h1 className="text-2xl font-bold">Chandanaish Darbar Sharif</h1>
                <p className="text-sm">Annual Statement — {year}</p>
                <p className="text-xs">Generated: {new Date().toLocaleString()}</p>
              </div>

              {/* Member card */}
              <div className="card-gold pr-card rounded-2xl p-6 mt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-primary">{member.member_code}</p>
                    <h3 className="font-display text-2xl gold-text mt-1">{member.full_name}</h3>
                    <p className="font-bangla text-sm text-muted-foreground mt-1">
                      যোগদান: {member.joined_date} • মাসিক ৳ {toBanglaNumber(member.monthly_rate)}
                      {member.phone ? ` • 📞 ${member.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="bg-background border border-primary/30 rounded-md px-2 py-1.5 text-sm font-bangla"
                    >
                      {years.map((y) => <option key={y} value={y}>{toBanglaNumber(y)}</option>)}
                    </select>
                    <Button onClick={handleDownload} size="sm" className="bg-gradient-gold text-primary-foreground font-bangla">
                      <Download className="h-4 w-4 mr-1" /> বার্ষিক PDF
                    </Button>
                    <Button onClick={handlePrint} size="sm" variant="outline" className="font-bangla">
                      <Printer className="h-4 w-4 mr-1" /> প্রিন্ট
                    </Button>
                    <Button asChild size="sm" variant="outline" className="font-bangla">
                      <Link to={`/member/${member.id}`}><User className="h-4 w-4 mr-1" /> প্রোফাইল</Link>
                    </Button>
                    <Button onClick={handleSelfTest} size="sm" variant="ghost" className="font-bangla">
                      <FlaskConical className="h-4 w-4 mr-1" /> টেস্ট
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                <div className="card-gold pr-card rounded-2xl p-5">
                  <Wallet className="h-6 w-6 text-primary mb-2 no-print" />
                  <p className="font-bangla text-xs text-muted-foreground">মোট জমা</p>
                  <p className="font-display text-2xl gold-text">৳ {toBanglaNumber(stats.totalPaid.toFixed(0))}</p>
                </div>
                <div className="card-gold pr-card rounded-2xl p-5">
                  <AlertCircle className="h-6 w-6 text-destructive mb-2 no-print" />
                  <p className="font-bangla text-xs text-muted-foreground">বকেয়া</p>
                  <p className="font-display text-2xl text-destructive">৳ {toBanglaNumber(stats.dues.toFixed(0))}</p>
                  <p className="font-bangla text-xs text-muted-foreground mt-1">
                    {toBanglaNumber(stats.dueMonths)} মাস বাকি
                  </p>
                </div>
                <div className="card-gold pr-card rounded-2xl p-5">
                  <CheckCircle2 className="h-6 w-6 text-primary mb-2 no-print" />
                  <p className="font-bangla text-xs text-muted-foreground">প্রত্যাশিত মোট</p>
                  <p className="font-display text-2xl gold-text">৳ {toBanglaNumber(stats.totalExpected.toFixed(0))}</p>
                </div>
              </div>

              {/* Sort + filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-6 no-print">
                <h3 className="font-display text-lg gold-text flex items-center gap-2">
                  <FileText className="h-5 w-5" /> মাসিক বিবরণী
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-background border border-primary/30 rounded-md px-2 py-1.5 text-xs font-bangla"
                  >
                    <option value="all">সব স্ট্যাটাস</option>
                    <option value="due">শুধু বাকি</option>
                    <option value="partial">শুধু আংশিক</option>
                    <option value="paid">শুধু পরিশোধিত</option>
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="bg-background border border-primary/30 rounded-md px-2 py-1.5 text-xs font-bangla"
                  >
                    <option value="due-desc">বকেয়া (বেশি → কম)</option>
                    <option value="due-asc">বকেয়া (কম → বেশি)</option>
                    <option value="month-desc">মাস (নতুন → পুরাতন)</option>
                  </select>
                </div>
              </div>

              {/* Monthly table */}
              <div className="card-gold pr-card rounded-2xl p-6 mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary/20 text-left font-bangla text-muted-foreground">
                        <th className="py-2 px-2">মাস / বছর</th>
                        <th className="py-2 px-2 text-right">প্রত্যাশিত</th>
                        <th className="py-2 px-2 text-right">পরিশোধিত</th>
                        <th className="py-2 px-2 text-right">বকেয়া</th>
                        <th className="py-2 px-2">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="font-bangla">
                      {monthly.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">কোনো রেকর্ড নেই</td></tr>
                      )}
                      {monthly.map((r) => {
                        const due = Math.max(0, r.expected - r.paid);
                        const prClass = r.status === 'paid' ? 'pr-paid' : r.status === 'partial' ? 'pr-partial' : 'pr-due';
                        return (
                          <tr key={`${r.year}-${r.month}`} className={`border-b border-border/50 ${rowBg(r.status)} ${prClass}`}>
                            <td className="py-2 px-2">{monthName(r.month)} {toBanglaNumber(r.year)}</td>
                            <td className="py-2 px-2 text-right">৳ {toBanglaNumber(r.expected)}</td>
                            <td className="py-2 px-2 text-right text-primary">৳ {toBanglaNumber(r.paid)}</td>
                            <td className={`py-2 px-2 text-right font-semibold ${due > 0 ? 'text-destructive' : 'text-green-600'}`}>৳ {toBanglaNumber(due)}</td>
                            <td className="py-2 px-2">{statusBadge(r.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {monthly.length > 0 && (() => {
                      const tExp = monthly.reduce((s, r) => s + r.expected, 0);
                      const tPaid = monthly.reduce((s, r) => s + r.paid, 0);
                      const tDue = Math.max(0, tExp - tPaid);
                      return (
                        <tfoot className="font-bangla">
                          <tr className="print-recon border-t-2 border-primary/40 bg-primary/10">
                            <td className="py-3 px-2 font-semibold">
                              পুনঃমিলন (Reconciliation) — {toBanglaNumber(monthly.length)} মাস
                            </td>
                            <td className="py-3 px-2 text-right font-bold">৳ {toBanglaNumber(tExp)}</td>
                            <td className="py-3 px-2 text-right font-bold text-primary">৳ {toBanglaNumber(tPaid)}</td>
                            <td className={`py-3 px-2 text-right font-bold ${tDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                              ৳ {toBanglaNumber(tDue)}
                            </td>
                            <td className="py-3 px-2 text-xs">
                              {tDue === 0 ? '✓ সম্পূর্ণ পরিশোধিত' : `ব্যালেন্স বাকি`}
                            </td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
                {/* Quick legend below table */}
                <div className="mt-3 text-xs font-bangla text-muted-foreground flex flex-wrap gap-3 no-print">
                  <span><span className="inline-block w-3 h-3 rounded-sm bg-green-500/40 mr-1 align-middle" />পরিশোধিত = প্রত্যাশিত ≤ পরিশোধিত</span>
                  <span><span className="inline-block w-3 h-3 rounded-sm bg-yellow-500/40 mr-1 align-middle" />আংশিক = কিছু জমা হয়েছে কিন্তু পূর্ণ নয়</span>
                  <span><span className="inline-block w-3 h-3 rounded-sm bg-red-500/40 mr-1 align-middle" />বাকি = কোনো জমা নেই</span>
                </div>
              </div>

              <p className="hidden print:block text-xs mt-4 text-center" style={{ color: '#666' }}>
                Member Code: {member.member_code} — এই কোড দিয়ে অনলাইনে যাচাই করুন
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MemberSearch;
