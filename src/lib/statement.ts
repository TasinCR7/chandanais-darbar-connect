import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { ensureBanglaFont, setBanglaFontStyle, BANGLA_FONT_NAME } from './pdfFont';
import { toBanglaNumber } from './bangla';
import { BANGLA_MONTHS } from './months';

/** Method labels in Bangla — used in every PDF for consistency. */
const METHOD_BN: Record<string, string> = {
  cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', rocket: 'রকেট', bank: 'ব্যাংক', other: 'অন্যান্য',
};
const methodLabel = (m?: string | null) =>
  METHOD_BN[String(m ?? '').toLowerCase()] ?? String(m ?? '-').toUpperCase();

const MONTHS_BN = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
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

/** Same as formatBDT but uses the ৳ symbol — preferred inside PDFs once the
 * Bangla font is loaded (the symbol still renders in the Bangla font). */
function formatTk(n: number): string {
  const v = Math.round(Number(n) || 0);
  return `৳ ${v.toLocaleString('en-IN')}`;
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

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build month-by-month status from join date to current month.
 */
export function buildMonthlyStatement(member: MemberLite, payments: PaymentLite[]) {
  const join = new Date(member.joined_date);
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
  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ===== COVER HEADER =====
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 52, 'F');

  // QR code (top-right of header)
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(
      `MEMBER:${member.member_code}|YEAR:${targetYear}|NAME:${member.full_name}`,
      { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } },
    );
  } catch { /* ignore */ }

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 40, 5, 34, 34, 'F');
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 38, 7, 30, 30);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(16);
  doc.text('চন্দনাইশ দরবার শরীফ', 14, 14);
  doc.setFontSize(10);
  doc.text('Chandanaish Darbar Sharif', 14, 21);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(11);
  doc.text(`বার্ষিক বিবরণী — ${targetYear}`, 14, 30);
  doc.setFontSize(9);
  doc.text(`তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, 14, 37);

  // Member info inside header
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(11);
  doc.text(`সদস্য কোড: ${member.member_code}`, 14, 46);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(10);
  doc.text(`${member.full_name}`, 80, 46);

  // ===== MEMBER INFO BLOCK =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const yPos = 62;
  doc.text(`ফোন: ${member.phone ?? '-'}`, 14, yPos);
  doc.text(`যোগদান: ${member.joined_date}`, 14, yPos + 6);
  doc.text(`মাসিক চাঁদা: ${formatTk(member.monthly_rate)}`, 110, yPos);
  doc.text(`বিবরণীর বছর: ${targetYear}`, 110, yPos + 6);

  // ===== Build year rows =====
  const expected = Number(member.monthly_rate);
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

  // Strip helper numeric column from rows for rendering
  const renderRows = rows.map((r) => r.slice(0, 6));

  // ===== SUMMARY BANNER =====
  const summaryY = yPos + 16;
  doc.setFillColor(248, 244, 235);
  doc.rect(14, summaryY, pageWidth - 28, 22, 'F');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Year Expected: ${formatBDT(totalExpectedThisYear)}`, 18, summaryY + 8);
  doc.setTextColor(22, 122, 50);
  doc.text(`Total Paid: ${formatBDT(totalPaidThisYear)}`, 80, summaryY + 8);
  if (balanceThisYear > 0) {
    doc.setTextColor(200, 30, 30);
    doc.text(`Due: ${formatBDT(balanceThisYear)}`, 145, summaryY + 8);
  } else {
    doc.setTextColor(22, 122, 50);
    doc.text(`Status: CLEARED`, 145, summaryY + 8);
  }
  doc.setTextColor(80, 80, 80);
  doc.text(`Cleared: ${rows.filter(r => r[3] === 'PAID').length} / 12`, 18, summaryY + 17);
  doc.text(`Partial: ${rows.filter(r => r[3] === 'PARTIAL').length}`, 80, summaryY + 17);
  doc.text(`Due: ${rows.filter(r => r[3] === 'DUE').length}`, 145, summaryY + 17);

  // ===== STATUS LEGEND =====
  const legendY = summaryY + 26;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.rect(14, legendY, pageWidth - 28, 12);

  doc.setFontSize(9);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Legend:', 18, legendY + 7.5);

  // PAID swatch
  doc.setFillColor(231, 245, 236);
  doc.rect(38, legendY + 3, 6, 6, 'F');
  doc.setTextColor(22, 117, 61);
  doc.text('PAID', 46, legendY + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Full month paid', 60, legendY + 7.5);

  // PARTIAL swatch
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFillColor(253, 243, 214);
  doc.rect(108, legendY + 3, 6, 6, 'F');
  doc.setTextColor(160, 104, 0);
  doc.text('PARTIAL', 116, legendY + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Some amount paid', 134, legendY + 7.5);

  // DUE swatch
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFillColor(253, 226, 226);
  doc.rect(165, legendY + 3, 6, 6, 'F');
  doc.setTextColor(180, 24, 24);
  doc.text('DUE', 173, legendY + 7.5);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('= Unpaid', 184, legendY + 7.5);

  autoTable(doc, {
    startY: legendY + 16,
    head: [['মাস (Month)', 'প্রত্যাশিত', 'পরিশোধিত', 'অবস্থা', 'তারিখ', 'রেফারেন্স']],
    body: renderRows,
    headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 10, font: BANGLA_FONT_NAME },
    bodyStyles: { fontSize: 9, font: BANGLA_FONT_NAME },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const v = data.cell.raw as string;
        if (v === 'PAID') {
          data.cell.styles.textColor = [22, 117, 61];
          data.cell.styles.fillColor = [231, 245, 236];
        } else if (v === 'DUE') {
          data.cell.styles.textColor = [180, 24, 24];
          data.cell.styles.fillColor = [253, 226, 226];
        } else {
          data.cell.styles.textColor = [160, 104, 0];
          data.cell.styles.fillColor = [253, 243, 214];
        }
        data.cell.styles.fontStyle = 'bold';
      }
    },
    foot: [[
      'মোট (TOTAL)',
      formatTk(totalExpectedThisYear),
      formatTk(totalPaidThisYear),
      totalPaidThisYear >= totalExpectedThisYear ? 'সম্পূর্ণ' : `বকেয়া ${formatTk(totalExpectedThisYear - totalPaidThisYear)}`,
      '', ''
    ]],
    footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold', font: BANGLA_FONT_NAME },
  });

  // ===== Footer =====
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text(
    `সদস্য কোড: ${member.member_code} | QR কোড দিয়ে যাচাই করুন`,
    14,
    pageHeight - 10,
  );
  doc.text('চন্দনাইশ দরবার শরীফ — স্বয়ংক্রিয় বিবরণী', pageWidth - 14, pageHeight - 10, { align: 'right' });

  doc.save(`statement-${member.member_code}-${targetYear}.pdf`);
}

