import React from "react";
import { Settings, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api";
import TasbihCounter from "@/components/TasbihCounter";
import { Helmet } from "react-helmet-async";

const Maintenance = () => {
  const { data: settings = {} } = useQuery({
    queryKey: ['app_settings'],
    queryFn: fetchSettings,
    staleTime: 5000,
  });

  return (
    <>
      <Helmet>
        <title>Maintenance | Chandanaish Dorbar Sharif</title>
      </Helmet>
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center p-6 text-center overflow-y-auto no-scrollbar">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse" />

        <div className="max-w-md w-full my-auto space-y-6 relative z-10 animate-in fade-in zoom-in duration-700 py-8">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full animate-ping" />
            <div className="relative bg-gold-gradient p-5 rounded-3xl shadow-2xl flex items-center justify-center border border-white/10">
              <Settings className="h-8 w-8 text-primary-foreground animate-[spin_2s_linear_infinite]" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-heading font-bold gold-text leading-tight">
              ওয়েবসাইট মেইনটেনেন্স চলছে
            </h1>
            <div className="h-0.5 w-16 bg-gold-gradient mx-auto rounded-full" />
            <p className="text-sm text-muted-foreground font-bangla leading-relaxed max-w-sm mx-auto">
              {settings.maintenance_text || "আমরা সাইটটির উন্নয়নে কাজ করছি। খুব শীঘ্রই আমরা ফিরে আসছি। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।"}
            </p>
          </div>

          {/* Premium Tasbih Counter Component */}
          <TasbihCounter />

          <div className="pt-4 grid grid-cols-1 gap-3 max-w-sm mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-gold/10 backdrop-blur-sm">
              <p className="text-[10px] text-gold uppercase tracking-widest mb-1">জরুরি প্রয়োজনে</p>
              <p className="text-lg font-bold text-white">{settings.hadia_payment_number || "০১৬২২-৭২১৯৯৬"}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a
                href="/committee-login"
                className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1.5 cursor-pointer relative z-20"
              >
                <Lock className="h-3.5 w-3.5" /> কমিটি লগইন (অফিসিয়াল)
              </a>
              <span className="hidden sm:inline text-muted-foreground/20">|</span>
              <a
                href="/admin"
                className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1.5 cursor-pointer relative z-20"
              >
                <Lock className="h-3.5 w-3.5" /> এডমিন লগইন
              </a>
            </div>
          </div>
        </div>

        {/* Stylized Footer */}
        <div className="absolute bottom-4 left-0 right-0 pointer-events-none hidden md:block">
          <p className="text-[9px] text-muted-foreground/30 font-heading tracking-widest uppercase">
            Chandanaish Dorbar Sharif — System
          </p>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
