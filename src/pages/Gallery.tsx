import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import PremiumLoader from "@/components/PremiumLoader";

const categories = ["সকল", "দরবার শরীফ", "ওরশ শরীফ", "মাহফিল"];

const toBengaliNum = (n: number): string =>
  String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

interface GalleryItem {
  id: string;
  url: string;
  caption: string | null;
  category: string;
}

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("সকল");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data } = await supabase.from("gallery")
        .select("id, url, caption, category")
        .order("created_at", { ascending: false });
      
      if (data) {
        setGalleryItems(data as unknown as GalleryItem[]);
      }
      setLoading(false);
    };
    fetchGallery();
  }, []);

  const filtered =
    activeCategory === "সকল"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightbox === null) return;
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox(prev => (prev !== null && prev < filtered.length - 1 ? prev + 1 : prev));
      if (e.key === "ArrowLeft") setLightbox(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, filtered.length]);

  return (
    <>
      <SEO title="গ্যালারি" description="চন্দনাইশ দরবার শরীফের ওরশ, মাহফিল ও দরবারের স্মৃতিময় মুহূর্তের ছবি সংকলন।" canonical="/gallery" />
      <div className="py-20 islamic-pattern min-h-screen">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="গ্যালারি"
          subtitle="দরবার শরীফের স্মৃতিময় মুহূর্তসমূহ"
        />

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-gold-gradient text-primary-foreground border-gold"
                  : "border-gold/30 text-muted-foreground hover:text-gold hover:border-gold/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading / Grid */}
        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`${i % 2 === 0 ? "aspect-video" : "aspect-[4/5]"} rounded-lg border border-gold/10 overflow-hidden`}
                >
                  <div
                    className="w-full h-full bg-gradient-to-r from-card/50 via-gold/5 to-card/50 animate-pulse"
                    style={{ backgroundSize: "200% 100%" }}
                  />
                </div>
              ))}
            </div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-card/50 border border-gold/10 rounded-2xl max-w-2xl mx-auto">
              <ImageIcon className="mx-auto text-gold/30 mb-4" size={48} />
              <p className="text-muted-foreground">এই ক্যাটেগরিতে কোনো ছবি পাওয়া যায়নি।</p>
            </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className={`cursor-pointer group relative overflow-hidden rounded-lg border border-gold/20 ${
                  i % 2 === 0 ? "aspect-video" : "aspect-[4/5]"
                } shadow-sm hover:border-gold/50 transition-all`}
                onClick={() => setLightbox(i)}
              >
                <img
                  src={item.url}
                  alt={item.caption || "চন্দনাইশ দরবার শরীফ গ্যালারি ছবি"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-4">
                  <ZoomIn className="text-gold" size={28} />
                  <p className="text-cream text-sm font-medium text-center">{item.caption || "চন্দনাইশ দরবার শরীফ"}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightbox !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
            >
              {/* Image counter */}
              <span className="absolute top-6 left-6 text-gold/80 text-sm font-medium bg-background/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gold/20">
                {toBengaliNum(lightbox + 1)} / {toBengaliNum(filtered.length)}
              </span>

              {/* Close button */}
              <button
                className="absolute top-6 right-6 text-gold hover:text-gold-light"
                onClick={() => setLightbox(null)}
                title="বন্ধ করুন"
                aria-label="বন্ধ করুন"
              >
                <X size={32} />
              </button>

              {/* Left arrow */}
              {lightbox > 0 && (
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-gold p-3 rounded-full hover:bg-gold/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
                  }}
                  title="পূর্ববর্তী ছবি"
                  aria-label="পূর্ববর্তী ছবি"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Right arrow */}
              {lightbox < filtered.length - 1 && (
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-gold p-3 rounded-full hover:bg-gold/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => (prev !== null && prev < filtered.length - 1 ? prev + 1 : prev));
                  }}
                  title="পরবর্তী ছবি"
                  aria-label="পরবর্তী ছবি"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              <img
                src={filtered[lightbox]?.url}
                alt={filtered[lightbox]?.caption || ""}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="absolute bottom-10 left-0 right-0 text-center px-6">
                <p className="text-gold text-lg md:text-xl font-heading bg-background/50 backdrop-blur-sm inline-block px-6 py-2 rounded-full border border-gold/20">
                    {filtered[lightbox]?.caption || "চন্দনাইশ দরবার শরীফ"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
};
export default Gallery;
