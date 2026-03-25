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
    <div style={{ position: 'fixed', top: '-30000px', left: '-30000px', pointerEvents: 'none', zIndex: -1000 }}>
      {/* Container with a subtle shadow and border that shows in PDF */}
      <div 
        ref={ref} 
        className="bg-white text-slate-800 font-sans relative overflow-hidden" 
        style={{ width: '900px', padding: '70px', margin: '0', minHeight: '1200px' }}
      >
        {/* Decorative corner patterns (simulated with CSS for better PDF rendering) */}
        <div className="absolute top-0 right-0 w-48 h-48 border-t-[12px] border-r-[12px] border-emerald-800/20 opacity-30 rounded-tr-[40px] z-0" />
        <div className="absolute bottom-0 left-0 w-48 h-48 border-b-[12px] border-l-[12px] border-emerald-800/20 opacity-30 rounded-bl-[40px] z-0" />
        
        {/* Background Watermark (Subtle) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0 select-none">
           <div className="text-[120px] font-bold text-emerald-900 rotate-[-35deg]">চন্দনাইশ দরবার</div>
        </div>

        <div className="relative z-10">
          {/* Header Section */}
          <div className="text-center mb-14 pb-8 border-b-[3px] border-emerald-700/30">
            <h1 className="text-5xl font-extrabold text-emerald-900 mb-2 tracking-tight">চন্দনাইশ দরবার শরীফ</h1>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[2px] w-12 bg-gold/50" />
              <h2 className="text-2xl font-bold text-slate-600 bg-white px-4">হাদিয়া ও নজরানা হিসাব বিবরণী</h2>
              <div className="h-[2px] w-24 bg-gold/50" />
            </div>
            <div className="flex justify-between items-end mt-6 text-sm">
              <div className="text-left text-slate-500 bg-slate-50 px-3 py-1 rounded-md border border-slate-100">
                রিপোর্ট আইডি: <span className="font-mono text-emerald-800 font-bold">REP-{format(new Date(), 'yyyyMMdd')}-{(Math.random()*100).toFixed(0)}</span>
              </div>
              <div className="text-right text-slate-500 font-medium italic">
                রিপোর্ট তৈরির তারিখ: <span className="not-italic font-bold text-slate-700">{format(new Date(), 'dd MMMM yyyy, hh:mm a')}</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border-l-[6px] border-emerald-700 shadow-sm flex flex-col justify-center">
              <span className="text-emerald-800 font-bold text-sm uppercase tracking-widest mb-2">সর্বমোট সংগৃহীত হাদিয়া</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-emerald-900">৳ {totalAmount.toLocaleString()}</span>
                <span className="text-lg text-emerald-700 font-medium">মাত্র</span>
              </div>
            </div>
            <div className="p-8 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border-l-[6px] border-amber-600 shadow-sm flex flex-col justify-center">
              <span className="text-amber-800 font-bold text-sm uppercase tracking-widest mb-2">মসজিদ ও দরবার ফান্ড</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-900">৳ {mosqueTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Distribution Section (Redesigned) */}
          <div className="mb-14 p-10 bg-white rounded-3xl border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-gold rounded-full" />
              শাহজাদাদের প্রাপ্য অংশ (বিভাজন)
            </h3>
            
            <div className="grid grid-cols-2 gap-x-16 gap-y-10 relative">
              {/* Vertical Divider for the grid */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-100" />
              
              {SHAHJADAS.map(s => {
                const specific = specificShahjadaTotals.find(st => st.id === s.id)?.total || 0;
                const totalForThisShahjada = perShahjadaCombined + specific;
                return (
                  <div key={s.id} className="group transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-slate-700 text-xl">{s.name}</span>
                      <div className="px-4 py-1.5 bg-emerald-50 text-emerald-800 rounded-full font-black text-xl border border-emerald-100 shadow-sm">
                        ৳ {totalForThisShahjada.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 pl-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">সম্মিলিত অংশ:</span>
                        <span className="text-slate-600 font-semibold">{perShahjadaCombined.toLocaleString()} ৳</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">নির্দিষ্ট অংশ:</span>
                        <span className="text-slate-600 font-semibold">{specific.toLocaleString()} ৳</span>
                      </div>
                      <div className="w-full h-[1px] bg-slate-50 mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-12 p-4 bg-slate-50 rounded-xl border-t-2 border-emerald-700 animate-pulse text-sm text-slate-500 font-medium italic flex items-start gap-2">
              <span className="text-emerald-700 text-lg">💡</span>
              <p>সম্মিলিত শাহজাদাগণের মোট প্রাপ্তি ৳ {combinedShahjadasTotal.toLocaleString()} সমান চার ভাগে (প্রতি ভাগ ৳ {perShahjadaCombined.toLocaleString()}) বণ্টিত হয়েছে এবং এর সাথে সংশ্লিষ্ট নির্দিষ্ট হাদিয়া যোগ করা হয়েছে।</p>
            </div>
          </div>

          {/* Detailed Transactions Table */}
          <div className="mb-16">
            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-gold rounded-full" />
              বিস্তারিত লেনদেনের তালিকা
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white">
                    <th className="py-5 px-6 text-left font-bold text-sm tracking-widest uppercase border-r border-emerald-800">তারিখ</th>
                    <th className="py-5 px-6 text-left font-bold text-sm tracking-widest uppercase border-r border-emerald-800">দাতার নাম</th>
                    <th className="py-5 px-6 text-left font-bold text-sm tracking-widest uppercase border-r border-emerald-800">খাত/বিবরণ</th>
                    <th className="py-5 px-6 text-right font-bold text-sm tracking-widest uppercase">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {donations.map((d, index) => (
                    <tr key={index} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-emerald-50/30 transition-colors`}>
                      <td className="py-4 px-6 border-r border-slate-100 font-mono text-sm">
                        {d.created_at ? format(new Date(d.created_at), 'dd-MM-yyyy') : '---'}
                      </td>
                      <td className="py-4 px-6 border-r border-slate-100 font-bold text-slate-800">{d.donor_name}</td>
                      <td className="py-4 px-6 border-r border-slate-100 font-medium">
                        {getCategoryLabel(d.donation_category, d.recipient_id)}
                        <span className="text-[10px] block opacity-40 mt-0.5 tracking-tighter uppercase">{d.payment_method} - {d.transaction_id}</span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-800 text-lg">
                        {d.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/50">
                    <td colSpan={3} className="py-6 px-6 text-right font-black text-xl text-slate-700 tracking-tighter uppercase">সর্বমোট জমা (পরিশোধিত সকল)</td>
                    <td className="py-6 px-6 text-right font-black text-3xl text-emerald-900 border-l-[3px] border-emerald-800">
                      ৳ {totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Signature & Footer Section */}
          <div className="mt-auto grid grid-cols-2 gap-20 pt-20">
            <div className="text-center">
              <div className="w-full h-[1px] bg-slate-300 mb-4 mx-auto" style={{ width: '200px' }} />
              <p className="text-slate-700 font-black text-lg">খাদেমের স্বাক্ষর</p>
              <p className="text-slate-400 text-xs">চন্দনাইশ দরবার শরীফ</p>
            </div>
            <div className="text-center">
              <div className="w-full h-[1px] bg-slate-300 mb-4 mx-auto" style={{ width: '200px' }} />
              <p className="text-slate-700 font-black text-lg">অ্যাডমিন স্বাক্ষর</p>
              <p className="text-slate-400 text-xs">অফিস ম্যানেজমেন্ট</p>
            </div>
          </div>

          <div className="mt-24 pt-10 border-t border-slate-100 text-center">
             <p className="text-2xl font-arabic text-emerald-800/40 mb-3 tracking-[0.2em]">إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ</p>
             <p className="text-slate-400 text-xs italic tracking-widest mb-1">
               আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন। আমীন।
             </p>
             <div className="w-12 h-1.5 bg-gold/30 rounded-full mx-auto mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
});

DonationReportTemplate.displayName = 'DonationReportTemplate';
