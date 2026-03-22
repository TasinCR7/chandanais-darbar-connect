import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, GripVertical, Eye, EyeOff, Link2, Unlink } from "lucide-react";

interface Member {
  id: string;
  name: string;
  designation: string;
  phone: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  user_id: string | null;
}

interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
}

const CommitteeManager = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("committee_members")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setMembers(data as Member[]);
  };

  const fetchAuthUsers = async () => {
    // We'll use an edge function or just let admin manually enter user_id
    // For now, we show a text input for user_id linking
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
        const ext = imageFile.name.split(".").pop();
        const path = `committee/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, imageFile);
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
        user_id: selectedUserId.trim() || null,
      }]);

      if (error) throw error;

      toast({ title: "সফল", description: "সদস্য যোগ করা হয়েছে।" });
      setName("");
      setDesignation("");
      setPhone("");
      setImageFile(null);
      setSelectedUserId("");
      fetchMembers();
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

  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState("");

  const linkUser = async (memberId: string) => {
    if (!linkUserId.trim()) return;
    const { error } = await supabase.from("committee_members").update({ user_id: linkUserId.trim() }).eq("id", memberId);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "ইউজার লিংক করা হয়েছে।" });
      setLinkingId(null);
      setLinkUserId("");
      fetchMembers();
    }
  };

  const unlinkUser = async (memberId: string) => {
    await supabase.from("committee_members").update({ user_id: null }).eq("id", memberId);
    toast({ title: "আনলিংক হয়েছে" });
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
          <div className="md:col-span-2">
            <Label className="text-cream/80">User ID (ঐচ্ছিক - লগইন অ্যাকাউন্ট লিংক)</Label>
            <Input value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} placeholder="ইউজারের UUID পেস্ট করুন" className="mt-1 font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">সদস্য সাইনআপ করার পর তার User ID এখানে দিন।</p>
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
            <div key={m.id} className="bg-card/40 border border-gold/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-4">
                <GripVertical size={16} className="text-gold/30 shrink-0" />
                
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gold/20 bg-muted shrink-0">
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold/30 text-lg font-bold">
                      {m.name[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-cream truncate">{m.name}</p>
                  <p className="text-xs text-gold/60">{m.designation}</p>
                  {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {m.user_id ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md font-bold">লিংকড</span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-md">আনলিংকড</span>
                  )}
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

              {/* Link/Unlink user_id */}
              <div className="flex items-center gap-2 ml-12">
                {m.user_id ? (
                  <>
                    <code className="text-[10px] text-gold/40 font-mono truncate max-w-[200px]">{m.user_id}</code>
                    <button onClick={() => unlinkUser(m.id)} className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-1">
                      <Unlink size={12} /> আনলিংক
                    </button>
                  </>
                ) : (
                  <>
                    {linkingId === m.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={linkUserId} onChange={e => setLinkUserId(e.target.value)} placeholder="User UUID পেস্ট করুন"
                          className="h-8 text-xs font-mono flex-1" />
                        <Button size="sm" onClick={() => linkUser(m.id)} className="h-8 text-xs bg-gold-gradient text-primary-foreground">লিংক</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setLinkingId(null); setLinkUserId(""); }} className="h-8 text-xs">বাতিল</Button>
                      </div>
                    ) : (
                      <button onClick={() => setLinkingId(m.id)} className="text-[10px] text-gold/60 hover:text-gold flex items-center gap-1">
                        <Link2 size={12} /> ইউজার লিংক করুন
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommitteeManager;
