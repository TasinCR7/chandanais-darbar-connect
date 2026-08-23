
export const formatMonthBn = (m: string | null | undefined) => {
  if (!m) return "-";
  try {
    let dateStr: string;
    if (m.includes("T")) {
      dateStr = m;
    } else if (/^\d{4}-\d{2}$/.test(m)) {
      // YYYY-MM format — append day
      dateStr = `${m}-01T00:00:00`;
    } else {
      // Already has day component or other format
      dateStr = `${m}T00:00:00`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return m;
    return d.toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
  } catch {
    return m;
  }
};

