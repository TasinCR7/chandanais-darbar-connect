import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { toBanglaNumber } from '@/lib/bangla';

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

const SHAHJADAS = [
  { id: 'boro', name: 'বড় শাহজাদা' },
  { id: 'mej', name: 'মেজ শাহজাদা' },
  { id: 'sej', name: 'সেজ শাহজাদা' },
  { id: 'choto', name: 'ছোট শাহজাদা' },
];

export const DonationInvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceProps>(({ donation }, ref) => {
  const getCategoryLabel = (category: string, recipientId?: string | null) => {
    if (category === 'mosque') return 'মসজিদ ফান্ড / দরবার ফান্ড';
    if (category === 'combined_shahjadas') return 'সম্মিলিত শাহজাদাগণ';
    if (category === 'specific_shahjada') {
      const map: Record<string, string> = {
        boro: 'বড় শাহজাদা',
        mej: 'মেজ শাহজাদা',
        sej: 'সেজ শাহজাদা',
        choto: 'ছোট শাহজাদা',
      };
      return map[recipientId || ''] || 'নির্দিষ্ট শাহজাদা';
    }
    return category;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      bkash: 'bKash',
      nagad: 'Nagad',
      rocket: 'Rocket',
      card: 'Card / Bank',
    };
    return methods[method] || method;
  };

  const isVerified = donation.status === 'verified';
  const invoiceDate = donation.created_at
    ? format(new Date(donation.created_at), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy');
  const invoiceTime = donation.created_at
    ? format(new Date(donation.created_at), 'hh:mm a')
    : format(new Date(), 'hh:mm a');
  const invoiceNo = donation.id?.substring(0, 8).toUpperCase() || 'N/A';
  const verificationCode = donation.id
    ? `CD-${donation.id.substring(0, 4).toUpperCase()}-${donation.id.substring(4, 8).toUpperCase()}`
    : 'N/A';

  // Distribution for combined shahjadas
  const showDistribution = donation.donation_category === 'combined_shahjadas';
  const perPerson = showDistribution ? donation.amount / SHAHJADAS.length : 0;

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (verificationCode !== 'N/A') {
      const qrText = `DONATION:${verificationCode}|AMOUNT:${donation.amount}|DATE:${donation.created_at || new Date().toISOString()}`;
      QRCode.toDataURL(qrText, { width: 120, margin: 1, color: { dark: '#065f46', light: '#ffffff' } })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [verificationCode, donation.amount, donation.created_at]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'verified':
        return { text: '✔ গৃহীত (Verified)', bg: '#dcfce7', textCol: '#166534', border: '#86efac', containerBg: '#f0fdf4' };
      case 'rejected':
        return { text: '✖ বাতিল (Rejected)', bg: '#fee2e2', textCol: '#991b1b', border: '#fca5a5', containerBg: '#fef2f2' };
      case 'pending':
      default:
        return { text: '⏳ অপেক্ষমান (Pending)', bg: '#ffedd5', textCol: '#9a3412', border: '#fb923c', containerBg: '#fff7ed' };
    }
  };

  const statusDisplay = getStatusDisplay(donation.status);

  return (
    <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', pointerEvents: 'none', zIndex: -1000 }}>
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          backgroundColor: '#ffffff',
          fontFamily: "'Segoe UI', 'Arial Unicode MS', sans-serif",
          color: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          padding: '0',
          margin: '0',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Watermark ── */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            fontSize: '90px',
            fontWeight: '900',
            color: 'rgba(6,95,70,0.04)',
            letterSpacing: '8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          চন্দনাইশ দরবার শরীফ
        </div>

        {/* ── Outer Border Frame ── */}
        <div
          style={{
            position: 'absolute',
            inset: '12px',
            border: '2px solid #065f46',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '16px',
            border: '1px solid rgba(6,95,70,0.25)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ── Corner Ornaments ── */}
        {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((corner) => (
          <div
            key={corner}
            style={{
              position: 'absolute',
              top: corner.includes('top') ? '6px' : 'auto',
              bottom: corner.includes('bottom') ? '6px' : 'auto',
              left: corner.includes('Left') ? '6px' : 'auto',
              right: corner.includes('Right') ? '6px' : 'auto',
              width: '24px',
              height: '24px',
              borderTop: corner.includes('top') ? '3px solid #065f46' : 'none',
              borderBottom: corner.includes('bottom') ? '3px solid #065f46' : 'none',
              borderLeft: corner.includes('Left') ? '3px solid #065f46' : 'none',
              borderRight: corner.includes('Right') ? '3px solid #065f46' : 'none',
              zIndex: 2,
            }}
          />
        ))}

        {/* ── Content Wrapper ── */}
        <div style={{ position: 'relative', zIndex: 3, padding: '40px 48px' }}>

          {/* ── Header ── */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            {/* Arabic Bismillah */}
            <div style={{ fontSize: '28px', color: '#065f46', marginBottom: '6px', letterSpacing: '2px' }}>
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </div>

            {/* Decorative divider */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '10px 0' }}>
              <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, #065f46)' }} />
              <div style={{ fontSize: '18px', color: '#b45309' }}>✦</div>
              <div style={{ height: '1px', width: '200px', background: '#065f46' }} />
              <div style={{ fontSize: '18px', color: '#b45309' }}>✦</div>
              <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, #065f46)' }} />
            </div>

            {/* Organization Name */}
            <div style={{ fontSize: '30px', fontWeight: '900', color: '#065f46', letterSpacing: '1px', marginBottom: '4px' }}>
              চন্দনাইশ দরবার শরীফ
            </div>
            <div style={{ fontSize: '14px', color: '#b45309', fontWeight: 'bold', marginBottom: '4px' }}>
              সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Chandanais Darbar Sharif
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ &nbsp;|&nbsp; হটলাইন: ০১৬২২-৭২১৯৯৬
            </div>

            {/* Decorative divider */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '10px 0' }}>
              <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, #065f46)' }} />
              <div style={{ fontSize: '18px', color: '#b45309' }}>✦</div>
              <div style={{ height: '1px', width: '200px', background: '#065f46' }} />
              <div style={{ fontSize: '18px', color: '#b45309' }}>✦</div>
              <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, #065f46)' }} />
            </div>

            {/* Invoice Title Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #065f46 100%)',
                color: '#ffffff',
                padding: '10px 32px',
                borderRadius: '4px',
                display: 'inline-block',
                fontSize: '18px',
                fontWeight: '700',
                letterSpacing: '2px',
                marginTop: '6px',
              }}
            >
              হাদিয়া ও নজরানা রশিদ &nbsp;/&nbsp; DONATION RECEIPT
            </div>
          </div>

          {/* ── Invoice Meta Row ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              marginBottom: '24px',
              gap: '16px',
            }}
          >
            {/* Left: Invoice No */}
            <div
              style={{
                flex: 1,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '14px 18px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>রশিদ নম্বর / Invoice No.</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#065f46', fontFamily: 'monospace' }}>#{toBanglaNumber(invoiceNo.replace(/\D/g, ''))}{invoiceNo.replace(/[0-9]/g, '')}</div>
            </div>

            {/* Middle: Date */}
            <div
              style={{
                flex: 1,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                padding: '14px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>তারিখ / Date</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#92400e' }}>{toBanglaNumber(invoiceDate)}</div>
              <div style={{ fontSize: '12px', color: '#b45309' }}>{toBanglaNumber(invoiceTime)}</div>
            </div>

            {/* Right: Status */}
            <div
              style={{
                flex: 1,
                background: isVerified ? '#f0fdf4' : '#fff7ed',
                border: `1px solid ${isVerified ? '#86efac' : '#fdba74'}`,
                borderRadius: '6px',
                padding: '14px 18px',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>স্ট্যাটাস / Status</div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 14px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: statusDisplay.bg,
                  color: statusDisplay.textCol,
                  border: `1px solid ${statusDisplay.border}`,
                }}
              >
                {statusDisplay.text}
              </div>
            </div>
          </div>

          {/* ── Donor Info ── */}
          <div
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px 24px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#065f46',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '14px',
                paddingBottom: '8px',
                borderBottom: '1px solid #d1fae5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>👤</span> দাতার তথ্য / Donor Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>নাম / Name</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{donation.donor_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>মোবাইল / Phone</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>{toBanglaNumber(donation.donor_phone)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>যাচাই কোড / Verify Code</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#065f46', fontFamily: 'monospace' }}>{verificationCode}</div>
              </div>
            </div>
          </div>

          {/* ── Donation Details Table ── */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'linear-gradient(135deg, #065f46, #047857)',
                  color: '#ffffff',
                }}
              >
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>বিবরণ (খাত)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>পেমেন্ট মাধ্যম</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>ট্রানজেকশন আইডি</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', letterSpacing: '0.5px' }}>পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: '15px', fontWeight: '600', color: '#065f46' }}>
                  {getCategoryLabel(donation.donation_category, donation.recipient_id)}
                </td>
                <td style={{ padding: '16px', borderRight: '1px solid #e5e7eb', fontSize: '14px' }}>
                  <span
                    style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '3px 10px',
                      borderRadius: '99px',
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                  >
                    {getPaymentMethodLabel(donation.payment_method)}
                  </span>
                </td>
                <td style={{ padding: '16px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px', color: '#374151', letterSpacing: '1px' }}>
                  {donation.transaction_id || '-'}
                </td>
                <td style={{ padding: '16px', textAlign: 'right', borderRight: '1px solid #e5e7eb', fontSize: '20px', fontWeight: '900', color: '#065f46' }}>
                  {toBanglaNumber(donation.amount.toLocaleString('en-US'))} ৳
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Total Row ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div style={{ width: '340px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #065f46, #047857)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '1px' }}>সর্বমোট / TOTAL</span>
                <span style={{ fontSize: '26px', fontWeight: '900' }}>{toBanglaNumber(donation.amount.toLocaleString('en-US'))} ৳</span>
              </div>
            </div>
          </div>

          {/* ── Distribution Breakdown (for combined_shahjadas) ── */}
          {showDistribution && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '18px 22px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚖️</span> বণ্টনের বিবরণ / Distribution Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                {SHAHJADAS.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#b45309' }}>{toBanglaNumber(perPerson.toFixed(2))} ৳</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Signature & Seal Row ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginTop: '32px',
              marginBottom: '28px',
            }}
          >
            {/* Authorized Signature */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '1px dashed #9ca3af', marginBottom: '8px' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>অনুমোদনকারীর স্বাক্ষর</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>Authorized Signature</div>
            </div>

            {/* Official Seal */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '2px dashed #065f46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#065f46',
                  fontSize: '10px',
                  opacity: qrCodeUrl ? 1 : 0.5,
                  textAlign: 'center',
                  padding: qrCodeUrl ? '0px' : '8px',
                  lineHeight: '1.4',
                  marginBottom: '4px',
                  overflow: 'hidden',
                }}
              >
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>অফিসিয়াল<br />সিলমোহর<br />Official Seal</>
                )}
              </div>
            </div>

            {/* Receiver */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '1px dashed #9ca3af', marginBottom: '8px' }} />
              <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>গ্রাহকের স্বাক্ষর</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>Receiver's Signature</div>
            </div>
          </div>

          {/* ── Quranic Verse ── */}
          <div
            style={{
              textAlign: 'center',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px 24px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '20px', color: '#065f46', marginBottom: '6px' }}>
              إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ
            </div>
            <div style={{ fontSize: '13px', color: '#047857', fontStyle: 'italic' }}>
              "নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।" — সূরা আল-বাকারাহ: ১৯৫
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন। আমীন।
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              background: '#065f46',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
            }}
          >
            <div>
              <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '2px' }}>চন্দনাইশ দরবার শরীফ</div>
              <div style={{ opacity: 0.75 }}>chandanais-darbar-connect.vercel.app</div>
            </div>
            <div style={{ textAlign: 'center', opacity: 0.7 }}>
              এটি একটি কম্পিউটার জেনারেটেড রশিদ।<br />
              This is a computer-generated receipt.
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '2px' }}>যাচাই কোড</div>
              <div style={{ fontFamily: 'monospace', opacity: 0.85 }}>{verificationCode}</div>
            </div>
          </div>

        </div>{/* end content wrapper */}
      </div>
    </div>
  );
});

DonationInvoiceTemplate.displayName = 'DonationInvoiceTemplate';
