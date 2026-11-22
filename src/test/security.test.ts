import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  sanitizeCsvCell,
  sanitizeFilenameSegment,
  sanitizeSafeUrl,
} from "@/utils/security";
import {
  formatBangladeshIntlPhone,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/utils/phoneUtils";
import { computeFinancialSummary, computeMemberStats } from "@/utils/calculations";
import type { Expense, Member, Payment } from "@/types/finance";

describe("security utilities", () => {
  it("escapes dangerous HTML characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#039;y&#039;"
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(0)).toBe("0");
  });

  it("neutralizes CSV formula injection payloads while keeping numeric values intact", () => {
    expect(sanitizeCsvCell("=CMD('calc')")).toBe("'=CMD('calc')");
    expect(sanitizeCsvCell("+1+1")).toBe("'+1+1");
    expect(sanitizeCsvCell("-2+3")).toBe("'-2+3");
    expect(sanitizeCsvCell("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
    expect(sanitizeCsvCell(" =1+1")).toBe("' =1+1");
    expect(sanitizeCsvCell("hello, \"world\"")).toBe("\"hello, \"\"world\"\"\"");
    expect(sanitizeCsvCell(-500)).toBe("-500");
  });

  it("allows only safe http(s), relative, and sanitized tel URLs", () => {
    expect(sanitizeSafeUrl("https://chandanaish-darbar.com/events")).toBe(
      "https://chandanaish-darbar.com/events"
    );
    expect(sanitizeSafeUrl("/events", { allowRelative: true })).toBe("/events");
    expect(sanitizeSafeUrl("//evil.com/x", { allowRelative: true })).toBe("");
    expect(sanitizeSafeUrl("javascript:alert(1)", { allowRelative: true })).toBe("");
    expect(sanitizeSafeUrl("data:text/html,<script>", { allowRelative: true })).toBe("");
    expect(sanitizeSafeUrl("tel:+8801712345678", { allowTel: true })).toBe(
      "tel:+8801712345678"
    );
  });

  it("sanitizes unsafe filename segments", () => {
    expect(sanitizeFilenameSegment("../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeFilenameSegment('test:"file"?', "fallback")).toBe("test-file");
    expect(sanitizeFilenameSegment("", "fallback")).toBe("fallback");
  });
});

describe("phone normalization utilities", () => {
  it("normalizes Bangla digits and +880 prefixes accurately", () => {
    expect(normalizePhoneNumber("+8801712345678")).toBe("01712345678");
    expect(normalizePhoneNumber("০১৭১২-৩৪৫৬৭৮")).toBe("01712345678");
    expect(isValidPhoneNumber("০১৮১৯৬১৪৪৪৪")).toBe(true);
    expect(formatBangladeshIntlPhone("+8801712345678")).toBe("8801712345678");
    expect(formatBangladeshIntlPhone("01712345678")).toBe("8801712345678");
  });
});

describe("financial calculations", () => {
  const members: Member[] = [
    {
      id: "m1",
      member_code: "CDS-001",
      full_name: "Test Member",
      phone: "01712345678",
      joined_date: "2026-01-01",
      monthly_rate: 500,
      is_active: true,
    },
  ];
  const expenses: Expense[] = [
    {
      id: "e1",
      title: "Lighting",
      amount: 200,
      expense_date: "2026-01-10",
    },
  ];
  const payments: Payment[] = [
    {
      id: "p1",
      member_id: "m1",
      amount: 500,
      for_year: 2026,
      for_month: 1,
      payment_date: "2026-01-05",
      method: "cash",
      status: "approved",
    },
    {
      id: "p2",
      member_id: "m1",
      amount: 999999,
      for_year: 2026,
      for_month: 2,
      payment_date: "2026-02-05",
      method: "bkash",
      status: "pending",
    },
    {
      id: "p3",
      member_id: "m1",
      amount: 50000,
      for_year: 2026,
      for_month: 3,
      payment_date: "2026-03-05",
      method: "bkash",
      status: "rejected",
    },
  ];

  it("excludes pending and rejected payments from realized income and member dues", () => {
    const summary = computeFinancialSummary(payments, expenses, members);
    expect(summary.totalIncome).toBe(500);
    expect(summary.totalExpense).toBe(200);
    expect(summary.balance).toBe(300);

    const stats = computeMemberStats(members, payments);
    expect(stats[0].memPays).toHaveLength(1);
    expect(stats[0].memPays[0].amount).toBe(500);
  });
});
