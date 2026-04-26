import React from 'react';

export interface CommitteeContribution {
  id: string;
  name: string;
  amount: number;
  area: string;
  target_month: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  note?: string;
}

interface Props {
  type: 'receipt' | 'report' | 'area-report';
  data: CommitteeContribution[];
  subtitle: string;
  meta?: {
    month?: string;
    totalAmount?: number;
    totalEntries?: number;
    stats?: any[];
    areas?: string[];
    contributionsByArea?: Record<string, CommitteeContribution[]>;
  };
}

export const CommitteeReportTemplate = React.forwardRef<HTMLDivElement, Props>(({ type, data, subtitle, meta }, ref) => {
  const formatMonthBn = (m: string) => {
    try {
      const [year, month] = m.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString("bn-BD", { month: "long", year: "numeric" });
    } catch { return m; }
  };

  return (
    <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', pointerEvents: 'none', zIndex: -9999 }}>
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          backgroundColor: '#ffffff',
          padding: '40px',
          fontFamily: "'Inter', 'Arial Unicode MS', sans-serif",
          position: 'relative',
          color: '#1a1a1a',
          boxSizing: 'border-box'
        }}
      >
        {/* Frame */}
        <div style={{ position: 'absolute', inset: '15px', border: '2px solid #d4af37', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: '20px', border: '1px solid rgba(212, 175, 55, 0.3)', pointerEvents: 'none' }} />

        {/* Header Block */}
        <div style={{ backgroundColor: '#212121', padding: '30px 20px', textAlign: 'center', position: 'relative', marginBottom: '30px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d4af37', marginBottom: '8px' }}>চন্দনাইশ দরবার শরীফ</div>
          <div style={{ fontSize: '13px', color: '#cccccc', letterSpacing: '1px' }}>
            চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | email: chandanaishdarbarsharif@gmail.com
          </div>
          <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', backgroundColor: '#d4af37' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'inline-block', borderBottom: '2px solid #d4af37', paddingBottom: '5px', fontSize: '20px', fontWeight: 'bold' }}>
            {subtitle}
          </div>
        </div>

        {/* Content based on type */}
        {type === 'receipt' && data[0] && (
          <div style={{ padding: '0 20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px', color: '#666' }}>
                <div>রসিদ নম্বর: <span style={{ color: '#333', fontWeight: 'bold' }}>#{data[0].id.slice(0,8).toUpperCase()}</span></div>
                <div>তারিখ: <span style={{ color: '#333' }}>{new Date(data[0].created_at).toLocaleDateString('bn-BD')}</span></div>
             </div>

             <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <tbody>
                  {[
                    ['দাতার নাম', data[0].name],
                    ['এলাকা/অবস্থান', data[0].area || 'N/A'],
                    ['সংগ্রহের মাস', formatMonthBn(data[0].target_month)],
                    ['টাকার পরিমাণ', data[0].amount.toLocaleString('bn-BD') + ' টাকা'],
                    ['পেমেন্ট মাধ্যম', data[0].payment_method || 'ক্যাশ'],
                    ['ট্রানজেকশন আইডি', data[0].transaction_id || 'N/A'],
                    ['বিশেষ মন্তব্য', data[0].note || '-']
                  ].map(([label, val], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px 10px', color: '#666', width: '200px' }}>{label}</td>
                      <td style={{ padding: '15px 10px', fontWeight: '600', color: label === 'টাকার পরিমাণ' ? '#b48c00' : '#333' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
             </table>

             <div style={{ backgroundColor: '#fffdf0', border: '1px solid #d4af37', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>সর্বমোট পরিশোধিত:</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#b48c00' }}>{data[0].amount.toLocaleString('bn-BD')} /-</div>
             </div>

             <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ borderTop: '1px solid #999', width: '150px', paddingTop: '5px', fontSize: '12px' }}>সদস্যের স্বাক্ষর</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ borderTop: '1px solid #999', width: '150px', paddingTop: '5px', fontSize: '12px' }}>কর্তৃপক্ষের স্বাক্ষর ও সিল</div>
                </div>
             </div>
          </div>
        )}

        {type === 'report' && (
          <div style={{ padding: '0 10px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                {meta?.stats?.map((s, i) => (
                  <div key={i} style={{ backgroundColor: '#f9f9f9', border: '1px solid #eee', padding: '15px', textAlign: 'center', borderRadius: '5px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>{s.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{s.value}</div>
                  </div>
                ))}
             </div>

             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#333', color: '#d4af37' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #444' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #444' }}>তারিখ</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #444' }}>নাম</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #444' }}>এলাকা</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #444' }}>মাস</th>
                    <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #444' }}>পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                      <td style={{ padding: '8px', border: '1px solid #eee' }}>{(i + 1).toLocaleString('bn-BD')}</td>
                      <td style={{ padding: '8px', border: '1px solid #eee' }}>{new Date(c.created_at).toLocaleDateString('bn-BD')}</td>
                      <td style={{ padding: '8px', border: '1px solid #eee' }}>{c.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #eee' }}>{c.area || '-'}</td>
                      <td style={{ padding: '8px', border: '1px solid #eee' }}>{formatMonthBn(c.target_month)}</td>
                      <td style={{ padding: '8px', border: '1px solid #eee', textAlign: 'right', fontWeight: 'bold' }}>{c.amount.toLocaleString('bn-BD')}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {type === 'area-report' && meta?.areas && meta?.contributionsByArea && (
          <div style={{ padding: '0 10px' }}>
             {meta.areas.map((areaName, idx) => {
               const ac = meta.contributionsByArea![areaName] || [];
               if (ac.length === 0) return null;
               const areaTotal = ac.reduce((sum, c) => sum + c.amount, 0);
               return (
                 <div key={idx} style={{ marginBottom: '30px' }}>
                    <div style={{ backgroundColor: '#333', color: '#d4af37', padding: '10px 15px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <div style={{ fontWeight: 'bold' }}>{(idx + 1).toLocaleString('bn-BD')}. {areaName}</div>
                       <div style={{ fontSize: '13px' }}>মোট: {areaTotal.toLocaleString('bn-BD')} টাকা</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                       <thead>
                         <tr style={{ borderBottom: '2px solid #eee' }}>
                           <th style={{ padding: '8px', textAlign: 'left' }}>তারিখ</th>
                           <th style={{ padding: '8px', textAlign: 'left' }}>নাম</th>
                           <th style={{ padding: '8px', textAlign: 'left' }}>মাস</th>
                           <th style={{ padding: '8px', textAlign: 'right' }}>পরিমাণ</th>
                         </tr>
                       </thead>
                       <tbody>
                         {ac.map((c, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                             <td style={{ padding: '6px 8px' }}>{new Date(c.created_at).toLocaleDateString('bn-BD')}</td>
                             <td style={{ padding: '6px 8px' }}>{c.name}</td>
                             <td style={{ padding: '6px 8px' }}>{formatMonthBn(c.target_month)}</td>
                             <td style={{ padding: '6px 8px', textAlign: 'right' }}>{c.amount.toLocaleString('bn-BD')}</td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 </div>
               );
             })}
          </div>
        )}

        {/* Footer Block */}
        <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
          <div style={{ borderTop: '1px solid #d4af37', paddingTop: '15px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
            এটি একটি কম্পিউটার জেনারেটেড ডকুমেন্ট। ডিজিটাল কপির জন্য কোনো স্বাক্ষর প্রয়োজন নেই। <br />
            চন্দনাইশ দরবার শরীফ কমিটি | তৈরির সময়: {new Date().toLocaleString('bn-BD')}
          </div>
        </div>

        {/* Watermark */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '80px', fontWeight: 'bold', color: 'rgba(212, 175, 55, 0.05)', whiteSpace: 'nowrap', zIndex: 0, pointerEvents: 'none' }}>
           চন্দনাইশ দরবার
        </div>
      </div>
    </div>
  );
});

CommitteeReportTemplate.displayName = 'CommitteeReportTemplate';
