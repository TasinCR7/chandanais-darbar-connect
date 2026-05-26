import React from 'react';
import { format } from 'date-fns';
import type { InvoiceData } from '@/components/DonationInvoiceTemplate';
import { toBanglaNumber } from '@/lib/bangla';

interface DonationReportProps {
  donations: InvoiceData[];
  totalAmount: number;
  periodLabel?: string;
}

const SHAHJADAS = [
  { id: "boro", name: "বড় শাহজাদা" },
  { id: "mej", name: "মেজ শাহজাদা" },
  { id: "sej", name: "সেজ শাহজাদা" },
  { id: "choto", name: "ছোট শাহজাদা" },
];

export const DonationReportTemplate = React.forwardRef<HTMLDivElement, DonationReportProps>(({ donations, totalAmount, periodLabel }, ref) => {
  // Calculate specific totals
  const mosqueTotal = donations
    .filter(d => d.donation_category === 'mosque')
    .reduce((sum, d) => sum + d.amount, 0);
  
  const combinedShahjadasTotal = donations
    .filter(d => d.donation_category === 'combined_shahjadas')
    .reduce((sum, d) => sum + d.amount, 0);
    
  // Split the combined amount 4 ways
  const perShahjadaCombined = Math.floor(combinedShahjadasTotal / 4);
  
  // Calculate specific shahjada totals
  const specificShahjadaTotals = SHAHJADAS.map(s => {
    const total = donations
      .filter(d => d.donation_category === 'specific_shahjada' && d.recipient_id === s.id)
      .reduce((sum, d) => sum + d.amount, 0);
    return { ...s, total };
  });

  const getCategoryLabel = (category: string, recipientId?: string | null) => {
    if (category === 'mosque') return 'মসজিদ / দরবার ফান্ড';
    if (category === 'combined_shahjadas') return 'সম্মিলিত শাহজাদাগণ';
    if (category === 'specific_shahjada') {
      const map: Record<string, string> = {
        'boro': 'বড় শাহজাদা',
        'mej': 'মেজ শাহজাদা',
        'sej': 'সেজ শাহজাদা',
        'choto': 'ছোট শাহজাদা'
      };
      return map[recipientId || ''] || 'নির্দিষ্ট শাহজাদা';
    }
    return category;
  };

  return (
    <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', pointerEvents: 'none', zIndex: -1000 }}>
      {/* Official Statement of Account Layout */}
      <div 
        id="report-container"
        ref={ref} 
        className="bg-white text-black relative" 
        style={{ width: '800px', padding: '50px', margin: '0', minHeight: '1100px', fontFamily: "'Noto Sans Bengali', sans-serif" }}
      >
        {/* Subtle Watermark Logo/Seal Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0">
          <div className="w-[400px] h-[400px] border-[20px] border-black rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold uppercase text-center">চন্দনাইশ দরবার শরীফ<br/>OFFICIAL SEAL</span>
          </div>
        </div>

        <div className="relative z-10">
          {/* Official Header */}
          <div className="flex justify-between items-start border-b-[3px] border-black pb-6 mb-8">
            <div className="w-2/3">
              <h1 className="text-4xl font-black uppercase mb-1 tracking-tighter">চন্দনাইশ দরবার শরীফ</h1>
              <p className="text-lg font-bold text-emerald-800">সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
              <p className="text-sm font-bold text-gray-800">অফিস অফ দ্য খাদেম | ফিন্যান্সিয়াল রেকর্ডস</p>
              <div className="mt-4 text-[10px] font-mono leading-tight">
                <p>Location: Chitrasala, Chandanaish, Chittagong, Bangladesh</p>
                <p>Contact: +8801622-721996 | +8801819-614050</p>
                <p>Email: chandanaishdarbarsharif@gmail.com</p>
              </div>
            </div>
            <div className="w-1/3 text-right">
              <div className="inline-block border-2 border-black p-2 mb-2">
                <h2 className="text-xl font-black uppercase tracking-widest leading-none">STATEMENT OF<br/>ACCOUNT</h2>
              </div>
              <div className="text-[10px] space-y-0.5">
                <p><span className="font-bold">Date:</span> {toBanglaNumber(format(new Date(), 'dd/MM/yyyy'))}</p>
                <p><span className="font-bold">Time:</span> {toBanglaNumber(format(new Date(), 'hh:mm:ss a'))}</p>
                <p><span className="font-bold">Ref No:</span> CD-{toBanglaNumber((Math.random()*100000).toFixed(0))}</p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="mb-8 grid grid-cols-2 gap-10">
            <div className="border border-black p-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Account Particulars</p>
              <h3 className="text-xl font-black">{periodLabel || 'হাদিয়া ও নজরানা ফান্ড'}</h3>
              <p className="text-xs">Category: Religious Contributions & Welfare</p>
              <p className="text-xs">Status: Verified Official Ledger</p>
            </div>
            <div className="border border-black p-4 bg-gray-50">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Financial Summary</p>
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-1">
                <span className="text-xs">Total Net Collections:</span>
                <span className="font-bold">৳ {toBanglaNumber(totalAmount.toLocaleString())}</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-gray-300 pb-1 mb-1">
                <span className="text-xs">Mosque Fund Allocation:</span>
                <span className="font-bold">৳ {toBanglaNumber(mosqueTotal.toLocaleString())}</span>
              </div>
              <div className="flex justify-between items-baseline font-black">
                <span className="text-sm">Balance for Distribution:</span>
                <span className="text-lg">৳ {toBanglaNumber(combinedShahjadasTotal.toLocaleString())}</span>
              </div>
            </div>
          </div>

          {/* Distribution Schedule */}
          <div className="mb-10">
            <table className="w-full border-collapse border-2 border-black">
              <thead>
                <tr className="bg-black text-white">
                  <th colSpan={4} className="py-2 text-sm font-black uppercase tracking-widest">শাহজাদাদের বণ্টন বিবরণী (Distribution Schedule)</th>
                </tr>
                <tr className="bg-gray-200 text-[10px] font-black uppercase">
                  <th className="border border-black p-2 text-left w-1/3">Recipient Name (শাহজাদার নাম)</th>
                  <th className="border border-black p-2 text-right">Variable Share (সম্মিলিত)</th>
                  <th className="border border-black p-2 text-right">Fixed Hadia (নির্দিষ্ট)</th>
                  <th className="border border-black p-2 text-right w-1/4">Grand Total (সর্বমোট)</th>
                </tr>
              </thead>
              <tbody>
                {SHAHJADAS.map(s => {
                  const specific = specificShahjadaTotals.find(st => st.id === s.id)?.total || 0;
                  const totalForThisShahjada = perShahjadaCombined + specific;
                  return (
                    <tr key={s.id} className="text-xs">
                      <td className="border border-black p-2 font-black">{s.name}</td>
                      <td className="border border-black p-2 text-right">{toBanglaNumber(perShahjadaCombined.toLocaleString())}</td>
                      <td className="border border-black p-2 text-right">{toBanglaNumber(specific.toLocaleString())}</td>
                      <td className="border border-black p-2 text-right font-black text-sm bg-gray-50">৳ {toBanglaNumber(totalForThisShahjada.toLocaleString())}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ledger Table */}
          <div className="mb-16">
            <table className="w-full border-collapse border-2 border-black text-[9px]">
              <thead>
                <tr className="bg-black text-white">
                  <th colSpan={4} className="py-2 text-sm font-black uppercase tracking-widest">ট্রানজেকশন লেজার (Transaction Ledger)</th>
                </tr>
                <tr className="bg-gray-200 font-black uppercase">
                  <th className="border border-black p-2 text-left w-[12%]">Val. Date</th>
                  <th className="border border-black p-2 text-left">Transaction Details (Contributor & Ref)</th>
                  <th className="border border-black p-2 text-left w-[25%]">Description (Fund Category)</th>
                  <th className="border border-black p-2 text-right w-[15%]">Amount (DR/CR)</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-black px-2 py-3 font-mono">
                      {d.created_at ? toBanglaNumber(format(new Date(d.created_at), 'dd-MM-yy')) : '--/--/--'}
                    </td>
                    <td className="border border-black px-2 py-3">
                      <div className="font-bold text-xs uppercase">{d.donor_name}</div>
                      <div className="text-[7px] text-gray-500 font-mono">CHANNEL: {d.payment_method.toUpperCase()} | TXN: {d.transaction_id}</div>
                    </td>
                    <td className="border border-black px-2 py-3 font-medium italic">
                      {getCategoryLabel(d.donation_category, d.recipient_id)}
                    </td>
                    <td className="border border-black px-2 py-3 text-right font-black text-xs">
                      {toBanglaNumber(d.amount.toLocaleString())}.০০
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-black text-sm">
                  <td colSpan={3} className="border border-black p-3 text-right tracking-[0.2em]">CUMULATIVE COLLECTIONS (TOTAL)</td>
                  <td className="border border-black p-3 text-right underline decoration-double">
                    ৳ {toBanglaNumber(totalAmount.toLocaleString())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Verification Section */}
          <div className="grid grid-cols-2 gap-20 mt-20 mb-10">
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 mx-auto w-4/5">
                <p className="text-sm font-black uppercase">খাদেমের স্বাক্ষর</p>
                <p className="text-[9px] text-gray-500">Authorized Financial Custodian</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2 mx-auto w-4/5">
                <p className="text-sm font-black uppercase">অফিসিয়াল সিল</p>
                <p className="text-[9px] text-gray-500">Chandanaish Darbar Sharif Finance Dept.</p>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="border-t border-gray-200 mt-20 pt-6 text-center text-[8px] text-gray-400">
            <p>"إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ" - আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন।</p>
            <p className="mt-2 text-[7px] font-mono">E-DOCUMENT - GENERATED BY CDB FINANCE SYSTEM V2.1 | PAGE 1 OF 1 (CANDIDATE)</p>
          </div>
        </div>
      </div>
    </div>
  );
});

DonationReportTemplate.displayName = 'DonationReportTemplate';
