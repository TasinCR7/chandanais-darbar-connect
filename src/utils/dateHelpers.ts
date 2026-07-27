
export const formatMonthBn = (m: string | null | undefined) => {
  if (!m) return "-";
  try {
    const dateStr = m.includes("T") ? m : `${m}-01T00:00:00`;
    return new Date(dateStr).toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
  } catch {
    return m;
  }
};

