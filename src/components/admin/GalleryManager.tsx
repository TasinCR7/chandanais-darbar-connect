import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, LayoutGrid } from "lucide-react";
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
  return (
    <div className="space-y-8">
      <div className="bg-card/40 backdrop-blur-md border border-gold/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Plus size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-cream">নতুন ছবি আপলোড</h2>
            <p className="text-xs text-gold/60">গ্যালারিতে নতুন ছবি যোগ করার জন্য নিচের তথ্যগুলো পূরণ করুন।</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">ক্যাপশন</label>
             <Input 
                value={galleryCaption} 
                onChange={(e) => setGalleryCaption(e.target.value)}
                placeholder="ছবির একটি সুন্দর বর্ণনা দিন..."
                className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl text-cream placeholder:text-muted-foreground/50"
             />
          </div>
          <div className="space-y-2">
             <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">ক্যাটেগরি</label>
             <select 
                value={galleryCategory} 
                onChange={(e) => setGalleryCategory(e.target.value)}
                className="w-full flex h-12 rounded-xl border border-gold/30 bg-black/20 px-4 py-2 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
             >
                <option value="দরবার শরীফ" className="bg-background">দরবার শরীফ</option>
                <option value="ওরশ শরীফ" className="bg-background">ওরশ শরীফ</option>
                <option value="মাহফিল" className="bg-background">মাহফিল</option>
             </select>
          </div>
        </div>

        <div className="relative group">
          <Input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />
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
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-cream flex items-center gap-3 px-1">
          <LayoutGrid size={24} className="text-gold" />
          সংরক্ষিত ছবিসমূহ ({gallery.length})
        </h2>

        {gallery.length === 0 ? (
          <div className="text-center py-20 bg-card/20 border border-gold/10 rounded-2xl backdrop-blur-sm">
            <LayoutGrid size={48} className="mx-auto text-gold/10 mb-4" />
            <p className="text-muted-foreground font-medium">বর্তমানে গ্যালারিতে কোনো ছবি নেই।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {gallery.map((item) => (
              <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-gold/20 aspect-square shadow-lg hover:border-gold/50 transition-all duration-500">
                <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                   <span className="text-[10px] text-gold font-bold uppercase tracking-wider mb-1">{item.category}</span>
                   <p className="text-white text-xs font-medium line-clamp-2 mb-3">{item.caption || "কোনো বর্ণনা নেই"}</p>
                   <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-9 w-full rounded-xl bg-destructive/80 hover:bg-destructive backdrop-blur-md font-bold"
                      onClick={() => onDelete(item.id, item.url)}
                   >
                     <Trash2 size={14} className="mr-2" /> ডিলিট করুন
                   </Button>
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
