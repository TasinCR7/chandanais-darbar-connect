import React from 'react';
import { format } from 'date-fns';
import { InvoiceData } from '@/components/DonationInvoiceTemplate';

interface DonationReportProps {
  donations: InvoiceData[];
  totalAmount: number;
}

const SHAHJADAS = [
  { id: "boro", name: "বড় শাহজাদা" },
  { id: "mej", name: "মেজ শাহজাদা" },
  { id: "sej", name: "সেজ শাহজাদা" },
  { id: "choto", name: "ছোট শাহজাদা" },
];

export const DonationReportTemplate = React.forwardRef<HTMLDivElement, DonationReportProps>(({ donations, totalAmount }, ref) => {
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
    if (category === 'mosque') return 'মসজিদ/দরবার ফান্ড';
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
      {/* Compact Bank Statement Layout */}
      <div 
        id="report-container"
        ref={ref} 
        className="bg-white text-black font-sans" 
        style={{ width: '800px', padding: '40px', margin: '0' }}
      >
        {/* Header Section */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">চন্দনাইশ দরবার শরীফ</h1>
              <p className="text-sm font-semibold text-gray-700">হাদিয়া ও নজরানা হিসাব বিবরণী</p>
            </div>
            <div className="text-right text-xs">
              <p>Statement Date: {format(new Date(), 'dd/MM/yyyy')}</p>
              <p>Generation Time: {format(new Date(), 'hh:mm a')}</p>
              <p className="mt-1 font-bold">Report ID: {format(new Date(), 'yyyyMMdd')}-{(Math.random()*100).toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Account Summary Section (Table-like) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-t border-x border-black">আর্থিক সারাংশ (Summary)</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold bg-gray-50 w-1/3">সর্বমোট সংগৃহীত হাদিয়া</td>
                <td className="border border-black p-2 font-bold text-lg text-right">৳ {totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-50">মসজিদ ও দরবার ফান্ড</td>
                <td className="border border-black p-2 font-semibold text-right">৳ {mosqueTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold bg-gray-50">সম্মিলিত প্রাপ্তি (ভাগ করারযোগ্য)</td>
                <td className="border border-black p-2 font-semibold text-right">৳ {combinedShahjadasTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Breakdown Section (More Compact) */}
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-t border-x border-black">শাহজাদাদের বণ্টন বিবরণী (Breakdown)</h3>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-50 font-bold">
                <th className="border border-black p-2 text-left">শাহজাদার নাম</th>
                <th className="border border-black p-2 text-right">সম্মিলিত অংশ (1/4)</th>
                <th className="border border-black p-2 text-right">নির্দিষ্ট হাদিয়া</th>
                <th className="border border-black p-2 text-right">সর্বমোট (৳)</th>
              </tr>
            </thead>
            <tbody>
              {SHAHJADAS.map(s => {
                const specific = specificShahjadaTotals.find(st => st.id === s.id)?.total || 0;
                const totalForThisShahjada = perShahjadaCombined + specific;
                return (
                  <tr key={s.id}>
                    <td className="border border-black p-2 font-bold">{s.name}</td>
                    <td className="border border-black p-2 text-right">{perShahjadaCombined.toLocaleString()}</td>
                    <td className="border border-black p-2 text-right">{specific.toLocaleString()}</td>
                    <td className="border border-black p-2 text-right font-bold">{totalForThisShahjada.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detailed Transactions Table (Formal Ledger Style) */}
        <div className="mb-10">
          <h3 className="text-sm font-bold uppercase bg-gray-100 p-2 border-t border-x border-black">লেনদেনের বিস্তারিত তালিকা (Ledger)</h3>
          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-gray-50 font-bold">
                <th className="border border-black p-2 text-left w-[80px]">তারিখ</th>
                <th className="border border-black p-2 text-left">দাতার বিবরণ (নাম ও ট্রানজেকশন আইডি)</th>
                <th className="border border-black p-2 text-left">খাত / বিবরণ</th>
                <th className="border border-black p-2 text-right w-[80px]">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, index) => (
                <tr key={index}>
                  <td className="border border-black p-2">
                    {d.created_at ? format(new Date(d.created_at), 'dd-MM-yy') : '---'}
                  </td>
                  <td className="border border-black p-2">
                    <span className="font-bold">{d.donor_name}</span>
                    <p className="text-[8px] text-gray-500">{d.payment_method.toUpperCase()} | Trx: {d.transaction_id}</p>
                  </td>
                  <td className="border border-black p-2">
                    {getCategoryLabel(d.donation_category, d.recipient_id)}
                  </td>
                  <td className="border border-black p-2 text-right font-bold">
                    {d.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold text-xs">
                <td colSpan={3} className="border border-black p-2 text-right uppercase">মোট জমা:</td>
                <td className="border border-black p-2 text-right">
                  ৳ {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Simple Footer/Signature Area */}
        <div className="mt-16 flex justify-between items-end border-t border-gray-300 pt-8 px-10">
          <div className="text-center w-32 border-t border-black pt-2">
            <p className="text-xs font-bold">খাদেমের স্বাক্ষর</p>
          </div>
          <div className="text-center text-[8px] text-gray-400 italic">
            <p>চন্দনাইশ দরবার শরীফ অফিসীয়াল রেকর্ড।</p>
            <p>এটি একটি কম্পিউটার জেনারেটেড স্টেটমেন্ট।</p>
          </div>
          <div className="text-center w-32 border-t border-black pt-2">
            <p className="text-xs font-bold">অফিসিয়াল সিল</p>
          </div>
        </div>

        {/* Small footer text */}
        <div className="mt-8 text-center text-[10px] text-gray-500">
           <p>"নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।"</p>
        </div>
      </div>
    </div>
  );
});

DonationReportTemplate.displayName = 'DonationReportTemplate';
