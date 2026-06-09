import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { ensureBanglaFont, BANGLA_FONT_NAME } from './pdfFont';
// Lazy load the font base64 to avoid 267KB being in the main bundle
let _fontBase64Cache: string | null = null;
async function getFontBase64(): Promise<string> {
  if (_fontBase64Cache) return _fontBase64Cache;
  const mod = await import('@/fonts/bengaliFont');
  _fontBase64Cache = mod.default;
  return _fontBase64Cache;
}

// ---------- PDF Advanced Styling Helpers ----------
const PDF_COLORS = {
  headerBg: [18, 18, 18] as [number, number, number],
  headerBgLight: [35, 35, 35] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  accent: [180, 142, 73] as [number, number, number],
  accentLight: [212, 175, 95] as [number, number, number],
  accentDark: [140, 110, 55] as [number, number, number],
  successFill: [220, 252, 231] as [number, number, number],
  successText: [22, 101, 52] as [number, number, number],
  successBorder: [74, 222, 128] as [number, number, number],
  partialFill: [254, 249, 195] as [number, number, number],
  partialText: [133, 77, 14] as [number, number, number],
  partialBorder: [250, 204, 21] as [number, number, number],
  dueFill: [254, 226, 226] as [number, number, number],
  dueText: [153, 27, 27] as [number, number, number],
  dueBorder: [248, 113, 113] as [number, number, number],
  footerBg: [245, 245, 245] as [number, number, number],
  mutedText: [120, 120, 120] as [number, number, number],
  sectionBg: [250, 248, 243] as [number, number, number],
  borderLight: [230, 230, 230] as [number, number, number],
};

/** Draw subtle diagonal watermark pattern across entire page */
function drawWatermark(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.025 }));
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(40);
  doc.setTextColor(180, 142, 73);
  const text = 'Chandanaish Darbar Sharif';
  for (let y = 60; y < ph; y += 90) {
    for (let x = -30; x < pw + 30; x += 180) {
      doc.text(text, x, y, { angle: 35 });
    }
  }
  doc.restoreGraphicsState();
}

/** Draw decorative gold border frame on page edges */
function drawPageBorder(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.3);
  // Outer frame with small inset
  doc.rect(4, 4, pw - 8, ph - 8);
  // Inner subtle frame
  doc.setDrawColor(...PDF_COLORS.borderLight);
  doc.setLineWidth(0.15);
  doc.rect(6, 6, pw - 12, ph - 12);
}

/** Draw an organizational seal circle at given position */
function drawOrgSeal(doc: jsPDF, cx: number, cy: number, radius = 12) {
  // Outer ring
  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, radius);
  // Inner ring
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, radius - 2);
  // Center text
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.accent);
  doc.text('DARBAR', cx, cy - 1.5, { align: 'center' });
  doc.text('SHARIF', cx, cy + 2.5, { align: 'center' });
  // Outer ring text hint
  doc.setFontSize(4);
  doc.text('OFFICIAL SEAL', cx, cy + radius + 3, { align: 'center' });
}

/** Draw a compact horizontal progress bar */
function drawProgressBar(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  pct: number, label?: string,
) {
  const clamped = Math.max(0, Math.min(100, pct));
  // Background track
  doc.setFillColor(235, 235, 235);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  // Filled portion
  if (clamped > 0) {
    const fillW = (w * clamped) / 100;
    const fillColor: [number, number, number] =
      clamped >= 80 ? [34, 197, 94] : clamped >= 50 ? [250, 204, 21] : [239, 68, 68];
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, Math.max(h, fillW), h, h / 2, h / 2, 'F');
  }
  // Label
  if (label) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(label, x + w + 2, y + h - 0.5);
  }
}

/** Draw a section divider with label */
function drawSectionDivider(doc: jsPDF, y: number, label: string) {
  const pw = doc.internal.pageSize.getWidth();
  // Gold gradient stripe
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(14, y, pw - 28, 0.5, 'F');
  // Label chip
  const labelWidth = doc.getTextWidth(label) + 12;
  doc.setFillColor(255, 255, 255);
  doc.rect(pw / 2 - labelWidth / 2, y - 3, labelWidth, 6, 'F');
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.accent);
  doc.text(label, pw / 2, y + 1.5, { align: 'center' });
}

/** Draw verification stamp block */
function drawVerificationStamp(doc: jsPDF, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  const stampW = 65;
  const stampH = 28;
  const sx = pw - 14 - stampW;

  // Stamp border (dashed feel via double rect)
  doc.setDrawColor(...PDF_COLORS.successText);
  doc.setLineWidth(0.6);
  doc.rect(sx, y, stampW, stampH);
  doc.setLineWidth(0.2);
  doc.rect(sx + 1.5, y + 1.5, stampW - 3, stampH - 3);

  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.successText);
  doc.text('VERIFIED', sx + stampW / 2, y + 9, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('Digitally Generated & Verified', sx + stampW / 2, y + 14, { align: 'center' });
  doc.text(`Timestamp: ${new Date().toISOString().slice(0, 19)}`, sx + stampW / 2, y + 18, { align: 'center' });
  doc.text('Chandanaish Darbar Sharif', sx + stampW / 2, y + 22, { align: 'center' });

  // Authorized signature line (left side)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(14, y + stampH - 5, sx - 10, y + stampH - 5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text('Authorized Signature', 14, y + stampH);
}

function addPdfHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  extraLines: string[] = [],
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Dark header background
  doc.setFillColor(...PDF_COLORS.headerBg);
  doc.rect(0, 0, pageWidth, 45, 'F');
  // Main organization name (left)
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setTextColor(...PDF_COLORS.headerText);
  doc.setFontSize(16);
  doc.text('Chandanaish Darbar Sharif', 14, 18);
  // Subtitle (left)
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.accent);
  doc.text(subtitle, 14, 24);
  // Title (right)
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.headerText);
  doc.text(title, pageWidth - 14, 18, { align: 'right' });
  // Extra lines (left)
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.accent);
  extraLines.forEach((txt, idx) => {
    doc.text(txt, 14, 32 + idx * 6);
  });
}

function addPdfFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}

import { toBanglaNumber } from './bangla';
import { BANGLA_MONTHS } from './months';