export async function downloadReceiptPDF(
  member: MemberLite,
  payment: PaymentLite & { id?: string },
) {
  const doc = new jsPDF();
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(16);
  doc.text('চন্দনাইশ দরবার শরীফ', pageWidth / 2, 12, { align: 'center' });
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(12);
  doc.text('পেমেন্ট রশিদ (Payment Receipt)', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, pageWidth / 2, 29, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(11);
  let y = 48;
  const line = (k: string, v: string) => {
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.text(`${k}:`, 18, y);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.text(v, 75, y);
    y += 9;
  };
  line('রশিদ নং', payment.id?.slice(0, 8).toUpperCase() ?? '-');
  line('সদস্য কোড', member.member_code);
  line('সদস্যের নাম', member.full_name);
  line('পরিমাণ', formatTk(payment.amount));
  line('মাস', `${MONTHS_BN[payment.for_month - 1]} ${payment.for_year}`);
  line('পেমেন্ট তারিখ', payment.payment_date);
  line('পদ্ধতি', methodLabel(payment.method));
  line('রেফারেন্স', payment.transaction_ref ?? '-');

  // Divider line
  y += 6;
  doc.setDrawColor(180, 142, 73);
  doc.setLineWidth(0.5);
  doc.line(18, y, pageWidth - 18, y);
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.text('অনুমোদিত স্বাক্ষর: _____________________', 18, y + 10);
  doc.text('চন্দনাইশ দরবার শরীফ — স্বয়ংক্রিয় রশিদ', 18, y + 22);

  doc.save(`receipt-${member.member_code}-${payment.for_year}-${payment.for_month}.pdf`);
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
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(14);
  doc.text('চন্দনাইশ দরবার শরীফ', 14, 12);
  doc.setFontSize(9);
  doc.text('Chandanaish Darbar Sharif', 14, 18);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(11);
  doc.text(title, 14, 27);
  doc.setFontSize(9);
  doc.text(subtitle, 14, 34);
  doc.text(
    `তারিখ: ${new Date().toLocaleDateString('bn-BD')}`,
    pageWidth - 14, 12, { align: 'right' },
  );
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    pageWidth - 14, 18, { align: 'right' },
  );
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

export interface OrgPaymentRow extends PaymentLite {
  member_id: string;
  status?: string;
}

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
    const join = new Date(m.joined_date);
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
    const join = new Date(m.joined_date);
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

  drawOrgHeader(
    doc,
    `Monthly Collection Report — ${MONTHS_EN[month - 1]} ${year}`,
    `${options.activeOnly ? 'Active members only' : 'All members'} | Total: ${list.length}`,
  );

  const rows: (string | number)[][] = [];
  let totExpected = 0, totPaid = 0;
  let nPaid = 0, nPartial = 0, nDue = 0;
  const targetKey = year * 12 + (month - 1);

  list
    .slice()
    .sort((a, b) => a.member_code.localeCompare(b.member_code))
    .forEach((m) => {
      const join = new Date(m.joined_date);
      if (join.getFullYear() * 12 + join.getMonth() > targetKey) return;

      const expected = Number(m.monthly_rate);
      const memberPays = payments.filter(
        (p) => p.member_id === m.id && p.for_year === year && p.for_month === month,
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

  // Summary banner
  const sumY = 46;
  doc.setFillColor(248, 244, 235);
  doc.rect(14, sumY, pageWidth - 28, 22, 'F');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Members: ${rows.length}`, 18, sumY + 8);
  doc.text(`Expected: ${formatBDT(totExpected)}`, 60, sumY + 8);
  doc.setTextColor(22, 117, 61);
  doc.text(`Paid: ${formatBDT(totPaid)}`, 130, sumY + 8);
  if (totExpected - totPaid > 0) {
    doc.setTextColor(180, 24, 24);
    doc.text(`Due: ${formatBDT(totExpected - totPaid)}`, 200, sumY + 8);
  } else {
    doc.setTextColor(22, 117, 61);
    doc.text(`Status: CLEARED`, 200, sumY + 8);
  }
  doc.setTextColor(80, 80, 80);
  doc.text(`PAID: ${nPaid}`, 18, sumY + 17);
  doc.text(`PARTIAL: ${nPartial}`, 60, sumY + 17);
  doc.text(`DUE: ${nDue}`, 130, sumY + 17);

  drawStatusLegend(doc, sumY + 26);

  const tableStartY = sumY + 42;
  let firstPageRendered = false;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Code', 'Name', 'Phone', 'Expected', 'Paid', 'Due', 'Status', 'Method', 'Ref']],
    body: rows,
    headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
    },
    // Reserve space at top of overflow pages so the repeated section header
    // never collides with the table head, and avoid splitting a row across pages.
    margin: { top: 22, left: 14, right: 14, bottom: 14 },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
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
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: () => {
      // Skip the first page — it already has the full cover header.
      if (!firstPageRendered) { firstPageRendered = true; return; }
      const pw = doc.internal.pageSize.getWidth();
      doc.setFillColor(180, 142, 73);
      doc.rect(0, 0, pw, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(BANGLA_FONT_NAME, 'bold');
      doc.setFontSize(10);
      doc.text(
        `Monthly Collection — ${MONTHS_EN[month - 1]} ${year} (continued)`,
        14, 9,
      );
      doc.setFont(BANGLA_FONT_NAME, 'normal');
      doc.setFontSize(8);
      doc.text(
        `${options.activeOnly ? 'Active members only' : 'All members'}`,
        pw - 14, 9, { align: 'right' },
      );
      doc.setTextColor(0, 0, 0);
    },
    foot: [[
      'TOTAL', '', '',
      formatBDT(totExpected), formatBDT(totPaid), formatBDT(Math.max(0, totExpected - totPaid)),
      '', '', '',
    ]],
    footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold' },
  });
}

function stampFooters(doc: jsPDF, label: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text(label, 14, pageHeight - 8);
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
      const join = new Date(m.joined_date);
      const rate = Number(m.monthly_rate);
      const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
      if (startMonth > 12) return;

      let expected = 0, paid = 0;
      const grid: string[] = [];
      for (let mo = 1; mo <= 12; mo++) {
        if (mo < startMonth || mo > endMonth) { grid.push('·'); continue; }
        const monthPays = payments.filter(
          (p) => p.member_id === m.id && p.for_year === year && p.for_month === mo,
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

  // Summary banner
  const sumY = 46;
  doc.setFillColor(248, 244, 235);
  doc.rect(14, sumY, pageWidth - 28, 22, 'F');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Members: ${rows.length}`, 18, sumY + 8);
  doc.text(`Year Expected: ${formatBDT(totExpected)}`, 60, sumY + 8);
  doc.setTextColor(22, 117, 61);
  doc.text(`Total Paid: ${formatBDT(totPaid)}`, 130, sumY + 8);
  if (totExpected - totPaid > 0) {
    doc.setTextColor(180, 24, 24);
    doc.text(`Total Due: ${formatBDT(totExpected - totPaid)}`, 200, sumY + 8);
  } else {
    doc.setTextColor(22, 117, 61);
    doc.text(`Status: CLEARED`, 200, sumY + 8);
  }
  doc.setTextColor(80, 80, 80);
  doc.text(`Months PAID: ${mPaid}`, 18, sumY + 17);
  doc.text(`PARTIAL: ${mPartial}`, 70, sumY + 17);
  doc.text(`DUE: ${mDue}`, 120, sumY + 17);
  doc.text(`Grid: P=Paid  ~=Partial  X=Due  ·=Inactive`, 160, sumY + 17);

  drawStatusLegend(doc, sumY + 26);

  autoTable(doc, {
    startY: sumY + 42,
    head: [['Code', 'Name', 'Phone', 'Expected', 'Paid', 'Due', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec']],
    body: rows,
    headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { font: 'courier', fontSize: 8 },
    },
    margin: { top: 14, left: 14, right: 14, bottom: 14 },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    foot: [[
      'TOTAL', '', '',
      formatBDT(totExpected), formatBDT(totPaid), formatBDT(Math.max(0, totExpected - totPaid)),
      '',
    ]],
    footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold' },
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
      const join = new Date(m.joined_date);
      if (join.getFullYear() * 12 + join.getMonth() > targetKey) return;
      const expected = Number(m.monthly_rate);
      const memberPays = payments.filter(
        (p) => p.member_id === m.id && p.for_year === year && p.for_month === month,
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

const AREA_FALLBACK = 'অজানা / Unspecified';
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
    const join = new Date(m.joined_date);
    const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
    if (startMonth > 12) continue;

    const rate = Number(m.monthly_rate) || 0;
    let expected = 0, paid = 0;
    if (monthFilter) {
      if (monthFilter < startMonth) continue;
      expected = rate;
      paid = payments
        .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === monthFilter)
        .reduce((s, p) => s + Number(p.amount), 0);
    } else {
      const months = Math.max(0, endMonth - startMonth + 1);
      expected = rate * months;
      paid = payments
        .filter((p) => p.member_id === m.id && p.for_year === year && p.for_month >= startMonth && p.for_month <= endMonth)
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
  const monthLabel = options.month ? `${BANGLA_MONTHS[options.month - 1]} ${toBanglaNumber(year)}` : `${toBanglaNumber(year)}`;

  drawOrgHeader(
    doc,
    `এলাকা ভিত্তিক চাঁদা হিসাব — ${monthLabel}`,
    `${options.activeOnly ? 'শুধু সক্রিয় সদস্য' : 'সব সদস্য'} | মোট: ${list.length}`,
  );

  const summaries = computeAreaSummaries(members, payments, year, {
    month: options.month, activeOnly: options.activeOnly,
  });

  const totMembers = summaries.reduce((s, a) => s + a.members, 0);
  const totExpected = summaries.reduce((s, a) => s + a.expected, 0);
  const totPaid = summaries.reduce((s, a) => s + a.paid, 0);
  const totDue = Math.max(0, totExpected - totPaid);

  const sumY = 46;
  doc.setFillColor(248, 244, 235);
  doc.rect(14, sumY, pageWidth - 28, 18, 'F');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`এলাকা: ${summaries.length}`, 18, sumY + 7);
  doc.text(`সদস্য: ${totMembers}`, 60, sumY + 7);
  doc.text(`প্রত্যাশিত: ${formatBDT(totExpected)}`, 110, sumY + 7);
  doc.setTextColor(22, 117, 61);
  doc.text(`সংগ্রহ: ${formatBDT(totPaid)}`, 180, sumY + 7);
  if (totDue > 0) {
    doc.setTextColor(180, 24, 24);
    doc.text(`বকেয়া: ${formatBDT(totDue)}`, 235, sumY + 7);
  }
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text('প্রত্যাশিত পরিমাণ অনুযায়ী সাজানো (সর্বোচ্চ প্রথমে)', 18, sumY + 14);

  // Per-area summary table
  autoTable(doc, {
    startY: sumY + 22,
    head: [['এলাকা', 'সদস্য', 'প্রত্যাশিত', 'সংগ্রহ', 'বকেয়া', '% অর্জন']],
    body: summaries.map((a) => [
      a.area, a.members,
      formatBDT(a.expected), formatBDT(a.paid), formatBDT(a.due),
      a.expected > 0 ? `${Math.round((a.paid / a.expected) * 100)}%` : '—',
    ]),
    headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
    },
    foot: [[
      'মোট', totMembers, formatBDT(totExpected), formatBDT(totPaid), formatBDT(totDue),
      totExpected > 0 ? `${Math.round((totPaid / totExpected) * 100)}%` : '—',
    ]],
    footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  // Per-area member breakdown — each area on a new page
  const groups = new Map<string, MemberLite[]>();
  for (const m of list) {
    const key = normArea(m.area);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  const sortedAreas = summaries.map((s) => s.area);
  const endMonth = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

  for (const area of sortedAreas) {
    const areaMembers = (groups.get(area) ?? []).slice().sort((a, b) =>
      a.member_code.localeCompare(b.member_code));
    if (areaMembers.length === 0) continue;
    doc.addPage('a4', 'landscape');

    doc.setFillColor(180, 142, 73);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(`এলাকা: ${area} — ${monthLabel}`, 14, 10);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.text(`সদস্য: ${areaMembers.length}`, pageWidth - 14, 10, { align: 'right' });

    const rows: (string | number)[][] = [];
    let aExp = 0, aPaid = 0;
    for (const m of areaMembers) {
      const join = new Date(m.joined_date);
      const startMonth = join.getFullYear() < year ? 1 : (join.getFullYear() === year ? join.getMonth() + 1 : 13);
      if (startMonth > 12) continue;
      const rate = Number(m.monthly_rate) || 0;
      let expected = 0, paid = 0;
      if (options.month) {
        if (options.month < startMonth) continue;
        expected = rate;
        paid = payments.filter((p) => p.member_id === m.id && p.for_year === year && p.for_month === options.month)
          .reduce((s, p) => s + Number(p.amount), 0);
      } else {
        expected = rate * Math.max(0, endMonth - startMonth + 1);
        paid = payments.filter((p) => p.member_id === m.id && p.for_year === year && p.for_month >= startMonth && p.for_month <= endMonth)
          .reduce((s, p) => s + Number(p.amount), 0);
      }
      const status = paid >= expected ? 'পরিশোধিত' : paid > 0 ? 'আংশিক' : 'বাকি';
      const due = Math.max(0, expected - paid);
      aExp += expected; aPaid += paid;
      rows.push([m.member_code, m.full_name, m.phone ?? '-', formatBDT(expected), formatBDT(paid), formatBDT(due), status]);
    }

    autoTable(doc, {
      startY: 22,
      head: [['কোড', 'নাম', 'ফোন', 'প্রত্যাশিত', 'জমা', 'বকেয়া', 'অবস্থা']],
      body: rows,
      headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      },
      margin: { top: 22, left: 14, right: 14, bottom: 14 },
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const v = data.cell.raw as string;
          if (v === 'পরিশোধিত') {
            data.cell.styles.textColor = COL_PAID_TEXT;
            data.cell.styles.fillColor = COL_PAID_FILL;
          } else if (v === 'বাকি') {
            data.cell.styles.textColor = COL_DUE_TEXT;
            data.cell.styles.fillColor = COL_DUE_FILL;
          } else {
            data.cell.styles.textColor = COL_PARTIAL_TEXT;
            data.cell.styles.fillColor = COL_PARTIAL_FILL;
          }
          data.cell.styles.fontStyle = 'bold';
        }
      },
      foot: [[
        'TOTAL', '', '',
        formatBDT(aExp), formatBDT(aPaid), formatBDT(Math.max(0, aExp - aPaid)), '',
      ]],
      footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold' },
    });
  }

  stampFooters(doc, `এলাকা ভিত্তিক চাঁদা হিসাব (${monthLabel})`);
  const slug = options.month
    ? `area-${year}-${String(options.month).padStart(2, '0')}`
    : `area-${year}`;
  doc.save(safeFilename(options.filename ?? '', slug));
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

const UNASSIGNED_AREA = '— এলাকা বিহীন —';

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
 * PAYMENTS PDF grouped by member.area, honoring year/month/area filters.
 */
export async function downloadAreaPaymentsPDF(
  rows: AreaPaymentRow[],
  filters: AreaExportFilters = {},
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);

  // Apply filters defensively
  const filtered = rows.filter((p) => {
    if (filters.year && p.for_year !== filters.year) return false;
    if (filters.month && p.for_month !== filters.month) return false;
    const memArea = (p.members?.area ?? '').trim();
    if (filters.area && filters.area !== '__all__' && memArea !== filters.area) return false;
    return true;
  });

  drawOrgHeader(
    doc,
    'Area-grouped Payments Report',
    filterLabel(filters),
  );

  // Group rows by area
  const groups = new Map<string, AreaPaymentRow[]>();
  for (const p of filtered) {
    const key = (p.members?.area ?? '').trim() || UNASSIGNED_AREA;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const sortedAreas = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  const yCursor = 48;
  let grandTotal = 0;
  let grandCount = 0;

  if (filtered.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No payment records match the selected filters.', 14, yCursor + 4);
  }

  sortedAreas.forEach((area, idx) => {
    const items = groups.get(area)!;
    const subtotal = items.reduce((s, p) => s + Number(p.amount || 0), 0);
    grandTotal += subtotal;
    grandCount += items.length;

    const startY = idx === 0 ? yCursor : (doc as any).lastAutoTable?.finalY + 10 || yCursor;

    // Section banner
    doc.setFillColor(245, 238, 220);
    doc.setDrawColor(180, 142, 73);
    doc.setLineWidth(0.3);
    doc.rect(14, startY - 6, doc.internal.pageSize.getWidth() - 28, 9, 'FD');
    doc.setTextColor(120, 95, 35);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(11);
    doc.text(`Area: ${area}`, 18, startY);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.text(
      `Records: ${items.length}   Subtotal: ${formatBDT(subtotal)}`,
      doc.internal.pageSize.getWidth() - 18, startY,
      { align: 'right' },
    );

    autoTable(doc, {
      startY: startY + 5,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Code', 'Member', 'Period', 'Method', 'Reference', 'Amount']],
      body: items.map((p) => [
        p.payment_date,
        p.members?.member_code ?? '-',
        p.members?.full_name ?? '-',
        `${MONTH_SHORT[p.for_month - 1]} ${p.for_year}`,
        String(p.method ?? '').toUpperCase(),
        p.transaction_ref ?? '-',
        formatBDT(Number(p.amount || 0)),
      ]),
      foot: [[
        '', '', '', '', '', 'Subtotal',
        formatBDT(subtotal),
      ]],
      styles: { font: BANGLA_FONT_NAME, fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [180, 142, 73], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 230, 200], textColor: [80, 60, 20], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 22 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        6: { cellWidth: 28, halign: 'right' },
      },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
  });

  // Grand total banner
  if (filtered.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? yCursor;
    const gY = lastY + 10;
    doc.setFillColor(180, 142, 73);
    doc.rect(14, gY - 6, doc.internal.pageSize.getWidth() - 28, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.text(
      `Areas: ${sortedAreas.length}   Records: ${grandCount}   Grand Total: ${formatBDT(grandTotal)}`,
      doc.internal.pageSize.getWidth() / 2, gY + 1,
      { align: 'center' },
    );
  }

  stampFooters(doc, `Area-grouped payments — ${filterLabel(filters)}`);
  doc.save(safeFilename(filters.filename ?? '', areaSlug(filters, 'payments')));
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

    doc.setFillColor(245, 238, 220);
    doc.setDrawColor(180, 142, 73);
    doc.setLineWidth(0.3);
    doc.rect(14, startY - 6, doc.internal.pageSize.getWidth() - 28, 9, 'FD');
    doc.setTextColor(120, 95, 35);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(11);
    doc.text(`Category: ${cat}`, 18, startY);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.text(
      `Records: ${items.length}   Subtotal: ${formatBDT(subtotal)}`,
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
      headStyles: { fillColor: [180, 142, 73], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 230, 200], textColor: [80, 60, 20], fontStyle: 'bold' },
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
    doc.setFillColor(180, 142, 73);
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
  const monthLabel = month ? `${BANGLA_MONTHS[month - 1]} ${toBanglaNumber(year)}` : `${toBanglaNumber(year)}`;

  drawOrgHeader(
    doc,
    `এলাকা ভিত্তিক র‍্যাঙ্কিং — ${monthLabel}`,
    `মোট সংগ্রহের ভিত্তিতে এলাকাগুলোর অবস্থান (সর্বোচ্চ সংগ্রহ প্রথমে)।`,
  );

  const totMembers = summaries.reduce((s, a) => s + a.members, 0);
  const totExpected = summaries.reduce((s, a) => s + a.expected, 0);
  const totPaid = summaries.reduce((s, a) => s + a.paid, 0);
  const totDue = Math.max(0, totExpected - totPaid);

  const sumY = 46;
  doc.setFillColor(248, 244, 235);
  doc.rect(14, sumY, pageWidth - 28, 18, 'F');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`মোট এলাকা: ${toBanglaNumber(summaries.length)}`, 18, sumY + 7);
  doc.text(`মোট সদস্য: ${toBanglaNumber(totMembers)}`, 60, sumY + 7);
  doc.text(`মোট সংগ্রহ: ${formatBDT(totPaid)}`, 110, sumY + 7);

  autoTable(doc, {
    startY: sumY + 22,
    head: [['র‍্যাঙ্ক', 'এলাকা', 'সদস্য', 'সংগৃহীত চাঁদা', '% অর্জন']],
    body: summaries.map((a, i) => [
      `#${toBanglaNumber(i + 1)}`,
      a.area,
      toBanglaNumber(a.members),
      formatBDT(a.paid),
      a.expected > 0 ? `${toBanglaNumber(Math.round((a.paid / a.expected) * 100))}%` : '—',
    ]),
    headStyles: { fillColor: [180, 142, 73], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [180, 142, 73] },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
    },
    foot: [[
      '', 'সর্বমোট', toBanglaNumber(totMembers), formatBDT(totPaid),
      totExpected > 0 ? `${toBanglaNumber(Math.round((totPaid / totExpected) * 100))}%` : '—',
    ]],
    footStyles: { fillColor: [240, 230, 210], textColor: 0, fontStyle: 'bold' },
  });

  stampFooters(doc, `এলাকা ভিত্তিক র‍্যাঙ্কিং — ${monthLabel}`);
  doc.save(`area-ranking-${year}${month ? `-${month}` : ''}.pdf`);
}

