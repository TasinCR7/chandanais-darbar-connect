import React from 'react';
import { format } from 'date-fns';

const formatBDT = (amount: number) => {
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
};

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

interface MemberLite {
  member_code: string;
  full_name: string;
  phone?: string;
  area?: string;
  monthly_rate: number;
}

interface PaymentLite {
  id?: string;
  amount: number;
  for_month: number;
  for_year: number;
  payment_date: string;
  method: string;
  transaction_ref?: string;
  status?: string;
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, { member: MemberLite, payment: PaymentLite }>(({ member, payment }, ref) => {
  return (
    <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
      <div ref={ref} style={{ width: '595px', padding: '40px', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #b48e49', paddingBottom: '15px' }}>
          <h1 style={{ fontSize: '28px', margin: '0 0 5px 0', color: '#1a1a1a' }}>চন্দনাইশ দরবার শরীফ</h1>
          <p style={{ fontSize: '14px', margin: '0', color: '#b48e49', fontWeight: 'bold' }}>সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
          <p style={{ fontSize: '12px', margin: '5px 0 0 0', color: '#666' }}>চন্দনাইশ, চট্টগ্রাম | হটলাইন: ০১৬২২-৭২১৯৯৬</p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', margin: '0', textDecoration: 'underline' }}>চাঁদা রসিদ</h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <tbody>
            {[
              ['রসিদ নং', payment.id?.slice(0, 12).toUpperCase() ?? '-'],
              ['তারিখ', payment.payment_date],
              ['সদস্যের নাম', member.full_name],
              ['সদস্য আইডি', member.member_code],
              ['চাঁদার ধরন', 'মাসিক'],
              ['মাস/বছর', `${MONTHS_BN[payment.for_month - 1]} ${payment.for_year}`],
              ['পরিমাণ', `${payment.amount} টাকা`],
              ['পেমেন্ট মাধ্যম', payment.method],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: '8px', border: '1px solid #ddd', width: '40%', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>{label}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '150px', borderTop: '1px solid #000', paddingTop: '5px', fontSize: '12px' }}>সদস্যের স্বাক্ষর</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '150px', borderTop: '1px solid #000', paddingTop: '5px', fontSize: '12px' }}>গ্রহণকারীর স্বাক্ষর</div>
          </div>
        </div>
        
        <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px', color: '#999', borderTop: '1px dashed #ddd', paddingTop: '10px' }}>
          এটি একটি ডিজিটাল রসিদ। চন্দনাইশ দরবার শরীফ কানেক্ট সিস্টেম দ্বারা তৈরি।
        </div>
      </div>
    </div>
  );
});

export const AnnualStatementTemplate = React.forwardRef<HTMLDivElement, { member: MemberLite, payments: PaymentLite[], year: number }>(({ member, payments, year }, ref) => {
  const expected = Number(member.monthly_rate);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpected = expected * 12;

  return (
    <div style={{ position: 'fixed', top: '-20000px', left: '-20000px' }}>
      <div ref={ref} style={{ width: '794px', padding: '50px', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1a1a1a', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '32px', margin: '0' }}>চন্দনাইশ দরবার শরীফ</h1>
            <p style={{ color: '#b48e49', fontWeight: 'bold', margin: '5px 0' }}>সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</p>
            <p style={{ fontSize: '12px', color: '#666' }}>চন্দনাইশ, চট্টগ্রাম | ০১৬২২-৭২১৯৯৬</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '20px', margin: '0' }}>অ্যানুয়াল স্টেটমেন্ট</h2>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>বছর: {year}</p>
            <p style={{ fontSize: '12px', color: '#999' }}>তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', borderBottom: '1px solid #eee' }}>সদস্যের তথ্য</h3>
            <p style={{ margin: '5px 0' }}><b>নাম:</b> {member.full_name}</p>
            <p style={{ margin: '5px 0' }}><b>আইডি:</b> {member.member_code}</p>
            <p style={{ margin: '5px 0' }}><b>এলাকা:</b> {member.area || '-'}</p>
          </div>
          <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fcfaf5' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', borderBottom: '1px solid #eee' }}>হিসাব সারসংক্ষেপ</h3>
            <p style={{ margin: '5px 0' }}><b>মোট ধার্য:</b> {formatBDT(totalExpected)}</p>
            <p style={{ margin: '5px 0', color: 'green' }}><b>মোট জমা:</b> {formatBDT(totalPaid)}</p>
            <p style={{ margin: '5px 0', color: totalExpected > totalPaid ? 'red' : 'green' }}>
              <b>অবশিষ্ট:</b> {formatBDT(Math.max(0, totalExpected - totalPaid))}
            </p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
              <th style={{ padding: '10px', border: '1px solid #000' }}>মাস</th>
              <th style={{ padding: '10px', border: '1px solid #000' }}>ধার্য</th>
              <th style={{ padding: '10px', border: '1px solid #000' }}>জমা</th>
              <th style={{ padding: '10px', border: '1px solid #000' }}>অবস্থা</th>
              <th style={{ padding: '10px', border: '1px solid #000' }}>তারিখ</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS_BN.map((m, idx) => {
              const monthNum = idx + 1;
              const monthPaid = payments.filter(p => p.for_month === monthNum).reduce((s, p) => s + p.amount, 0);
              const status = monthPaid >= expected ? 'পেইড' : monthPaid > 0 ? 'আংশিক' : 'বকেয়া';
              const statusColor = status === 'পেইড' ? '#e7f5ec' : status === 'আংশিক' ? '#fdf3d6' : '#fde2e2';
              const textColor = status === 'পেইড' ? '#16753d' : status === 'আংশিক' ? '#a06800' : '#b41818';

              return (
                <tr key={m}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{m}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{expected}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{monthPaid}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', backgroundColor: statusColor, color: textColor, fontWeight: 'bold' }}>
                    {status}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {payments.find(p => p.for_month === monthNum)?.payment_date || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <p>এটি একটি ডিজিটাল স্টেটমেন্ট। কোনো অসংগতি থাকলে অনুগ্রহ করে কমিটির সাথে যোগাযোগ করুন।</p>
          <p style={{ marginTop: '10px', fontWeight: 'bold' }}>চন্দনাইশ দরবার শরীফ | www.chandanais-darbar.com</p>
        </div>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
AnnualStatementTemplate.displayName = 'AnnualStatementTemplate';
