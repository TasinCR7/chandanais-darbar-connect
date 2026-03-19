import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import PremiumLoader from "@/components/PremiumLoader";

const categories = ["সকল", "দরবার শরীফ", "ওরশ শরীফ", "মাহফিল"];

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
      const { data } = await (supabase
        .from("gallery" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data) {
        setGalleryItems(data as any as GalleryItem[]);
      }
      setLoading(false);
    };
    fetchGallery();
  }, []);

  const filtered =
    activeCategory === "সকল"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

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
            <PremiumLoader />
        ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-card/50 border border-gold/10 rounded-2xl max-w-2xl mx-auto">
              <ImageIcon className="mx-auto text-gold/30 mb-4" size={48} />
              <p className="text-muted-foreground">এই ক্যাটেগরিতে কোনো ছবি পাওয়া যায়নি।</p>
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
                className="cursor-pointer group relative overflow-hidden rounded-lg border border-gold/20 aspect-video shadow-sm hover:border-gold/50 transition-all"
                onClick={() => setLightbox(i)}
              >
                <img
                  src={item.url}
                  alt={item.caption || ""}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <p className="text-cream text-sm font-medium">{item.caption || "চন্দনাইশ দরবার শরীফ"}</p>
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
              <button
                className="absolute top-6 right-6 text-gold hover:text-gold-light"
                onClick={() => setLightbox(null)}
              >
                <X size={32} />
              </button>
              <img
                src={filtered[lightbox]?.url}
                alt={filtered[lightbox]?.caption || ""}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
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