/** Method labels in English. */
const METHOD_EN: Record<string, string> = {
  cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank: 'Bank Transfer', other: 'Other',
};
const methodLabel = (m?: string | null) =>
  METHOD_EN[String(m ?? '').toLowerCase()] ?? String(m ?? '-').toUpperCase();

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format an ISO date string as a human-friendly local date (DD MMM YYYY). */
function formatDateNice(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_EN_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
const MONTHS_EN_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export interface MemberLite {
  id?: string;
  member_code: string;
  full_name: string;
  phone: string | null;
  joined_date: string;
  monthly_rate: number;
  is_active?: boolean;
  area?: string | null;
}

/** Format a number as BDT with thousand separators (en-IN style ##,##,###). */
export function formatBDT(n: number): string {
  const v = Math.round(Number(n) || 0);
  return `BDT ${v.toLocaleString('en-IN')}`;
}



export interface PaymentLite {
  amount: number;
  for_year: number;
  for_month: number;
  payment_date: string;
  method: string;
  transaction_ref: string | null;
  status?: string;
}

/** Complete payment record with joined member data. */
export interface OrgPaymentRow extends PaymentLite {
  id: string;
  member_id: string;
  status?: string;
  members?: MemberLite | null;
}



/**
 * Build month-by-month status from join date to current month.
 */
export function buildMonthlyStatement(member: MemberLite, payments: PaymentLite[]) {
  const joinedDate = member.joined_date ? new Date(member.joined_date) : new Date();
  const join = isNaN(joinedDate.getTime()) ? new Date() : joinedDate;
  const now = new Date();
  const rows: { year: number; month: number; expected: number; paid: number; status: 'paid' | 'partial' | 'due' }[] = [];

  let y = join.getFullYear();
  let m = join.getMonth() + 1;
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  while (y < endY || (y === endY && m <= endM)) {
    const paid = payments
      .filter((p) => p.for_year === y && p.for_month === m && (p.status === 'approved' || !p.status))
      .reduce((s, p) => s + Number(p.amount), 0);
    const expected = Number(member.monthly_rate);
    const status: 'paid' | 'partial' | 'due' =
      paid >= expected ? 'paid' : paid > 0 ? 'partial' : 'due';
    rows.push({ year: y, month: m, expected, paid, status });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return rows;
}

export function calculateDues(member: MemberLite, payments: PaymentLite[]) {
  const rows = buildMonthlyStatement(member, payments);
  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const dueMonths = rows.filter((r) => r.status !== 'paid').length;
  return {
    totalExpected,
    totalPaid,
    dues: Math.max(0, totalExpected - totalPaid),
    dueMonths,
    rows,
  };
}

/**
 * Annual statement PDF — async (uses QR code generation).
 * Cover header on page 1 with Member Code, Name, Year, Generated date + QR.
 */
export async function downloadAnnualStatementPDF(member: MemberLite, payments: PaymentLite[], year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210; // A4 width in mm
  
  // ===== Build year rows =====
  const expected = Number(member.monthly_rate) || 0;
  const rows = MONTHS_EN.map((mn, idx) => {
    const monthNum = idx + 1;
    const monthPays = payments.filter((p) => p.for_year === targetYear && p.for_month === monthNum && (p.status === 'approved' || !p.status));
    const paid = monthPays.reduce((s, p) => s + Number(p.amount), 0);
    const status = paid >= expected ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';
    const ref = monthPays.map((p) => p.transaction_ref || p.method).join(', ') || '-';
    const date = monthPays[0]?.payment_date ?? '-';
    return [mn, formatBDT(expected), formatBDT(paid), status, date, ref, paid];
  });

  const totalPaidThisYear = rows.reduce((s, r) => s + (r[6] as number), 0);
  const totalExpectedThisYear = expected * 12;
  const balanceThisYear = totalExpectedThisYear - totalPaidThisYear;

  // QR for Annual
  const qrDataAn = `Member: ${member.member_code}\nYear: ${targetYear}\nName: ${member.full_name}`;
  let qrCodeUrl = '';
  try {
    qrCodeUrl = await QRCode.toDataURL(qrDataAn, { margin: 1, width: 100 });
  } catch (e) {
    console.warn(e);
  }

  // Lazy load the font for HTML embedding
  const fontBase64 = await getFontBase64();

  // Create HTML template for the annual statement with base64 font embedded
  const html = `
    <div id="statement-container" style="
      width: 794px; 
      min-height: 1120px;
      padding: 40px; 
      font-family: 'Noto Sans Bengali', sans-serif; 
      color: #1a1a1a; 
      background: white; 
      position: relative;
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
    ">
      <style>
        @font-face {
          font-family: 'Noto Sans Bengali';
          src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .value { color: #1e293b; font-size: 14px; font-weight: 700; }
        .data-row { display: flex; border-bottom: 1px solid #f1f5f9; padding: 8px 0; }
        .data-col { flex: 1; }
        
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: bold;
          font-size: 11px;
          text-align: center;
        }
        .status-paid { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
        .status-partial { background: #fffde7; color: #f57f17; border: 1px solid #fff9c4; }
        .status-due { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
      </style>
      
      <!-- Border decor -->
      <div style="position: absolute; inset: 15px; border: 1px solid #B48E49; pointer-events: none; opacity: 0.2;"></div>

      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; position: relative; z-index: 10;">
        <div>
          <h1 style="color: #B48E49; margin: 0; font-size: 26px; font-weight: 900; font-family: 'Noto Sans Bengali';">চন্দনাইশ দরবার শরীফ</h1>
          <p style="color: #64748b; margin: 3px 0 0 0; font-size: 12px; font-weight: bold; letter-spacing: 0.05em;">CHANDANAISH DARBAR SHARIF — ANNUAL STATEMENT</p>
          <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 11px;">চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | Silsila-e-Tariqaye Maizbhandaria</p>
        </div>
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #64748b;">বিবরণী বছর / Year</div>
            <div style="font-size: 18px; font-weight: bold; color: #B48E49;">${toBanglaNumber(targetYear)}</div>
          </div>
          ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 70px; height: 70px; border: 1px solid #f1f5f9; padding: 2px;" />` : ''}
        </div>
      </div>

      <!-- Section Title -->
      <div style="background: #0a2540; color: white; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 4px; margin-bottom: 20px; font-family: 'Noto Sans Bengali';">
        বার্ষিক সদস্য চাঁদা ও পেমেন্ট বিবরণী / Annual Contribution Statement
      </div>

      <!-- Member Details Box -->
      <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        <div>
          <div class="label">সদস্যের নাম / Name</div>
          <div class="value">${member.full_name}</div>
        </div>
        <div>
          <div class="label">সদস্য আইডি / Member ID</div>
          <div class="value" style="font-family: monospace; color: #B48E49;">${member.member_code}</div>
        </div>
        <div>
          <div class="label">মোবাইল নম্বর / Phone</div>
          <div class="value" style="font-family: monospace;">${toBanglaNumber(member.phone || "-")}</div>
        </div>
        <div>
          <div class="label">এলাকা / Area</div>
          <div class="value">${member.area || "-"}</div>
        </div>
        <div>
          <div class="label">মাসিক হার / Rate</div>
          <div class="value">${toBanglaNumber(member.monthly_rate || 0)} ৳ / মাস</div>
        </div>
        <div>
          <div class="label">যোগদানের তারিখ / Join Date</div>
          <div class="value">${toBanglaNumber(member.joined_date || "-")}</div>
        </div>
      </div>

      <!-- Summary Banner -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center;">
          <div class="label">প্রত্যাশিত মোট চাঁদা / Expected</div>
          <div style="font-size: 18px; font-weight: bold; color: #475569; margin-top: 4px;">${toBanglaNumber(totalExpectedThisYear)} ৳</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; text-align: center;">
          <div class="label" style="color: #166534;">মোট পরিশোধিত / Paid</div>
          <div style="font-size: 18px; font-weight: bold; color: #166534; margin-top: 4px;">${toBanglaNumber(totalPaidThisYear)} ৳</div>
        </div>
        <div style="background: ${balanceThisYear > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${balanceThisYear > 0 ? '#fca5a5' : '#bbf7d0'}; border-radius: 6px; padding: 12px; text-align: center;">
          <div class="label" style="color: ${balanceThisYear > 0 ? '#991b1b' : '#166534'};">${balanceThisYear > 0 ? 'বকেয়া পরিমাণ / Due' : 'স্ট্যাটাস / Status'}</div>
          <div style="font-size: 18px; font-weight: bold; color: ${balanceThisYear > 0 ? '#991b1b' : '#166534'}; margin-top: 4px;">
            ${balanceThisYear > 0 ? `${toBanglaNumber(balanceThisYear)} ৳` : 'CLEARED'}
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 15px; font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <span style="font-weight: bold; font-family: 'Noto Sans Bengali';">নির্দেশিকা:</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span class="status-badge status-paid" style="padding: 1px 6px; font-size: 9px;">PAID</span> সম্পূর্ণ পরিশোধিত</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span class="status-badge status-partial" style="padding: 1px 6px; font-size: 9px;">PARTIAL</span> আংশিক পরিশোধিত</span>
        <span style="display: flex; align-items: center; gap: 4px;"><span class="status-badge status-due" style="padding: 1px 6px; font-size: 9px;">DUE</span> বকেয়া</span>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
        <thead>
          <tr style="background: #0a2540; color: white; border-bottom: 2px solid #B48E49;">
            <th style="padding: 8px 10px; text-align: left;">মাস / Month</th>
            <th style="padding: 8px 10px; text-align: right;">ধার্যকৃত / Expected</th>
            <th style="padding: 8px 10px; text-align: right;">পরিশোধিত / Paid</th>
            <th style="padding: 8px 10px; text-align: center;">অবস্থা / Status</th>
            <th style="padding: 8px 10px; text-align: center;">তারিখ / Date</th>
            <th style="padding: 8px 10px; text-align: left;">মন্তব্য / Reference</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => {
            const monthBn = BANGLA_MONTHS[idx];
            const expVal = row[1] as string;
            const paidVal = row[2] as string;
            const status = row[3] as string;
            const dateVal = row[4] as string;
            const refVal = row[5] as string;
            const badgeClass = status === 'PAID' ? 'status-paid' : status === 'PARTIAL' ? 'status-partial' : 'status-due';
            
            return `
              <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                <td style="padding: 8px 10px; font-weight: bold; font-family: 'Noto Sans Bengali';">${monthBn} (${row[0]})</td>
                <td style="padding: 8px 10px; text-align: right;">${toBanglaNumber(expVal.replace('BDT ', ''))} ৳</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: bold;">${toBanglaNumber(paidVal.replace('BDT ', ''))} ৳</td>
                <td style="padding: 8px 10px; text-align: center;"><span class="status-badge ${badgeClass}">${status}</span></td>
                <td style="padding: 8px 10px; text-align: center; font-family: monospace;">${toBanglaNumber(dateVal)}</td>
                <td style="padding: 8px 10px; color: #64748b;">${refVal}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #e2e8f0; font-family: 'Noto Sans Bengali';">
            <td style="padding: 10px;">মোট বিবরণী (SUMMARY)</td>
            <td style="padding: 10px; text-align: right;">${toBanglaNumber(totalExpectedThisYear)} ৳</td>
            <td style="padding: 10px; text-align: right; color: #166534;">${toBanglaNumber(totalPaidThisYear)} ৳</td>
            <td style="padding: 10px; text-align: center; color: ${balanceThisYear > 0 ? '#c62828' : '#2e7d32'};">
              ${balanceThisYear > 0 ? `বকেয়া ${toBanglaNumber(balanceThisYear)} ৳` : 'CLEARED'}
            </td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures & Verification Block -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding: 0 10px;">
        <div style="text-align: center; width: 220px;">
          <div style="border-bottom: 1px dashed #cbd5e1; margin-bottom: 8px; height: 35px;"></div>
          <p style="font-size: 11px; color: #64748b; margin: 0; font-family: 'Noto Sans Bengali';">কর্তৃপক্ষের স্বাক্ষর</p>
          <p style="font-size: 9px; color: #94a3b8; margin: 0;">Authorized Signature</p>
        </div>
        
        <div style="text-align: center; border: 2px dashed #2e7d32; border-radius: 6px; padding: 8px 15px; background: #e8f5e9; color: #2e7d32; font-family: 'Noto Sans Bengali'; width: 220px;">
          <div style="font-size: 13px; font-weight: bold; margin-bottom: 2px;">ডিজিটাল যাচাইকৃত</div>
          <div style="font-size: 9px; color: #558b2f;">DIGITALLY VERIFIED</div>
          <div style="font-size: 8px; color: #64748b; margin-top: 4px; font-family: monospace;">Time: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}</div>
        </div>
      </div>

      <!-- Watermark background -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 80px; font-weight: 900; color: rgba(180, 142, 73, 0.03); letter-spacing: 5px; white-space: nowrap; pointer-events: none; user-select: none; z-index: 0;">
        CHANDANAISH DARBAR
      </div>

      <!-- Footer -->
      <div style="position: absolute; bottom: 35px; left: 40px; right: 40px; text-align: center; padding-top: 15px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8; font-family: 'Noto Sans Bengali';">
        <p style="margin: 0;">
          এটি চন্দনাইশ দরবার শরীফ ফিন্যান্স সিস্টেমের একটি অফিসিয়াল জেনারেটেড বার্ষিক হিসাব বিবরণী।
        </p>
        <p style="font-size: 8px; color: #cbd5e1; margin: 3px 0 0 0; font-family: monospace;">
          ID: CD-STAT-${member.member_code}-${targetYear} | Generated: ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;

  // Use jspdf's html method to render the PDF
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  try {
    await doc.html(container, {
      callback: function (doc) {
        doc.save(`statement-${member.member_code}-${targetYear}.pdf`);
      },
      x: 0,
      y: 0,
      width: pageWidth,
      windowWidth: 794
    });
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

/**
 * NEW: Professional Bank-style Transaction Statement for a Member.
 */
export async function downloadMemberBankStatementPDF(member: MemberLite, payments: PaymentLite[]) {
  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawPageBorder(doc);

  drawOrgHeader(
    doc,
    'MEMBER ACCOUNT STATEMENT',
    'Official Transaction Ledger'
  );

  // 2. MEMBER INFO BOX & QR
  const infoY = 60;
  const qrDataS = `Statement: ${member.member_code}\nMember: ${member.full_name}\nStatus: ${calculateDues(member, payments).dues > 0 ? 'Dues Pending' : 'Clear'}`;
  try {
    const qrDataUrlS = await QRCode.toDataURL(qrDataS, { margin: 1, width: 80 });
    doc.addImage(qrDataUrlS, 'PNG', pageWidth - 38, infoY - 8, 25, 25);
  } catch (e) { console.warn(e); }

  doc.setTextColor(0, 0, 0);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(11);
  doc.text('ACCOUNT HOLDER DETAILS', 14, infoY);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, infoY + 3, 100, infoY + 3);
  
  doc.setFontSize(9);
  doc.text(`Name: ${member.full_name}`, 14, infoY + 12);
  doc.text(`Member ID: ${member.member_code}`, 14, infoY + 18);
  doc.text(`Phone: ${member.phone || '-'}`, 14, infoY + 24);
  doc.text(`Area: ${member.area || '-'}`, 110, infoY + 12);
  doc.text(`Joined: ${member.joined_date}`, 110, infoY + 18);

  // 3. SUMMARY BANNER
  const stats = calculateDues(member, payments);
  const summaryY = infoY + 35;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(14, summaryY, pageWidth - 28, 20, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, summaryY, pageWidth - 28, 20);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL EXPECTED (CHARGES)', 18, summaryY + 8);
  doc.text('TOTAL PAID (CREDITS)', 80, summaryY + 8);
  doc.text('OUTSTANDING BALANCE', 145, summaryY + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(formatBDT(stats.totalExpected), 18, summaryY + 15);
  doc.setTextColor(22, 122, 50);
  doc.text(formatBDT(stats.totalPaid), 80, summaryY + 15);
  doc.setTextColor(stats.dues > 0 ? 180 : 22, stats.dues > 0 ? 24 : 122, stats.dues > 0 ? 24 : 50);
  doc.text(formatBDT(stats.dues), 145, summaryY + 15);

  // 4. TRANSACTION LEDGER
  const txs: any[] = [];
  
  // Add monthly charges
  stats.rows.forEach(r => {
    txs.push({
      date: `${r.year}-${String(r.month).padStart(2, '0')}-01`,
      desc: `${MONTHS_EN[r.month-1]} ${r.year} - Monthly Subscription`,
      ref: 'System Charge',
      debit: r.expected,
      credit: 0
    });
  });
  
  // Add payments
  payments.forEach(p => {
    if (p.status === 'approved' || !p.status) {
      txs.push({
        date: p.payment_date,
        desc: `${MONTHS_EN[p.for_month-1]} ${p.for_year} - Donation/Payment`,
        ref: p.transaction_ref || methodLabel(p.method),
        debit: 0,
        credit: p.amount
      });
    }
  });
  
  txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let runningDue = 0;
  const tableData = txs.map(t => {
    runningDue += (t.debit - t.credit);
    return [
      t.date,
      t.desc,
      t.ref,
      t.debit > 0 ? formatBDT(t.debit) : '',
      t.credit > 0 ? formatBDT(t.credit) : '',
      formatBDT(Math.max(0, runningDue))
    ];
  });

  autoTable(doc, {
    startY: summaryY + 28,
    head: [['Date', 'Description', 'Reference', 'Debit (Charge)', 'Credit (Pay)', 'Balance Due']],
    body: tableData,
    headStyles: { fillColor: [30, 30, 30], textColor: 255, font: BANGLA_FONT_NAME, fontSize: 9 },
    bodyStyles: { font: BANGLA_FONT_NAME, fontSize: 8.5 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    margin: { bottom: 25 },
    didDrawPage: (data) => {
      // Small header for overflow pages
      if (data.pageNumber > 1) {
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`Statement: ${member.full_name} (${member.member_code}) - Continued`, 14, 8);
      }
    }
  });

  stampFooters(doc, 'This is a computer generated bank statement. For any queries, contact the committee.');
  doc.save(`Statement-${member.member_code}.pdf`);
}

export async function downloadReceiptPDF(
  member: MemberLite,
  payment: PaymentLite & { id?: string },
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210; // A4 width in mm
  
  // Financial calculations
  const expected = Number(member.monthly_rate) || 0;
  const paidAmt = Number(payment.amount);
  const due = Math.max(0, expected - paidAmt);
  const status = paidAmt >= expected ? 'PAID' : paidAmt > 0 ? 'PARTIAL' : 'DUE';
  const statusLabel = status === 'PAID' ? 'PAID IN FULL' : status === 'PARTIAL' ? 'PARTIAL PAYMENT' : 'UNPAID';
  const statusColor = status === 'PAID' ? '#166534' : status === 'PARTIAL' ? '#854d0e' : '#991b1b';
  const statusBg = status === 'PAID' ? '#f0fdf4' : status === 'PARTIAL' ? '#fefce8' : '#fef2f2';
  
  const receiptNo = payment.id?.slice(0, 12).toUpperCase() ?? `RCT-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  // Generate QR Code as Data URL
  const qrData = `Receipt: ${payment.id || 'N/A'}\nMember: ${member.member_code}\nAmount: BDT ${payment.amount}\nDate: ${payment.payment_date}\nVerified: true`;
  let qrCodeUrl = '';
  try {
    qrCodeUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
  } catch (e) {
    console.warn("QR generation failed", e);
  }

  // Lazy load the font for HTML embedding
  const fontBase64 = await getFontBase64();

  // Create HTML template for the receipt
  const html = `
    <div id="receipt-container" style="
      width: 794px; 
      padding: 40px; 
      font-family: 'Noto Sans Bengali', sans-serif; 
      color: #1a1a1a; 
      background: white; 
      position: relative;
      border: 1px solid #e2e8f0;
    ">
      <style>
        @font-face {
          font-family: 'Noto Sans Bengali';
          src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .value { color: #1e293b; font-size: 15px; font-weight: 700; }
        .data-row { display: flex; border-bottom: 1px solid #f1f5f9; padding: 10px 0; }
        .data-col { flex: 1; }
      </style>

      <!-- Header with Border Decor -->
      <div style="position: absolute; top: 15px; left: 15px; right: 15px; bottom: 15px; border: 1px solid #B48E49; pointer-events: none; opacity: 0.2;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; position: relative; z-index: 10;">
        <div>
          <h1 style="color: #B48E49; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em;">চন্দনাইশ দরবার শরীফ</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 13px; font-weight: 500;">CHANDANAISH DARBAR SHARIF — OFFICIAL RECEIPT</p>
          <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 11px;">চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | ডিজিটাল পেমেন্ট রসিদ</p>
        </div>
        <img src="${qrCodeUrl}" style="width: 100px; height: 100px; border: 1px solid #f1f5f9; padding: 5px;" />
      </div>

      <div style="height: 4px; background: linear-gradient(to right, #B48E49, #dfbd7d, #B48E49); margin-bottom: 30px; border-radius: 2px;"></div>

      <!-- Amount Banner -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; position: relative; z-index: 10;">
        <div>
          <p class="label" style="margin-bottom: 5px;">পরিশোধিত টাকার পরিমাণ / Paid Amount</p>
          <p style="font-size: 32px; font-weight: 900; color: #B48E49; margin: 0;">${formatBDT(paidAmt)}</p>
        </div>
        <div style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40; padding: 8px 20px; border-radius: 99px; font-weight: 700; font-size: 14px;">
          ${statusLabel}
        </div>
      </div>

      <!-- Details Section -->
      <div style="margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
        <h3 style="margin: 0; font-size: 16px; color: #B48E49; letter-spacing: 0.1em;">MEMBER & TRANSACTION DETAILS</h3>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; position: relative; z-index: 10;">
        <div style="background: #fff; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
          <div style="margin-bottom: 15px;">
            <p class="label">রসিদ নম্বর / Receipt No</p>
            <p class="value" style="font-family: monospace;">${receiptNo}</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p class="label">সদস্যের নাম / Full Name</p>
            <p class="value">${member.full_name}</p>
          </div>
          <div>
            <p class="label">মোবাইল / Phone</p>
            <p class="value">${member.phone || '-'}</p>
          </div>
        </div>
        
        <div style="background: #fff; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
          <div style="margin-bottom: 15px;">
            <p class="label">সদস্য আইডি / Member ID</p>
            <p class="value">${member.member_code}</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p class="label">এলাকা / Area</p>
            <p class="value">${member.area || '-'}</p>
          </div>
          <div>
            <p class="label">মাসের নাম / Payment For</p>
            <p class="value">${MONTHS_EN[payment.for_month - 1]} ${payment.for_year}</p>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 60px;">
        <div class="data-row">
          <div class="data-col"><p class="label">নির্ধারিত চাঁদা / Monthly Rate</p></div>
          <div class="data-col" style="text-align: right;"><p class="value">${formatBDT(expected)}</p></div>
        </div>
        <div class="data-row">
          <div class="data-col"><p class="label">পরিশোধিত / Paid Amount</p></div>
          <div class="data-col" style="text-align: right;"><p class="value" style="color: #166534;">${formatBDT(paidAmt)}</p></div>
        </div>
        <div class="data-row" style="border: none;">
          <div class="data-col"><p class="label">বকেয়া / Due Amount</p></div>
          <div class="data-col" style="text-align: right;"><p class="value" style="color: ${due > 0 ? '#991b1b' : '#166534'};">${due > 0 ? formatBDT(due) : 'NIL'}</p></div>
        </div>
      </div>

      <!-- Verification Info -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;">
          <div style="width: 150px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">Authorized Signature</p>
        </div>
        
        <div style="text-align: center; opacity: 0.8;">
          <div style="width: 80px; height: 80px; border: 2px dashed #B48E49; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px;">
            <div style="text-align: center; font-size: 8px; color: #B48E49; font-weight: bold;">
              OFFICIAL<br/>SEAL
            </div>
          </div>
          <p style="font-size: 10px; color: #B48E49; font-weight: bold; margin: 0;">VERIFIED</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 50px; text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 10px; color: #94a3b8; margin: 0;">
          This is a computer-generated receipt. No manual signature is required.
        </p>
        <p style="font-size: 9px; color: #cbd5e1; margin: 5px 0 0 0;">
          Generated At: ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;

  // Use jspdf's html method to render the PDF
  // We create a temporary hidden div
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  try {
    await doc.html(container, {
      callback: function (doc) {
        doc.save(`receipt-${member.member_code}-${payment.for_year}-${payment.for_month}.pdf`);
      },
      x: 0,
      y: 0,
      width: pageWidth,
      windowWidth: 794 // 794px is exactly 210mm at 96dpi
    });
  } finally {
    // Always clean up the temporary DOM element, even if rendering fails
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Consolidated receipt for multiple months/payments.
 */
export async function downloadConsolidatedReceiptPDF(
  member: MemberLite,
  payments: (PaymentLite & { id?: string })[],
) {
  if (payments.length === 0) return;
  if (payments.length === 1) return downloadReceiptPDF(member, payments[0]);

  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Page border
  drawPageBorder(doc);

  drawOrgHeader(
    doc,
    'CONSOLIDATED PAYMENT RECEIPT',
    `Bulk Collection Statement - ${payments.length} Months`
  );

  // QR Code for Consolidated
  const qrDataC = `Bulk Receipt: ${payments.length} Months\nMember: ${member.member_code}\nTotal: BDT ${payments.reduce((s, p) => s + Number(p.amount), 0)}\nGenerated: ${new Date().toLocaleDateString()}`;
  try {
    const qrDataUrlC = await QRCode.toDataURL(qrDataC, { margin: 1, width: 100 });
    doc.addImage(qrDataUrlC, 'PNG', pageWidth - 40, 8, 28, 28);
  } catch (e) {
    console.warn("QR generation failed", e);
  }

  const expectedPerMonth = Number(member.monthly_rate) || 0;
  const totalExpected = expectedPerMonth * payments.length;
  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = Math.max(0, totalExpected - totalAmount);

  // ===== SUMMARY BANNER (Premium 3-column) =====
  const sumY = 60;
  const colW = (pageWidth - 28) / 3;

  // Total Paid box
  doc.setFillColor(...PDF_COLORS.successFill);
  doc.setDrawColor(...PDF_COLORS.successBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, sumY, colW - 2, 24, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL PAID', 18, sumY + 8);
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.successText);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(formatBDT(totalAmount), 18, sumY + 17);

  // Expected box
  const ex = 14 + colW;
  doc.setFillColor(...PDF_COLORS.sectionBg);
  doc.setDrawColor(...PDF_COLORS.borderLight);
  doc.roundedRect(ex, sumY, colW - 2, 24, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL EXPECTED', ex + 4, sumY + 8);
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(formatBDT(totalExpected), ex + 4, sumY + 17);

  // Due box
  const dueX = 14 + colW * 2;
  const dueColor = totalDue > 0 ? PDF_COLORS.dueFill : PDF_COLORS.successFill;
  const dueBorder = totalDue > 0 ? PDF_COLORS.dueBorder : PDF_COLORS.successBorder;
  const dueTextC = totalDue > 0 ? PDF_COLORS.dueText : PDF_COLORS.successText;
  doc.setFillColor(...dueColor);
  doc.setDrawColor(...dueBorder);
  doc.roundedRect(dueX, sumY, colW - 2, 24, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('OUTSTANDING', dueX + 4, sumY + 8);
  doc.setFontSize(13);
  doc.setTextColor(...dueTextC);
  doc.text(totalDue > 0 ? formatBDT(totalDue) : 'CLEARED', dueX + 4, sumY + 17);

  // Member info line
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Member: ${member.full_name} (${member.member_code}) | Area: ${member.area || '-'} | Phone: ${member.phone || '-'} | Rate: ${formatBDT(expectedPerMonth)}/month`, 14, sumY + 30);

  // ===== PAYMENT TABLE =====
  drawSectionDivider(doc, sumY + 36, 'PAYMENT BREAKDOWN');

  autoTable(doc, {
    startY: sumY + 42,
    head: [['#', 'Month', 'Expected', 'Paid', 'Due', 'Date', 'Method', 'Reference']],
    body: payments.map((p, idx) => {
      const pExpected = expectedPerMonth;
      const pPaid = Number(p.amount);
      const pDue = Math.max(0, pExpected - pPaid);
      const pStatus = pPaid >= pExpected ? 'PAID' : pPaid > 0 ? 'PARTIAL' : 'DUE';
      return [
        String(idx + 1),
        `${MONTHS_EN[p.for_month - 1]} ${p.for_year}`,
        formatBDT(pExpected),
        formatBDT(pPaid),
        pDue > 0 ? formatBDT(pDue) : '-',
        p.payment_date,
        methodLabel(p.method),
        p.transaction_ref || '-'
      ];
    }),
    headStyles: { fillColor: [30, 30, 30], font: BANGLA_FONT_NAME, textColor: 255, fontSize: 8 },
    bodyStyles: { font: BANGLA_FONT_NAME, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [...PDF_COLORS.accent] },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
    alternateRowStyles: { fillColor: [252, 250, 245] },
    foot: [['', 'GRAND TOTAL', formatBDT(totalExpected), formatBDT(totalAmount), totalDue > 0 ? formatBDT(totalDue) : 'CLEAR', '', '', '']],
    footStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', font: BANGLA_FONT_NAME },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Verification stamp + Org seal
  drawVerificationStamp(doc, finalY);
  drawOrgSeal(doc, pageWidth - 35, finalY + 14, 10);

  // Achievement progress bar
  const pct = totalExpected > 0 ? (totalAmount / totalExpected) * 100 : 100;
  drawProgressBar(doc, 14, finalY + 35, 100, 4, pct, `${Math.round(pct)}% Achievement`);

  // Watermark
  drawWatermark(doc);

  // Footer
  doc.setFillColor(248, 248, 248);
  doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(0, pageHeight - 16, pageWidth, 0.3, 'F');
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('Consolidated Receipt - Computer Generated & Verified | Chandanaish Darbar Sharif', pageWidth / 2, pageHeight - 8, { align: 'center' });

  doc.save(`receipt-bulk-${member.member_code}-${payments.length}-months.pdf`);
}

/* ===========================================================
   ORGANIZATION-WIDE REPORTS (all members)
   =========================================================== */

// Status colors aligned with /member-search print + statement legend
const COL_PAID_FILL: [number, number, number] = [231, 245, 236];
const COL_PAID_TEXT: [number, number, number] = [22, 117, 61];
const COL_PARTIAL_FILL: [number, number, number] = [253, 243, 214];
const COL_PARTIAL_TEXT: [number, number, number] = [160, 104, 0];
const COL_DUE_FILL: [number, number, number] = [253, 226, 226];
const COL_DUE_TEXT: [number, number, number] = [180, 24, 24];

function drawOrgHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Multi-layer header background (gradient effect via stacked rects)
  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pageWidth, 52, 'F');
  // Subtle lighter strip at bottom of header
  doc.setFillColor(25, 25, 25);
  doc.rect(0, 42, pageWidth, 10, 'F');

  // Gold accent stripe (thicker with subtle glow effect)
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(0, 52, pageWidth, 2.5, 'F');
  // Secondary thin gold line
  doc.setFillColor(...PDF_COLORS.accentDark);
  doc.rect(0, 54.5, pageWidth, 0.5, 'F');

  // Decorative corner elements on header
  doc.setDrawColor(...PDF_COLORS.accent);
  doc.setLineWidth(0.5);
  // Top-left corner bracket
  doc.line(8, 4, 8, 12);
  doc.line(8, 4, 20, 4);
  // Top-right corner bracket
  doc.line(pageWidth - 8, 4, pageWidth - 8, 12);
  doc.line(pageWidth - 8, 4, pageWidth - 20, 4);

  // Organization name — Bengali (primary)
  doc.setTextColor(255, 255, 255);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(17);
  doc.text('Chandanaish Darbar Sharif', 14, 15);

  // Organization name — English (secondary)
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text('OFFICIAL RECEIPT', 14, 20);

  // Tagline / Silsila
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.accent);
  doc.text('Silsila-E-Tariqa-e-Maizbhandaria', 14, 26);
  doc.text('Chandanaish, Chattogram | 01622-721996', 14, 31);

  // Document title (bottom of header)
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title, 14, 40);

  // Subtitle right-aligned
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.accentLight);
  doc.text(subtitle, pageWidth - 14, 40, { align: 'right' });

  // Date & Document ID (top-right)
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pageWidth - 14, 12, { align: 'right' },
  );
  // Document ID (short unique hash)
  const docId = `DOC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.text(`Ref: ${docId}`, pageWidth - 14, 16, { align: 'right' });
}

function drawStatusLegend(doc: jsPDF, yPos: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.rect(14, yPos, pageWidth - 28, 12);

  doc.setFontSize(9);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Legend:', 18, yPos + 7.5);

  doc.setFillColor(...COL_PAID_FILL);
  doc.rect(38, yPos + 3, 6, 6, 'F');
  doc.setTextColor(...COL_PAID_TEXT);
  doc.text('PAID', 46, yPos + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Full month paid', 60, yPos + 7.5);

  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFillColor(...COL_PARTIAL_FILL);
  doc.rect(108, yPos + 3, 6, 6, 'F');
  doc.setTextColor(...COL_PARTIAL_TEXT);
  doc.text('PARTIAL', 116, yPos + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Some amount paid', 134, yPos + 7.5);

  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFillColor(...COL_DUE_FILL);
  doc.rect(165, yPos + 3, 6, 6, 'F');
  doc.setTextColor(...COL_DUE_TEXT);
  doc.text('DUE', 173, yPos + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Unpaid', 184, yPos + 7.5);
}

// OrgPaymentRow is already exported above (line ~253).
// Re-export kept for backward compat if needed:
// export type { OrgPaymentRow };

/** Build a Map keyed by member.id → MemberLite for robust payment-to-member resolution. */
function buildMemberIndex(members: MemberLite[]): Map<string, MemberLite> {
  const idx = new Map<string, MemberLite>();
  for (const m of members) {
    if (m.id) idx.set(m.id, m);
  }
  return idx;
}

/** Filter members for org reports: optionally only active. */
function filterReportMembers(members: MemberLite[], activeOnly: boolean): MemberLite[] {
  return activeOnly ? members.filter((m) => m.is_active !== false) : members;
}

export interface MethodBreakdownRow {
  method: string;
  count: number;
  total: number;
}

export interface MemberMonthlyGridRow {
  member_code: string;
  full_name: string;
  /** length 12; values: 'paid' | 'partial' | 'due' | 'inactive' */
  grid: ('paid' | 'partial' | 'due' | 'inactive')[];
  expected: number;
  paid: number;
  due: number;
}

export interface OrgMonthlyTotals {
  members: number;
  expected: number;
  paid: number;
  due: number;
  paidCount: number;
  partialCount: number;
  dueCount: number;
  /** Sorted desc by total. */
  methodBreakdown: MethodBreakdownRow[];
}

export interface OrgAnnualTotals {
  members: number;
  expected: number;
  paid: number;
  due: number;
  monthsPaid: number;
  monthsPartial: number;
  monthsDue: number;
  /** Sorted desc by total. */
  methodBreakdown: MethodBreakdownRow[];
  /** 12-length aggregate of paid/partial/due/inactive month-counts across members. */
  monthGrid: { month: number; paid: number; partial: number; due: number; inactive: number }[];
  /** Per-member 12-month grid for preview (sorted by member_code). */
  memberGrid: MemberMonthlyGridRow[];
}

function aggregateMethodBreakdown(rows: OrgPaymentRow[]): MethodBreakdownRow[] {
  const map = new Map<string, MethodBreakdownRow>();
  for (const p of rows) {
    const key = (p.method || 'other').toLowerCase();
    const cur = map.get(key) ?? { method: key, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(p.amount) || 0;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Compute org-wide totals for a single month — used by preview modal. */
export function computeOrgMonthlyTotals(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  month: number,
  options: { activeOnly?: boolean } = {},
): OrgMonthlyTotals {
  const list = filterReportMembers(members, !!options.activeOnly);
  const allowedIds = new Set(list.map((m) => m.id).filter(Boolean) as string[]);
  let expected = 0, paid = 0, paidCount = 0, partialCount = 0, dueCount = 0;
  let count = 0;
  const targetKey = year * 12 + (month - 1);
  for (const m of list) {
    if (!m.joined_date) continue;
    const join = new Date(m.joined_date);
    if (isNaN(join.getTime())) continue;
    if (join.getFullYear() * 12 + join.getMonth() > targetKey) continue;
    count++;
    const rate = Number(m.monthly_rate);
    const memberPaid = payments
      .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === month && (p.status === 'approved' || !p.status))
      .reduce((s, p) => s + Number(p.amount), 0);
    expected += rate;
    paid += memberPaid;
    if (memberPaid >= rate) paidCount++;
    else if (memberPaid > 0) partialCount++;
    else dueCount++;
  }
  const methodBreakdown = aggregateMethodBreakdown(
    payments.filter(
      (p) => p.for_year === year && p.for_month === month && allowedIds.has(p.member_id),
    ),
  );
  return {
    members: count,
    expected,
    paid,
    due: Math.max(0, expected - paid),
    paidCount,
    partialCount,
    dueCount,
    methodBreakdown,
  };
}

/** Compute org-wide totals for a year — used by preview modal. */
export function computeOrgAnnualTotals(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: { activeOnly?: boolean } = {},
): OrgAnnualTotals {
  const list = filterReportMembers(members, !!options.activeOnly);
  const allowedIds = new Set(list.map((m) => m.id).filter(Boolean) as string[]);
  let expected = 0, paid = 0, monthsPaid = 0, monthsPartial = 0, monthsDue = 0, count = 0;
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
  const monthGrid = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, paid: 0, partial: 0, due: 0, inactive: 0,
  }));
  const memberGrid: MemberMonthlyGridRow[] = [];

  const sortedList = list.slice().sort((a, b) => a.member_code.localeCompare(b.member_code));
  for (const m of sortedList) {
    if (!m.joined_date) continue;
    const join = new Date(m.joined_date);
    if (isNaN(join.getTime())) continue;
    const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
    if (startMonth > 12) continue;
    count++;
    const rate = Number(m.monthly_rate);
    let mExpected = 0, mPaid = 0;
    const grid: MemberMonthlyGridRow['grid'] = [];
    for (let mo = 1; mo <= 12; mo++) {
      if (mo < startMonth || mo > endMonth) {
        monthGrid[mo - 1].inactive++;
        grid.push('inactive');
        continue;
      }
      const monthPaid = payments
        .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === mo && (p.status === 'approved' || !p.status))
        .reduce((s, p) => s + Number(p.amount), 0);
      mExpected += rate;
      mPaid += monthPaid;
      if (monthPaid >= rate) { monthsPaid++; monthGrid[mo - 1].paid++; grid.push('paid'); }
      else if (monthPaid > 0) { monthsPartial++; monthGrid[mo - 1].partial++; grid.push('partial'); }
      else { monthsDue++; monthGrid[mo - 1].due++; grid.push('due'); }
    }
    expected += mExpected;
    paid += mPaid;
    memberGrid.push({
      member_code: m.member_code,
      full_name: m.full_name,
      grid,
      expected: mExpected,
      paid: mPaid,
      due: Math.max(0, mExpected - mPaid),
    });
  }
  const methodBreakdown = aggregateMethodBreakdown(
    payments.filter((p) => p.for_year === year && allowedIds.has(p.member_id)),
  );
  return {
    members: count,
    expected,
    paid,
    due: Math.max(0, expected - paid),
    monthsPaid,
    monthsPartial,
    monthsDue,
    methodBreakdown,
    monthGrid,
    memberGrid,
  };
}

export interface OrgReportOptions {
  activeOnly?: boolean;
  /** Filename override (with or without .pdf extension). */
  filename?: string;
  /** Optional: only include this area in the report. */
  area?: string;
}

function safeFilename(name: string, fallback: string, ext = 'pdf'): string {
  const cleaned = (name || '').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  const base = cleaned || fallback;
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

/**
 * Render the monthly report into an existing jsPDF (so it can be reused in combined PDFs).
 * Adds a NEW PAGE if `appendPage` is true.
 */
async function renderOrgMonthlyReport(
  doc: jsPDF,
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  month: number,
  options: OrgReportOptions = {},
  appendPage = false,
) {
  if (appendPage) doc.addPage('a4', 'landscape');
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const list = filterReportMembers(members, !!options.activeOnly);
  const monthLabel = `${MONTHS_EN[month - 1]} ${year}`;

  drawOrgHeader(
    doc,
    `Monthly Collection Report — ${monthLabel}`,
    `${options.activeOnly ? 'Active members only' : 'All members'} | Total: ${list.length}`,
  );

  // QR for Monthly Summary
  const qrDataM = `Monthly Report: ${monthLabel}\nTotal Members: ${list.length}`;
  try {
    const qrDataUrlM = await QRCode.toDataURL(qrDataM, { margin: 1, width: 80 });
    doc.addImage(qrDataUrlM, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (e) { console.warn(e); }

  const rows: (string | number)[][] = [];
  let totExpected = 0, totPaid = 0;
  let nPaid = 0, nPartial = 0, nDue = 0;
  const targetKey = year * 12 + (month - 1);

  list
    .slice()
    .sort((a, b) => a.member_code.localeCompare(b.member_code))
    .forEach((m) => {
      if (!m.joined_date) return;
      const join = new Date(m.joined_date);
      if (isNaN(join.getTime())) return;
      if (join.getFullYear() * 12 + join.getMonth() > targetKey) return;

      const expected = Number(m.monthly_rate);
      const memberPays = payments.filter(
        (p) => p.member_id === m.id && p.for_year === year && p.for_month === month && (p.status === 'approved' || !p.status),
      );
      const paid = memberPays.reduce((s, p) => s + Number(p.amount), 0);
      const due = Math.max(0, expected - paid);
      const status = paid >= expected ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';
      const methods = memberPays.map((p) => p.method.toUpperCase()).join(', ') || '-';
      const refs = memberPays.map((p) => p.transaction_ref || '-').join(', ') || '-';

      totExpected += expected;
      totPaid += paid;
      if (status === 'PAID') nPaid++; else if (status === 'PARTIAL') nPartial++; else nDue++;

      rows.push([
        m.member_code, m.full_name, m.phone ?? '-',
        formatBDT(expected), formatBDT(paid), formatBDT(due),
        status, methods, refs,
      ]);
    });

  // Summary banner (Bank Style)
  const sumY = 46;
  doc.setFillColor(245, 245, 245);
  doc.rect(14, sumY, pageWidth - 28, 22, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, sumY, pageWidth - 28, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('MEMBERS', 18, sumY + 8);
  doc.text('EXPECTED', 50, sumY + 8);
  doc.text('COLLECTED', 100, sumY + 8);
  doc.text('DUE', 145, sumY + 8);
  doc.text('STATUS COUNTS', 190, sumY + 8);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(rows.length), 18, sumY + 16);
  doc.text(formatBDT(totExpected), 50, sumY + 16);
  doc.setTextColor(22, 122, 50);
  doc.text(formatBDT(totPaid), 100, sumY + 16);
  doc.setTextColor(totExpected - totPaid > 0 ? 180 : 22, totExpected - totPaid > 0 ? 24 : 122, totExpected - totPaid > 0 ? 24 : 50);
  doc.text(formatBDT(totExpected - totPaid), 145, sumY + 16);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Paid: ${nPaid} | Partial: ${nPartial} | Due: ${nDue}`, 190, sumY + 16);

  autoTable(doc, {
    startY: sumY + 32,
    head: [['Code', 'Name', 'Phone', 'Expected', 'Paid', 'Due', 'Status', 'Method', 'Ref']],
    body: rows,
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2, font: BANGLA_FONT_NAME },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center', fontStyle: 'bold' } },
    margin: { top: 22, left: 14, right: 14, bottom: 14 },
    showHead: 'everyPage',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const v = data.cell.raw as string;
        if (v === 'PAID') {
          data.cell.styles.textColor = COL_PAID_TEXT;
          data.cell.styles.fillColor = COL_PAID_FILL;
        } else if (v === 'DUE') {
          data.cell.styles.textColor = COL_DUE_TEXT;
          data.cell.styles.fillColor = COL_DUE_FILL;
        } else {
          data.cell.styles.textColor = COL_PARTIAL_TEXT;
          data.cell.styles.fillColor = COL_PARTIAL_FILL;
        }
      }
    },
    foot: [['TOTAL', '', '', formatBDT(totExpected), formatBDT(totPaid), formatBDT(Math.max(0, totExpected - totPaid)), '', '', '']],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
  });
}

