import { useState, useMemo } from "react";
import { Plus, Trash2, Image as ImageIcon, LayoutGrid, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GalleryItem {
  id: string;
  url: string;
  caption: string | null;
  category: string;
  created_at: string;
}

interface GalleryManagerProps {
  gallery: GalleryItem[];
  uploading: boolean;
  galleryCaption: string;
  setGalleryCaption: (val: string) => void;
  galleryCategory: string;
  setGalleryCategory: (val: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: string, url: string) => void;
}

const GalleryManager = ({
  gallery,
  uploading,
  galleryCaption,
  setGalleryCaption,
  galleryCategory,
  setGalleryCategory,
  onUpload,
  onDelete
}: GalleryManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("সব");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const categories = ["সব", "দরবার শরীফ", "ওরশ শরীফ", "মাহফিল", "অন্যান্য"];

  const filteredGallery = useMemo(() => {
    return gallery.filter(item => {
      const matchesSearch = !searchTerm || (item.caption?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "সব" || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [gallery, searchTerm, filterCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onUpload(e);
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Upload Section */}
      <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Plus size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-cream">নতুন ছবি আপলোড</h2>
            <p className="text-xs text-gold/60">গ্যালারিতে নতুন ছবি যোগ করার জন্য নিচের তথ্যগুলো পূরণ করুন।</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">ক্যাপশন</label>
             <Input 
                value={galleryCaption} 
                onChange={(e) => setGalleryCaption(e.target.value)}
                placeholder="ছবির একটি সুন্দর বর্ণনা দিন..."
                className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl text-cream placeholder:text-muted-foreground/50 transition-all"
             />
          </div>
          <div className="space-y-2">
             <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">ক্যাটেগরি</label>
             <select 
                value={galleryCategory} 
                onChange={(e) => setGalleryCategory(e.target.value)}
                className="w-full flex h-12 rounded-xl border border-gold/30 bg-black/20 px-4 py-2 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
             >
                {categories.slice(1).map(cat => (
                  <option key={cat} value={cat} className="bg-background">{cat}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="relative group">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />
          
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-gold/30 aspect-video md:aspect-[21/9] bg-black/40 group">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearPreview}
                  className="rounded-full h-10 w-10 p-0"
                >
                  <X size={20} />
                </Button>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
                  <span className="text-gold font-bold animate-pulse">আপলোড হচ্ছে...</span>
                </div>
              )}
            </div>
          ) : (
            <label 
              htmlFor="image-upload" 
              className={`cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gold/20 rounded-2xl p-10 hover:border-gold/50 hover:bg-gold/5 transition-all duration-300 group ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
               <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <ImageIcon size={32} className="text-gold" />
               </div>
               <span className="font-heading font-bold text-gold text-lg">{uploading ? "প্রসেসিং হচ্ছে..." : "ছবি সিলেক্ট করুন"}</span>
               <p className="text-xs text-gold/40 mt-1 uppercase tracking-widest font-bold">Image Files (JPG, PNG)</p>
            </label>
          )}
        </div>
      </div>

      {/* Gallery List Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <h2 className="text-xl font-heading font-bold text-cream flex items-center gap-3">
            <LayoutGrid size={24} className="text-gold" />
            সংরক্ষিত ছবিসমূহ ({filteredGallery.length})
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" size={16} />
              <Input 
                placeholder="সার্চ করুন..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/20 border-gold/20 focus:border-gold/50 h-10 rounded-xl text-sm"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" size={16} />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-gold/20 bg-black/20 text-xs text-cream focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-background">{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredGallery.length === 0 ? (
          <div className="text-center py-24 bg-card/20 border border-gold/10 rounded-3xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={40} className="text-gold/20" />
            </div>
            <p className="text-muted-foreground font-medium mb-1">কোনো ছবি খুঁজে পাওয়া যায়নি।</p>
            <p className="text-xs text-gold/30 uppercase tracking-widest">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredGallery.map((item) => (
              <div key={item.id} className="group relative rounded-2xl overflow-hidden border border-gold/10 aspect-square shadow-xl hover:border-gold/30 hover:shadow-gold/5 transition-all duration-500 bg-black/40">
                <img 
                  src={item.url} 
                  alt={item.caption || ""} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  loading="lazy"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5">
                   <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                     <span className="inline-block px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[9px] font-bold uppercase tracking-wider mb-2 border border-gold/20">
                       {item.category}
                     </span>
                     <p className="text-white text-sm font-medium line-clamp-2 mb-4 leading-relaxed">
                       {item.caption || "কোনো বর্ণনা নেই"}
                     </p>
                     <div className="flex gap-2">
                       <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-9 flex-1 rounded-xl bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/20 font-bold text-xs"
                          onClick={() => onDelete(item.id, item.url)}
                       >
                         <Trash2 size={14} className="mr-2" /> ডিলিট করুন
                       </Button>
                     </div>
                   </div>
                </div>

                {/* Date/Category badge (visible on mobile/initial) */}
                <div className="absolute top-3 left-3 flex gap-2 pointer-events-none group-hover:opacity-0 transition-opacity">
                  <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-gold/20 text-gold text-[8px] font-bold uppercase tracking-tighter">
                    {item.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryManager;
