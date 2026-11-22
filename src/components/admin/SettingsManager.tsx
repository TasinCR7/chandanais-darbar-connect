import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Phone, Globe, Settings2, Bell, AlertTriangle, Sparkles, Upload, Trash2 } from "lucide-react";
import { fetchSettings } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { sanitizeSafeUrl } from "@/utils/security";
import { compressImage } from "@/utils/imageCompression";

const SettingsManager = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
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

  const queryClient = useQueryClient();

  const handlePopupBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadingBanner(true);
    try {
      const compressedFile = await compressImage(rawFile);
      const fileExt = compressedFile.name.split(".").pop() || "webp";
      const filePath = `popup-banners/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("gallery").getPublicUrl(filePath);

      setSettings((prev) => ({
        ...prev,
        popup_banner_image_url: publicUrl,
      }));
      toast({
        title: "ছবি আপলোড সম্পন্ন",
        description: "ব্যানার কার্যকর করতে নিচে 'সব পরিবর্তন সংরক্ষণ করুন' বাটনে ক্লিক করুন।",
      });
    } catch (err: any) {
      toast({
        title: "আপলোড ব্যর্থ",
        description: err?.message || "ছবি আপলোড করা যায়নি।",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlFields: Array<{ key: string; label: string }> = [
      { key: "site_logo_url", label: "লোগো ইউআরএল" },
      { key: "popup_banner_image_url", label: "পপআপ ব্যানার ছবি URL" },
      { key: "popup_banner_cta_url", label: "পপআপ বাটন লিংক" },
    ];
    for (const field of urlFields) {
      const rawVal = settings[field.key];
      if (rawVal && rawVal.trim()) {
        const safe = sanitizeSafeUrl(rawVal, { allowRelative: true });
        if (!safe) {
          toast({
            title: `অবৈধ ${field.label}`,
            description: "অনুগ্রহ করে বৈধ https:// বা / দিয়ে শুরু হওয়া নিরাপদ লিংক দিন।",
            variant: "destructive",
          });
          return;
        }
      }
    }
    setLoading(true);
    try {
      const nextSettings: Record<string, string> = {
        ...settings,
        popup_banner_version: String(Date.now()),
      };
      const updates = Object.entries(nextSettings).map(([key, value]) => ({ 
        key, 
        value: String(value) 
      }));
      
      const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      
      setSettings(nextSettings);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_settings_cache', JSON.stringify(nextSettings));
      }
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });

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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">হাদিয়া পেজের জরুরী নোটিশ (Hadia Page Notice)</label>
              <textarea
                value={settings.hadia_notice || ""}
                onChange={(e) => handleChange("hadia_notice", e.target.value)}
                rows={2}
                placeholder="যেমন: পেমেন্ট সম্পন্ন করার পর আপনার সঠিক ট্রানজেকশন আইডি (TrxID) দিন..."
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors font-bangla text-sm"
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
              value={settings.global_notice_text || ""}
              onChange={(e) => handleChange("global_notice_text", e.target.value)}
              className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            />
          </div>
        </div>

        {/* Welcome Popup Banner Settings */}
        <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              ওয়েলকাম পপআপ ব্যানার (সাইটে ঢুকলেই দেখাবে)
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {settings.popup_banner_enabled !== 'false' ? 'চালু' : 'বন্ধ'}
              </span>
              <Switch
                checked={settings.popup_banner_enabled !== 'false'}
                onCheckedChange={(checked) => handleChange("popup_banner_enabled", checked)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">ব্যাজ / উপরের ছোট লেখা</label>
              <input
                type="text"
                value={settings.popup_banner_badge ?? ""}
                onChange={(e) => handleChange("popup_banner_badge", e.target.value)}
                placeholder="আসসালামু আলাইকুম • স্বাগতম"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">মূল শিরোনাম (Title)</label>
              <input
                type="text"
                value={settings.popup_banner_title ?? ""}
                onChange={(e) => handleChange("popup_banner_title", e.target.value)}
                placeholder="চন্দনাইশ দরবার শরীফ"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">সাব-টাইটেল (ঐচ্ছিক)</label>
              <input
                type="text"
                value={settings.popup_banner_subtitle ?? ""}
                onChange={(e) => handleChange("popup_banner_subtitle", e.target.value)}
                placeholder="সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">মূল বার্তা / ঘোষণা (Message)</label>
              <textarea
                value={settings.popup_banner_message ?? ""}
                onChange={(e) => handleChange("popup_banner_message", e.target.value)}
                rows={3}
                placeholder="ওয়েবসাইটে প্রবেশকারীদের জন্য আপনার জরুরি ঘোষণা বা শুভেচ্ছা বার্তা লিখুন..."
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors font-bangla text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">বাটনের লেখা (CTA Text)</label>
              <input
                type="text"
                value={settings.popup_banner_cta_text ?? ""}
                onChange={(e) => handleChange("popup_banner_cta_text", e.target.value)}
                placeholder="ওরশ ও অনুষ্ঠান দেখুন"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">বাটন লিংক (যেমন /events, /hadia, /notices)</label>
              <input
                type="text"
                value={settings.popup_banner_cta_url ?? ""}
                onChange={(e) => handleChange("popup_banner_cta_url", e.target.value)}
                placeholder="/events"
                className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-foreground">পোস্টার / ব্যানার ছবি (ঐচ্ছিক)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={settings.popup_banner_image_url ?? ""}
                  onChange={(e) => handleChange("popup_banner_image_url", e.target.value)}
                  placeholder="https://... অথবা নিচ থেকে ছবি আপলোড করুন"
                  className="flex-1 p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                />
                <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold/20 text-gold text-sm font-semibold cursor-pointer transition-colors shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingBanner ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePopupBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
                {settings.popup_banner_image_url && (
                  <button
                    type="button"
                    onClick={() => handleChange("popup_banner_image_url", "")}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm font-semibold transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>মুছুন</span>
                  </button>
                )}
              </div>
              {sanitizeSafeUrl(settings.popup_banner_image_url, { allowRelative: true }) && (
                <div className="mt-2 rounded-xl overflow-hidden border border-gold/20 max-w-xs bg-black/30">
                  <img
                    src={sanitizeSafeUrl(settings.popup_banner_image_url, { allowRelative: true })}
                    alt="Popup banner preview"
                    className="w-full h-36 object-cover"
                  />
                </div>
              )}
            </div>
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
