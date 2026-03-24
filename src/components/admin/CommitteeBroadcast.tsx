import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Phone, 
  UserCheck, 
  Settings as SettingsIcon, 
  Megaphone,
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

interface Member {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
}

const MemberRow = memo(({ 
  member, 
  isSelected, 
  onToggle 
}: { 
  member: Member; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
}) => {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected 
          ? "bg-gold/10 border-gold/30 ring-1 ring-gold/20" 
          : "bg-black/20 border-white/5 hover:border-gold/20"
      }`}
      onClick={() => onToggle(member.id)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${member.phone ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500/50"}`} />
        <div>
          <p className="text-sm font-bold text-cream leading-none">{member.name}</p>
          <p className="text-[10px] text-gold/60 mt-1">{member.phone || "No Number"}</p>
        </div>
      </div>
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={() => onToggle(member.id)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
});

MemberRow.displayName = "MemberRow";

const CommitteeBroadcast = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsBalance, setSmsBalance] = useState<string | null>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const [smsLogs, setSmsLogs] = useState<{name: string, status: 'success' | 'error'}[]>([]);
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState(localStorage.getItem("sms_api_key") || import.meta.env.VITE_SMS_API_KEY || "");
  const [senderId, setSenderId] = useState(localStorage.getItem("sms_sender_id") || "");
  const [contentId, setContentId] = useState(localStorage.getItem("sms_content_id") || "");

  const [currentWaIndex, setCurrentWaIndex] = useState<number | null>(null);

  const selectedMembersWithPhone = React.useMemo(() => {
    return members.filter(m => selectedIds.includes(m.id) && m.phone);
  }, [members, selectedIds]);

  const fetchBalance = async (key: string) => {
    if (!key) return;
    try {
      const res = await fetch(`https://api.sms.net.bd/user/balance?api_key=${key}`);
      const data = await res.json();
      if (data && data.balance) {
        setSmsBalance(`${data.balance} ${data.currency || 'BDT'}`);
      }
    } catch (err) {
      console.error("Balance fetch failed", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, name, phone, is_active")
        .eq("is_active", true);
      if (data) {
        setMembers(data as Member[]);
        setSelectedIds(data.map(m => m.id));
      }
      if (apiKey) fetchBalance(apiKey);
    };
    init();
  }, [apiKey]);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone?.includes(searchTerm)
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredIds = filteredMembers.map(m => m.id);
      setSelectedIds(prev => {
        const otherIds = prev.filter(id => !filteredMembers.some(fm => fm.id === id));
        return Array.from(new Set([...otherIds, ...filteredIds]));
      });
    } else {
      setSelectedIds(prev => prev.filter(id => !filteredMembers.some(fm => fm.id === id)));
    }
  };

  const handleToggleMember = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const saveSettings = () => {
    localStorage.setItem("sms_api_key", apiKey);
    localStorage.setItem("sms_sender_id", senderId);
    localStorage.setItem("sms_content_id", contentId);
    fetchBalance(apiKey);
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
      toast({ title: "ব্যর্থ", description: "নোটিশ সেভ করা সম্ভব হয়নি।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendBulkSms = async () => {
    if (!apiKey || !message.trim() || selectedIds.length === 0) {
      toast({ title: "ত্রুটি", description: "API তথ্য এবং মেসেজ নিশ্চিত করুন।", variant: "destructive" });
      return;
    }

    setSendingSms(true);
    setSendProgress(0);
    setSmsLogs([]);
    
    const selectedMembers = members.filter(m => selectedIds.includes(m.id) && m.phone);
    let successCount = 0;
    const total = selectedMembers.length;
    
    for (let i = 0; i < total; i++) {
      const member = selectedMembers[i];
      try {
        const phone = member.phone?.replace(/[^0-9]/g, "");
        if (!phone) continue;
        
        const url = `https://api.sms.net.bd/sendsms?api_key=${apiKey}&msg=${encodeURIComponent(message)}&to=${phone}${senderId ? `&sender_id=${senderId}` : ""}${contentId ? `&content_id=${contentId}` : ""}`;
        
        await fetch(url, { method: "GET", mode: "no-cors", cache: 'no-cache' });
        
        successCount++;
        setSmsLogs(prev => [{name: member.name, status: 'success' as const}, ...prev].slice(0, 15));
      } catch (err) {
        setSmsLogs(prev => [{name: member.name, status: 'error' as const}, ...prev].slice(0, 15));
      }
      setSendProgress(Math.round(((i + 1) / total) * 100));
      if (i < total - 1) await new Promise(r => setTimeout(r, 800)); // Increased delay for security
    }

    setSendingSms(false);
    fetchBalance(apiKey);
    toast({ 
      title: "SMS সেন্ড প্রসেস শেষ", 
      description: `${successCount} জন সদস্যকে মেসেজ পাঠানোর রিকোয়েস্ট করা হয়েছে।`,
    });
  };

  const startWhatsAppQueue = () => {
    if (!message.trim() || selectedIds.length === 0) {
      toast({ title: "ত্রুটি", description: "মেসেজ লিখুন এবং মেম্বার সিলেক্ট করুন।", variant: "destructive" });
      return;
    }
    
    if (selectedMembersWithPhone.length === 0) {
      toast({ title: "ত্রুটি", description: "সিলেক্ট করা মেম্বারদের কারো ফোন নম্বর নেই।", variant: "destructive" });
      return;
    }
    
    setCurrentWaIndex(0);
    openWhatsApp(selectedMembersWithPhone[0]);
  };

  const openWhatsApp = (member: Member) => {
    let phone = member.phone?.replace(/[^0-9]/g, "");
    if (!phone) {
      toast({ title: "ত্রুটি", description: `মেম্বার ${member.name} এর কোনো ফোন নম্বর নেই।`, variant: "destructive" });
      return;
    }
    
    // Ensure Bangladesh country code (88) is present for wa.me
    if (phone.length === 11 && phone.startsWith("0")) {
      phone = "88" + phone;
    } else if (phone.length === 10 && !phone.startsWith("88") && !phone.startsWith("0")) {
      phone = "880" + phone;
    } else if (phone.length === 11 && !phone.startsWith("0") && !phone.startsWith("88")) {
      phone = "88" + phone;
    }

    const encodedMessage = encodeURIComponent(message.trim());
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    
    console.log("Opening WhatsApp for:", phone);
    
    // Improved window opening logic
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast({ 
        title: "পপআপ ব্লকড!", 
        description: "আপনার ব্রাউজারে 'Popup Blocker' বন্ধ করুন অথবা নিচের বাটন দিয়ে ম্যাসেজটি কপি করুন।",
        variant: "destructive",
        action: (
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(message);
            toast({ title: "কপি হয়েছে", description: "মেসেজটি কপি করা হয়েছে, এখন WhatsApp-এ পেস্ট করুন।" });
          }}>
            Copy
          </Button>
        )
      });
    } else {
      toast({ 
        title: "WhatsApp ওপেন হচ্ছে", 
        description: `${member.name} এর জন্য চ্যাটবক্স ওপেন করা হয়েছে।`,
        action: (
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(message);
            toast({ title: "কপি হয়েছে", description: "মেসেজটি কপি করা হয়েছে।" });
          }}>
            Copy
          </Button>
        )
      });
    }
  };


  const nextWhatsApp = () => {
    if (currentWaIndex !== null && currentWaIndex < selectedMembersWithPhone.length - 1) {
      const nextIdx = currentWaIndex + 1;
      setCurrentWaIndex(nextIdx);
      openWhatsApp(selectedMembersWithPhone[nextIdx]);
    } else {
      setCurrentWaIndex(null);
      toast({ title: "সম্পন্ন", description: "সবাইকে WhatsApp মেসেজ পাঠানো হয়েছে।" });
    }
  };


  const selectedMembersCount = selectedIds.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-gold/10 p-4 rounded-2xl border border-gold/20">
        <Megaphone className="text-gold w-6 h-6" />
        <div className="flex-1">
          <h2 className="text-xl font-heading font-bold text-cream">কমিটি ব্রডকাস্ট (Premium)</h2>
          <p className="text-xs text-gold/60">কমিটি মেম্বারদের সব চ্যানেলে নোটিশ পাঠান একসাথে।</p>
        </div>
        {smsBalance && (
          <Badge variant="outline" className="bg-gold/5 border-gold/30 text-gold gap-2 py-1 px-3 rounded-full">
            <Wallet size={14} /> {smsBalance}
          </Badge>
        )}
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
              <TabsTrigger value="settings" className="data-[state=active]:bg-gold-gradient rounded-lg px-6 py-2"><SettingsIcon size={16} /></TabsTrigger>
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
                    ব্রডকাস্ট শুরু করুন ({selectedMembersWithPhone.length} জন)
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-emerald/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-emerald-light">বর্তমান: {selectedMembersWithPhone[currentWaIndex]?.name}</span>
                        <span className="text-xs text-muted-foreground">{currentWaIndex + 1} / {selectedMembersWithPhone.length}</span>
                      </div>
                      <Progress 
                        value={((currentWaIndex + 1) / selectedMembersWithPhone.length) * 100} 
                        className="h-2 bg-black/50"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => setCurrentWaIndex(null)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        বন্ধ করুন
                      </Button>
                      <Button 
                        onClick={nextWhatsApp}
                        className="bg-gold-gradient text-primary-foreground font-bold flex items-center justify-center gap-2"
                      >
                        পরবর্তী (Next) <Send size={18} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                    <Send size={20} /> Bulk SMS (পেইড API)
                  </h3>
                  {apiKey && (
                    <Button variant="ghost" size="sm" onClick={() => fetchBalance(apiKey)} className="text-blue-400 h-8 gap-1 hover:bg-blue-500/10">
                      <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> রিফ্রেশ ব্যালেন্স
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mb-6">
                  সরাসরি অফলাইন মেসেজ পাঠানোর জন্য আপনার sms.net.bd গেটওয়ে ব্যবহার করা হবে।
                </p>

                {sendingSms ? (
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-blue-400">মেসেজ পাঠানো হচ্ছে...</span>
                      <span className="text-cream">{sendProgress}%</span>
                    </div>
                    <Progress value={sendProgress} className="h-2 bg-black/40 border border-blue-500/20" />
                    
                    <ScrollArea className="h-24 bg-black/20 rounded-xl border border-white/5 p-2">
                      <div className="space-y-1">
                        {smsLogs.map((log, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px]">
                            {log.status === 'success' ? <CheckCircle2 size={10} className="text-green-500" /> : <AlertCircle size={10} className="text-red-500" />}
                            <span className="text-cream/80">{log.name}</span>
                            <span className={log.status === 'success' ? "text-green-500/60" : "text-red-500/60"}>
                              {log.status === 'success' ? "সফল" : "ব্যর্থ"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <Button 
                    onClick={sendBulkSms}
                    disabled={sendingSms || selectedMembersCount === 0 || !message.trim() || !apiKey}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl"
                  >
                    {sendingSms ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                    সরাসরি SMS পাঠান ({selectedMembersCount} জন)
                  </Button>
                )}
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
                  <SettingsIcon size={20} /> গেটওয়ে সেটিংস (sms.net.bd)
                </h3>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" placeholder="Key..." className="bg-black/20" />
                </div>
                <div className="space-y-2">
                  <Label>Sender ID (Optional)</Label>
                  <Input value={senderId} onChange={e => setSenderId(e.target.value)} placeholder="e.g. 88096..." className="bg-black/20" />
                </div>
                <div className="space-y-2">
                  <Label>Content ID (For Bulk)</Label>
                  <Input value={contentId} onChange={e => setContentId(e.target.value)} placeholder="Approved Content ID..." className="bg-black/20" />
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
              <UserCheck size={20} /> মেম্বার লিস্ট
            </h3>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={filteredMembers.length > 0 && filteredMembers.every(m => selectedIds.includes(m.id))} 
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-xs font-bold cursor-pointer">সবাই</Label>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/50 w-4 h-4" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
              className="bg-black/40 border-gold/20 pl-9 h-10 rounded-xl focus:border-gold/50"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/50 hover:text-gold"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-2">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">কোনো মেম্বার পাওয়া যায়নি।</p>
              ) : (
                filteredMembers.map(member => (
                  <MemberRow 
                    key={member.id}
                    member={member}
                    isSelected={selectedIds.includes(member.id)}
                    onToggle={handleToggleMember}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-4 pt-4 border-t border-gold/10 flex justify-between items-center text-[10px] font-bold text-gold/60 uppercase">
            <span>মোট: {filteredMembers.length}</span>
            <span>সিলেক্টেড: {selectedMembersCount}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommitteeBroadcast;
