import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

// Map paths to their respective lazy import functions for prefetching
const routeImports: Record<string, () => Promise<any>> = {
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
  "/committee-contributions": () => import("../pages/CommitteeContributions"),
  "/fund-transparency": () => import("../pages/FundTransparency"),
};
import { Menu, X, Phone, Bell, Settings, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import DeveloperTeam from "./DeveloperTeam";
import Chatbot from "./Chatbot";

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
  { path: "/committee-contributions", label: "অর্থ সংগ্রহ" },
  { path: "/fund-transparency", label: "তহবিল স্বচ্ছতা" },
  { path: "/committee-login", label: "কমিটি লগইন" },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string | null } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchNotice = async () => {
      const { data } = await supabase
        .from("notices")
        .select("title, message")
        .eq("is_active", true)
        .not("title", "ilike", "%test%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setNotice(data);
    };
    fetchNotice();
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

      {/* Sticky Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-gold/20">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" aria-label="হোম পেজ">
            <span className="text-gold font-heading font-bold text-lg leading-tight">
              চন্দনাইশ দরবার শরীফ
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => {
                  // Prefetch the component for the route
                  const route = link.path;
                  if (route !== location.pathname && routeImports[route]) {
                    routeImports[route]();
                  }
                }}
                className={`text-sm font-medium transition-colors duration-300 hover:text-gold ${
                  location.pathname === link.path
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
              to="/admin"
              className="text-muted-foreground hover:text-gold transition-colors p-2"
              aria-label="এডমিন"
            >
              <Settings size={20} />
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gold p-2"
              aria-label="মেনু"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-background/95 backdrop-blur-md border-b border-gold/20 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMenuOpen(false)}
                    className={`text-sm font-medium py-2 px-3 rounded-md transition-colors duration-300 ${
                      location.pathname === link.path
                        ? "text-gold bg-gold/10"
                        : "text-muted-foreground hover:text-gold"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-2">
                  <Link
                    to="/hadia"
                    onClick={() => setMenuOpen(false)}
                    className="bg-gold-gradient text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold text-center block shadow-lg shadow-gold/20"
                  >
                    হাদিয়া দিন
                  </Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Notice Bar */}
      {notice && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-gold/20 overflow-hidden shadow-sm">
          <div className="flex items-center h-10 px-4">
            <div className="bg-gold-gradient p-1.5 rounded-lg shrink-0 z-10 shadow-sm shadow-gold/20 ring-1 ring-gold/30">
              <Bell size={14} className="text-primary-foreground" />
            </div>
            <div className="overflow-hidden flex-1 relative h-full flex items-center">
              {/* Fade masks for marquee */}
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10" />
              
              <p className="text-[13px] md:text-sm text-gold font-medium whitespace-nowrap animate-marquee pl-4">
                {notice.title}{notice.message ? ` — ${notice.message}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className={notice ? "pt-[104px]" : "pt-16"}>{children}</main>

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
                  <span>০১৭১১-২৩৪৫৬৭</span>
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