function stampFooters(doc: jsPDF, label: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Subtle footer background strip
    doc.setFillColor(248, 248, 248);
    doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
    // Gold top border of footer
    doc.setFillColor(...PDF_COLORS.accent);
    doc.rect(0, pageHeight - 18, pageWidth, 0.4, 'F');

    // Left: organization name + label
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`Chandanaish Darbar Sharif | ${label}`, 14, pageHeight - 11);

    // Center: confidentiality notice
    doc.setFontSize(5.5);
    doc.setTextColor(165, 165, 165);
    doc.text(
      'This document is computer-generated and verified. No manual signature is required.',
      pageWidth / 2, pageHeight - 6, { align: 'center' },
    );

    // Right: page number
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 11, { align: 'right' });

    // Decorative bottom corners
    doc.setDrawColor(...PDF_COLORS.accent);
    doc.setLineWidth(0.3);
    // Bottom-left corner bracket
    doc.line(8, pageHeight - 4, 8, pageHeight - 10);
    doc.line(8, pageHeight - 4, 20, pageHeight - 4);
    // Bottom-right corner bracket
    doc.line(pageWidth - 8, pageHeight - 4, pageWidth - 8, pageHeight - 10);
    doc.line(pageWidth - 8, pageHeight - 4, pageWidth - 20, pageHeight - 4);

    // Draw watermark on every page
    drawWatermark(doc);
  }
}

