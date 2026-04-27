import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toBanglaNumber } from '@/lib/bangla';
import { monthName } from '@/lib/months';
import { computeMemberDues } from '@/lib/dues';
import { downloadAnnualStatementPDF, formatBDT } from '@/lib/statement';
import { ArrowLeft, Download, Phone, MapPin, Calendar, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MemberProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase.from('members').select('*').eq('id', id).maybeSingle(),
        supabase.from('payments').select('*').eq('member_id', id).order('payment_date', { ascending: false }),
      ]);
      setMember(m);
      setPayments(p ?? []);
      setLoading(false);
    })();
  }, [id]);

  const dues = useMemo(() => {
    if (!member) return null;
    return computeMemberDues(member, payments.map((p) => ({
      member_id: p.member_id, amount: Number(p.amount), for_year: p.for_year, for_month: p.for_month,
    })));
  }, [member, payments]);

  const yearlyPayments = useMemo(
    () => payments.filter((p) => p.for_year === year),
    [payments, year],
  );

  const yearTotal = yearlyPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    payments.forEach((p) => ys.add(p.for_year));
    return Array.from(ys).sort((a, b) => b - a);
  }, [payments]);

  const handleDownload = async () => {
    if (!member) return;
    try {
      await downloadAnnualStatementPDF(member, payments, year);
      toast({ title: 'PDF ডাউনলোড হয়েছে' });
    } catch (e: unknown) {
      toast({ title: 'PDF তৈরি ব্যর্থ', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  if (!id) return <Navigate to="/member-search" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 font-bengali">
      <SEO title="সদস্য প্রোফাইল - চন্দনাইশ দরবার শরীফ" description="সদস্যের বিস্তারিত প্রোফাইল ও পেমেন্ট ইতিহাস" />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/member-search" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> ফিরে যান
        </Link>

        {loading ? (
          <Card><CardContent className="py-12 text-center font-bangla text-muted-foreground">লোড হচ্ছে...</CardContent></Card>
        ) : !member ? (
          <Card><CardContent className="py-12 text-center font-bangla text-muted-foreground">সদস্য পাওয়া যায়নি</CardContent></Card>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-heading font-bold text-gold">{member.full_name}</h1>
              <p className="text-muted-foreground font-bangla">সদস্য কোড: {member.member_code}</p>
            </div>

            {/* Identity card */}
            <Card className="mb-6">
              <CardContent className="pt-6 grid sm:grid-cols-2 gap-3 text-sm">
                {member.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="font-bangla">{member.phone}</span></div>
                )}
                {member.area && (
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="font-bangla">{member.area}</span></div>
                )}
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="font-bangla">যোগদান: {member.joined_date}</span></div>
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /><span className="font-bangla">মাসিক চাঁদা: {toBanglaNumber(member.monthly_rate)} টাকা</span></div>
                {member.address && (
                  <div className="sm:col-span-2 text-muted-foreground font-bangla">{member.address}</div>
                )}
                <div>
                  {member.is_active
                    ? <Badge variant="secondary" className="font-bangla">সক্রিয়</Badge>
                    : <Badge variant="outline" className="font-bangla">নিষ্ক্রিয়</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Dues summary */}
            {dues && (
              <div className="grid sm:grid-cols-4 gap-3 mb-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bangla text-muted-foreground">প্রত্যাশিত মোট</CardTitle></CardHeader>
                  <CardContent className="text-xl font-bold">{formatBDT(dues.expectedTotal)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bangla text-muted-foreground">প্রদত্ত মোট</CardTitle></CardHeader>
                  <CardContent className="text-xl font-bold text-green-600">{formatBDT(dues.paidTotal)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bangla text-muted-foreground">বকেয়া</CardTitle></CardHeader>
                  <CardContent className={`text-xl font-bold ${dues.dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatBDT(dues.dueAmount)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bangla text-muted-foreground">বকেয়া মাস</CardTitle></CardHeader>
                  <CardContent className={`text-xl font-bold ${dues.monthsBehind > 0 ? 'text-destructive' : 'text-green-600'} font-bangla`}>
                    {toBanglaNumber(dues.monthsBehind)} মাস
                  </CardContent>
                </Card>
              </div>
            )}

            {dues && dues.dueAmount > 0 && dues.oldestUnpaid && (
              <div className="mb-6 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="font-bangla text-sm">
                  <p className="font-semibold text-destructive">বকেয়া রয়েছে</p>
                  <p className="text-muted-foreground">
                    সবচেয়ে পুরোনো অপ্রদত্ত মাস: {monthName(dues.oldestUnpaid.month)} {toBanglaNumber(dues.oldestUnpaid.year)}
                  </p>
                </div>
              </div>
            )}

            {/* Year filter + PDF */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
              <div className="flex gap-2 items-center">
                <span className="text-sm font-bangla text-muted-foreground">বছর:</span>
                <select
                  className="border rounded-md px-2 py-1 text-sm bg-background"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                >
                  {years.map((y) => <option key={y} value={y}>{toBanglaNumber(y)}</option>)}
                </select>
                <span className="text-sm font-bangla text-muted-foreground ml-2">
                  মোট: <span className="font-semibold text-foreground">{formatBDT(yearTotal)}</span> ({toBanglaNumber(yearlyPayments.length)} টি)
                </span>
              </div>
              <Button onClick={handleDownload} variant="default" size="sm" className="font-bangla">
                <Download className="h-4 w-4 mr-1" /> বার্ষিক স্টেটমেন্ট PDF
              </Button>
            </div>

            <Card>
              <CardHeader><CardTitle className="font-bangla text-base">পেমেন্ট ইতিহাস ({toBanglaNumber(year)})</CardTitle></CardHeader>
              <CardContent>
                {yearlyPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-bangla py-4 text-center">এই বছরে কোন পেমেন্ট নেই</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-bangla">তারিখ</th>
                          <th className="py-2 pr-3 font-bangla">মাস</th>
                          <th className="py-2 pr-3 font-bangla">পরিমাণ</th>
                          <th className="py-2 pr-3 font-bangla">পদ্ধতি</th>
                          <th className="py-2 pr-3 font-bangla">রেফারেন্স</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyPayments.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{p.payment_date}</td>
                            <td className="py-2 pr-3 font-bangla">{monthName(p.for_month)} {toBanglaNumber(p.for_year)}</td>
                            <td className="py-2 pr-3 font-medium">{formatBDT(Number(p.amount))}</td>
                            <td className="py-2 pr-3 font-bangla">{p.method}</td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground">{p.transaction_ref || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Month-by-month status */}
            {dues && (
              <Card className="mt-6">
                <CardHeader><CardTitle className="font-bangla text-base">মাসিক স্ট্যাটাস ({toBanglaNumber(year)})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const paid = yearlyPayments
                        .filter((p) => p.for_month === m)
                        .reduce((s, p) => s + Number(p.amount || 0), 0);
                      const rate = Number(member.monthly_rate) || 0;
                      const isPaid = paid >= rate && rate > 0;
                      const isPartial = paid > 0 && paid < rate;
                      return (
                        <div key={m} className={`rounded-md border p-2 text-xs ${
                          isPaid ? 'border-green-500/40 bg-green-500/5' :
                          isPartial ? 'border-yellow-500/40 bg-yellow-500/5' :
                          'border-muted bg-muted/20'
                        }`}>
                          <div className="font-bangla font-medium flex items-center justify-between">
                            <span>{monthName(m)}</span>
                            {isPaid && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                          </div>
                          <div className={`font-bangla ${isPaid ? 'text-green-600' : isPartial ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {paid > 0 ? formatBDT(paid) : 'অপ্রদত্ত'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MemberProfile;
