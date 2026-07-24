import type { Member, Payment, Expense } from '@/types/finance';

/**
 * Compute overall financial summary.
 */
export function computeFinancialSummary(
  payments: Payment[] = [],
  expenses: Expense[] = [],
  members: Member[] = []
) {
  const safePayments = payments || [];
  const safeExpenses = expenses || [];
  const safeMembers = members || [];

  const totalIncome = safePayments
    .filter(p => p && p.status !== 'rejected')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpense = safeExpenses.reduce((s, e) => s + Number(e?.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const activeMembers = safeMembers.filter(m => m && m.is_active).length;
  return { totalIncome, totalExpense, balance, activeMembers };
}

/**
 * Compute per‑member statistics including payment list.
 * Dues can be calculated elsewhere using `calculateDues`.
 */
export function computeMemberStats(members: Member[] = [], payments: Payment[] = []) {
  const safeMembers = members || [];
  const safePayments = payments || [];
  const payMap = new Map<string, any[]>();
  
  safePayments
    .filter(p => p && p.status !== 'rejected')
    .forEach(p => {
      if (!payMap.has(p.member_id)) payMap.set(p.member_id, []);
      payMap.get(p.member_id)!.push({
        amount: Number(p.amount || 0),
        for_year: p.for_year,
        for_month: p.for_month,
        payment_date: p.payment_date,
        method: p.method,
        transaction_ref: p.transaction_ref,
      });
    });

  return safeMembers.map(m => {
    const memPays = payMap.get(m.id) || [];
    return { ...m, memPays };
  });
}

/**
 * Compute total dues from memberStats (expects each member to have a `dues` field).
 */
export function computeTotalDues(memberStats: Array<any> = []) {
  const safeStats = memberStats || [];
  return safeStats.reduce((s, m) => s + (m?.dues ?? 0), 0);
}
