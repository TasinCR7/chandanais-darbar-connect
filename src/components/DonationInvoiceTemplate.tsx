import React from 'react';
import { format } from 'date-fns';

export interface InvoiceData {
  id?: string;
  donor_name: string;
  donor_phone: string;
  amount: number;
  donation_category: string;
  recipient_id?: string | null;
  payment_method: string;
  transaction_id: string;
  status: string;
  created_at?: string;
}

interface InvoiceProps {
  donation: InvoiceData;
}

export const DonationInvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceProps>(({ donation }, ref) => {
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
    <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', pointerEvents: 'none', zIndex: -1000 }}>
      <div 
        ref={ref} 
        className="bg-white text-black font-sans" 
        style={{ width: '800px', padding: '50px', margin: '0' }}
      >
        <div className="text-center mb-10 border-b-2 border-emerald-700 pb-6 w-full">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">চন্দনাইশ দরবার শরীফ</h1>
          <h2 className="text-2xl font-semibold text-gray-700">হাদিয়া ও নজরআনা রশিদ (Invoice)</h2>
        </div>

        <div className="flex justify-between items-center mb-10 text-sm">
          <div>
            <p className="text-gray-500 mb-1">রশিদ নং:</p>
            <p className="font-bold text-lg">{donation.id?.substring(0, 8).toUpperCase() || 'N/A'}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 mb-1">তারিখ ও সময়:</p>
            <p className="font-bold text-lg">{donation.created_at ? format(new Date(donation.created_at), 'dd MMM yyyy, hh:mm a') : format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
          </div>
        </div>

        <div className="mb-10 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">দাতার তথ্য</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500 mb-1">নাম:</p>
              <p className="font-bold text-xl">{donation.donor_name}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">মোবাইল নাম্বার:</p>
              <p className="font-bold text-xl">{donation.donor_phone}</p>
            </div>
          </div>
        </div>

        <table className="w-full mb-10 border-collapse table-auto">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="py-4 px-5 text-left font-semibold border border-emerald-800">বিবরণ (খাত)</th>
              <th className="py-4 px-5 text-left font-semibold border border-emerald-800">পেমেন্ট মাধ্যম</th>
              <th className="py-4 px-5 text-left font-semibold border border-emerald-800">ট্রানজেকশন আইডি</th>
              <th className="py-4 px-5 text-right font-semibold border border-emerald-800">পরিমাণ (৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 bg-white">
              <td className="py-5 px-5 border-l border-r border-gray-200 text-lg">{getCategoryLabel(donation.donation_category, donation.recipient_id)}</td>
              <td className="py-5 px-5 border-r border-gray-200 text-lg capitalize">{donation.payment_method}</td>
              <td className="py-5 px-5 border-r border-gray-200 text-lg font-mono tracking-wider">{donation.transaction_id}</td>
              <td className="py-5 px-5 border-r border-gray-200 text-right font-bold text-xl text-emerald-700">{donation.amount.toLocaleString()} ৳</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-16">
          <div className="w-80">
            <div className="flex justify-between border-b-2 border-gray-800 py-3">
              <span className="font-bold text-xl">সর্বমোট:</span>
              <span className="font-bold text-2xl text-emerald-800">{donation.amount.toLocaleString()} ৳</span>
            </div>
            <div className="flex justify-between items-center py-4">
              <span className="font-semibold text-lg text-gray-700">স্ট্যাটাস:</span>
              <span className={`font-bold text-lg px-4 py-1.5 rounded-full ${donation.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-600 border border-orange-200'}`}>
                {donation.status === 'verified' ? 'গৃহীত (Verified)' : 'অপেক্ষমান (Pending)'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-200 text-center text-gray-500">
          <p className="mb-2 text-lg italic mt-4 text-emerald-800/80">"নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।"</p>
          <p className="text-base text-gray-400">আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন। আমীন।</p>
          <p className="text-xs mt-6">এটি একটি কম্পিউটার জেনারেটেড রশিদ।</p>
        </div>
      </div>
    </div>
  );
});

DonationInvoiceTemplate.displayName = 'DonationInvoiceTemplate';
