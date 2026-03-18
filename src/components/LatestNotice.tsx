import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LatestNotice = () => {
  const [notice, setNotice] = useState<{ title: string; message: string | null } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchNotice = async () => {
      const { data } = await supabase
        .from("notices")
        .select("title, message")
        .eq("is_active", true)
        .eq("type", "detailed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setNotice(data);
      }
    };
    fetchNotice();
  }, []);

  if (!notice || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="container mx-auto px-4 mt-8 mb-4"
      >
        <div className="relative overflow-hidden bg-card border border-gold/30 rounded-xl p-6 md:p-8 shadow-2xl">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0 border border-gold/20">
              <Bell className="text-gold w-6 h-6 animate-glow-pulse" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-heading font-bold text-gold mb-3 flex items-center gap-2">
                নিবেদন ও ঘোষণা
              </h3>
              <div className="section-divider-small mb-4" />
              <h4 className="text-lg font-semibold text-foreground mb-2">
                {notice.title}
              </h4>
              {notice.message && (
                <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                  {notice.message}
                </p>
              )}
            </div>

            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-gold transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LatestNotice;
