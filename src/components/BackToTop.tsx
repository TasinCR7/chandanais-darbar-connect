import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setVisible(scrollY > 250);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, []);

  const scrollToTop = (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }
    
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
    
    if (document.documentElement) {
      try {
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        document.documentElement.scrollTop = 0;
      }
    }
    
    if (document.body) {
      document.body.scrollTop = 0;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={scrollToTop}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 z-[45] w-12 h-12 rounded-full bg-background/90 sm:bg-gold/10 border-2 border-gold/60 text-gold hover:bg-gold/20 active:scale-95 transition-all duration-300 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-gold shadow-xl shadow-black/50 flex items-center justify-center pointer-events-auto cursor-pointer touch-manipulation select-none"
          aria-label="উপরে যান"
        >
          <ArrowUp size={22} className="stroke-[2.5]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
