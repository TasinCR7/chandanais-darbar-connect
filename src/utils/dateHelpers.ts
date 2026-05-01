
export const formatMonthBn = (m: string | null | undefined) => {
  if (!m) return "-";
  try {
    return new Date(m + "-01").toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
  } catch {
    return m;
  }
};