/**
 * Org-wide MONTHLY report PDF — all members for a given Year + Month.
 */
export async function downloadOrgMonthlyReportPDF(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  month: number,
  options: OrgReportOptions = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  await renderOrgMonthlyReport(doc, members, payments, year, month, options, false);
  stampFooters(doc, 'Auto-generated organization-wide monthly report');
  doc.save(safeFilename(options.filename ?? '', `org-monthly-${year}-${String(month).padStart(2, '0')}`));
}

/**
 * Org-wide ALL-12-MONTHS combined PDF — one document, one page per month.
 * Each month always starts on a fresh page so long member lists never bleed
 * into the next month's section.
 */
export async function downloadOrgAllMonthsCombinedPDF(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: OrgReportOptions = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  for (let mo = 1; mo <= 12; mo++) {
    await renderOrgMonthlyReport(doc, members, payments, year, mo, options, mo > 1);
  }
  stampFooters(doc, `Auto-generated org-wide combined monthly report (${year})`);
  doc.save(safeFilename(options.filename ?? '', `org-monthly-combined-${year}`));
}

/**
 * Org-wide ANNUAL report PDF — all members for a given Year.
 * Includes a 12-month status grid (P/~/X/·) per member.
 */
export async function downloadOrgAnnualReportPDF(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: OrgReportOptions = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const list = filterReportMembers(members, !!options.activeOnly);

  drawOrgHeader(
    doc,
    `Annual Collection Report — ${year}`,
    `${options.activeOnly ? 'Active members only' : 'All members'} | Total: ${list.length}`,
  );

  const rows: (string | number)[][] = [];
  let totExpected = 0, totPaid = 0;
  let mPaid = 0, mPartial = 0, mDue = 0;
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

  list
    .slice()
    .sort((a, b) => a.member_code.localeCompare(b.member_code))
    .forEach((m) => {
      if (!m.joined_date) return;
      const join = new Date(m.joined_date);
      if (isNaN(join.getTime())) return;
      const rate = Number(m.monthly_rate);
      const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
      if (startMonth > 12) return;

      let expected = 0, paid = 0;
      const grid: string[] = [];
      for (let mo = 1; mo <= 12; mo++) {
        if (mo < startMonth || mo > endMonth) { grid.push('·'); continue; }
        const monthPays = payments.filter(
          (p) => p.member_id === m.id && p.for_year === year && p.for_month === mo && (p.status === 'approved' || !p.status),
        );
        const monthPaid = monthPays.reduce((s, p) => s + Number(p.amount), 0);
        expected += rate;
        paid += monthPaid;
        if (monthPaid >= rate) { grid.push('P'); mPaid++; }
        else if (monthPaid > 0) { grid.push('~'); mPartial++; }
        else { grid.push('X'); mDue++; }
      }

      const due = Math.max(0, expected - paid);
      totExpected += expected;
      totPaid += paid;

      rows.push([
        m.member_code, m.full_name, m.phone ?? '-',
        formatBDT(expected), formatBDT(paid), formatBDT(due),
        grid.join(' '),
      ]);
    });

  const sumY = 46;
  doc.setFillColor(245, 245, 245);
  doc.rect(14, sumY, pageWidth - 28, 22, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(14, sumY, pageWidth - 28, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('MEMBERS', 18, sumY + 8);
  doc.text('YEAR EXPECTED', 50, sumY + 8);
  doc.text('TOTAL PAID', 100, sumY + 8);
  doc.text('TOTAL DUE', 145, sumY + 8);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(rows.length), 18, sumY + 16);
  doc.text(formatBDT(totExpected), 50, sumY + 16);
  doc.setTextColor(22, 122, 50);
  doc.text(formatBDT(totPaid), 100, sumY + 16);
  doc.setTextColor(totExpected - totPaid > 0 ? 180 : 22, totExpected - totPaid > 0 ? 24 : 122, totExpected - totPaid > 0 ? 24 : 50);
  doc.text(formatBDT(totExpected - totPaid), 145, sumY + 16);

  autoTable(doc, {
    startY: sumY + 32,
    head: [['Code', 'Name', 'Phone', 'Expected', 'Paid', 'Due', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec']],
    body: rows,
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 9, font: BANGLA_FONT_NAME },
    bodyStyles: { fontSize: 8, cellPadding: 2, font: BANGLA_FONT_NAME },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { font: BANGLA_FONT_NAME, fontSize: 8 },
    },
    margin: { top: 14, left: 14, right: 14, bottom: 14 },
    showHead: 'everyPage',
    foot: [[
      'TOTAL', '', '',
      formatBDT(totExpected), formatBDT(totPaid), formatBDT(Math.max(0, totExpected - totPaid)),
      '',
    ]],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
  });

  stampFooters(doc, 'Auto-generated organization-wide annual report');
  doc.save(safeFilename(options.filename ?? '', `org-annual-${year}`));
}


/* ===========================================================
   CSV EXPORTS — org-wide totals + per-member rows
   =========================================================== */

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  // BOM so Excel reads UTF-8 (Bangla names) correctly.
  const csv = '\uFEFF' + rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(filename, 'report', 'csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Org-wide MONTHLY CSV: totals header + per-member rows + method breakdown. */
export function downloadOrgMonthlyReportCSV(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  month: number,
  options: OrgReportOptions = {},
) {
  const list = filterReportMembers(members, !!options.activeOnly);
  const totals = computeOrgMonthlyTotals(members, payments, year, month, options);
  const rows: (string | number)[][] = [];

  rows.push([`Monthly Collection Report — ${MONTHS_EN[month - 1]} ${year}`]);
  rows.push([`Scope`, options.activeOnly ? 'Active members only' : 'All members']);
  rows.push([`Generated`, new Date().toISOString().slice(0, 16).replace('T', ' ')]);
  rows.push([]);
  rows.push(['Members', 'Expected (BDT)', 'Paid (BDT)', 'Due (BDT)', 'PAID', 'PARTIAL', 'DUE']);
  rows.push([
    totals.members, totals.expected, totals.paid, totals.due,
    totals.paidCount, totals.partialCount, totals.dueCount,
  ]);
  rows.push([]);
  rows.push(['Member Code', 'Name', 'Phone', 'Expected (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Status', 'Methods', 'References']);

  const targetKey = year * 12 + (month - 1);
  list
    .slice()
    .sort((a, b) => a.member_code.localeCompare(b.member_code))
    .forEach((m) => {
      if (!m.joined_date) return;
      const join = new Date(m.joined_date);
      if (isNaN(join.getTime())) return;
      if (join.getFullYear() * 12 + join.getMonth() > targetKey) return;
      const expected = Number(m.monthly_rate);
      const memberPays = payments.filter(
        (p) => p.member_id === m.id && p.for_year === year && p.for_month === month && (p.status === 'approved' || !p.status),
      );
      const paid = memberPays.reduce((s, p) => s + Number(p.amount), 0);
      const due = Math.max(0, expected - paid);
      const status = paid >= expected ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';
      rows.push([
        m.member_code, m.full_name, m.phone ?? '',
        expected, paid, due, status,
        memberPays.map((p) => p.method.toUpperCase()).join(' | '),
        memberPays.map((p) => p.transaction_ref || '').join(' | '),
      ]);
    });

  if (totals.methodBreakdown.length) {
    rows.push([]);
    rows.push(['Payment Method Breakdown']);
    rows.push(['Method', 'Count', 'Total (BDT)']);
    totals.methodBreakdown.forEach((b) => rows.push([b.method.toUpperCase(), b.count, b.total]));
  }

  downloadCSV(rows, options.filename ?? `org-monthly-${year}-${String(month).padStart(2, '0')}`);
}

/** Org-wide ANNUAL CSV: totals + per-member 12-month status grid + method breakdown. */
export function downloadOrgAnnualReportCSV(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: OrgReportOptions = {},
) {
  const totals = computeOrgAnnualTotals(members, payments, year, options);
  const rows: (string | number)[][] = [];

  rows.push([`Annual Collection Report — ${year}`]);
  rows.push([`Scope`, options.activeOnly ? 'Active members only' : 'All members']);
  rows.push([`Generated`, new Date().toISOString().slice(0, 16).replace('T', ' ')]);
  rows.push([]);
  rows.push(['Members', 'Expected (BDT)', 'Paid (BDT)', 'Due (BDT)', 'Months PAID', 'PARTIAL', 'DUE']);
  rows.push([
    totals.members, totals.expected, totals.paid, totals.due,
    totals.monthsPaid, totals.monthsPartial, totals.monthsDue,
  ]);
  rows.push([]);
  rows.push([
    'Member Code', 'Name', 'Expected (BDT)', 'Paid (BDT)', 'Due (BDT)',
    ...MONTHS_EN.map((mn) => mn.slice(0, 3)),
  ]);
  totals.memberGrid.forEach((m) => {
    rows.push([
      m.member_code, m.full_name, m.expected, m.paid, m.due,
      ...m.grid.map((g) =>
        g === 'paid' ? 'PAID' : g === 'partial' ? 'PARTIAL' : g === 'due' ? 'DUE' : '-',
      ),
    ]);
  });

  if (totals.methodBreakdown.length) {
    rows.push([]);
    rows.push(['Payment Method Breakdown']);
    rows.push(['Method', 'Count', 'Total (BDT)']);
    totals.methodBreakdown.forEach((b) => rows.push([b.method.toUpperCase(), b.count, b.total]));
  }

  downloadCSV(rows, options.filename ?? `org-annual-${year}`);
}

/* ===========================================================
   AREA-BASED COLLECTION REPORT
   Groups members by their `area` field and produces per-area
   summary + per-member rows for a given Year (and optional Month).
   =========================================================== */

export interface AreaSummary {
  area: string;
  members: number;
  expected: number;
  paid: number;
  due: number;
}

const AREA_FALLBACK = 'Unspecified';
const normArea = (s?: any) => {
  if (typeof s !== 'string') s = String(s || '');
  const trimmed = s.trim();
  return trimmed || AREA_FALLBACK;
};

/** Compute per-area collection summary for a year (and optional month). */
export function computeAreaSummaries(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: { month?: number; activeOnly?: boolean } = {},
): AreaSummary[] {
  const list = filterReportMembers(members, !!options.activeOnly);
  const monthFilter = options.month;
  const map = new Map<string, AreaSummary>();
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

  for (const m of list) {
    const area = normArea(m.area);
    if (!m.joined_date) continue;
    const join = new Date(m.joined_date);
    if (isNaN(join.getTime())) continue;
    const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
    if (startMonth > 12) continue;

    const rate = Number(m.monthly_rate) || 0;
    let expected = 0, paid = 0;
    if (monthFilter) {
      if (monthFilter < startMonth) continue;
      expected = rate;
      paid = payments
        .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === monthFilter && (p.status === 'approved' || !p.status))
        .reduce((s, p) => s + Number(p.amount), 0);
    } else {
      const months = Math.max(0, endMonth - startMonth + 1);
      expected = rate * months;
      paid = payments
        .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month >= startMonth && p.for_month <= endMonth && (p.status === 'approved' || !p.status))
        .reduce((s, p) => s + Number(p.amount), 0);
    }

    const cur = map.get(area) ?? { area, members: 0, expected: 0, paid: 0, due: 0 };
    cur.members += 1;
    cur.expected += expected;
    cur.paid += paid;
    cur.due = Math.max(0, cur.expected - cur.paid);
    map.set(area, cur);
  }

  return Array.from(map.values()).sort((a, b) => b.expected - a.expected);
}

