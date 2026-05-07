import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Phone, Globe, Settings2, Bell, AlertTriangle } from "lucide-react";
import { fetchSettings } from "@/lib/api";
import { Switch } from "@/components/ui/switch";

const SettingsManager = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ 
        key, 
        value: String(value) 
      }));
      
      const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      
      toast({ title: "সফল", description: "সেটিংস সংরক্ষিত হয়েছে।" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: String(value) }));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Global Website Branding */}
        <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            ওয়েবসাইট ব্র্যান্ডিং ও টাইটেল
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">সাইটের শিরোনাম (বাংলা)</label>
              <input
                type="text"
                value={settings.site_title_bn || ""}
                onChange={(e) => handleChange("site_title_bn", e.target.value)}
                placeholder="যেমন: চন্দনাইশ দরবার শরীফ"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">লোগো ইউআরএল (Logo URL)</label>
              <input
                type="text"
                value={settings.site_logo_url || ""}
                onChange={(e) => handleChange("site_logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Payment & Contact */}
        <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gold mb-6 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            পেমেন্ট এবং যোগাযোগ সেটিংস
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">অফিশিয়াল পেমেন্ট নাম্বার</label>
              <input
                type="text"
                value={settings.hadia_payment_number || ""}
                onChange={(e) => handleChange("hadia_payment_number", e.target.value)}
                placeholder="+88017XXXXXXXX"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">হোয়াটসঅ্যাপ নাম্বার (বিনা +)</label>
              <input
                type="text"
                value={settings.hadia_whatsapp_number || ""}
                onChange={(e) => handleChange("hadia_whatsapp_number", e.target.value)}
                placeholder="88017XXXXXXXX"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              মেইনটেন্যান্স মোড (Maintenance)
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{settings.maintenance_mode === 'true' ? 'চালু' : 'বন্ধ'}</span>
              <Switch 
                checked={settings.maintenance_mode === 'true'} 
                onCheckedChange={(checked) => handleChange("maintenance_mode", checked)} 
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">মেইনটেন্যান্স বার্তা</label>
              <textarea
                value={settings.maintenance_text || ""}
                onChange={(e) => handleChange("maintenance_text", e.target.value)}
                rows={2}
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                placeholder="আমরা বর্তমানে সাইটটি আপডেট করছি। শীঘ্রই ফিরে আসছি।"
              />
            </div>
          </div>
        </div>

        {/* Global Notice Banner */}
        <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              গ্লোবাল নোটিশ ব্যানার
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{settings.show_maintenance_banner === 'true' ? 'চালু' : 'বন্ধ'}</span>
              <Switch 
                checked={settings.show_maintenance_banner === 'true'} 
                onCheckedChange={(checked) => handleChange("show_maintenance_banner", checked)} 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">ব্যানার টেক্সট (উপরে লাল ব্যানার)</label>
            <input
              type="text"
              value={settings.maintenance_text || ""}
              onChange={(e) => handleChange("maintenance_text", e.target.value)}
              className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 pb-10">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-gold-gradient text-primary-foreground font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? <span className="animate-pulse">সংরক্ষণ হচ্ছে...</span> : <><Save size={20} /> সব পরিবর্তন সংরক্ষণ করুন</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsManager;
