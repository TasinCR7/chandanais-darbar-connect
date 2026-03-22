import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, GripVertical, Eye, EyeOff } from "lucide-react";
import { compressImage } from "@/utils/imageCompression";


interface Member {
  id: string;
  name: string;
  designation: string;
  phone: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

const AvatarImage = ({ url, name, className }: { url: string | null; name: string; className: string }) => {
  const [error, setError] = useState(false);
  if (!url || url === "null" || error) {
    return (
      <div className={`${className} flex items-center justify-center text-gold/60 text-lg font-bold bg-muted`}>
        {name ? name.charAt(0).toUpperCase() : "?"}
      </div>
    );
  }
  return <img src={url} alt={name} className={className} onError={() => setError(true)} />;
};

const CommitteeManager = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("committee_members")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setMembers(data as Member[]);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !designation.trim()) {
      toast({ title: "ত্রুটি", description: "নাম ও পদবী আবশ্যক।", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        setUploading(true);
        const compressedFile = await compressImage(imageFile);
        const ext = compressedFile.name.split(".").pop() || "webp";
        const path = `committee/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, compressedFile);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(path);
        imageUrl = publicUrl;
        setUploading(false);
      }

      const { error } = await supabase.from("committee_members").insert([{
        name: name.trim(),
        designation: designation.trim(),
        phone: phone.trim() || null,
        image_url: imageUrl,
        display_order: members.length,
      }]);

      if (error) throw error;

      toast({ title: "সফল", description: "সদস্য যোগ করা হয়েছে।" });
      setName("");
      setDesignation("");
      setPhone("");
      setImageFile(null);
      fetchMembers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("committee_members").update({ is_active: !current }).eq("id", id);
    fetchMembers();
  };

  const deleteMember = async (id: string, imageUrl: string | null) => {
    if (imageUrl) {
      const path = imageUrl.split("/storage/v1/object/public/gallery/")[1];
      if (path) await supabase.storage.from("gallery").remove([path]);
    }
    await supabase.from("committee_members").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    fetchMembers();
  };

  return (
    <div className="space-y-8">
      {/* Add Form */}
      <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-heading font-bold text-gold">নতুন সদস্য যোগ করুন</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-cream/80">নাম *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="সদস্যের নাম" className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">পদবী *</Label>
            <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="যেমন: সভাপতি" className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">ফোন নম্বর</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="০১৭..." className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">ছবি</Label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="mt-1" />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={loading || uploading} className="bg-gold-gradient text-primary-foreground font-bold">
          <Plus size={16} className="mr-1" />
          {uploading ? "আপলোড হচ্ছে..." : loading ? "যোগ হচ্ছে..." : "সদস্য যোগ করুন"}
        </Button>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-bold text-gold">
          কমিটি সদস্যবৃন্দ ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">কোনো সদস্য যোগ করা হয়নি।</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="bg-card/40 border border-gold/10 rounded-xl p-4 flex items-center gap-4">
              <GripVertical size={16} className="text-gold/30 shrink-0" />
              
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden border border-gold/20 bg-muted shrink-0">
                <AvatarImage url={m.image_url} name={m.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-cream truncate">{m.name}</p>
                <p className="text-xs text-gold/60">{m.designation}</p>
                {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(m.id, m.is_active)}
                  className={`p-2 rounded-lg transition-colors ${m.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-muted"}`}
                  title={m.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                >
                  {m.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => deleteMember(m.id, m.image_url)}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommitteeManager;
