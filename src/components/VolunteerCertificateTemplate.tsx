import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toBanglaNumber } from "@/lib/bangla";
import {
  getCertificateVerifyUrl,
  type VolunteerCertificate,
} from "@/lib/certificate";

interface Props {
  certificate: VolunteerCertificate;
}

function formatCertificateDate(dateStr?: string | null, isEn = false): string {
  if (!dateStr) return "—";
  try {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return isEn ? dateStr : toBanglaNumber(dateStr);
    }
    return parsed.toLocaleDateString(isEn ? "en-GB" : "bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isEn ? dateStr : toBanglaNumber(dateStr);
  }
}

/**
 * Full-resolution A4 Landscape (1123 x 794 px) Volunteer Certificate of Appreciation.
 * Supports both Bangla ("bn") and English ("en") layouts with inline styles for pixel-perfect PDF/PNG export.
 */
export const VolunteerCertificateTemplate = React.forwardRef<HTMLDivElement, Props>(
  ({ certificate }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const isEn = certificate.language === "en";

    useEffect(() => {
      let active = true;
      const code = certificate.certificate_code?.trim();
      if (!code) {
        setQrDataUrl("");
        return () => {
          active = false;
        };
      }
      const verifyUrl = getCertificateVerifyUrl(code);
      QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: { dark: "#064e3b", light: "#fdfbf4" },
      })
        .then((url) => {
          if (active) setQrDataUrl(url);
        })
        .catch(() => {
          if (active) setQrDataUrl("");
        });
      return () => {
        active = false;
      };
    }, [certificate.certificate_code]);

    const volunteerName =
      certificate.volunteer_name?.trim() || (isEn ? "Volunteer Name" : "স্বেচ্ছাসেবকের নাম");
    const roleTitle =
      certificate.role_title?.trim() || (isEn ? "Volunteer" : "স্বেচ্ছাসেবক");
    const eventName =
      certificate.event_name?.trim() ||
      (isEn ? "Annual Urs Sharif & Darbar Khidmat" : "পবিত্র ওরশ শরীফ ও দরবার খিদমত");
    const formattedIssueDate = formatCertificateDate(certificate.issue_date, isEn);

    return (
      <div
        ref={ref}
        style={{
          width: "1123px",
          height: "794px",
          backgroundColor: "#fdfbf4",
          backgroundImage:
            "radial-gradient(circle at 50% 45%, rgba(212, 175, 55, 0.08) 0%, rgba(6, 78, 59, 0.03) 65%, rgba(6, 78, 59, 0.07) 100%)",
          color: "#1a1a1a",
          fontFamily: isEn
            ? "'Georgia', 'Noto Sans Bengali', 'Segoe UI', serif"
            : "'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        {/* Subtle Center Watermark */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-18deg)",
            fontSize: isEn ? "64px" : "88px",
            fontWeight: 900,
            color: "rgba(6, 78, 59, 0.035)",
            whiteSpace: "nowrap",
            letterSpacing: "6px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {isEn ? "CHANDANAISH DARBAR SHARIF" : "চন্দনাইশ দরবার শরীফ"}
        </div>

        {/* Outer Emerald Frame */}
        <div
          style={{
            position: "absolute",
            inset: "18px",
            border: "5px solid #064e3b",
            borderRadius: "8px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        {/* Inner Gold Frame */}
        <div
          style={{
            position: "absolute",
            inset: "28px",
            border: "2px solid #b8860b",
            borderRadius: "4px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        {/* Thin Inner Accent */}
        <div
          style={{
            position: "absolute",
            inset: "34px",
            border: "1px dashed rgba(184, 134, 11, 0.45)",
            borderRadius: "2px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* 4 Ornamental Corner Accents */}
        {[
          { top: "14px", left: "14px", bt: true, bl: true },
          { top: "14px", right: "14px", bt: true, br: true },
          { bottom: "14px", left: "14px", bb: true, bl: true },
          { bottom: "14px", right: "14px", bb: true, br: true },
        ].map((pos, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              right: pos.right,
              width: "46px",
              height: "46px",
              borderTop: pos.bt ? "6px solid #b8860b" : "none",
              borderBottom: pos.bb ? "6px solid #b8860b" : "none",
              borderLeft: pos.bl ? "6px solid #b8860b" : "none",
              borderRight: pos.br ? "6px solid #b8860b" : "none",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Content Wrapper */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            height: "100%",
            padding: "46px 68px 42px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          {/* Top Header */}
          <div style={{ textAlign: "center" }}>
            {/* Top Meta Row: Cert ID & Date */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "#4b5563",
                marginBottom: "4px",
              }}
            >
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#064e3b" }}>
                {isEn ? "Certificate No:" : "সনদ নং:"} {certificate.certificate_code}
              </div>
              <div style={{ fontWeight: 600, color: "#064e3b" }}>
                {isEn ? "Date of Issue:" : "ইস্যু তারিখ:"} {formattedIssueDate}
              </div>
            </div>

            {/* Bismillah */}
            <div
              style={{
                fontSize: "24px",
                color: "#064e3b",
                fontFamily: "'Amiri', serif",
                letterSpacing: "1px",
                marginBottom: "4px",
              }}
            >
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </div>

            {/* Logo + Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                marginBottom: "4px",
              }}
            >
              <img
                src="/logo.png"
                alt="Darbar Logo"
                crossOrigin="anonymous"
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  border: "2px solid #b8860b",
                  objectFit: "cover",
                  backgroundColor: "#0a0a0a",
                }}
              />
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: isEn ? "28px" : "30px",
                    fontWeight: 900,
                    color: "#064e3b",
                    lineHeight: 1.15,
                    letterSpacing: isEn ? "1.5px" : "0px",
                  }}
                >
                  {isEn ? "CHANDANAISH DARBAR SHARIF" : "চন্দনাইশ দরবার শরীফ"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#92400e",
                    letterSpacing: isEn ? "1.2px" : "1.5px",
                  }}
                >
                  {isEn
                    ? "Silsila-e-Tariqaye Maizbhandaria • Chandanaish, Chattogram, Bangladesh"
                    : "সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া • চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ"}
                </div>
              </div>
            </div>

            {/* Ribbon Banner */}
            <div
              style={{
                marginTop: "10px",
                display: "inline-block",
                background:
                  "linear-gradient(135deg, #064e3b 0%, #047857 50%, #064e3b 100%)",
                color: "#fef3c7",
                padding: "8px 38px",
                borderRadius: "999px",
                border: "2px solid #d4af37",
                boxShadow: "0 4px 12px rgba(6, 78, 59, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: isEn ? "17px" : "18px",
                  fontWeight: 800,
                  letterSpacing: isEn ? "2px" : "1px",
                  textTransform: isEn ? "uppercase" : "none",
                }}
              >
                {isEn
                  ? "Certificate of Volunteer Appreciation"
                  : "স্বেচ্ছাসেবক সম্মাননা সনদপত্র"}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  letterSpacing: isEn ? "1.5px" : "3px",
                  textTransform: isEn ? "none" : "uppercase",
                  color: "#fde68a",
                  marginTop: "1px",
                }}
              >
                {isEn
                  ? "স্বেচ্ছাসেবক সম্মাননা সনদপত্র"
                  : "Certificate of Volunteer Appreciation"}
              </div>
            </div>
          </div>

          {/* Middle Body: Recipient & Citation */}
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <div
              style={{
                fontSize: "14px",
                color: "#4b5563",
                fontWeight: 600,
                marginBottom: "8px",
                fontStyle: isEn ? "italic" : "normal",
              }}
            >
              {isEn
                ? "This certificate is proudly presented with sincere gratitude to"
                : "এই মর্মে সাদর সম্মাননা ও কৃতজ্ঞতা জ্ঞাপন করা যাচ্ছে যে,"}
            </div>

            {/* Volunteer Name */}
            <div
              style={{
                fontSize: "38px",
                fontWeight: 900,
                color: "#064e3b",
                lineHeight: 1.2,
                paddingBottom: "8px",
                margin: "0 auto 10px",
                maxWidth: "760px",
                borderBottom: "2px solid #d4af37",
              }}
            >
              {volunteerName}
            </div>

            {/* Optional Father Name / Address */}
            {(certificate.father_name?.trim() || certificate.address?.trim()) && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#374151",
                  fontWeight: 600,
                  marginBottom: "10px",
                }}
              >
                {certificate.father_name?.trim() && (
                  <span>
                    {isEn ? "S/O / D/O: " : "পিতা: "}
                    {certificate.father_name.trim()}
                  </span>
                )}
                {certificate.father_name?.trim() && certificate.address?.trim() && (
                  <span style={{ margin: "0 10px", color: "#b8860b" }}>•</span>
                )}
                {certificate.address?.trim() && (
                  <span>
                    {isEn ? "Address: " : "ঠিকানা: "}
                    {certificate.address.trim()}
                  </span>
                )}
              </div>
            )}

            {/* Role Pill */}
            <div style={{ marginBottom: "12px" }}>
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #d4af37",
                  borderRadius: "999px",
                  padding: "4px 20px",
                  fontSize: "14px",
                  fontWeight: 800,
                }}
              >
                {isEn ? `Role: ${roleTitle}` : `দায়িত্ব: ${roleTitle}`}
              </span>
            </div>

            {/* Citation Paragraph */}
            {isEn ? (
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.75,
                  color: "#1f2937",
                  maxWidth: "860px",
                  margin: "0 auto",
                  fontWeight: 500,
                }}
              >
                In heartfelt recognition of outstanding dedication, sincerity, and selfless
                service rendered during{" "}
                <strong style={{ color: "#064e3b", fontWeight: 800 }}>“{eventName}”</strong>
                {certificate.service_period?.trim() ? (
                  <> ({certificate.service_period.trim()})</>
                ) : null}{" "}
                at Chandanaish Darbar Sharif. We deeply appreciate this noble contribution
                and pray for continued blessings, well-being, and spiritual elevation.
              </p>
            ) : (
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.75,
                  color: "#1f2937",
                  maxWidth: "860px",
                  margin: "0 auto",
                  fontWeight: 500,
                }}
              >
                চন্দনাইশ দরবার শরীফের{" "}
                <strong style={{ color: "#064e3b", fontWeight: 800 }}>“{eventName}”</strong>
                {certificate.service_period?.trim() ? (
                  <> ({certificate.service_period.trim()})</>
                ) : null}{" "}
                সফলভাবে সম্পন্ন করতে নিষ্ঠা, আন্তরিকতা ও নিঃস্বার্থ খেদমতের মাধ্যমে অসামান্য অবদান
                রেখেছেন। তাঁর এই মহৎ সেবার স্বীকৃতিস্বরূপ চন্দনাইশ দরবার শরীফের পক্ষ থেকে এই
                সম্মাননা সনদপত্র প্রদান করা হলো। আমরা তাঁর সর্বাঙ্গীণ মঙ্গল ও রূহানী উন্নতি কামনা
                করি।
              </p>
            )}
          </div>

          {/* Bottom Row: Signatures + Official Seal + QR */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 1fr 110px",
              alignItems: "end",
              gap: "16px",
              paddingTop: "8px",
            }}
          >
            {/* Left Signature: Committee */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "36px",
                  borderBottom: "1.5px solid #064e3b",
                  width: "220px",
                  margin: "0 auto 6px",
                }}
              />
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#064e3b" }}>
                {isEn ? "Managing Committee" : "পরিচালনা কমিটি"}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                {isEn
                  ? "Chandanaish Darbar Sharif, Chattogram"
                  : "চন্দনাইশ দরবার শরীফ, চট্টগ্রাম"}
              </div>
            </div>

            {/* Center Official Golden Seal */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, #fef3c7 0%, #f59e0b 60%, #b45309 100%)",
                  border: "3px double #064e3b",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#064e3b",
                  boxShadow: "0 4px 12px rgba(180, 83, 9, 0.25)",
                  padding: "6px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: isEn ? "9px" : "10px", fontWeight: 900, lineHeight: 1.2 }}>
                  {isEn ? "OFFICIAL SEAL" : "অফিসিয়াল সিল"}
                </div>
                <div style={{ fontSize: "14px", margin: "2px 0" }}>✦</div>
                <div style={{ fontSize: isEn ? "8px" : "9px", fontWeight: 800, lineHeight: 1.15 }}>
                  {isEn ? "CHANDANAISH DARBAR SHARIF" : "চন্দনাইশ দরবার শরীফ"}
                </div>
              </div>
            </div>

            {/* Right Signature: Primary Signatory */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "36px",
                  borderBottom: "1.5px solid #064e3b",
                  width: "240px",
                  margin: "0 auto 6px",
                }}
              />
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#064e3b" }}>
                {certificate.signatory_name?.trim() ||
                  (isEn ? "Chief Khadim" : "প্রধান খেদমতকারী")}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                {certificate.signatory_title?.trim() ||
                  (isEn ? "Chandanaish Darbar Sharif" : "চন্দনাইশ দরবার শরীফ")}
              </div>
            </div>

            {/* QR Verification Block */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  margin: "0 auto 4px",
                  padding: "4px",
                  backgroundColor: "#fdfbf4",
                  border: "1px solid #d4af37",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Verification QR"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <span style={{ fontSize: "9px", color: "#6b7280" }}>QR</span>
                )}
              </div>
              <div style={{ fontSize: "9px", color: "#6b7280", fontWeight: 700 }}>
                {isEn ? "Scan to Verify" : "যাচাই করতে স্ক্যান করুন"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VolunteerCertificateTemplate.displayName = "VolunteerCertificateTemplate";
