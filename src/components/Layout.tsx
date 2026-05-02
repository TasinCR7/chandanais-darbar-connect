import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

// Map paths to their respective lazy import functions for prefetching
const routeImports: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/Index"),
  "/about": () => import("../pages/About"),
  "/pir": () => import("../pages/Pir"),
  "/rules": () => import("../pages/Rules"),
  "/events": () => import("../pages/Events"),
  "/hadia": () => import("../pages/Hadia"),
  "/gallery": () => import("../pages/Gallery"),
  "/notices": () => import("../pages/Notices"),
  "/committee": () => import("../pages/Committee"),
  "/doa": () => import("../pages/Doa"),
  "/qna": () => import("../pages/QnA"),
  "/contact": () => import("../pages/Contact"),
  "/committee-login": () => import("../pages/CommitteeLogin"),
  "/admin": () => import("../pages/Admin"),
  "/finance": () => import("../pages/Finance"),
  "/transparency": () => import("../pages/Transparency"),
  "/member-portal": () => import("../pages/MemberPortal"),
};
import { Menu, X, Phone, Bell, Settings, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import DeveloperTeam from "./DeveloperTeam";
import Chatbot from "./Chatbot";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const navLinks = [
  { path: "/", label: "হোম" },
  { path: "/about", label: "দরবার পরিচিতি" },
  { path: "/pir", label: "পীর ও শাহজাদা" },
  { path: "/rules", label: "নিয়ম-নীতি" },
  { path: "/events", label: "ওরশ ও অনুষ্ঠান" },
  { path: "/hadia", label: "হাদিয়া ও নজরানা" },
  { path: "/gallery", label: "গ্যালারি" },
  { path: "/notices", label: "নোটিশ" },
  { path: "/committee", label: "কমিটি" },
  { path: "/doa", label: "দোয়া আবেদন" },
  { path: "/qna", label: "প্রশ্ন ও অভিযোগ" },
  { path: "/contact", label: "যোগাযোগ" },
  { path: "/finance", label: "অর্থ সংগ্রহ ও ফাইন্যান্স" },
  { path: "/transparency", label: "তহবিল স্বচ্ছতা" },
  { path: "/committee-login", label: "কমিটি লগইন" },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { isStaff, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: appSettings = {} } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('key, value');
      const obj: Record<string, string> = {};
      if (data) {
        data.forEach((row: any) => { obj[row.key] = row.value; });
      }
      return obj;
    },
    staleTime: 10 * 60 * 1000,
  });
  
  const { data: scrollingNotices = [] } = useQuery({
    queryKey: ['scrolling_notices'],
    queryFn: async () => {
      const { data } = await ((supabase as any)
        .from('notices')
        .select('title')
        .eq('type', 'scrolling')
        .eq('is_active', true)
        .order('created_at', { ascending: false }));
      
      if (data && data.length > 0) {
        return data.map((n: any) => n.title);
      } else if (appSettings.global_notice_message) {
        return [appSettings.global_notice_message];
      }
      return [];
    },
    enabled: !!appSettings,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // Real-time Subscription for App Settings
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['app_settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-primary-foreground focus:rounded-md"
      >
        মূল কন্টেন্টে যান
      </a>

      {/* Maintenance Banner */}
      {String(appSettings.show_maintenance_banner) === 'true' && appSettings.maintenance_text && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-[10px] md:text-xs font-bold py-1 px-4 text-center shadow-md animate-pulse">
          {appSettings.maintenance_text}
        </div>
      )}

      {/* Sticky Navigation */}
      <header className={`fixed ${String(appSettings.show_maintenance_banner) === 'true' && appSettings.maintenance_text ? 'top-6' : 'top-0'} left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-gold/20 transition-all duration-300`}>
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 mr-2" aria-label="হোম পেজ">
            {appSettings.site_logo_url && (
              <img src={appSettings.site_logo_url} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain shrink-0" />
            )}
            <span className="text-gold font-heading font-bold text-sm md:text-lg leading-tight truncate">
              {appSettings.site_title_bn || "চন্দনাইশ দরবার শরীফ"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => {
                  const route = link.path;
                  if (route !== location.pathname && routeImports[route]) {
                    routeImports[route]();
                  }
                }}
                onPointerDown={() => {
                  const route = link.path;
                  if (route !== location.pathname && routeImports[route]) {
                    routeImports[route]();
                  }
                }}
                className={`text-sm font-medium transition-colors duration-300 hover:text-gold ${location.pathname === link.path
                    ? "text-gold"
                    : "text-muted-foreground"
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/hadia"
              className="bg-gold-gradient text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold gold-glow-hover transition-all duration-300"
            >
              হাদিয়া দিন
            </Link>
            <Link
              to="/admin"
              className="text-muted-foreground hover:text-gold transition-colors duration-300 p-2"
              aria-label="এডমিন"
            >
              <Settings size={18} />
            </Link>
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1 lg:hidden">
            <Link
              to="/hadia"
              className="bg-gold-gradient text-primary-foreground px-3 py-1.5 rounded-md text-[10px] font-bold shadow-lg shadow-gold/10 mr-1"
            >
              হাদিয়া
            </Link>
            <Link
              to="/admin"
              className="text-muted-foreground hover:text-gold transition-colors p-2"
              aria-label="এডমিন"
            >
              <Settings size={18} />
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              onPointerDown={() => setMenuOpen(!menuOpen)}
              className="text-gold p-2 active:scale-90 transition-transform"
              aria-label="মেনু"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

      </header>
      <AnimatePresence mode="wait">
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] z-[80] bg-background border-l border-gold/20 lg:hidden shadow-2xl flex flex-col h-[100dvh] overflow-hidden"
            >
              <div className="p-4 flex justify-end border-b border-gold/10">
                <button
                  onClick={() => setMenuOpen(false)}
                  onPointerDown={() => setMenuOpen(false)}
                  className="text-gold p-2 hover:bg-gold/10 rounded-full transition-colors active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-6 px-6">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setMenuOpen(false)}
                        className={`text-sm font-medium py-3 px-4 block transition-colors active:bg-gold/10 rounded-lg ${
                          location.pathname === link.path
                            ? "text-gold"
                            : "text-muted-foreground hover:text-gold"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gold/10 bg-gold/5 space-y-4">
                <Link
                  to="/hadia"
                  onClick={() => setMenuOpen(false)}
                  onPointerDown={() => setMenuOpen(false)}
                  className="bg-gold-gradient text-primary-foreground px-4 py-3.5 rounded-2xl text-sm font-bold text-center block shadow-lg shadow-gold/20 active:scale-95 transition-transform"
                >
                  হাদিয়া দিন
                </Link>
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-[10px] text-gold uppercase tracking-[0.2em] font-bold opacity-70">জরুরি যোগাযোগ</p>
                  <a href="tel:01622721996" className="text-white font-bold flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gold" /> ০১৬২২-৭২১৯৯৬
                  </a>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Premium Scrolling Marquee */}
      {scrollingNotices.length > 0 && (
        <div className={`fixed ${String(appSettings.show_maintenance_banner) === 'true' && appSettings.maintenance_text ? 'top-[88px]' : 'top-16'} left-0 right-0 z-40 bg-background/40 backdrop-blur-md border-b border-gold/10 overflow-hidden shadow-sm h-11 flex items-center`}>
          <div className="bg-gold-gradient text-primary-foreground px-3 md:px-5 h-full flex items-center gap-1 md:gap-2 z-10 shadow-xl font-heading font-black text-[10px] md:text-xs uppercase tracking-wider">
            <Bell className="h-3 w-3 md:h-3.5 md:w-3.5 animate-bounce" /> নোটিশ
          </div>
          <div className="flex-1 whitespace-nowrap overflow-hidden relative">
            <div className="inline-block animate-marquee md:animate-marquee-slow">
              {scrollingNotices.map((n, i) => (
                <span key={i} className="inline-flex items-center text-[13px] md:text-sm text-foreground/90 font-bangla font-semibold ml-16">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse mr-4 shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  {n}
                </span>
              ))}
              {/* Seamless loop duplication */}
              {scrollingNotices.map((n, i) => (
                <span key={`dup-${i}`} className="inline-flex items-center text-[13px] md:text-sm text-foreground/90 font-bangla font-semibold ml-16">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse mr-4 shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Maintenance Overlay for Public Users */}
      {String(appSettings.maintenance_mode) === 'true' && !isStaff && location.pathname !== '/committee-login' && !location.pathname.startsWith('/admin') && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center p-6 text-center overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full animate-pulse" />

          <div className="max-w-md w-full space-y-8 relative z-10 animate-in fade-in zoom-in duration-700">
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full animate-ping" />
              <div className="relative bg-gold-gradient p-6 rounded-3xl shadow-2xl flex items-center justify-center border border-white/10">
                <Settings className="h-10 w-10 text-primary-foreground animate-[spin_2s_linear_infinite]" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-heading font-bold gold-text leading-tight">
                ওয়েবসাইট আপডেট চলছে
              </h1>
              <div className="h-1 w-20 bg-gold-gradient mx-auto rounded-full" />
              <p className="text-lg text-muted-foreground font-bangla leading-relaxed">
                {appSettings.maintenance_text || "আমরা সাইটটির উন্নয়নে কাজ করছি। খুব শীঘ্রই আমরা ফিরে আসছি। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।"}
              </p>
            </div>

            <div className="pt-8 grid grid-cols-1 gap-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-gold/10 backdrop-blur-sm">
                <p className="text-xs text-gold uppercase tracking-widest mb-2">জরুরি প্রয়োজনে</p>
                <p className="text-xl font-bold text-white">০১৬২২-৭২১৯৯৬</p>
              </div>

              <Link
                to="/committee-login"
                onClick={() => window.location.href = '/committee-login'}
                className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center justify-center gap-2 pt-4 cursor-pointer relative z-20"
              >
                <Lock className="h-3 w-3" /> কমিটি লগইন (অফিসিয়াল)
              </Link>
            </div>
          </div>

          {/* Stylized Footer */}
          <div className="absolute bottom-8 left-0 right-0">
            <p className="text-[10px] text-muted-foreground/40 font-heading tracking-widest uppercase">
              Chandanaish Dorbar Sharif — Financial System
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className={
        scrollingNotices.length > 0 
          ? (String(appSettings.show_maintenance_banner) === 'true' && appSettings.maintenance_text ? "pt-[132px]" : "pt-[108px]") 
          : (String(appSettings.show_maintenance_banner) === 'true' && appSettings.maintenance_text ? "pt-[88px]" : "pt-16")
      }>{children}</main>

      <div className="border-t border-gold/20" />
      <DeveloperTeam />

      {/* Footer */}
      <footer className="border-t border-gold/20 bg-card islamic-pattern content-visibility-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-gold font-heading font-bold text-lg mb-4">
                চন্দনাইশ দরবার শরীফ
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
              </p>
            </div>
            <div>
              <h4 className="text-gold font-heading font-semibold mb-4">দ্রুত লিংক</h4>
              <div className="flex flex-col gap-2">
                {navLinks.slice(0, 4).map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-muted-foreground text-sm hover:text-gold transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-gold font-heading font-semibold mb-4">যোগাযোগ</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Phone size={14} className="text-gold" />
                  <span>০১৬২২-৭২১৯৯৬</span>
                </div>
                <a
                  href="https://maps.app.goo.gl/pWk7MFAWh51PiMeX6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground text-sm hover:text-gold transition-colors inline-flex"
                >
                  <MapPin size={14} className="text-gold" />
                  <span>ম্যাপে দেখুন</span>
                </a>
              </div>
            </div>
          </div>
          <div className="section-divider mt-8 mb-4" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs text-center sm:text-left">
              © {new Date().getFullYear()} চন্দনাইশ দরবার শরীফ। সর্বস্বত্ব সংরক্ষিত।
            </p>
            <Link to="/admin" className="text-muted-foreground/50 text-xs hover:text-gold transition-colors duration-300">
              এডমিন লগইন
            </Link>
          </div>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
};

export default Layout;
