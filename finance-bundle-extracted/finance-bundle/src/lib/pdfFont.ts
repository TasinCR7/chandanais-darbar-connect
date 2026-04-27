// Bangla / Bengali font support for jsPDF.
// Loads NotoSansBengali (TTF) from /fonts/, base64-encodes it once,
// registers with jsPDF, and exposes a single helper to set the font
// safely. jsPDF synthesizes bold from the regular face, so a single
// Variable TTF is enough.
import type jsPDF from 'jspdf';

const FONT_URL = '/fonts/NotoSansBengali-Regular.ttf';
const FONT_NAME = 'NotoBengali';
const FONT_FILE = 'NotoSansBengali-Regular.ttf';

let cachedBase64: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchFontBase64(): Promise<string> {
  if (cachedBase64) return cachedBase64;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`Failed to load Bangla font: ${res.status}`);
    const buf = await res.arrayBuffer();
    // Convert ArrayBuffer to base64 in chunks (browser-safe).
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    cachedBase64 = btoa(binary);
    return cachedBase64;
  })();
  return inflight;
}

/**
 * Make sure the Bangla font is registered on `doc` and set as active.
 * Call once per generated PDF (await before drawing any text).
 */
export async function ensureBanglaFont(
  doc: jsPDF,
  style: 'normal' | 'bold' = 'normal',
): Promise<void> {
  try {
    const b64 = await fetchFontBase64();
    // jsPDF VFS only needs to be populated once per file name per doc.
    const vfs = (doc as any).getFileFromVFS?.(FONT_FILE);
    if (!vfs) {
      doc.addFileToVFS(FONT_FILE, b64);
      doc.addFont(FONT_FILE, FONT_NAME, 'normal');
      // Register a synthetic bold mapping that points at the same file —
      // jsPDF will fall back to faux-bold rendering for it.
      doc.addFont(FONT_FILE, FONT_NAME, 'bold');
    }
    doc.setFont(FONT_NAME, style);
  } catch (e) {
    // Hard fallback so PDFs still generate (Latin only) if font fails.
    console.warn('Bangla font load failed; falling back to helvetica.', e);
    doc.setFont('helvetica', style);
  }
}

/** Convenience: switch font style without re-fetching the font file. */
export function setBanglaFontStyle(doc: jsPDF, style: 'normal' | 'bold') {
  try {
    doc.setFont(FONT_NAME, style);
  } catch {
    doc.setFont('helvetica', style);
  }
}

export const BANGLA_FONT_NAME = FONT_NAME;
