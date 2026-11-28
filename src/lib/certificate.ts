import { toLocalISODate } from "@/lib/localDate";
import { sanitizeFilenameSegment } from "@/utils/security";

export type CertificateLanguage = "bilingual" | "bn" | "en";

export interface VolunteerCertificate {
  id?: string;
  certificate_code: string;
  volunteer_name: string;
  father_name?: string | null;
  phone?: string | null;
  address?: string | null;
  role_title: string;
  event_name: string;
  service_period?: string | null;
  issue_date: string;
  signatory_name: string;
  signatory_title: string;
  language?: CertificateLanguage;
  status?: "active" | "revoked";
  notes?: string | null;
  created_at?: string;
}

export const VOLUNTEER_ROLE_PRESETS = [
  "স্বেচ্ছাসেবক",
  "প্রধান স্বেচ্ছাসেবক",
  "শৃঙ্খলা ও নিরাপত্তা স্বেচ্ছাসেবক",
  "মেহমানদারী ও তবারুক বিতরণ স্বেচ্ছাসেবক",
  "চিকিৎসা ও প্রাথমিক সেবা স্বেচ্ছাসেবক",
  "মিডিয়া, প্রচার ও তথ্য স্বেচ্ছাসেবক",
  "মঞ্চ ও সাউন্ড ব্যবস্থাপনা স্বেচ্ছাসেবক",
  "পরিষ্কার-পরিচ্ছন্নতা স্বেচ্ছাসেবক",
];

export const VOLUNTEER_ROLE_PRESETS_EN = [
  "Volunteer",
  "Lead Volunteer",
  "Discipline & Security Volunteer",
  "Hospitality & Tabarruk Distribution Volunteer",
  "Medical & First Aid Volunteer",
  "Media, Publicity & Information Volunteer",
  "Stage & Sound Management Volunteer",
  "Cleanliness & Sanitation Volunteer",
];

export const EVENT_PRESETS = [
  "পবিত্র বার্ষিক ওরশ শরীফ ২০২৬",
  "গাউছে জামান মাইজভান্ডারী ওরশ শরীফ",
  "পীর বাবা ভান্ডারীর ওরশ শরীফ",
  "বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন মাহফিল",
  "মাসিক ৩ তারিখ ওরশ ও ফাতেহা শরীফ",
  "দরবার শরীফের নিয়মিত খিদমত ও সেবাকার্যক্রম",
];

export const EVENT_PRESETS_EN = [
  "Annual Urs Sharif 2026",
  "Ghaus-e-Zaman Maizbhandari Urs Sharif",
  "Pir Baba Bhandari Urs Sharif",
  "Babajan Qibla Chandanaishi Birth Anniversary Mahfil",
  "Monthly 3rd Arabic Date Urs & Fateha Sharif",
  "Regular Khidmat & Volunteer Service at Darbar Sharif",
];

export const DEFAULT_SIGNATORY_NAME =
  "শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী";
export const DEFAULT_SIGNATORY_TITLE = "গদ্দীনশীন পীর ও প্রধান খেদমতকারী";

export const DEFAULT_SIGNATORY_NAME_EN =
  "Shahzada Syed Mohammad Moksudul Alam Shah Al-Chandanaishi";
export const DEFAULT_SIGNATORY_TITLE_EN = "Gaddinashin Pir & Chief Khadim";

export const VERIFY_BASE_URL = "https://www.chandanaishdarbarsharif.com/certificates";

export function generateCertificateCode(year: number = new Date().getFullYear()): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = new Uint8Array(5);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 5; i++) {
      suffix += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 5; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `CDS-VOL-${year}-${suffix}`;
}

export function getCertificateVerifyUrl(code: string): string {
  return `${VERIFY_BASE_URL}?code=${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function createEmptyCertificate(
  language: CertificateLanguage = "bilingual"
): VolunteerCertificate {
  const isEn = language === "en";
  return {
    certificate_code: generateCertificateCode(),
    volunteer_name: "",
    father_name: "",
    phone: "",
    address: "",
    role_title: isEn ? VOLUNTEER_ROLE_PRESETS_EN[0] : VOLUNTEER_ROLE_PRESETS[0],
    event_name: isEn ? EVENT_PRESETS_EN[0] : EVENT_PRESETS[0],
    service_period: "",
    issue_date: toLocalISODate(),
    signatory_name: isEn ? DEFAULT_SIGNATORY_NAME_EN : DEFAULT_SIGNATORY_NAME,
    signatory_title: isEn ? DEFAULT_SIGNATORY_TITLE_EN : DEFAULT_SIGNATORY_TITLE,
    language,
    status: "active",
  };
}

export async function downloadCertificatePNG(
  element: HTMLElement,
  certificate: VolunteerCertificate
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#fdfbf4",
    width: 1123,
    height: 794,
    windowWidth: 1123,
    windowHeight: 794,
  });

  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const link = document.createElement("a");
  const safeName = sanitizeFilenameSegment(certificate.volunteer_name, "Volunteer");
  const safeCode = sanitizeFilenameSegment(certificate.certificate_code, "CERT");
  link.download = `Certificate-${safeName}-${safeCode}.png`;
  link.href = dataUrl;
  link.click();
}

export async function downloadCertificatePDF(
  element: HTMLElement,
  certificate: VolunteerCertificate
): Promise<void> {
  const [html2canvasMod, jsPDFMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const html2canvas = html2canvasMod.default;
  const jsPDF = jsPDFMod.default;

  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#fdfbf4",
    width: 1123,
    height: 794,
    windowWidth: 1123,
    windowHeight: 794,
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);

  const safeName = sanitizeFilenameSegment(certificate.volunteer_name, "Volunteer");
  const safeCode = sanitizeFilenameSegment(certificate.certificate_code, "CERT");
  pdf.save(`Certificate-${safeName}-${safeCode}.pdf`);
}
