import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { sanitizeSafeUrl } from "@/utils/security";

const DISMISSED_STORAGE_KEY = "darbar_welcome_popup_dismissed";

const HIDDEN_ROUTE_PREFIXES = [
  "/admin",
  "/maintenance",
  "/committee-login",
  "/committee-dashboard",
];

const DEFAULT_TITLE = "চন্দনাইশ দরবার শরীফ";
const DEFAULT_BADGE = "আসসালামু আলাইকুম • স্বাগতম";
const DEFAULT_SUBTITLE = "সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া";
const DEFAULT_MESSAGE =
  "গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ)-এর পবিত্র দরবার শরীফের অফিসিয়াল ওয়েবসাইটে আপনাকে স্বাগতম। দরবারের ওরশ শরীফ, জরুরি নোটিশ ও খিদমত সংক্রান্ত সকল তথ্য এখান থেকে জানুন।";
const DEFAULT_CTA_TEXT = "ওরশ ও অনুষ্ঠান দেখুন";
const DEFAULT_CTA_URL = "/events";

export default function WelcomePopupBanner() {
  const { data: appSettings = {} } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const isMaintenanceMode =
    import.meta.env.VITE_MAINTENANCE_MODE === "true" ||
    String(appSettings.maintenance_mode) === "true";

  const isHiddenRoute = HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  const isEnabled = String(appSettings.popup_banner_enabled) !== "false";
  const bannerVersion = (appSettings.popup_banner_version || "v1").trim();

  const imageUrl = sanitizeSafeUrl(appSettings.popup_banner_image_url, {
    allowRelative: true,
  });
  const ctaUrl = sanitizeSafeUrl(appSettings.popup_banner_cta_url || DEFAULT_CTA_URL, {
    allowRelative: true,
  });

  const badgeText = (appSettings.popup_banner_badge ?? DEFAULT_BADGE).trim();
  const titleText = (appSettings.popup_banner_title || DEFAULT_TITLE).trim();
  const subtitleText = (appSettings.popup_banner_subtitle ?? DEFAULT_SUBTITLE).trim();
  const messageText = (appSettings.popup_banner_message || DEFAULT_MESSAGE).trim();
  const ctaText = (appSettings.popup_banner_cta_text ?? DEFAULT_CTA_TEXT).trim();

  const dismissPopup = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISSED_STORAGE_KEY, bannerVersion);
    } catch {
      // ignore sessionStorage privacy mode restrictions
    }
  }, [bannerVersion]);

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!isEnabled || isHiddenRoute || isMaintenanceMode) {
      setOpen(false);
      return;
    }

    let alreadyDismissed = false;
    try {
      alreadyDismissed = sessionStorage.getItem(DISMISSED_STORAGE_KEY) === bannerVersion;
    } catch {
      alreadyDismissed = false;
    }

    if (alreadyDismissed) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [isEnabled, isHiddenRoute, isMaintenanceMode, bannerVersion]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissPopup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismissPopup]);

  const handleCtaClick = () => {
    dismissPopup();
    if (!ctaUrl) return;
    if (ctaUrl.startsWith("/")) {
      navigate(ctaUrl);
      return;
    }
    window.open(ctaUrl, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 md:backdrop-blur-sm animate-in fade-in duration-200"
      onClick={dismissPopup}
    >
      <div
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl border border-gold/40 bg-gradient-to-b from-[#131b17] via-[#0e1411] to-[#0a0f0c] text-foreground shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ornamental gold strip */}
        <div className="h-1.5 w-full bg-gold-gradient" />

        {/* Close Button */}
        <button
          type="button"
          onClick={dismissPopup}
          aria-label="পপআপ বন্ধ করুন"
          className="absolute top-3.5 right-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-black/60 text-gold hover:bg-gold hover:text-primary-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Optional Banner Poster Image */}
        {imageUrl && !imgFailed && (
          <div className="relative w-full bg-black/40 border-b border-gold/20">
            <img
              src={imageUrl}
              alt={titleText}
              onError={() => setImgFailed(true)}
              className="w-full max-h-[42vh] object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-7 text-center space-y-4">
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold font-bangla">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{badgeText}</span>
            </div>
          )}

          <div className="space-y-1">
            <h2
              id="welcome-popup-title"
              className="text-xl sm:text-2xl font-heading font-bold text-gold leading-snug"
            >
              {titleText}
            </h2>
            {subtitleText && (
              <p className="text-xs sm:text-sm text-emerald-light/90 font-bangla font-medium">
                {subtitleText}
              </p>
            )}
          </div>

          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <p className="text-sm sm:text-base text-foreground/90 font-bangla leading-relaxed whitespace-pre-line">
            {messageText}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:justify-center">
            {ctaText && ctaUrl && (
              <button
                type="button"
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-primary-foreground font-bold text-sm font-bangla shadow-lg shadow-gold/20 hover:opacity-95 transition-opacity min-h-[44px]"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={dismissPopup}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-gold/30 bg-background/40 hover:bg-gold/10 text-foreground text-sm font-semibold font-bangla transition-colors min-h-[44px]"
            >
              প্রবেশ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
