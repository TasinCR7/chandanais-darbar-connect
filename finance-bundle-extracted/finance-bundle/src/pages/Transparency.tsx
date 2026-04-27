import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { SectionHeader } from '@/components/SectionHeader';
import { supabase } from '@/integrations/supabase/client';
import { toBanglaNumber } from '@/lib/bangla';
import { monthName } from '@/lib/months';
import { TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react';

const Transparency = () => {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [chart, setChart] = useState<{ label: string; income: number; expense: number }[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [paysRes, expRes, memRes] = await Promise.all([
        supabase.from('payments').select('amount, for_year, for_month, payment_date, method, members(full_name, member_code)').order('payment_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const pays = paysRes.data ?? [];
      const exps = expRes.data ?? [];

      setIncome(pays.reduce((s: number, p: any) => s + Number(p.amount), 0));
      setExpense(exps.reduce((s: number, e: any) => s + Number(e.amount), 0));
      setMemberCount(memRes.count ?? 0);
      setRecentPayments(pays.slice(0, 8));
      setRecentExpenses(exps.slice(0, 8));

      // Last 6 months chart
      const now = new Date();
      const buckets: Record<string, { income: number; expense: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        buckets[k] = { income: 0, expense: 0 };
      }
      pays.forEach((p: any) => {
        const d = new Date(p.payment_date);
        const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (buckets[k]) buckets[k].income += Number(p.amount);
      });
      exps.forEach((e: any) => {
        const d = new Date(e.expense_date);
        const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (buckets[k]) buckets[k].expense += Number(e.amount);
      });
      setChart(
        Object.entries(buckets).map(([k, v]) => {
          const [, m] = k.split('-');
          return { label: monthName(Number(m)).slice(0, 3), income: v.income, expense: v.expense };
        }),
      );
    })();
  }, []);

  const balance = income - expense;

  return (
    <Layout>
      <section className="py-12 md:py-16">
        <div className="container max-w-6xl">
          <SectionHeader
            arabic="الشَّفَافِيَّة"
            title="স্বচ্ছতা ও হিসাব"
            subtitle="দরবারের সব আয় ও খরচ এখানে উন্মুক্ত — যে কেউ দেখতে পারবেন"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            <div className="card-gold rounded-2xl p-5">
              <TrendingUp className="h-6 w-6 text-primary mb-2" />
              <p className="font-bangla text-xs text-muted-foreground">মোট আয়</p>
              <p className="font-display text-xl gold-text mt-1">৳ {toBanglaNumber(income.toFixed(0))}</p>
            </div>
            <div className="card-gold rounded-2xl p-5">
              <TrendingDown className="h-6 w-6 text-destructive mb-2" />
              <p className="font-bangla text-xs text-muted-foreground">মোট খরচ</p>
              <p className="font-display text-xl text-destructive mt-1">৳ {toBanglaNumber(expense.toFixed(0))}</p>
            </div>
            <div className="card-gold rounded-2xl p-5">
              <Wallet className="h-6 w-6 text-primary mb-2" />
              <p className="font-bangla text-xs text-muted-foreground">বর্তমান ব্যালেন্স</p>
              <p className={`font-display text-xl mt-1 ${balance >= 0 ? 'gold-text' : 'text-destructive'}`}>
                ৳ {toBanglaNumber(balance.toFixed(0))}
              </p>
            </div>
            <div className="card-gold rounded-2xl p-5">
              <Users className="h-6 w-6 text-primary mb-2" />
              <p className="font-bangla text-xs text-muted-foreground">সক্রিয় সদস্য</p>
              <p className="font-display text-xl gold-text mt-1">{toBanglaNumber(memberCount)}</p>
            </div>
          </div>

          <div className="card-gold rounded-2xl p-6 mt-8">
            <h3 className="font-display text-lg gold-text mb-4">গত ৬ মাসের আয়-ব্যয়</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" style={{ fontFamily: 'Noto Sans Bengali' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--primary) / 0.3)' }} />
                  <Bar dataKey="income" fill="hsl(var(--primary))" name="আয়" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="খরচ" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text mb-4">সাম্প্রতিক জমা</h3>
              {recentPayments.length === 0 ? (
                <p className="font-bangla text-muted-foreground text-center py-4">কোনো রেকর্ড নেই</p>
              ) : (
                <ul className="space-y-2 font-bangla text-sm">
                  {recentPayments.map((p, i) => (
                    <li key={i} className="flex justify-between border-b border-border/50 pb-2">
                      <span>
                        {p.members?.full_name ?? '-'} ({p.members?.member_code})
                        <span className="block text-xs text-muted-foreground">{monthName(p.for_month)} {toBanglaNumber(p.for_year)}</span>
                      </span>
                      <span className="text-primary font-medium">৳ {toBanglaNumber(Number(p.amount).toFixed(0))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card-gold rounded-2xl p-6">
              <h3 className="font-display text-lg gold-text mb-4">সাম্প্রতিক খরচ</h3>
              {recentExpenses.length === 0 ? (
                <p className="font-bangla text-muted-foreground text-center py-4">কোনো রেকর্ড নেই</p>
              ) : (
                <ul className="space-y-2 font-bangla text-sm">
                  {recentExpenses.map((e: any) => (
                    <li key={e.id} className="flex justify-between border-b border-border/50 pb-2">
                      <span>
                        {e.title}
                        <span className="block text-xs text-muted-foreground">{e.expense_date} • {e.category ?? 'সাধারণ'}</span>
                      </span>
                      <span className="text-destructive font-medium">৳ {toBanglaNumber(Number(e.amount).toFixed(0))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Transparency;
