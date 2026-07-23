import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
import { Menu, X, Phone, Bell, Settings, MapPin, Lock, RotateCcw, Volume2, VolumeX, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lazy, Suspense } from "react";
const DeveloperTeam = lazy(() => import("./DeveloperTeam"));
const Chatbot = lazy(() => import("./Chatbot"));
const VisitorCounter = lazy(() => import("./VisitorCounter"));
const BackToTop = lazy(() => import("./BackToTop"));
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api";

const navLinks = [
  { path: "/", label: "হোম" },
  { path: "/about", label: "দরবার পরিচিতি" },
  { path: "/pir", label: "পীর ও শাহজাদা" },
  { path: "/rules", label: "নিয়ম-নীতি" },
  { path: "/events", label: "ওরশ ও অনুষ্ঠান" },
  { path: "/hadia", label: "হাদিয়া ও নজরানা" },
  { path: "/doa", label: "দোয়া আবেদন" },
  { path: "/qna", label: "প্রশ্ন ও অভিযোগ" },
  { path: "/gallery", label: "গ্যালারি" },
  { path: "/notices", label: "নোটিশ" },
  { path: "/committee", label: "কমিটি" },
  { path: "/contact", label: "যোগাযোগ" },
  { path: "/finance", label: "অর্থ সংগ্রহ ও ফাইন্যান্স" },
  { path: "/transparency", label: "তহবিল স্বচ্ছতা" },
  { path: "/committee-login", label: "কমিটি লগইন" },
];



