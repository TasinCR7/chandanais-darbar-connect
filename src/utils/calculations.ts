import type { Member, Payment, Expense } from '@/types/finance';

/**
 * Compute overall financial summary.
 */
export function computeFinancialSummary(
  payments: Payment[],
  expenses: Expense[],
  members: Member[]
) {
  const totalIncome = payments
    .filter(p => p.status !== 'rejected')
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;
  const activeMembers = members.filter(m => m.is_active).length;
  return { totalIncome, totalExpense, balance, activeMembers };
}

/**
 * Compute per‑member statistics including payment list.
 * Dues can be calculated elsewhere using `calculateDues`.
 */
export function computeMemberStats(members: Member[], payments: Payment[]) {
  const payMap = new Map<string, any[]>();
  payments
    .filter(p => p.status !== 'rejected')
    .forEach(p => {
      if (!payMap.has(p.member_id)) payMap.set(p.member_id, []);
      payMap.get(p.member_id)!.push({
        amount: Number(p.amount),
        for_year: p.for_year,
        for_month: p.for_month,
        payment_date: p.payment_date,
        method: p.method,
        transaction_ref: p.transaction_ref,
      });
    });

  return members.map(m => {
    const memPays = payMap.get(m.id) || [];
    return { ...m, memPays };
  });
}

/**
 * Compute total dues from memberStats (expects each member to have a `dues` field).
 */
export function computeTotalDues(memberStats: Array<any>) {
  return memberStats.reduce((s, m) => s + (m.dues ?? 0), 0);
}
