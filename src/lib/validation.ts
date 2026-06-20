// Data validation engine for members, payments, and expenses.
// Detects discrepancies that would corrupt statements/receipts/PDFs:
// - amount/date sanity
// - Bengali text rendering issues (mojibake / encoding errors)
// - missing required fields
// - cross-record consistency (orphaned payments, total mismatches)
// - duplicate transaction references
// - font / glyph compatibility risks for jsPDF

// jsPDF + autoTable lazy-loaded only when generating validation report PDF
const getJsPDF = () => import('jspdf').then(m => m.default);
const getAutoTable = () => import('jspdf-autotable').then(m => m.default);
import { ensureBanglaFont, BANGLA_FONT_NAME } from './pdfFont';
import { computeMemberDues, type MemberForDues, type PaymentForDues } from './dues';
import type { Member, Payment, Expense } from '@/types/finance';

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: Severity;
  table: 'members' | 'payments' | 'expenses' | 'system';
  recordId?: string;
  recordLabel: string;   // human-friendly identifier (member code, payment date, etc.)
  field?: string;        // which field is wrong
  value?: unknown;           // the offending value
  rule: string;          // short rule code (e.g. NEGATIVE_AMOUNT)
  message: string;       // Bengali description
  suggestion?: string;   // how to fix
}

export interface ValidationReport {
  generatedAt: Date;
  totals: {
    members: number;
    payments: number;
    expenses: number;
  };
  counts: { error: number; warning: number; info: number };
  issues: ValidationIssue[];
}

/* -------------------------------------------------------------------------- */
/*                            Detection helpers                               */
/* -------------------------------------------------------------------------- */

// "Mojibake" detection — if Bengali text was decoded with the wrong encoding
// it usually contains long runs of Latin-1 replacement chars or `Ã`, `â`, `Ä`.
const MOJIBAKE_RX = /[ÃÂâÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß]{2,}|�/;

// Check that string is renderable in our PDF Bangla font:
// Devanagari, Latin (basic + extended-A), Bengali block (\u0980–\u09FF),
// digits, common punctuation. Anything else (e.g. emoji, Tibetan, Burmese)
// becomes a black box in the PDF.
const SAFE_CHAR_RX = /^[\u0020-\u017F\u0980-\u09FF\u200C\u200D\s\u2000-\u206F\u2010-\u201F\u2030-\u2060\u20A0-\u20CF\u2122\u00A0-\u00FF]*$/;

function hasUnsafeGlyphs(text: string): { unsafe: string; index: number } | null {
  if (!text || SAFE_CHAR_RX.test(text)) return null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!SAFE_CHAR_RX.test(c)) return { unsafe: c, index: i };
  }
  return null;
}

