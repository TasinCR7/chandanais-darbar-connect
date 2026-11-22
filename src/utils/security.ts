/**
 * Safely escape characters that could lead to HTML injection (XSS).
 */
export const escapeHtml = (unsafe: string | number | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function hasControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isDangerousCsvPrefix(text: string): boolean {
  if (!text) return false;
  if (text.startsWith("\t") || text.startsWith("\r")) return true;
  let i = 0;
  while (i < text.length && text.charCodeAt(i) <= 32) {
    i++;
  }
  if (i >= text.length) return false;
  const firstVisible = text[i];
  return firstVisible === "=" || firstVisible === "+" || firstVisible === "-" || firstVisible === "@";
}

/**
 * Neutralize spreadsheet formula injection (=, +, -, @, tab, CR) and quote RFC 4180 CSV cells.
 */
export const sanitizeCsvCell = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val) : "";
  }
  let text = String(val);
  if (isDangerousCsvPrefix(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Allow only safe navigation/image URLs (http/https, optional relative `/` or `tel:`).
 * Rejects `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and control characters.
 */
export const sanitizeSafeUrl = (
  rawUrl: string | null | undefined,
  options: { allowRelative?: boolean; allowTel?: boolean } = {}
): string => {
  if (!rawUrl) return "";
  const trimmed = String(rawUrl).trim();
  if (!trimmed) return "";

  if (hasControlChars(trimmed)) return "";

  if (options.allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  if (options.allowTel && /^tel:[+\d\-\s()]{5,25}$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
};

/**
 * Sanitize filename segments for client-side PDF/CSV downloads.
 */
export const sanitizeFilenameSegment = (raw: string | null | undefined, fallback = "document"): string => {
  const cleaned = String(raw || "")
    .trim()
    .replace(/[/\\:*?"<>|\s]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
};
