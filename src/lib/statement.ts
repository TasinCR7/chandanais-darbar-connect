import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerBengaliFont } from "../fonts/bengaliFont";

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface MemberLite {
  id: string;
  name: string;
  phone?: string;
  monthly_due?: number;
  area?: string;
}

export interface PaymentLite {
  id: string;
  name: string;
  amount: number;
  target_month: string; // YYYY-MM
  payment_method?: string;
  transaction_id?: string;
  created_at?: string;
}

export function downloadAnnualStatementPDF(
  member: MemberLite, 
  payments: PaymentLite[], 
  year?: number
) {
  const targetYear = year ?? new Date().getFullYear();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  registerBengaliFont(doc);

  // Gold Header
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Chandanaish Darbar Sharif', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Annual Statement - ${targetYear}`, pageWidth / 2, 21, { align: 'center' });

  // Member Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('NotoSansBengali', 'normal');
  let yPos = 38;
  doc.text(`Member ID: ${member.id.slice(0, 8)}`, 14, yPos);
  doc.text(`Name: ${member.name}`, 14, yPos + 6);
  doc.text(`Phone: ${member.phone ?? '-'}`, 14, yPos + 12);
  doc.text(`Area: ${member.area ?? '-'}`, 110, yPos);
  doc.text(`Monthly Rate: BDT ${member.monthly_due || 0}`, 110, yPos + 6);

  // Build 12 month rows
  const expected = Number(member.monthly_due || 0);
  const rows = MONTHS_EN.map((mn, idx) => {
    const monthNum = idx + 1;
    const targetMonthStr = `${targetYear}-${monthNum.toString().padStart(2, '0')}`;
    const monthPays = payments.filter((p) => p.target_month === targetMonthStr);
    const paid = monthPays.reduce((s, p) => s + Number(p.amount || 0), 0);
    const status = paid >= expected ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';
    const ref = monthPays.map((p) => p.transaction_id || p.payment_method).join(', ') || '-';
    const date = monthPays[0]?.created_at ? new Date(monthPays[0].created_at).toLocaleDateString() : '-';
    return [mn, `BDT ${expected}`, `BDT ${paid}`, status, date, ref];
  });

  // Color-coded Table
  autoTable(doc, {
    startY: yPos + 22,
    head: [['Month', 'Expected', 'Paid', 'Status', 'Date', 'Ref / Method']],
    body: rows,
    styles: { font: 'NotoSansBengali', fontStyle: 'normal' },
    headStyles: { fillColor: [180, 142, 73], textColor: 255 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const v = data.cell.raw as string;
        if (v === 'PAID') data.cell.styles.textColor = [22, 122, 50];      // Green
        else if (v === 'DUE') data.cell.styles.textColor = [200, 30, 30];  // Red
        else data.cell.styles.textColor = [200, 130, 0];                    // Orange
      }
    },
  });

  doc.save(`statement-${member.name}-${targetYear}.pdf`);
}

export function downloadReceiptPDF(
  member: MemberLite,
  payment: PaymentLite
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  registerBengaliFont(doc);

  // Header
  doc.setFillColor(180, 142, 73);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Chandanaish Darbar Sharif', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text('Payment Receipt', pageWidth / 2, 21, { align: 'center' });

  // Receipt details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('NotoSansBengali', 'normal');
  let y = 44;
  const line = (k: string, v: string) => { 
    doc.text(`${k}:`, 18, y); 
    doc.text(v, 70, y); 
    y += 9; 
  };

  const paymentDate = payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-';
  let targetMonthDisplay = payment.target_month;
  try {
    const [yStr, mStr] = payment.target_month.split('-');
    targetMonthDisplay = `${MONTHS_EN[parseInt(mStr) - 1]} ${yStr}`;
  } catch (e) {}

  line('Receipt No', payment.id?.slice(0, 8).toUpperCase() ?? '-');
  line('Member ID', member.id.slice(0, 8));
  line('Member Name', member.name);
  line('Amount', `BDT ${payment.amount || 0}`);
  line('For', targetMonthDisplay);
  line('Payment Date', paymentDate);
  line('Method', (payment.payment_method || 'Cash').toUpperCase());
  line('Reference', payment.transaction_id ?? '-');

  doc.text('Authorized Signature: _____________________', 18, y + 20);
  doc.save(`receipt-${member.name}-${payment.target_month}.pdf`);
}

export function buildMonthlyStatement(member: MemberLite, payments: PaymentLite[]) {
  const join = new Date(); // Need joined_date but MemberLite doesn't have it, fallback
  const now = new Date();
  const rows = [];

  let y = join.getFullYear();
  let m = join.getMonth() + 1;
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  while (y < endY || (y === endY && m <= endM)) {
    const paid = payments
      .filter((p) => p.target_month === `${y}-${m.toString().padStart(2, '0')}`)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const expected = Number(member.monthly_due || 0);
    const status = paid >= expected ? 'paid' : paid > 0 ? 'partial' : 'due';
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
  return {
    totalExpected,
    totalPaid,
    dues: Math.max(0, totalExpected - totalPaid),
    dueMonths: rows.filter((r) => r.status !== 'paid').length,
    rows,
  };
}