function isFiniteNonNeg(n: unknown): boolean {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

let issueSeq = 0;
const nextId = () => `V${(++issueSeq).toString().padStart(4, '0')}`;

/* -------------------------------------------------------------------------- */
/*                             Main validator                                  */
/* -------------------------------------------------------------------------- */

export interface ValidationInput {
  members: Member[];
  payments: Payment[];
  expenses: Expense[];
}

export function runValidation(input: ValidationInput): ValidationReport {
  issueSeq = 0;
  const issues: ValidationIssue[] = [];
  const today = todayISO();
  const memberById = new Map<string, Member>(input.members.map((m) => [m.id, m]));
  const memberCodes = new Map<string, Member[]>();
  input.members.forEach((m) => {
    const arr = memberCodes.get(m.member_code) ?? [];
    arr.push(m);
    memberCodes.set(m.member_code, arr);
  });

  /* ---- MEMBERS ---- */
  for (const m of input.members) {
    const label = `${m.member_code} — ${m.full_name}`;

    if (!m.member_code || !String(m.member_code).trim()) {
      issues.push({
        id: nextId(), severity: 'error', table: 'members', recordId: m.id, recordLabel: m.full_name || '(নাম নেই)',
        field: 'member_code', rule: 'MISSING_CODE',
        message: 'সদস্য কোড নেই — রিসিট/স্টেটমেন্টে কোড ফাঁকা দেখাবে',
        suggestion: 'অ্যাডমিন প্যানেল → তালিকা → সদস্যের কোড সম্পাদনা করুন',
      });
    }
    if (!m.full_name || String(m.full_name).trim().length < 2) {
      issues.push({
        id: nextId(), severity: 'error', table: 'members', recordId: m.id, recordLabel: label,
        field: 'full_name', value: m.full_name, rule: 'INVALID_NAME',
        message: 'সদস্যের পূর্ণ নাম নেই বা খুব ছোট',
      });
    }
    if (!isFiniteNonNeg(m.monthly_rate) || Number(m.monthly_rate) === 0) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'members', recordId: m.id, recordLabel: label,
        field: 'monthly_rate', value: m.monthly_rate, rule: 'INVALID_RATE',
        message: 'মাসিক চাঁদার হার শূন্য বা অবৈধ — বকেয়া হিসাব ভুল হবে',
      });
    }
    if (!m.joined_date || isNaN(new Date(m.joined_date).getTime())) {
      issues.push({
        id: nextId(), severity: 'error', table: 'members', recordId: m.id, recordLabel: label,
        field: 'joined_date', value: m.joined_date, rule: 'INVALID_JOIN_DATE',
        message: 'যোগদান তারিখ অবৈধ — বার্ষিক স্টেটমেন্টে মাসগুলি ভুল আসবে',
      });
    } else if (m.joined_date > today) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'members', recordId: m.id, recordLabel: label,
        field: 'joined_date', value: m.joined_date, rule: 'FUTURE_JOIN_DATE',
        message: 'যোগদান তারিখ ভবিষ্যতের',
      });
    }
    // Mojibake / unsafe glyphs in name or address
    for (const f of ['full_name', 'address', 'area', 'phone']) {
      const v = m[f];
      if (typeof v !== 'string' || !v) continue;
      if (MOJIBAKE_RX.test(v)) {
        issues.push({
          id: nextId(), severity: 'error', table: 'members', recordId: m.id, recordLabel: label,
          field: f, value: v, rule: 'MOJIBAKE',
          message: `${f} এ এনকোডিং ত্রুটি — বাংলা টেক্সট ভেঙে গেছে (PDF এ গার্বেজ আসবে)`,
          suggestion: 'সঠিক বাংলা ইউনিকোড দিয়ে আবার লিখুন',
        });
      }
      const bad = hasUnsafeGlyphs(v);
      if (bad) {
        issues.push({
          id: nextId(), severity: 'warning', table: 'members', recordId: m.id, recordLabel: label,
          field: f, value: v, rule: 'UNSUPPORTED_GLYPH',
          message: `${f} এ অসমর্থিত চিহ্ন "${bad.unsafe}" (পজিশন ${bad.index}) — PDF এ কালো বক্স দেখাবে`,
          suggestion: 'ইমোজি বা বিশেষ চিহ্ন সরিয়ে দিন',
        });
      }
    }
  }

  // Duplicate member codes
  for (const [code, arr] of memberCodes) {
    if (arr.length > 1) {
      issues.push({
        id: nextId(), severity: 'error', table: 'members', recordLabel: code,
        field: 'member_code', value: code, rule: 'DUPLICATE_CODE',
        message: `${arr.length} জন সদস্যের একই কোড "${code}" — রিসিট ও পেমেন্ট অ্যাট্রিবিউশন ভুল হবে`,
        suggestion: 'অতিরিক্ত সদস্যদের কোড পরিবর্তন করুন',
      });
    }
  }

  /* ---- PAYMENTS ---- */
  const txRefMap = new Map<string, any[]>();
  for (const p of input.payments) {
    const member = memberById.get(p.member_id);
    const memberLabel = member ? `${member.member_code} — ${member.full_name}` : `(অজানা সদস্য)`;
    const label = `${memberLabel} • ${p.payment_date}`;

    if (!member) {
      issues.push({
        id: nextId(), severity: 'error', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'member_id', value: p.member_id, rule: 'ORPHAN_PAYMENT',
        message: 'পেমেন্ট কোনো বিদ্যমান সদস্যের সাথে যুক্ত নয় — রিসিট তৈরি ব্যর্থ হবে',
      });
    }
    if (!isFiniteNonNeg(p.amount) || Number(p.amount) <= 0) {
      issues.push({
        id: nextId(), severity: 'error', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'amount', value: p.amount, rule: 'INVALID_AMOUNT',
        message: 'পেমেন্টের পরিমাণ শূন্য, ঋণাত্মক, বা অবৈধ',
      });
    }
    if (!p.for_year || p.for_year < 2000 || p.for_year > 2100) {
      issues.push({
        id: nextId(), severity: 'error', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'for_year', value: p.for_year, rule: 'INVALID_YEAR',
        message: 'পেমেন্ট বছর অবৈধ',
      });
    }
    if (!p.for_month || p.for_month < 1 || p.for_month > 12) {
      issues.push({
        id: nextId(), severity: 'error', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'for_month', value: p.for_month, rule: 'INVALID_MONTH',
        message: 'পেমেন্ট মাস অবৈধ',
      });
    }
    if (!p.payment_date || isNaN(new Date(p.payment_date).getTime())) {
      issues.push({
        id: nextId(), severity: 'error', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'payment_date', value: p.payment_date, rule: 'INVALID_DATE',
        message: 'পেমেন্ট তারিখ অবৈধ',
      });
    } else if (p.payment_date > today) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'payment_date', value: p.payment_date, rule: 'FUTURE_DATE',
        message: 'পেমেন্ট তারিখ ভবিষ্যতের',
      });
    }
    if (member && p.payment_date && member.joined_date && p.payment_date < member.joined_date) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'payment_date', value: p.payment_date, rule: 'BEFORE_JOIN',
        message: `পেমেন্ট তারিখ যোগদানের (${member.joined_date}) আগের`,
      });
    }
    const validMethods = ['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other'];
    if (p.method && !validMethods.includes(String(p.method).toLowerCase())) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'payments', recordId: p.id, recordLabel: label,
        field: 'method', value: p.method, rule: 'UNKNOWN_METHOD',
        message: `অপরিচিত পেমেন্ট পদ্ধতি "${p.method}" — PDF এ লেবেল ভুল আসবে`,
      });
    }
    // Mojibake in note / transaction_ref
    for (const f of ['note', 'transaction_ref']) {
      const v = p[f];
      if (typeof v === 'string' && v) {
        if (MOJIBAKE_RX.test(v)) {
          issues.push({
            id: nextId(), severity: 'warning', table: 'payments', recordId: p.id, recordLabel: label,
            field: f, value: v, rule: 'MOJIBAKE',
            message: `${f} এ এনকোডিং ত্রুটি`,
          });
        }
        const bad = hasUnsafeGlyphs(v);
        if (bad) {
          issues.push({
            id: nextId(), severity: 'info', table: 'payments', recordId: p.id, recordLabel: label,
            field: f, value: v, rule: 'UNSUPPORTED_GLYPH',
            message: `${f} এ অসমর্থিত চিহ্ন "${bad.unsafe}"`,
          });
        }
      }
    }
    // Track tx refs
    const ref = (p.transaction_ref || '').trim();
    if (ref && p.method && p.method !== 'cash') {
      const arr = txRefMap.get(`${p.method}:${ref}`) ?? [];
      arr.push(p);
      txRefMap.set(`${p.method}:${ref}`, arr);
    }
  }

  // Duplicate transaction refs (same method + same ref = likely double-entry)
  for (const [key, arr] of txRefMap) {
    if (arr.length > 1) {
      const [method, ref] = key.split(':');
      issues.push({
        id: nextId(), severity: 'warning', table: 'payments', recordLabel: `${method}: ${ref}`,
        field: 'transaction_ref', value: ref, rule: 'DUPLICATE_TX_REF',
        message: `${arr.length} টি পেমেন্টে একই ${method.toUpperCase()} TX রেফারেন্স — সম্ভাব্য ডুপ্লিকেট এন্ট্রি`,
        suggestion: 'একটি বাদে বাকি গুলি ডিলিট করুন',
      });
    }
  }

  /* ---- EXPENSES ---- */
  for (const e of input.expenses) {
    const label = `${e.title || '(শিরোনাম নেই)'} • ${e.expense_date}`;
    if (!e.title || String(e.title).trim().length < 2) {
      issues.push({
        id: nextId(), severity: 'error', table: 'expenses', recordId: e.id, recordLabel: label,
        field: 'title', value: e.title, rule: 'MISSING_TITLE',
        message: 'খরচের শিরোনাম নেই',
      });
    }
    if (!isFiniteNonNeg(e.amount) || Number(e.amount) <= 0) {
      issues.push({
        id: nextId(), severity: 'error', table: 'expenses', recordId: e.id, recordLabel: label,
        field: 'amount', value: e.amount, rule: 'INVALID_AMOUNT',
        message: 'খরচের পরিমাণ শূন্য, ঋণাত্মক, বা অবৈধ',
      });
    }
    if (!e.expense_date || isNaN(new Date(e.expense_date).getTime())) {
      issues.push({
        id: nextId(), severity: 'error', table: 'expenses', recordId: e.id, recordLabel: label,
        field: 'expense_date', value: e.expense_date, rule: 'INVALID_DATE',
        message: 'খরচের তারিখ অবৈধ',
      });
    } else if (e.expense_date > today) {
      issues.push({
        id: nextId(), severity: 'warning', table: 'expenses', recordId: e.id, recordLabel: label,
        field: 'expense_date', value: e.expense_date, rule: 'FUTURE_DATE',
        message: 'খরচের তারিখ ভবিষ্যতের',
      });
    }
    for (const f of ['title', 'note', 'category', 'approved_by']) {
      const v = e[f];
      if (typeof v === 'string' && v) {
        if (MOJIBAKE_RX.test(v)) {
          issues.push({
            id: nextId(), severity: 'error', table: 'expenses', recordId: e.id, recordLabel: label,
            field: f, value: v, rule: 'MOJIBAKE',
            message: `${f} এ এনকোডিং ত্রুটি — PDF এ গার্বেজ আসবে`,
          });
        }
        const bad = hasUnsafeGlyphs(v);
        if (bad) {
          issues.push({
            id: nextId(), severity: 'warning', table: 'expenses', recordId: e.id, recordLabel: label,
            field: f, value: v, rule: 'UNSUPPORTED_GLYPH',
            message: `${f} এ অসমর্থিত চিহ্ন "${bad.unsafe}"`,
          });
        }
      }
    }
  }

  /* ---- CROSS-RECORD: per-member totals ---- */
  for (const m of input.members) {
    const memberPays = input.payments.filter((p) => p.member_id === m.id);
    if (memberPays.length === 0) continue;
    const sumPaid = memberPays.reduce((s, p) => s + Number(p.amount || 0), 0);
    const dues = computeMemberDues(
      m as MemberForDues,
      memberPays.map((p) => ({
        member_id: p.member_id, amount: Number(p.amount || 0),
        for_year: p.for_year, for_month: p.for_month,
      })) as PaymentForDues[],
    );
    // Overpayment is a flag for review (could indicate wrong amount)
    if (sumPaid > dues.expectedTotal * 1.5 && dues.expectedTotal > 0) {
      issues.push({
        id: nextId(), severity: 'info', table: 'members', recordId: m.id, recordLabel: `${m.member_code} — ${m.full_name}`,
        field: 'paid_total', value: sumPaid, rule: 'OVERPAID',
        message: `প্রত্যাশিত ৳${Math.round(dues.expectedTotal).toLocaleString('en-IN')} এর বিপরীতে জমা ৳${Math.round(sumPaid).toLocaleString('en-IN')} — যাচাই করুন`,
      });
    }
  }

  const counts = { error: 0, warning: 0, info: 0 };
  issues.forEach((i) => { counts[i.severity]++; });

  return {
    generatedAt: new Date(),
    totals: {
      members: input.members.length,
      payments: input.payments.length,
      expenses: input.expenses.length,
    },
    counts,
    issues,
  };
}

