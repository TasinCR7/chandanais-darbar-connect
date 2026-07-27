// Due/Bakeya tracking helpers
// Calculates how much each member owes based on their monthly_rate vs payments received,
// counted from joined_date through the current month.

export interface MemberForDues {
  id: string;
  member_code: string;
  full_name: string;
  area?: string | null;
  monthly_rate: number;
  joined_date: string;
  is_active?: boolean;
  phone?: string | null;
}

export interface PaymentForDues {
  member_id: string;
  amount: number;
  for_year: number;
  for_month: number;
}

export interface MemberDues {
  member: MemberForDues;
  monthsExpected: number;
  expectedTotal: number;
  paidTotal: number;
  dueAmount: number;
  monthsBehind: number;        // # of unpaid (or partially paid) months
  oldestUnpaid?: { year: number; month: number };
}

/** Iterate inclusive months between two YYYY-MM points. */
function* iterMonths(fromY: number, fromM: number, toY: number, toM: number) {
  let y = fromY, m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    yield { y, m };
    m++;
    if (m > 12) { m = 1; y++; }
  }
}

export function computeMemberDues(
  member: MemberForDues,
  payments: PaymentForDues[],
  asOf: Date = new Date(),
): MemberDues {
  const joinedStr = member.joined_date
    ? member.joined_date.includes("T")
      ? member.joined_date
      : `${member.joined_date}T00:00:00`
    : "";
  const joinedDate = joinedStr ? new Date(joinedStr) : new Date();
  const join = isNaN(joinedDate.getTime()) ? new Date() : joinedDate;
  const fromY = join.getFullYear();
  const fromM = join.getMonth() + 1;
  const toY = asOf.getFullYear();
  const toM = asOf.getMonth() + 1;

  const memberPays = payments.filter((p) => p.member_id === member.id);
  let monthsExpected = 0;
  let monthsBehind = 0;
  let oldestUnpaid: { year: number; month: number } | undefined;
  const rate = Number(member.monthly_rate) || 0;

  for (const { y, m } of iterMonths(fromY, fromM, toY, toM)) {
    monthsExpected++;
    const paidThisMonth = memberPays
      .filter((p) => p.for_year === y && p.for_month === m)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    if (paidThisMonth < rate) {
      monthsBehind++;
      if (!oldestUnpaid) oldestUnpaid = { year: y, month: m };
    }
  }

  const expectedTotal = monthsExpected * rate;
  const paidTotal = memberPays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const dueAmount = Math.max(0, expectedTotal - paidTotal);

  return {
    member,
    monthsExpected,
    expectedTotal,
    paidTotal,
    dueAmount,
    monthsBehind,
    oldestUnpaid,
  };
}

export function computeAllDues(
  members: MemberForDues[],
  payments: PaymentForDues[],
  asOf: Date = new Date(),
): MemberDues[] {
  return members
    .filter((m) => m.is_active !== false)
    .map((m) => computeMemberDues(m, payments, asOf));
}

/** Members with N or more unpaid/partial months. */
export function getDefaulters(allDues: MemberDues[], minMonthsBehind = 3): MemberDues[] {
  return allDues
    .filter((d) => d.monthsBehind >= minMonthsBehind && d.dueAmount > 0)
    .sort((a, b) => b.monthsBehind - a.monthsBehind || b.dueAmount - a.dueAmount);
}
