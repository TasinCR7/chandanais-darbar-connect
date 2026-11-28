/**
 * Returns a YYYY-MM-DD string in the user's LOCAL timezone.
 *
 * `new Date().toISOString().slice(0, 10)` returns the UTC date, which in
 * Bangladesh (UTC+6) gives *yesterday's* date between 00:00 and 06:00 local
 * time. Use this helper for all form defaults, payment dates and filenames.
 */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns a YYYY-MM string in the user's LOCAL timezone. */
export function toLocalISOMonth(date: Date = new Date()): string {
  return toLocalISODate(date).slice(0, 7);
}