/** Org-wide AREA report PDF — grouped by member.area for a year (or year+month). */
export async function downloadAreaReportPDF(
  members: MemberLite[],
  payments: OrgPaymentRow[],
  year: number,
  options: OrgReportOptions & { month?: number } = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const list = filterReportMembers(members, !!options.activeOnly);
  const monthLabel = options.month ? `${MONTHS_EN[options.month - 1]} ${year}` : `${year}`;
  
  drawOrgHeader(
    doc,
    options.area ? `AREA COLLECTION: ${options.area.toUpperCase()}` : 'AREA COLLECTION SUMMARY',
    `Statement Period: ${monthLabel}`
  );

  // QR for Area Summary
  const qrDataA = `Area Report: ${monthLabel}\nMembers: ${list.length}\nGen: ${new Date().toLocaleDateString()}`;
  try {
    const qrDataUrlA = await QRCode.toDataURL(qrDataA, { margin: 1, width: 80 });
    doc.addImage(qrDataUrlA, 'PNG', pageWidth - 38, 10, 25, 25);
  } catch (e) { console.warn(e); }

  const summaries = computeAreaSummaries(members, payments, year, {
    month: options.month, activeOnly: options.activeOnly,
  });

  const totMembers = summaries.reduce((s, a) => s + a.members, 0);
  const totExpected = summaries.reduce((s, a) => s + a.expected, 0);
  const totPaid = summaries.reduce((s, a) => s + a.paid, 0);
  const totDue = Math.max(0, totExpected - totPaid);

  // 3. SUMMARY BOXES — Premium 4-column style
  const sumY = 46;
  const colW = (pageWidth - 28) / 4;
  
  // Members box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL MEMBERS', 18, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(String(totMembers), 18, sumY + 16);

  // Expected box
  const ex = 14 + colW;
  doc.setFillColor(255, 251, 235);
  doc.rect(ex, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.rect(ex, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('EXPECTED REVENUE', ex + 4, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(120, 95, 35);
  doc.text(formatBDT(totExpected), ex + 4, sumY + 16);

  // Collected box
  const col = 14 + colW * 2;
  doc.setFillColor(236, 253, 245);
  doc.rect(col, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.rect(col, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL COLLECTED', col + 4, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(22, 122, 50);
  doc.text(formatBDT(totPaid), col + 4, sumY + 16);

  // Due box
  const due = 14 + colW * 3;
  doc.setFillColor(254, 242, 242);
  doc.rect(due, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(252, 165, 165);
  doc.rect(due, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('OUTSTANDING DUE', due + 4, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(180, 24, 24);
  doc.text(formatBDT(totDue), due + 4, sumY + 16);

  // Per-area summary table
  autoTable(doc, {
    startY: sumY + 28,
    head: [['Area', 'Members', 'Expected', 'Collected', 'Due', 'Achievement']],
    body: summaries.map((a) => [
      a.area, a.members,
      formatBDT(a.expected), formatBDT(a.paid), formatBDT(a.due),
      a.expected > 0 ? `${Math.round((a.paid / a.expected) * 100)}%` : '—',
    ]),
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
    },
    foot: [[
      'TOTAL', totMembers, formatBDT(totExpected), formatBDT(totPaid), formatBDT(totDue),
      totExpected > 0 ? `${Math.round((totPaid / totExpected) * 100)}%` : '—',
    ]],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  // Per-area breakdown
  const groups = new Map<string, MemberLite[]>();
  for (const m of list) {
    const key = normArea(m.area);
    if (options.area && key !== options.area) continue;
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  
  const sortedAreas = options.area ? [options.area] : summaries.map((s) => s.area);
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

  for (const area of sortedAreas) {
    const areaMembers = (groups.get(area) ?? []).slice().sort((a, b) => a.member_code.localeCompare(b.member_code));
    if (areaMembers.length === 0) continue;
    doc.addPage('a4', 'landscape');

    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(`Area: ${area} — ${monthLabel}`, 14, 10);
    doc.setFontSize(9);
    doc.text(`Members: ${areaMembers.length}`, pageWidth - 14, 10, { align: 'right' });

    const areaRows: (string | number)[][] = [];
    let aExp = 0, aPaid = 0;
    for (const m of areaMembers) {
      if (!m.joined_date) continue;
      const join = new Date(m.joined_date);
      if (isNaN(join.getTime())) continue;
      const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
      if (startMonth > 12) continue;
      const rate = Number(m.monthly_rate) || 0;
      let expected = 0, paid = 0;
      if (options.month) {
        if (options.month < startMonth) continue;
        expected = rate;
        paid = payments.filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === options.month && (p.status === 'approved' || !p.status))
          .reduce((s, p) => s + Number(p.amount), 0);
      } else {
        expected = rate * Math.max(0, endMonth - startMonth + 1);
        paid = payments.filter((p) => p.member_id === m.id && p.for_year === year && p.for_month >= startMonth && p.for_month <= endMonth && (p.status === 'approved' || !p.status))
          .reduce((s, p) => s + Number(p.amount), 0);
      }
      const status = paid >= expected ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';
      const due = Math.max(0, expected - paid);
      aExp += expected; aPaid += paid;
      areaRows.push([m.member_code, m.full_name, m.phone ?? '-', formatBDT(expected), formatBDT(paid), formatBDT(due), status]);
    }

    autoTable(doc, {
      startY: 22,
      head: [['Code', 'Name', 'Phone', 'Expected', 'Paid', 'Due', 'Status']],
      body: areaRows,
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2, font: BANGLA_FONT_NAME },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'center', fontStyle: 'bold' } },
      margin: { top: 22, left: 14, right: 14, bottom: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const v = data.cell.raw as string;
          if (v === 'PAID') {
            data.cell.styles.textColor = COL_PAID_TEXT;
            data.cell.styles.fillColor = COL_PAID_FILL;
          } else if (v === 'DUE') {
            data.cell.styles.textColor = COL_DUE_TEXT;
            data.cell.styles.fillColor = COL_DUE_FILL;
          } else {
            data.cell.styles.textColor = COL_PARTIAL_TEXT;
            data.cell.styles.fillColor = COL_PARTIAL_FILL;
          }
        }
      },
      foot: [['TOTAL', '', '', formatBDT(aExp), formatBDT(aPaid), formatBDT(Math.max(0, aExp - aPaid)), '']],
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    });
  }

  stampFooters(doc, `Area Collection Report — ${monthLabel}`);
  doc.save(safeFilename(options.filename ?? '', options.area ? `area-${options.area}-${year}` : `area-all-${year}`));
}

// =============================================================
// Area-grouped PAYMENTS / EXPENSES exports (admin Records tab)
// =============================================================

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export interface AreaPaymentRow {
  id: string;
  amount: number | string;
  payment_date: string;
  for_year: number;
  for_month: number;
  method: string;
  transaction_ref?: string | null;
  members?: { full_name?: string | null; member_code?: string | null; area?: string | null } | null;
}

export interface AreaExpenseRow {
  id: string;
  title: string;
  amount: number | string;
  expense_date: string;
  category?: string | null;
  approved_by?: string | null;
  note?: string | null;
}

export interface AreaExportFilters {
  year?: number | null;
  month?: number | null;     // 1-12, null/undefined = all months
  area?: string | null;      // null/undefined or '__all__' = all areas
  filename?: string;
}

const UNASSIGNED_AREA = '— Unassigned Area —';

function filterLabel(filters: AreaExportFilters): string {
  const parts: string[] = [];
  if (filters.year) parts.push(`Year ${filters.year}`);
  if (filters.month) parts.push(`Month ${MONTH_SHORT[filters.month - 1]}`);
  if (filters.area && filters.area !== '__all__') parts.push(`Area: ${filters.area}`);
  return parts.length ? parts.join(' • ') : 'All records';
}

function areaSlug(filters: AreaExportFilters, kind: 'payments' | 'expenses'): string {
  const y = filters.year ?? 'all';
  const m = filters.month ? String(filters.month).padStart(2, '0') : 'all';
  const a = filters.area && filters.area !== '__all__' ? filters.area.replace(/\s+/g, '-') : 'all';
  return `area-${kind}-${y}-${m}-${a}`;
}

/**
 * EXPENSES PDF grouped by category, honoring year/month filters.
 * (Expenses don't link to members, so "area" filter is intentionally ignored
 *  and a note is shown in the header when one was set.)
 */
export async function downloadAreaExpensesPDF(
  rows: AreaExpenseRow[],
  filters: AreaExportFilters = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);

  const filtered = rows.filter((e) => {
    const d = new Date(e.expense_date);
    if (filters.year && d.getFullYear() !== filters.year) return false;
    if (filters.month && d.getMonth() + 1 !== filters.month) return false;
    return true;
  });

  const subtitle = filters.area && filters.area !== '__all__'
    ? `${filterLabel({ ...filters, area: null })} (area filter ignored — expenses are org-wide)`
    : filterLabel(filters);

  drawOrgHeader(doc, 'Category-grouped Expenses Report', subtitle);

  // Group by category
  const groups = new Map<string, AreaExpenseRow[]>();
  for (const e of filtered) {
    const key = (e.category ?? '').trim() || '— Uncategorized —';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const sortedCats = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  const yCursor = 48;
  let grandTotal = 0;
  let grandCount = 0;

  if (filtered.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No expense records match the selected filters.', 14, yCursor + 4);
  }

  sortedCats.forEach((cat, idx) => {
    const items = groups.get(cat)!;
    const subtotal = items.reduce((s, e) => s + Number(e.amount || 0), 0);
    grandTotal += subtotal;
    grandCount += items.length;

    const startY = idx === 0 ? yCursor : (doc as any).lastAutoTable?.finalY + 10 || yCursor;

    // Section banner — Modern Glassy look
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(14, startY - 7, doc.internal.pageSize.getWidth() - 28, 10, 'FD');
    doc.setTextColor(51, 65, 85);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.text(`CATEGORY: ${cat.toUpperCase()}`, 18, startY);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Records: ${items.length} | Subtotal: ${formatBDT(subtotal)}`,
      doc.internal.pageSize.getWidth() - 18, startY,
      { align: 'right' },
    );

    autoTable(doc, {
      startY: startY + 5,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Title', 'Approved By', 'Note', 'Amount']],
      body: items.map((e) => [
        e.expense_date,
        e.title,
        e.approved_by ?? '-',
        e.note ?? '-',
        formatBDT(Number(e.amount || 0)),
      ]),
      foot: [['', '', '', 'Subtotal', formatBDT(subtotal)]],
      styles: { font: BANGLA_FONT_NAME, fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 26 },
        4: { cellWidth: 30, halign: 'right' },
      },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
  });

  if (filtered.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? yCursor;
    const gY = lastY + 10;
    doc.setFillColor(30, 30, 30);
    doc.rect(14, gY - 6, doc.internal.pageSize.getWidth() - 28, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(
      `Categories: ${sortedCats.length}   Records: ${grandCount}   Grand Total: ${formatBDT(grandTotal)}`,
      doc.internal.pageSize.getWidth() / 2, gY + 1,
      { align: 'center' },
    );
  }

  stampFooters(doc, `Category-grouped expenses — ${filterLabel({ ...filters, area: null })}`);
  doc.save(safeFilename(filters.filename ?? '', areaSlug(filters, 'expenses')));
}

/**
 * AREA RANKING PDF — Groups areas by total collection and ranks them.
 */
export async function downloadAreaRankingPDF(
  summaries: AreaSummary[],
  year: number,
  month?: number,
) {
  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const monthLabel = month ? `${MONTHS_EN[month - 1]} ${year}` : `${year}`;

  drawPageBorder(doc);

  drawOrgHeader(
    doc,
    `Area Collection Ranking — ${monthLabel}`,
    `Ranked by total collections (Highest first).`,
  );

  // QR for Ranking
  const qrDataR = `Ranking: ${monthLabel}\nTotal: ${formatBDT(summaries.reduce((s,a)=>s+a.paid,0))}`;
  try {
    const qrDataUrlR = await QRCode.toDataURL(qrDataR, { margin: 1, width: 80 });
    doc.addImage(qrDataUrlR, 'PNG', pageWidth - 35, 10, 25, 25);
  } catch (e) { console.warn(e); }

  const totMembers = summaries.reduce((s, a) => s + a.members, 0);
  const totExpected = summaries.reduce((s, a) => s + a.expected, 0);
  const totPaid = summaries.reduce((s, a) => s + a.paid, 0);
  const totDue = Math.max(0, totExpected - totPaid);

  // 3. SUMMARY BOXES — Premium 3-column style
  const sumY = 46;
  const colW = (pageWidth - 28) / 3;
  
  // Areas box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL AREAS', 18, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(String(summaries.length), 18, sumY + 16);

  // Members box
  const ex = 14 + colW;
  doc.setFillColor(236, 253, 245);
  doc.rect(ex, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.rect(ex, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL MEMBERS', ex + 4, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(22, 122, 50);
  doc.text(String(totMembers), ex + 4, sumY + 16);

  // Collection box
  const col = 14 + colW * 2;
  doc.setFillColor(255, 251, 235);
  doc.rect(col, sumY, colW - 2, 22, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.rect(col, sumY, colW - 2, 22);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL COLLECTION', col + 4, sumY + 8);
  doc.setFontSize(11);
  doc.setTextColor(120, 95, 35);
  doc.text(formatBDT(totPaid), col + 4, sumY + 16);

  autoTable(doc, {
    startY: sumY + 30,
    head: [['Rank', 'Area Name', 'Member Count', 'Collected Amount', '% Achievement']],
    body: summaries.map((a, i) => [
      `#${i + 1}`,
      a.area,
      a.members,
      formatBDT(a.paid),
      a.expected > 0 ? `${Math.round((a.paid / a.expected) * 100)}%` : '—',
    ]),
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [180, 142, 73] },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
    foot: [[
      '', 'TOTAL', totMembers, formatBDT(totPaid),
      totExpected > 0 ? `${Math.round((totPaid / totExpected) * 100)}%` : '—',
    ]],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
  });

  // ===== VISUAL PROGRESS BARS FOR EACH AREA =====
  const barStartY = ((doc as any).lastAutoTable?.finalY ?? sumY + 80) + 10;
  if (barStartY < doc.internal.pageSize.getHeight() - 60 && summaries.length > 0) {
    drawSectionDivider(doc, barStartY, 'ACHIEVEMENT OVERVIEW');
    let barY = barStartY + 8;
    const barW = pageWidth - 70;
    summaries.slice(0, 10).forEach((a, i) => {
      const pct = a.expected > 0 ? (a.paid / a.expected) * 100 : 0;
      doc.setFont(BANGLA_FONT_NAME, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(`#${i + 1} ${a.area}`, 14, barY + 3);
      drawProgressBar(doc, 55, barY, barW, 3.5, pct, `${Math.round(pct)}%`);
      barY += 7;
    });
  }

  // Org seal
  drawOrgSeal(doc, pageWidth - 25, doc.internal.pageSize.getHeight() - 35, 10);

  stampFooters(doc, `Area Ranking Report — ${monthLabel}`);
  doc.save(safeFilename('', `area-ranking-${year}${month ? '-' + month : ''}`));
}

/**
 * NEW: Organization-wide Bank Statement / General Ledger.
 */
export async function downloadOrganizationStatementPDF(
  payments: OrgPaymentRow[],
  expenses: AreaExpenseRow[],
  year: number,
  month?: number
) {
  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();

  drawPageBorder(doc);
  
  const period = month ? `${MONTHS_EN[month-1]} ${year}` : `Full Year ${year}`;

  drawOrgHeader(
    doc,
    'ORGANIZATION GENERAL LEDGER STATEMENT',
    `Statement Period: ${period}`
  );

  // QR for Ledger
  const qrDataL = `Ledger: ${period}\nGen: ${new Date().toLocaleDateString()}\nStatus: Official Verified`;
  try {
    const qrDataUrlL = await QRCode.toDataURL(qrDataL, { margin: 1, width: 80 });
    doc.addImage(qrDataUrlL, 'PNG', pageWidth - 38, 10, 25, 25);
  } catch (e) { console.warn(e); }

  // 2. DATA PREPARATION
  interface TxRow { date: string; desc: string; cat: string; ref: string; credit: number; debit: number; monthKey: string; }
  const txs: TxRow[] = [];
  
  // Build a member map for fast lookup
  const memberMap = new Map<string, MemberLite>();
  payments.forEach(p => {
    if ((p as any).members && !memberMap.has(p.member_id)) {
      memberMap.set(p.member_id, (p as any).members as any);
    }
  });

  payments.filter(p => 
    p.for_year === year && (!month || p.for_month === month) && (p.status === 'approved' || !p.status)
  ).forEach(p => {
    const m = (p as any).members || memberMap.get(p.member_id);
    txs.push({
      date: p.payment_date || '-',
      desc: m ? `Member Subscription: ${m.full_name} (${m.member_code})` : `Member Subscription [${p.member_id.slice(0,8)}]`, 
      cat: 'Income',
      ref: p.transaction_ref || methodLabel(p.method),
      credit: Number(p.amount),
      debit: 0,
      monthKey: p.payment_date ? p.payment_date.slice(0,7) : `${year}-${String(p.for_month).padStart(2,'0')}`,
    });
  });
  
  expenses.filter(e => {
    if (!e.expense_date) return false;
    const d = new Date(e.expense_date);
    return !isNaN(d.getTime()) && d.getFullYear() === year && (!month || (d.getMonth() + 1) === month);
  }).forEach(e => {
    txs.push({
      date: e.expense_date,
      desc: e.title || 'Expense',
      cat: e.category || 'General Expense',
      ref: e.approved_by || '-',
      credit: 0,
      debit: Number(e.amount || 0),
      monthKey: (e.expense_date || '').slice(0,7) || `${year}-01`,
    });
  });
  
  txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute totals
  const totalIn = txs.reduce((s, t) => s + t.credit, 0);
  const totalOut = txs.reduce((s, t) => s + t.debit, 0);
  const netBalance = totalIn - totalOut;
  const txCount = txs.length;
  const incomeCount = txs.filter(t => t.credit > 0).length;
  const expenseCount = txs.filter(t => t.debit > 0).length;

  // 3. SUMMARY BANNER — Professional 4-column grid
  const sumY = 56;
  const colW = (pageWidth - 28) / 4;
  
  // Income box
  doc.setFillColor(236, 253, 245);
  doc.rect(14, sumY, colW - 2, 28, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.rect(14, sumY, colW - 2, 28);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL INCOME (CREDITS)', 16, sumY + 8);
  doc.setFontSize(12);
  doc.setTextColor(22, 122, 50);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(formatBDT(totalIn), 16, sumY + 17);
  doc.setFontSize(7);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text(`${incomeCount} transactions`, 16, sumY + 23);

  // Expense box
  const ex = 14 + colW;
  doc.setFillColor(254, 242, 242);
  doc.rect(ex, sumY, colW - 2, 28, 'F');
  doc.setDrawColor(239, 68, 68);
  doc.rect(ex, sumY, colW - 2, 28);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL EXPENSE (DEBITS)', ex + 2, sumY + 8);
  doc.setFontSize(12);
  doc.setTextColor(180, 24, 24);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(formatBDT(totalOut), ex + 2, sumY + 17);
  doc.setFontSize(7);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text(`${expenseCount} transactions`, ex + 2, sumY + 23);

  // Net Balance box
  const nb = 14 + colW * 2;
  const isProfit = netBalance >= 0;
  doc.setFillColor(isProfit ? 240 : 254, isProfit ? 253 : 242, isProfit ? 244 : 242);
  doc.rect(nb, sumY, colW - 2, 28, 'F');
  doc.setDrawColor(isProfit ? 180 : 220, isProfit ? 142 : 50, isProfit ? 73 : 50);
  doc.rect(nb, sumY, colW - 2, 28);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('NET BALANCE', nb + 2, sumY + 8);
  doc.setFontSize(14);
  doc.setTextColor(isProfit ? 22 : 180, isProfit ? 122 : 24, isProfit ? 50 : 24);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(formatBDT(netBalance), nb + 2, sumY + 17);
  doc.setFontSize(7);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text(isProfit ? 'SURPLUS' : 'DEFICIT', nb + 2, sumY + 23);

  // Ratio box
  const rb = 14 + colW * 3;
  doc.setFillColor(248, 248, 248);
  doc.rect(rb, sumY, colW - 2, 28, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(rb, sumY, colW - 2, 28);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('EXPENSE RATIO', rb + 2, sumY + 8);
  const ratio = totalIn > 0 ? Math.round((totalOut / totalIn) * 100) : 0;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.text(`${ratio}%`, rb + 2, sumY + 17);
  doc.setFontSize(7);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text(`${txCount} total entries`, rb + 2, sumY + 23);

  // 4. BUILD TABLE DATA with running balance
  let balance = 0;
  const tableData = txs.map(t => {
    balance += (t.credit - t.debit);
    return [
      formatDateNice(t.date),
      t.desc,
      t.cat,
      t.ref,
      t.credit > 0 ? formatBDT(t.credit) : '',
      t.debit > 0 ? formatBDT(t.debit) : '',
      formatBDT(balance),
      t.credit, // hidden — used for cell coloring
      t.debit,  // hidden
    ];
  });

  // 5. TRANSACTION TABLE
  autoTable(doc, {
    startY: sumY + 34,
    head: [['Date', 'Description', 'Category', 'Ref / Approved', 'Credit (+)', 'Debit (−)', 'Running Balance']],
    body: tableData.map(r => r.slice(0, 7)),
    headStyles: { fillColor: [30, 30, 30], textColor: 255, font: BANGLA_FONT_NAME, fontSize: 8.5 },
    bodyStyles: { font: BANGLA_FONT_NAME, fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, fontSize: 7 },
      3: { cellWidth: 24, fontSize: 7 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { bottom: 22, left: 14, right: 14 },
    showHead: 'everyPage',
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        // Color credit cells green
        if (data.column.index === 4 && tableData[rowIdx]?.[7]) {
          data.cell.styles.textColor = [22, 122, 50];
        }
        // Color debit cells red
        if (data.column.index === 5 && tableData[rowIdx]?.[8]) {
          data.cell.styles.textColor = [180, 24, 24];
        }
        // Color balance based on value
        if (data.column.index === 6) {
          let runBal = 0;
          for (let i = 0; i <= rowIdx; i++) {
            runBal += ((tableData[i]?.[7] as number) || 0) - ((tableData[i]?.[8] as number) || 0);
          }
          data.cell.styles.textColor = runBal >= 0 ? [22, 122, 50] : [180, 24, 24];
        }
      }
    },
    foot: [[
      '', '', '', 'CLOSING TOTALS',
      formatBDT(totalIn),
      formatBDT(totalOut),
      formatBDT(netBalance),
    ]],
    footStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', font: BANGLA_FONT_NAME },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont(BANGLA_FONT_NAME, 'normal');
        doc.text(`Chandanaish Darbar Sharif — Ledger (${period}) — Continued`, 14, 9);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, 9, { align: 'right' });
      }
    },
  });

  // 6. MONTHLY BREAKDOWN TABLE (if showing full year)
  if (!month && txs.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 200;
    const breakdownY = lastY + 12;

    // Check if we need a new page
    if (breakdownY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
    }
    const startBreakdownY = breakdownY > doc.internal.pageSize.getHeight() - 60 ? 20 : breakdownY;

    doc.setFillColor(245, 238, 220);
    doc.rect(14, startBreakdownY - 6, pageWidth - 28, 10, 'F');
    doc.setTextColor(120, 95, 35);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(10);
    doc.text('MONTHLY BREAKDOWN SUMMARY', 18, startBreakdownY);

    const monthlyMap = new Map<number, { income: number; expense: number; count: number }>();
    for (let mo = 1; mo <= 12; mo++) monthlyMap.set(mo, { income: 0, expense: 0, count: 0 });

    txs.forEach(t => {
      const moNum = parseInt((t.monthKey || '').split('-')[1] || '0', 10);
      if (moNum >= 1 && moNum <= 12) {
        const cur = monthlyMap.get(moNum)!;
        cur.income += t.credit;
        cur.expense += t.debit;
        cur.count += 1;
      }
    });

    const monthRows = Array.from(monthlyMap.entries()).map(([mo, d]) => [
      MONTHS_EN[mo - 1],
      d.count > 0 ? formatBDT(d.income) : '-',
      d.count > 0 ? formatBDT(d.expense) : '-',
      d.count > 0 ? formatBDT(d.income - d.expense) : '-',
      d.count > 0 ? String(d.count) : '-',
    ]);

    autoTable(doc, {
      startY: startBreakdownY + 6,
      head: [['Month', 'Income', 'Expense', 'Net', 'Transactions']],
      body: monthRows,
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 9, font: BANGLA_FONT_NAME },
      bodyStyles: { fontSize: 8.5, font: BANGLA_FONT_NAME },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const raw = String(data.cell.raw ?? '');
          if (raw === '-') return; // skip placeholder cells
          // Extract numeric value: strip 'BDT', commas, spaces
          const cleaned = raw.replace(/BDT/gi, '').replace(/,/g, '').trim();
          const numericVal = Number(cleaned);
          if (!isNaN(numericVal) && numericVal < 0) {
            data.cell.styles.textColor = [180, 24, 24];
          } else if (!isNaN(numericVal)) {
            data.cell.styles.textColor = [22, 122, 50];
          }
        }
      },
      foot: [['TOTAL', formatBDT(totalIn), formatBDT(totalOut), formatBDT(netBalance), String(txCount)]],
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });
  }

  // No transactions at all
  if (txs.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No financial transactions recorded for this period.', pageWidth / 2, sumY + 50, { align: 'center' });
  }

  stampFooters(doc, `Official Ledger Statement — ${period} — Chandanaish Darbar Sharif`);
  doc.save(`Ledger-${year}${month ? '-' + month : ''}.pdf`);
}