const Layout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: appSettings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const settings = await fetchSettings();
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('app_settings_cache', JSON.stringify(settings));
        } catch (e) { console.warn('Cache write warning', e); }
      }
      return settings;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('app_settings_cache');
          if (cached) return JSON.parse(cached);
        } catch (e) { return undefined; }
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isCommitteeMember = typeof window !== 'undefined' && (() => {
    try { return !!localStorage.getItem("committee_auth"); } catch { return false; }
  })();
  const isBypassed = isStaff || isCommitteeMember;

  const [isIdleLoaded, setIsIdleLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsIdleLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const { data: dbNotices = [] } = useQuery({
    queryKey: ['scrolling_notices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notices')
        .select('title')
        .eq('type', 'scrolling')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      const list = data?.map(n => n.title) ?? [];
      if (typeof window !== 'undefined' && list.length > 0) {
        try {
          localStorage.setItem('scrolling_notices_cache', JSON.stringify(list));
        } catch (e) { console.warn('Cache write warning', e); }
      }
      return list;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('scrolling_notices_cache');
          if (cached) return JSON.parse(cached);
        } catch (e) { return undefined; }
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const scrollingNotices = dbNotices.length > 0 
    ? dbNotices 
    : (appSettings.global_notice_message ? [appSettings.global_notice_message] : []);

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
  }, [queryClient]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isPublicRoute = 
    !location.pathname.startsWith('/admin') && 
    !location.pathname.startsWith('/committee-login') && 
    !location.pathname.startsWith('/committee-dashboard');

  // Only block rendering for admin/staff routes while auth is loading.
  // Public routes render immediately without waiting for auth.
  const needsAuthGate = !isPublicRoute && authLoading;
  if (needsAuthGate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-14 h-14 rounded-full border-[3px] border-gold/20 border-t-gold animate-spin mb-4" />
        <p className="text-gold/80 font-heading animate-pulse tracking-widest text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }

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
      {String(appSettings.show_maintenance_banner) === 'true' && appSettings.global_notice_text && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-[10px] md:text-xs font-bold py-1 px-4 text-center shadow-md animate-pulse">
          {appSettings.global_notice_text}
        </div>
      )}

      {/* Sticky Navigation */}
      <header className={`fixed ${String(appSettings.show_maintenance_banner) === 'true' && appSettings.global_notice_text ? 'top-6' : 'top-0'} left-0 right-0 z-50 border-b border-gold/20 bg-background/95 shadow-lg shadow-black/30`}>
        <div className="container mx-auto px-2.5 sm:px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 mr-1 sm:mr-2">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-3 min-w-0" aria-label="হোম পেজ">
              {appSettings.site_logo_url && (
                <img src={appSettings.site_logo_url} alt="Logo" className="h-7 w-7 sm:h-9 sm:w-9 object-contain shrink-0" />
              )}
              <span className="text-gold font-heading font-bold text-xs xs:text-sm md:text-lg leading-tight truncate max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                {appSettings.site_title_bn || "চন্দনাইশ দরবার শরীফ"}
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-2 xl:gap-3 2xl:gap-4 overflow-x-auto no-scrollbar">
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
                className={`relative whitespace-nowrap text-[11px] 2xl:text-xs font-medium transition-colors duration-300 hover:text-gold py-1 ${location.pathname === link.path
                  ? "text-gold"
                  : "text-muted-foreground"
                  }`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <div
                    className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent rounded-full"
                  />
                )}
              </Link>
            ))}
            <Link
              to="/admin"
              className="text-muted-foreground hover:text-gold transition-colors duration-300 p-2"
              aria-label="এডমিন"
            >
              <Settings size={18} />
            </Link>
          </nav>

          {/* Mobile Actions */}
          <div className="flex items-center gap-0.5 xs:gap-1 xl:hidden shrink-0">
            <Link
              to="/admin"
              className="text-muted-foreground hover:text-gold p-1.5 xs:p-2 active:scale-90 transition-transform flex items-center justify-center"
              aria-label="এডমিন"
            >
              <Settings size={18} className="xs:w-5 xs:h-5" />
            </Link>
            <Link
              to="/hadia"
              className="bg-gold-gradient text-primary-foreground px-2.5 py-1.5 xs:px-3 rounded-md text-[10px] xs:text-[11px] font-bold shadow-lg shadow-gold/10 mr-0.5 xs:mr-1 min-h-[34px] flex items-center justify-center shrink-0"
            >
              হাদিয়া
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gold p-1.5 xs:p-2 active:scale-90 transition-transform min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0"
              aria-label="মেনু"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
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
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm xl:hidden touch-none"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-y-0 right-0 w-[85%] max-w-[320px] z-[80] bg-background border-l border-gold/20 xl:hidden shadow-2xl flex flex-col h-[100dvh] overflow-hidden pb-safe"
            >
              <div className="p-4 flex justify-end border-b border-gold/10 pt-safe">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-gold p-2 hover:bg-gold/10 rounded-full transition-colors active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain ios-touch-scroll py-6 px-6">
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
                        className={`w-full text-left text-sm font-medium py-3 px-4 block transition-all active:bg-gold/10 active:scale-[0.98] rounded-lg ${location.pathname === link.path
                          ? "text-gold bg-gold/5 shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]"
                          : "text-muted-foreground hover:text-gold"
                          }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gold/10 bg-gold/5 space-y-4 pb-safe">
                <Link
                  to="/hadia"
                  className="bg-gold-gradient text-primary-foreground px-4 py-3.5 rounded-2xl text-sm font-bold text-center block shadow-lg shadow-gold/20 active:scale-95 transition-all relative z-50"
                >
                  হাদিয়া দিন
                </Link>
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-[10px] text-gold uppercase tracking-[0.2em] font-bold opacity-70">জরুরি যোগাযোগ</p>
                  <a href="tel:01622721996" className="text-white font-bold flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gold" /> ০১৬২২-৭২১৯৯৬
                  </a>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-gold/10">
                  <Link
                    to="/admin"
                    className="text-muted-foreground hover:text-gold transition-colors flex items-center gap-2 text-xs font-semibold"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings size={14} className="text-gold" /> এডমিন প্যানেল
                  </Link>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Premium Scrolling Marquee */}
      {scrollingNotices.length > 0 && (
        <div className={`fixed ${
          String(appSettings.show_maintenance_banner) === 'true' && appSettings.global_notice_text
            ? 'top-[88px]'
            : 'top-16'
        } left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-gold/10 overflow-hidden shadow-sm h-11 flex items-center`}>
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


      {/* Main Content */}
      <main id="main-content" className={
        scrollingNotices.length > 0
          ? (String(appSettings.show_maintenance_banner) === 'true' && appSettings.global_notice_text ? "pt-[132px]" : "pt-[108px]")
          : (String(appSettings.show_maintenance_banner) === 'true' && appSettings.global_notice_text ? "pt-[88px]" : "pt-16")
      }>{children}</main>

      <div className="border-t border-gold/20" />
      {isIdleLoaded && <Suspense fallback={null}><DeveloperTeam /></Suspense>}

      {/* Footer */}
      <footer className="border-t border-gold/20 bg-card islamic-pattern content-visibility-auto relative overflow-hidden">
        {/* SVG Wave Divider */}
        <div className="absolute top-0 left-0 right-0 -translate-y-[calc(100%-1px)]" aria-hidden="true">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block" preserveAspectRatio="none">
            <path d="M0 60L48 53C96 46 192 32 288 26C384 20 480 22 576 28C672 34 768 44 864 46C960 48 1056 42 1152 36C1248 30 1344 24 1392 21L1440 18V60H0Z" fill="hsl(var(--card))" />
          </svg>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-gold font-heading font-bold text-lg mb-4">
                চন্দনাইশ দরবার শরীফ
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://www.facebook.com/Torikaye.Chandanaishi.Al.Maijvandri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/20 hover:border-gold/40 transition-colors duration-300"
                  aria-label="Facebook"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a
                  href="https://www.youtube.com/@chandanaishdarbar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold hover:bg-gold/20 hover:border-gold/40 transition-colors duration-300"
                  aria-label="YouTube"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-gold font-heading font-semibold mb-4">দ্রুত লিংক</h4>
              <div className="flex flex-col gap-2">
                {navLinks.slice(0, 4).map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-muted-foreground text-sm hover:text-gold transition-colors duration-300 inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-gold transition-[width] duration-300" />
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
                  className="flex items-center gap-2 text-muted-foreground text-sm hover:text-gold transition-colors"
                >
                  <MapPin size={14} className="text-gold" />
                  <span>ম্যাপে দেখুন</span>
                </a>
              </div>
            </div>
          </div>
          <div className="section-divider mt-8 mb-4" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-xs text-center sm:text-left">
              © {new Date().getFullYear()} চন্দনাইশ দরবার শরীফ। সর্বস্বত্ব সংরক্ষিত।
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {isIdleLoaded && <Suspense fallback={null}><VisitorCounter /></Suspense>}
            </div>
          </div>
        </div>
      </footer>
      {isIdleLoaded && (
        <>
          <Suspense fallback={null}><BackToTop /></Suspense>
          <Suspense fallback={null}><Chatbot /></Suspense>
        </>
      )}
      {/* Admin Maintenance Mode Active Banner */}
      {isBypassed && String(appSettings.maintenance_mode) === 'true' && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-amber-500 text-black text-[11px] md:text-xs font-bold py-2 px-4 text-center shadow-lg border-t border-amber-600 animate-pulse flex items-center justify-center gap-2">
          <span>⚠️ মেইনটেন্যান্স মোড চালু আছে (সাধারণ ভিজিটরদের জন্য সাইটটি বর্তমানে লক করা)</span>
        </div>
      )}
    </div>
  );
};

export default Layout;
