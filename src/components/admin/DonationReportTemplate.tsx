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
  const perShahjadaCombined = combinedShahjadasTotal / 4;
  
  // Calculate specific shahjada totals
  const specificShahjadaTotals = SHAHJADAS.map(s => {
    const total = donations
      .filter(d => d.donation_category === 'specific_shahjada' && d.recipient_id === s.id)
      .reduce((sum, d) => sum + d.amount, 0);
    return { ...s, total };
  });

  const getCategoryLabel = (category: string, recipientId?: string | null) => {
    if (category === 'mosque') return 'মসজিদ ফান্ড/ দরবার ফান্ড';
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
    <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', pointerEvents: 'none', zIndex: -1000 }}>
      <div 
        ref={ref} 
        className="bg-white text-black font-sans" 
        style={{ width: '850px', padding: '60px', margin: '0' }}
      >
        <div className="text-center mb-10 border-b-2 border-emerald-800 pb-8 w-full">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">চন্দনাইশ দরবার শরীফ</h1>
          <h2 className="text-2xl font-semibold text-gray-700">হাদিয়া ও নজরানা হিসাব বিবরণী (Calculation Report)</h2>
          <p className="text-gray-500 mt-2">রিপোর্ট তৈরির তারিখ: {format(new Date(), 'dd MMMM yyyy, hh:mm a')}</p>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center">
            <p className="text-emerald-800 font-semibold text-lg mb-1">সর্বমোট গৃহীত হাদিয়া</p>
            <p className="text-4xl font-bold text-emerald-900">৳ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex flex-col justify-center">
            <p className="text-blue-800 font-semibold text-lg mb-1">মসজিদ ফান্ড/ দরবার ফান্ড</p>
            <p className="text-3xl font-bold text-blue-900">৳ {mosqueTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Distribution Details */}
        <div className="mb-10 bg-gray-50 p-8 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-800 mb-6 border-b border-emerald-200 pb-3">শাহজাদাদের প্রাপ্য অংশ (বিভাজন)</h3>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            {SHAHJADAS.map(s => {
              const specific = specificShahjadaTotals.find(st => st.id === s.id)?.total || 0;
              const totalForThisShahjada = perShahjadaCombined + specific;
              return (
                <div key={s.id} className="flex flex-col border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-bold text-gray-800 text-lg">{s.name}</span>
                    <span className="font-bold text-emerald-700 text-xl">৳ {totalForThisShahjada.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 italic">
                    <span>(সম্মিলিত: {perShahjadaCombined.toLocaleString()} + নির্দিষ্ট: {specific.toLocaleString()})</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center text-sm text-gray-600">
            <p>* সম্মিলিত শাহজাদাগণের মোট ৳ {combinedShahjadasTotal.toLocaleString()} চার ভাগে সমানভাবে বণ্টিত হয়েছে।</p>
          </div>
        </div>

        {/* Detailed Transactions Table */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">বিস্তারিত লেনদেনের তালিকা (ভেরিফাইড)</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-emerald-800 text-white text-sm">
                <th className="py-3 px-4 text-left border border-emerald-900">তারিখ</th>
                <th className="py-3 px-4 text-left border border-emerald-900">দাতার নাম</th>
                <th className="py-3 px-4 text-left border border-emerald-900">খাত</th>
                <th className="py-3 px-4 text-left border border-emerald-900">পেমেন্ট মাধ্যম</th>
                <th className="py-3 px-4 text-right border border-emerald-900">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, index) => (
                <tr key={index} className={`text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                  <td className="py-3 px-4 border-x border-gray-200 whitespace-nowrap">
                    {d.created_at ? format(new Date(d.created_at), 'dd/MM/yyyy') : 'N/A'}
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200 font-medium">{d.donor_name}</td>
                  <td className="py-3 px-4 border-r border-gray-200">
                    {getCategoryLabel(d.donation_category, d.recipient_id)}
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200 capitalize">{d.payment_method}</td>
                  <td className="py-3 px-4 border-r border-gray-200 text-right font-bold">
                    {d.amount.toLocaleString()} ৳
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="py-4 px-4 text-right border border-gray-300">মোট জমা:</td>
                <td className="py-4 px-4 text-right border border-gray-300 text-emerald-800 text-lg">
                  {totalAmount.toLocaleString()} ৳
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-200 text-center text-gray-400 text-xs">
          <p className="mb-2 italic text-emerald-800/60 text-base">"নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।"</p>
          <p>চন্দনাইশ দরবার শরীফ - অফিসীয়াল হিসাব বিবরণী</p>
          <p className="mt-2">এটি একটি কম্পিউটার জেনারেটেড রিপোর্ট।</p>
        </div>
      </div>
    </div>
  );
});

DonationReportTemplate.displayName = 'DonationReportTemplate';
