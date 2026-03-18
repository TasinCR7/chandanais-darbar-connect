import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, ExternalLink } from "lucide-react";

const PDF_URL = "/books/chandanaish-darbar-jibonikatha.pdf";

const BookReader = () => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const isMobile = useIsMobile();

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 25, 200)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 25, 50)), []);
  const resetZoom = useCallback(() => setZoom(100), []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const openInNewTab = () => {
    window.open(PDF_URL, "_blank");
  };

  // On mobile, show a simple page with open/download buttons since embedded PDF is unreliable
  if (isMobile) {
    return (
      <>
        <SEO
          title="জীবনী বই পড়ুন - চন্দনাইশ দরবার শরীফ"
          description="গাউছেজামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ চন্দনাইশী মাইজভান্ডারী (ক:) এর পূর্ণাঙ্গ জীবনী বই পড়ুন।"
          canonical="/book"
        />
        <div className="min-h-screen flex flex-col bg-background">
          <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-gold/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                ফিরে যান
              </Link>
              <h1 className="text-sm font-heading font-semibold text-gold">জীবনী বই</h1>
              <div className="w-16" />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-24 h-24 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center"
            >
              <Download className="w-12 h-12 text-gold" />
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-heading font-bold text-foreground">জীবনী বই</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                গাউছেজামানের পূর্ণাঙ্গ জীবনী বই পড়তে নিচের বাটনে ক্লিক করুন।
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={openInNewTab}
                className="flex items-center justify-center gap-3 bg-gold-gradient text-primary-foreground font-semibold px-6 py-4 rounded-xl transition-all duration-300 gold-glow-hover w-full"
              >
                <ExternalLink className="w-5 h-5" />
                বই পড়ুন
              </button>
              <a
                href={PDF_URL}
                download
                className="flex items-center justify-center gap-3 bg-muted/50 hover:bg-muted border border-border hover:border-gold/40 text-muted-foreground hover:text-gold font-semibold px-6 py-4 rounded-xl transition-all duration-300 w-full"
              >
                <Download className="w-5 h-5" />
                ডাউনলোড (PDF)
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop: embedded PDF viewer
  return (
    <>
      <SEO
        title="জীবনী বই পড়ুন - চন্দনাইশ দরবার শরীফ"
        description="গাউছেজামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ চন্দনাইশী মাইজভান্ডারী (ক:) এর পূর্ণাঙ্গ জীবনী বই পড়ুন।"
        canonical="/book"
      />
      <div className="min-h-screen flex flex-col bg-background">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-gold/20 px-3 py-2 md:px-6 md:py-3"
        >
          <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>দরবার পরিচিতি</span>
            </Link>

            <h1 className="text-base font-heading font-semibold text-gold truncate px-2">
              জীবনী বই
            </h1>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={zoomOut}
                disabled={zoom <= 50}
                className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1 rounded-lg text-xs font-mono text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors min-w-[3rem] text-center"
                title="Reset Zoom"
              >
                {zoom}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= 200}
                className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <button
                onClick={openInNewTab}
                className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                title="নতুন ট্যাবে খুলুন"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <a
                href={PDF_URL}
                download
                className="p-2 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto">
          <div
            className="min-h-full flex items-start justify-center p-4"
            style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          >
            <div
              style={{
                width: `${zoom}%`,
                maxWidth: `${zoom * 10}px`,
                transition: "width 0.2s ease",
              }}
            >
              {!pdfError ? (
                <object
                  data={PDF_URL}
                  type="application/pdf"
                  className="w-full rounded-lg border border-border bg-card shadow-lg"
                  style={{ height: "calc(100vh - 60px)", minHeight: "600px" }}
                >
                  {/* Fallback if object tag doesn't work */}
                  <div className="flex flex-col items-center justify-center p-10 gap-4 text-center">
                    <p className="text-muted-foreground">
                      আপনার ব্রাউজারে PDF দেখানো যাচ্ছে না।
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={openInNewTab}
                        className="inline-flex items-center gap-2 bg-gold-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl"
                      >
                        <ExternalLink className="w-4 h-4" />
                        নতুন ট্যাবে খুলুন
                      </button>
                      <a
                        href={PDF_URL}
                        download
                        className="inline-flex items-center gap-2 bg-muted border border-border text-foreground font-semibold px-6 py-3 rounded-xl"
                      >
                        <Download className="w-4 h-4" />
                        ডাউনলোড
                      </a>
                    </div>
                  </div>
                </object>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 gap-4 text-center bg-card rounded-lg border border-border" style={{ height: "calc(100vh - 60px)" }}>
                  <p className="text-muted-foreground">PDF লোড করতে সমস্যা হচ্ছে।</p>
                  <div className="flex gap-3">
                    <button
                      onClick={openInNewTab}
                      className="inline-flex items-center gap-2 bg-gold-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl"
                    >
                      <ExternalLink className="w-4 h-4" />
                      নতুন ট্যাবে খুলুন
                    </button>
                    <a
                      href={PDF_URL}
                      download
                      className="inline-flex items-center gap-2 bg-muted border border-border text-foreground font-semibold px-6 py-3 rounded-xl"
                    >
                      <Download className="w-4 h-4" />
                      ডাউনলোড
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookReader;
