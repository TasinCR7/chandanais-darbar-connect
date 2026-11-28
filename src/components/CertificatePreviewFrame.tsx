import React, { useEffect, useRef, useState } from "react";
import { VolunteerCertificateTemplate } from "@/components/VolunteerCertificateTemplate";
import type { VolunteerCertificate } from "@/lib/certificate";

interface CertificatePreviewFrameProps {
  certificate: VolunteerCertificate;
  exportRef: React.RefObject<HTMLDivElement>;
}

const CERT_WIDTH = 1123;
const CERT_HEIGHT = 794;

/**
 * Displays a crisp, responsive scaled preview of the 1123x794 certificate
 * while maintaining a full-resolution hidden node for pixel-perfect PDF/PNG export.
 */
export const CertificatePreviewFrame: React.FC<CertificatePreviewFrameProps> = ({
  certificate,
  exportRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setScale(Math.min(1, width / CERT_WIDTH));
      }
    };

    updateScale();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateScale);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const scaledHeight = Math.round(CERT_HEIGHT * scale);

  return (
    <>
      {/* Responsive Visual Preview */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-gold/30 shadow-2xl bg-[#fdfbf4]"
        style={{ height: `${scaledHeight}px` }}
      >
        <div
          style={{
            width: `${CERT_WIDTH}px`,
            height: `${CERT_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <VolunteerCertificateTemplate certificate={certificate} />
        </div>
      </div>

      {/* Off-screen Full-Resolution Export Target */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-20000px",
          left: "-20000px",
          pointerEvents: "none",
          zIndex: -1000,
        }}
      >
        <VolunteerCertificateTemplate ref={exportRef} certificate={certificate} />
      </div>
    </>
  );
};