/**
 * NEW: Area-wise Payment Records PDF.
 */
export async function downloadAreaPaymentsPDF(
  payments: OrgPaymentRow[],
  options: { year: number; month: number | null }
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const { year, month } = options;
  const monthLabel = month ? `${MONTHS_EN[month - 1]} ${year}` : `Year ${year}`;

  drawOrgHeader(doc, 'Area Payment Records', `Official Collection Log — ${monthLabel}`);

  // Group by area
  const areaGroups = new Map<string, OrgPaymentRow[]>();
  payments.filter(p => p.for_year === year && (!month || p.for_month === month) && (p.status === 'approved' || !p.status)).forEach(p => {
    const a = (p as any).members?.area || 'General';
    const arr = areaGroups.get(a) ?? [];
    arr.push(p);
    areaGroups.set(a, arr);
  });

  const sortedAreas = Array.from(areaGroups.keys()).sort();
  
  if (sortedAreas.length === 0) {
    doc.setFontSize(12);
    doc.text('No payment records found for this period.', pageWidth / 2, 80, { align: 'center' });
    doc.save(`Area-Payments-${year}.pdf`);
    return;
  }

  sortedAreas.forEach((area, idx) => {
    if (idx > 0) doc.addPage('a4', 'landscape');
    
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.text(`Area: ${area} — ${monthLabel}`, 14, 9);

    const areaP = areaGroups.get(area)!;
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Member Code', 'Name', 'Month/Year', 'Amount', 'Method', 'Reference']],
      body: areaP.map(p => [
        formatDateNice(p.payment_date || ''),
        (p as any).members?.member_code || '-',
        (p as any).members?.full_name || '-',
        `${MONTHS_EN[p.for_month - 1]} ${p.for_year}`,
        formatBDT(p.amount),
        methodLabel(p.method),
        p.transaction_ref || '-'
      ]),
      headStyles: { fillColor: [60, 60, 60], textColor: 255, font: BANGLA_FONT_NAME, fontSize: 9 },
      bodyStyles: { font: BANGLA_FONT_NAME, fontSize: 8.5 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
    });
  });

  stampFooters(doc, `Area Payment Records — Generated ${new Date().toLocaleDateString()}`);
  doc.save(`Area-Payments-${year}${month ? '-' + month : ''}.pdf`);
}
