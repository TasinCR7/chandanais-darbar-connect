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
      toast({ title: "αªñαºìαª░αºüαªƒαª┐", description: "αª¿αª╛αª« αªô αª¬αªªαª¼αºÇ αªåαª¼αª╢αºìαª»αªòαÑñ", variant: "destructive" });
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

      toast({ title: "αª╕αª½αª▓", description: "αª╕αªªαª╕αºìαª» αª»αºïαªù αªòαª░αª╛ αª╣αª»αª╝αºçαª¢αºçαÑñ" });
      setName("");
      setDesignation("");
      setPhone("");
      setImageFile(null);
      setSelectedUserId("");
      fetchMembers();
    } catch (err: any) {
      toast({ title: "αªñαºìαª░αºüαªƒαª┐", description: err.message, variant: "destructive" });
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
    toast({ title: "αª«αºüαª¢αºç αª½αºçαª▓αª╛ αª╣αª»αª╝αºçαª¢αºç" });
    fetchMembers();
  };

  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState("");

  const linkUser = async (memberId: string) => {
    if (!linkUserId.trim()) return;
    const { error } = await supabase.from("committee_members").update({ user_id: linkUserId.trim() }).eq("id", memberId);
    if (error) {
      toast({ title: "αªñαºìαª░αºüαªƒαª┐", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "αª╕αª½αª▓", description: "αªçαªëαª£αª╛αª░ αª▓αª┐αªéαªò αªòαª░αª╛ αª╣αª»αª╝αºçαª¢αºçαÑñ" });
      setLinkingId(null);
      setLinkUserId("");
      fetchMembers();
    }
  };

  const unlinkUser = async (memberId: string) => {
    await supabase.from("committee_members").update({ user_id: null }).eq("id", memberId);
    toast({ title: "αªåαª¿αª▓αª┐αªéαªò αª╣αª»αª╝αºçαª¢αºç" });
    fetchMembers();
  };

  return (
    <div className="space-y-8">
      {/* Add Form */}
      <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-heading font-bold text-gold">αª¿αªñαºüαª¿ αª╕αªªαª╕αºìαª» αª»αºïαªù αªòαª░αºüαª¿</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-cream/80">αª¿αª╛αª« *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="αª╕αªªαª╕αºìαª»αºçαª░ αª¿αª╛αª«" className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">αª¬αªªαª¼αºÇ *</Label>
            <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="αª»αºçαª«αª¿: αª╕αª¡αª╛αª¬αªñαª┐" className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">αª½αºïαª¿ αª¿αª«αºìαª¼αª░</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="αºªαººαº¡..." className="mt-1" />
          </div>
          <div>
            <Label className="text-cream/80">αª¢αª¼αª┐</Label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-cream/80">User ID (αªÉαªÜαºìαª¢αª┐αªò - αª▓αªùαªçαª¿ αªàαºìαª»αª╛αªòαª╛αªëαª¿αºìαªƒ αª▓αª┐αªéαªò)</Label>
            <Input value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} placeholder="αªçαªëαª£αª╛αª░αºçαª░ UUID αª¬αºçαª╕αºìαªƒ αªòαª░αºüαª¿" className="mt-1 font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">αª╕αªªαª╕αºìαª» αª╕αª╛αªçαª¿αªåαª¬ αªòαª░αª╛αª░ αª¬αª░ αªñαª╛αª░ User ID αªÅαªûαª╛αª¿αºç αªªαª┐αª¿αÑñ</p>
          </div>
        </div>
        <Button onClick={handleAdd} disabled={loading || uploading} className="bg-gold-gradient text-primary-foreground font-bold">
          <Plus size={16} className="mr-1" />
          {uploading ? "αªåαª¬αª▓αºïαªí αª╣αªÜαºìαª¢αºç..." : loading ? "αª»αºïαªù αª╣αªÜαºìαª¢αºç..." : "αª╕αªªαª╕αºìαª» αª»αºïαªù αªòαª░αºüαª¿"}
        </Button>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-bold text-gold">
          αªòαª«αª┐αªƒαª┐ αª╕αªªαª╕αºìαª»αª¼αºâαª¿αºìαªª ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">αªòαºïαª¿αºï αª╕αªªαª╕αºìαª» αª»αºïαªù αªòαª░αª╛ αª╣αª»αª╝αª¿αª┐αÑñ</p>
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
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md font-bold">αª▓αª┐αªéαªòαªí</span>
                  ) : (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-md">αªåαª¿αª▓αª┐αªéαªòαªí</span>
                  )}
                  <button
                    onClick={() => toggleActive(m.id, m.is_active)}
                    className={`p-2 rounded-lg transition-colors ${m.is_active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-muted"}`}
                    title={m.is_active ? "αª╕αªòαºìαª░αª┐αª»αª╝" : "αª¿αª┐αª╖αºìαªòαºìαª░αª┐αª»αª╝"}
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
                      <Unlink size={12} /> αªåαª¿αª▓αª┐αªéαªò
                    </button>
                  </>
                ) : (
                  <>
                    {linkingId === m.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={linkUserId} onChange={e => setLinkUserId(e.target.value)} placeholder="User UUID αª¬αºçαª╕αºìαªƒ αªòαª░αºüαª¿"
                          className="h-8 text-xs font-mono flex-1" />
                        <Button size="sm" onClick={() => linkUser(m.id)} className="h-8 text-xs bg-gold-gradient text-primary-foreground">αª▓αª┐αªéαªò</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setLinkingId(null); setLinkUserId(""); }} className="h-8 text-xs">αª¼αª╛αªñαª┐αª▓</Button>
                      </div>
                    ) : (
                      <button onClick={() => setLinkingId(m.id)} className="text-[10px] text-gold/60 hover:text-gold flex items-center gap-1">
                        <Link2 size={12} /> αªçαªëαª£αª╛αª░ αª▓αª┐αªéαªò αªòαª░αºüαª¿
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
