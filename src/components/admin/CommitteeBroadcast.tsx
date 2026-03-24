import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Send, Phone, UserCheck, Settings, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Member {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
}

const CommitteeBroadcast = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const { toast } = useToast();

  // SMS API Settings (saved locally for convenience)
  const [apiKey, setApiKey] = useState(localStorage.getItem("sms_api_key") || "");
  const [senderId, setSenderId] = useState(localStorage.getItem("sms_sender_id") || "8809612... ");

  // WhatsApp Queue State
  const [currentWaIndex, setCurrentWaIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, name, phone, is_active")
        .eq("is_active", true);
      if (data) {
        setMembers(data as Member[]);
        setSelectedIds(data.map(m => m.id));
      }
    };
    fetchMembers();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(members.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const saveSettings = () => {
    localStorage.setItem("sms_api_key", apiKey);
    localStorage.setItem("sms_sender_id", senderId);
    toast({ title: "সফল", description: "SMS এপিআই সেটিংস সেভ করা হয়েছে।" });
  };

  const sendInternalNotice = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("committee_notices").insert({
        title: "সাধারণ নোটিশ",
        message: message.trim(),
        type: "internal",
        is_active: true
      });
      if (!error) {
        toast({ title: "সফল", description: "কমিটি ড্যাশবোর্ডে নোটিশটি পাবলিশ করা হয়েছে।" });
        setMessage("");
      } else {
        throw error;
      }
    } catch (err: any) {
      toast({ title: "ব্যর্থ", description: "নোটিশ সেভ করা সম্ভব হয়নি। (SQL Migration হয়তো এখনো বাকি)", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendBulkSms = async () => {
    if (!apiKey || !senderId || !message.trim() || selectedIds.length === 0) {
      toast({ title: "ত্রুটি", description: "API তথ্য এবং মেসেজ নিশ্চিত করুন।", variant: "destructive" });
      return;
    }

    setSendingSms(true);
    const selectedMembers = members.filter(m => selectedIds.includes(m.id) && m.phone);
    let successCount = 0;
    
    // Looping through numbers
    for (const member of selectedMembers) {
      try {
        const phone = member.phone?.replace(/[^0-9]/g, "");
        const url = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${phone}&senderid=${senderId}&message=${encodeURIComponent(message)}`;
        
        // Note: For actual cross-origin requests, we might need a backend proxy or Edge Function.
        // For now, we use a fetch which might hit CORS depending on the provider.
        const response = await fetch(url, { method: "GET", mode: "no-cors" });
        successCount++;
      } catch (err) {
        console.error("SMS failed for", member.name);
      }
    }

    setSendingSms(false);
    toast({ 
      title: "SMS সেন্ড প্রসেস শেষ", 
      description: `${successCount} জন সদস্যকে মেসেজ পাঠানোর রিকোয়েস্ট করা হয়েছে।`,
    });
  };

  const startWhatsAppQueue = () => {
    if (!message.trim() || selectedIds.length === 0) return;
    const selectedMembers = members.filter(m => selectedIds.includes(m.id) && m.phone);
    if (selectedMembers.length === 0) return;
    
    setCurrentWaIndex(0);
    openWhatsApp(selectedMembers[0]);
  };

  const openWhatsApp = (member: Member) => {
    const phone = member.phone?.replace(/[^0-9]/g, "");
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const nextWhatsApp = () => {
    const selectedMembers = members.filter(m => selectedIds.includes(m.id) && m.phone);
    if (currentWaIndex !== null && currentWaIndex < selectedMembers.length - 1) {
      const nextIdx = currentWaIndex + 1;
      setCurrentWaIndex(nextIdx);
      openWhatsApp(selectedMembers[nextIdx]);
    } else {
      setCurrentWaIndex(null);
      toast({ title: "সম্পন্ন", description: "সবাইকে WhatsApp মেসেজ পাঠানো হয়েছে।" });
    }
  };

  const selectedMembersCount = members.filter(m => selectedIds.includes(m.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-gold/10 p-4 rounded-2xl border border-gold/20">
        <Megaphone className="text-gold w-6 h-6" />
        <div>
          <h2 className="text-xl font-heading font-bold text-cream">কমিটি ব্রডকাস্ট (Bulk Message)</h2>
          <p className="text-xs text-gold/60">কমিটি মেম্বারদের মেসেজ বা নোটিশ পাঠান একসাথে।</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step 1: Message Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-6">
            <Label className="text-gold font-bold mb-2 block">মেসেজ লিখুন</Label>
            <Textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="এখানে আপনার নোটিশ বা মেসেজটি লিখুন..."
              className="min-h-[150px] bg-black/20 border-gold/20 rounded-xl mb-2 focus:border-gold/50"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold px-1">
              <span>অক্ষর সংখ্যা: {message.length}</span>
              <span>SMS সংখ্যা: {Math.ceil(message.length / 160)}</span>
            </div>
          </div>

          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="bg-card/40 border border-gold/20 p-1 rounded-xl mb-4">
              <TabsTrigger value="whatsapp" className="data-[state=active]:bg-gold-gradient rounded-lg px-6 py-2">WhatsApp</TabsTrigger>
              <TabsTrigger value="sms" className="data-[state=active]:bg-gold-gradient rounded-lg px-6 py-2">Bulk SMS</TabsTrigger>
              <TabsTrigger value="internal" className="data-[state=active]:bg-gold-gradient rounded-lg px-6 py-2">Dashboard</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-gold-gradient rounded-lg px-6 py-2"><Settings size={16} /></TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-4">
              <div className="bg-emerald/5 border border-emerald/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-emerald-light mb-2 flex items-center gap-2">
                  <MessageSquare size={20} /> WhatsApp ব্যাচিং (ফ্রি)
                </h3>
                <p className="text-sm text-foreground/80 mb-6">
                  এটি ফ্রীতে মেসেজ পাঠানোর সেরা মাধ্যম। নিচের বাটনে ক্লিক করলে সিরিয়াল অনুযায়ী সবার চ্যাট ওপেন হবে।
                </p>
                
                {currentWaIndex === null ? (
                  <Button 
                    onClick={startWhatsAppQueue}
                    disabled={selectedMembersCount === 0 || !message.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
                  >
                    ব্রডকাস্ট শুরু করুন ({selectedMembersCount} জন)
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-emerald/50">
                      <span className="text-sm font-bold text-emerald-light">বর্তমান: {members.filter(m => selectedIds.includes(m.id) && m.phone)[currentWaIndex]?.name}</span>
                      <span className="text-xs text-muted-foreground">{currentWaIndex + 1} / {members.filter(m => selectedIds.includes(m.id) && m.phone).length}</span>
                    </div>
                    <Button 
                      onClick={nextWhatsApp}
                      className="w-full bg-gold-gradient text-primary-foreground font-bold h-12 shadow-lg shadow-gold/20 rounded-xl"
                    >
                      পরবর্তী মেম্বার (Next)
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <Send size={20} /> Bulk SMS (পেইড API)
                </h3>
                <p className="text-sm text-foreground/80 mb-6">
                  ইন্টারনেট ছাড়াই সবার মোবাইলে সরাসরি মেসেজ যাবে। এর জন্য আপনার এপিআই থাকা প্রয়োজন।
                </p>
                <Button 
                  onClick={sendBulkSms}
                  disabled={sendingSms || selectedMembersCount === 0 || !message.trim() || !apiKey}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl"
                >
                  {sendingSms ? "মেসেজ পাঠানো হচ্ছে..." : `সরাসরি SMS পাঠান (${selectedMembersCount} জন)`}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="internal" className="space-y-4">
              <div className="bg-gold/5 border border-gold/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">
                  <Megaphone size={20} /> ড্যাশবোর্ড নোটিশ
                </h3>
                <p className="text-sm text-foreground/80 mb-6">
                  কমিটি মেম্বাররা তাদের নিজস্ব পোর্টালে লগইন করলে এই নোটিশটি সবার উপরে দেখতে পাবে।
                </p>
                <Button 
                  onClick={sendInternalNotice}
                  disabled={loading || !message.trim()}
                  className="w-full bg-gold-gradient text-primary-foreground font-bold h-12 rounded-xl"
                >
                  পাবলিশ করুন (Board)
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="bg-card/40 border border-gold/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-gold mb-2 flex items-center gap-2">
                  <Settings size={20} /> এপিআই সেটিংস (SMS)
                </h3>
                <div className="space-y-2">
                  <Label>BulkSMSBD API Key</Label>
                  <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key..." className="bg-black/20" />
                </div>
                <div className="space-y-2">
                  <Label>Sender ID</Label>
                  <Input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="88096..." className="bg-black/20" />
                </div>
                <Button onClick={saveSettings} className="w-full variant-outline border-gold/20 text-gold hover:bg-gold/10">সেটিংস সেভ করুন</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Step 2: Member Selection */}
        <div className="bg-card/60 backdrop-blur-md border border-gold/20 rounded-2xl p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-premium-gradient flex items-center gap-2">
              <UserCheck size={20} /> মেম্বার সিলেক্ট করুন
            </h3>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={selectedIds.length === members.length && members.length > 0} 
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-xs font-bold cursor-pointer">সবাই</Label>
            </div>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">কোনো মেম্বার পাওয়া যায়নি।</p>
            ) : (
              members.map(member => (
                <div 
                  key={member.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedIds.includes(member.id) 
                      ? "bg-gold/10 border-gold/30" 
                      : "bg-black/20 border-white/5 hover:border-gold/20"
                  }`}
                  onClick={() => handleToggleMember(member.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${member.phone ? "bg-green-500" : "bg-red-500/50"}`} title={member.phone ? "Phone available" : "No phone"} />
                    <div>
                      <p className="text-sm font-bold text-cream leading-none">{member.name}</p>
                      <p className="text-[10px] text-gold/60 mt-1">{member.phone || "No Number"}</p>
                    </div>
                  </div>
                  <Checkbox 
                    checked={selectedIds.includes(member.id)} 
                    onCheckedChange={() => handleToggleMember(member.id)}
                  />
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gold/10 text-center">
            <span className="text-xs font-bold text-gold/60 uppercase">সিলেক্টেড: {selectedMembersCount} জন</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommitteeBroadcast;
