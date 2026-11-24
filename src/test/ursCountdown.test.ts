import { describe, it, expect } from "vitest";
import { getNextUrs, getNextMonthlyUrs } from "@/lib/ursDates";

describe("UrsCountdown date rollover", () => {
  it("picks the next upcoming hardcoded Urs event in 2026", () => {
    const result = getNextUrs(new Date("2026-06-01T12:00:00"));
    expect(result.gregorianDate).toBe("2026-07-29");
    expect(result.targetDate.getFullYear()).toBe(2026);
    expect(result.targetDate.getMonth()).toBe(6); // July (0-indexed)
    expect(result.targetDate.getDate()).toBe(29);
  });

  it("rolls over to May 2027 (not 2028) after March 15 2027 passes", () => {
    const result = getNextUrs(new Date("2027-04-01T12:00:00"));
    expect(result.targetDate.getFullYear()).toBe(2027);
    expect(result.targetDate.getMonth()).toBe(4); // May (0-indexed)
    expect(result.targetDate.getDate()).toBe(25);
  });

  it("rolls over to January of next year after December passes", () => {
    const result = getNextUrs(new Date("2027-12-20T12:00:00"));
    expect(result.targetDate.getFullYear()).toBe(2028);
    expect(result.targetDate.getMonth()).toBe(0); // January
    expect(result.targetDate.getDate()).toBe(14);
  });

  it("rolls over monthly Urs to March 2027 (not 2028) after Feb 14 2027 passes", () => {
    const nextMonthly = getNextMonthlyUrs(new Date("2027-02-20T12:00:00"));
    expect(nextMonthly.getFullYear()).toBe(2027);
    expect(nextMonthly.getMonth()).toBe(2); // March (0-indexed)
    expect(nextMonthly.getDate()).toBe(23);
  });
});
