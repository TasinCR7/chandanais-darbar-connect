import { describe, it, expect } from "vitest";
import {
  createEmptyCertificate,
  generateCertificateCode,
  getCertificateVerifyUrl,
} from "@/lib/certificate";

describe("Volunteer Certificate helpers", () => {
  it("generates a formatted unique certificate code", () => {
    const c1 = generateCertificateCode(2026);
    const c2 = generateCertificateCode(2026);
    expect(c1).toMatch(/^CDS-VOL-2026-[A-Z0-9]{5}$/);
    expect(c2).toMatch(/^CDS-VOL-2026-[A-Z0-9]{5}$/);
    expect(c1).not.toBe(c2);
  });

  it("builds a clean verification URL with normalized code", () => {
    expect(getCertificateVerifyUrl("  cds-vol-2026-ab12c ")).toBe(
      "https://www.chandanaishdarbarsharif.com/certificates?code=CDS-VOL-2026-AB12C"
    );
  });

  it("creates an empty certificate with valid defaults in Bilingual, Bangla, and English", () => {
    const certBi = createEmptyCertificate();
    expect(certBi.language).toBe("bilingual");
    expect(certBi.certificate_code).toMatch(/^CDS-VOL-\d{4}-[A-Z0-9]{5}$/);

    const certBn = createEmptyCertificate("bn");
    expect(certBn.issue_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(certBn.language).toBe("bn");
    expect(certBn.role_title).toBe("স্বেচ্ছাসেবক");
    expect(certBn.status).toBe("active");

    const certEn = createEmptyCertificate("en");
    expect(certEn.language).toBe("en");
    expect(certEn.role_title).toBe("Volunteer");
    expect(certEn.event_name).toContain("Urs Sharif");
  });
});