/* -------------------------------------------------------------------------- */
/*                               PDF report                                    */
/* -------------------------------------------------------------------------- */

const SEV_COLORS: Record<Severity, [number, number, number]> = {
  error: [220, 53, 69],
  warning: [255, 153, 0],
  info: [13, 110, 253],
};

const SEV_BN: Record<Severity, string> = {
  error: 'ত্রুটি',
  warning: 'সতর্কতা',
  info: 'তথ্য',
};

export async function downloadValidationReportPDF(report: ValidationReport) {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: 'landscape' });
  await ensureBanglaFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(BANGLA_FONT_NAME, 'bold');
  doc.setFontSize(16);
  doc.text('Data Validation Report', 14, 12);
  doc.setFont(BANGLA_FONT_NAME, 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${report.generatedAt.toISOString().slice(0, 19).replace('T', ' ')}`, 14, 19);
  doc.text(
    `Members: ${report.totals.members} | Payments: ${report.totals.payments} | Expenses: ${report.totals.expenses}`,
    14, 25,
  );

  // Severity summary boxes (top-right)
  const boxW = 38, boxH = 18, gap = 4, baseY = 5;
  const boxes: Array<[Severity, number]> = [
    ['error', report.counts.error],
    ['warning', report.counts.warning],
    ['info', report.counts.info],
  ];
  let bx = pageWidth - 14 - (boxW * 3 + gap * 2);
  boxes.forEach(([sev, count]) => {
    const [r, g, b] = SEV_COLORS[sev];
    doc.setFillColor(255, 255, 255);
    doc.rect(bx, baseY, boxW, boxH, 'F');
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.6);
    doc.rect(bx, baseY, boxW, boxH);
    doc.setTextColor(r, g, b);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(13);
    doc.text(String(count), bx + boxW / 2, baseY + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.text(sev.toUpperCase(), bx + boxW / 2, baseY + 15, { align: 'center' });
    bx += boxW + gap;
  });

  // No issues case
  if (report.issues.length === 0) {
    doc.setTextColor(0, 128, 0);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(20);
    doc.text('সব ডেটা সঠিক — কোনো ত্রুটি পাওয়া যায়নি', pageWidth / 2, 100, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont(BANGLA_FONT_NAME, 'normal');
    doc.text(
      'No discrepancies detected in members, payments, or expenses.',
      pageWidth / 2, 110, { align: 'center' },
    );
    doc.save(`validation-report-${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
    return;
  }

  // Issues table
  const rows = report.issues.map((iss) => [
    iss.id,
    SEV_BN[iss.severity],
    iss.table,
    iss.recordLabel,
    iss.field ?? '-',
    iss.value === undefined || iss.value === null ? '-' : String(iss.value).slice(0, 40),
    iss.rule,
    iss.message,
  ]);

  const autoTableFn = await getAutoTable();
  autoTableFn(doc, {
    startY: 34,
    head: [[
      'ID', 'মাত্রা', 'টেবিল', 'রেকর্ড', 'ফিল্ড', 'ভুল মান', 'কোড', 'বিবরণ',
    ]],
    body: rows,
    styles: { font: BANGLA_FONT_NAME, fontSize: 8, cellPadding: 2, valign: 'top' },
    headStyles: {
      font: BANGLA_FONT_NAME, fontStyle: 'bold', fillColor: [40, 40, 40],
      textColor: [255, 255, 255], fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold' },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 50 },
      4: { cellWidth: 22 },
      5: { cellWidth: 35 },
      6: { cellWidth: 30 },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const sev = report.issues[data.row.index]?.severity;
      if (!sev) return;
      // Color the severity column
      if (data.column.index === 1) {
        const [r, g, b] = SEV_COLORS[sev];
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = 'bold';
      }
      // Tint full row faintly for errors
      if (sev === 'error' && data.column.index === 0) {
        data.cell.styles.fillColor = [255, 235, 235];
      }
    },
    didDrawPage: (data) => {
      const str = `Page ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont(BANGLA_FONT_NAME, 'normal');
      doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
      doc.text(
        'Validation Report — সকল detected discrepancy সহ',
        14, doc.internal.pageSize.getHeight() - 6,
      );
    },
  });

  // Suggestions appendix
  const withSuggestions = report.issues.filter((i) => i.suggestion);
  if (withSuggestions.length > 0) {
    doc.addPage('landscape');
    doc.setTextColor(0, 0, 0);
    doc.setFont(BANGLA_FONT_NAME, 'bold');
    doc.setFontSize(14);
    doc.text('সমাধানের পরামর্শ', 14, 16);

    const autoTableFn = await getAutoTable();
    autoTableFn(doc, {
      startY: 22,
      head: [['ID', 'রেকর্ড', 'পরামর্শ']],
      body: withSuggestions.map((i) => [i.id, i.recordLabel, i.suggestion!]),
      styles: { font: BANGLA_FONT_NAME, fontSize: 9, cellPadding: 2.5 },
      headStyles: { font: BANGLA_FONT_NAME, fontStyle: 'bold', fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 'auto' },
      },
    });
  }

  doc.save(`validation-report-${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
}
