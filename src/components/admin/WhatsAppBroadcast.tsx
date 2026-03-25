import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  UserCheck, 
  Users,
  Search,
  X,
  CreditCard,
  MessageCircle,
  Clock,
  CheckCircle2
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  source: 'committee' | 'donor' | 'submission';
}

const ContactRow = memo(({ 
  contact, 
  isSelected, 
  onToggle 
}: { 
  contact: Contact; 
  isSelected: boolean; 
  onToggle: (id: string, source: string) => void;
}) => {
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected 
          ? "bg-gold/10 border-gold/30 ring-1 ring-gold/20" 
          : "bg-black/20 border-white/5 hover:border-gold/20"
      }`}
      onClick={() => onToggle(contact.id, contact.source)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
          contact.source === 'committee' ? 'bg-blue-500/20 text-blue-400' : 
          contact.source === 'donor' ? 'bg-emerald-500/20 text-emerald-400' : 
          'bg-orange-500/20 text-orange-400'
        }`}>
          {contact.source === 'committee' ? 'COM' : contact.source === 'donor' ? 'DON' : 'SUB'}
        </div>
        <div>
          <p className="text-sm font-bold text-cream leading-none">{contact.name}</p>
          <p className="text-[10px] text-gold/60 mt-1">{contact.phone}</p>
        </div>
      </div>
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={() => onToggle(contact.id, contact.source)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
});

ContactRow.displayName = "ContactRow";

