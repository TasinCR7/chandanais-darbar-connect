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

  it("creates an empty certificate with valid defaults", () => {
    const cert = createEmptyCertificate();
    expect(cert.certificate_code).toMatch(/^CDS-VOL-\d{4}-[A-Z0-9]{5}$/);
    expect(cert.issue_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cert.role_title.length).toBeGreaterThan(0);
    expect(cert.event_name.length).toBeGreaterThan(0);
    expect(cert.status).toBe("active");
  });
});