const WhatsAppBroadcast = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Using "source-id" as unique key
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentWaIndex, setCurrentWaIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const [committeeRes, donorRes, submissionRes] = await Promise.all([
          supabase.from("committee_members").select("id, name, phone").eq("is_active", true),
          supabase.from("donations").select("id, donor_name, donor_phone").eq("status", "verified"),
          supabase.from("submissions").select("id, name, phone").not("phone", "is", null)
        ]);

        const allContacts: Contact[] = [];

        if (committeeRes.data) {
          committeeRes.data.forEach(m => {
            if (m.phone) allContacts.push({ id: m.id, name: m.name, phone: m.phone, source: 'committee' });
          });
        }

        if (donorRes.data) {
          donorRes.data.forEach(d => {
            if (d.donor_phone) {
              // Avoid duplicates by phone if already in list
              if (!allContacts.some(c => c.phone === d.donor_phone)) {
                allContacts.push({ id: d.id, name: d.donor_name, phone: d.donor_phone, source: 'donor' });
              }
            }
          });
        }

        if (submissionRes.data) {
          submissionRes.data.forEach(s => {
            if (s.phone) {
              if (!allContacts.some(c => c.phone === s.phone)) {
                allContacts.push({ id: s.id, name: s.name, phone: s.phone, source: 'submission' });
              }
            }
          });
        }

        setContacts(allContacts);
        // Select all by default
        setSelectedIds(allContacts.map(c => `${c.source}-${c.id}`));
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleToggleContact = useCallback((id: string, source: string) => {
    const key = `${source}-${id}`;
    setSelectedIds(prev => 
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredKeys = filteredContacts.map(c => `${c.source}-${c.id}`);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredKeys])));
    } else {
      const filteredKeys = filteredContacts.map(c => `${c.source}-${c.id}`);
      setSelectedIds(prev => prev.filter(key => !filteredKeys.includes(key)));
    }
  };

  const selectedContactsList = contacts.filter(c => selectedIds.includes(`${c.source}-${c.id}`));

  const openWhatsApp = (contact: Contact) => {
    let phone = contact.phone.replace(/[^0-9]/g, "");
    if (phone.length === 11 && phone.startsWith("0")) phone = "88" + phone;
    else if (phone.length === 10) phone = "880" + phone;

    const encodedMessage = encodeURIComponent(message.trim());
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(url, "_blank");
  };

  const startBroadcast = () => {
    if (!message.trim() || selectedIds.length === 0) {
      toast({ title: "ত্রুটি", description: "মেসেজ লিখুন এবং কন্টাক্ট সিলেক্ট করুন।", variant: "destructive" });
      return;
    }
    setCurrentWaIndex(0);
    openWhatsApp(selectedContactsList[0]);
  };

  const nextContact = () => {
    if (currentWaIndex !== null && currentWaIndex < selectedContactsList.length - 1) {
      const nextIdx = currentWaIndex + 1;
      setCurrentWaIndex(nextIdx);
      openWhatsApp(selectedContactsList[nextIdx]);
    } else {
      setCurrentWaIndex(null);
      toast({ title: "ধন্যবাদ!", description: "ব্রডকাস্ট সম্পন্ন হয়েছে।" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-gold/10 p-5 rounded-3xl border border-gold/20 backdrop-blur-md">
        <div className="bg-gold-gradient p-3 rounded-2xl shadow-lg shadow-gold/20">
          <MessageSquare className="text-primary-foreground w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold text-cream">পাবলিক নোটিশ ব্রডকাস্ট</h2>
          <p className="text-xs text-gold/60 uppercase tracking-widest font-bold">WhatsApp Batching System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Message Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card/40 border border-gold/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gold font-bold text-sm">নোটিশের মেসেজ</Label>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] bg-gold/5 border-gold/20">{message.length} Characters</Badge>
              </div>
            </div>
            <Textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="দরবার শরীফের সব মেম্বার এবং ভক্তদের জন্য নোটিশ লিখুন..."
              className="min-h-[200px] bg-black/40 border-gold/20 rounded-2xl focus:ring-2 focus:ring-gold/30 transition-all text-cream placeholder:text-gold/20"
            />
          </div>

          <div className="bg-gold/5 border border-gold/20 rounded-3xl p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 text-gold mb-2">
              <Users size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-cream">ব্রডকাস্ট শুরু করুন</h3>
              <p className="text-sm text-gold/60 max-w-md mx-auto">
                নিচের বাটনে ক্লিক করলে সিরিয়াল অনুযায়ী সবার WhatsApp চ্যাট ওপেন হবে। প্রত্যেকবার "Next" প্রেস করে পরবর্তী মেসেজ পাঠান।
              </p>
            </div>

            {currentWaIndex === null ? (
              <Button 
                onClick={startBroadcast}
                disabled={selectedIds.length === 0 || !message.trim() || loading}
                className="w-full bg-gold-gradient text-primary-foreground font-bold h-14 rounded-2xl shadow-xl shadow-gold/10 hover:scale-[1.02] transition-transform"
              >
                {loading ? "লোডিং হচ্ছে..." : `ব্রডকাস্ট শুরু করুন (${selectedIds.length} জন)`}
              </Button>
            ) : (
              <div className="space-y-4 bg-black/40 p-6 rounded-2xl border border-gold/30 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-left">
                    <p className="text-[10px] text-gold/60 font-bold uppercase">বর্তমান প্রাপক</p>
                    <p className="text-lg font-bold text-cream">{selectedContactsList[currentWaIndex]?.name}</p>
                  </div>
                  <Badge className="bg-gold/20 text-gold border-gold/30">{currentWaIndex + 1} / {selectedContactsList.length}</Badge>
                </div>
                
                <Progress 
                  value={((currentWaIndex + 1) / selectedContactsList.length) * 100} 
                  className="h-3 bg-black/50 border border-gold/10"
                />
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentWaIndex(null)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
                  >
                    বন্ধ করুন
                  </Button>
                  <Button 
                    onClick={nextContact}
                    className="bg-gold-gradient text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    পরবর্তী (Next) <Send size={18} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contact List */}
        <div className="lg:col-span-5 bg-card/60 backdrop-blur-xl border border-gold/20 rounded-3xl p-6 h-[700px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-cream flex items-center gap-2">
              <UserCheck size={20} className="text-gold" /> কন্টাক্ট লিস্ট
            </h3>
            <div className="flex items-center gap-2 bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
              <Checkbox 
                id="select-all" 
                checked={filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.includes(`${c.source}-${c.id}`))} 
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-[10px] font-bold cursor-pointer text-gold">সবাইকে সিলেক্ট করুন</Label>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/40 w-4 h-4" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
              className="bg-black/40 border-gold/10 pl-11 h-12 rounded-2xl focus:border-gold/30 focus:ring-0"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-400 border-blue-500/20">Committee</Badge>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-400 border-emerald-500/20">Donors</Badge>
            <Badge variant="outline" className="text-[10px] bg-orange-500/5 text-orange-400 border-orange-500/20">Submissions</Badge>
          </div>
          
          <ScrollArea className="flex-1 -mr-2 pr-4">
            <div className="space-y-2 pb-6">
              {loading ? (
                <p className="text-xs text-gold/40 text-center py-20">লোডিং হচ্ছে...</p>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-20 animate-in fade-in">
                  <p className="text-sm text-gold/40">কোনো কন্টাক্ট পাওয়া যায়নি।</p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <ContactRow 
                    key={`${contact.source}-${contact.id}`}
                    contact={contact}
                    isSelected={selectedIds.includes(`${contact.source}-${contact.id}`)}
                    onToggle={handleToggleContact}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-4 pt-4 border-t border-gold/10 bg-gold/5 -mx-6 -mb-6 p-6 rounded-b-3xl">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <span className="text-[10px] text-gold font-bold uppercase block tracking-widest">সিলেক্টেড মেম্বার</span>
                <span className="text-2xl font-bold text-cream leading-none">{selectedIds.length} <small className="text-xs text-gold/40">জন</small></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gold font-bold uppercase block tracking-widest">মোট কন্টাক্ট</span>
                <span className="text-2xl font-bold text-cream leading-none">{contacts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Badge = ({ children, variant, className }: any) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-xs font-medium ${className}`}>
    {children}
  </span>
);

export default WhatsAppBroadcast;
