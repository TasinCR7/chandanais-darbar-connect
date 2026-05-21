import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessOverlayProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  extraContent?: ReactNode;
}

const SuccessOverlay = ({ show, title, message, onClose, extraContent }: SuccessOverlayProps) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 overflow-y-auto bg-card/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-start p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="text-center p-4 sm:p-8 max-w-sm mx-auto my-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 10, stiffness: 200 }}
          >
            <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
          </motion.div>
          <motion.h3
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-heading font-bold text-foreground mb-2"
          >
            {title}
          </motion.h3>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mb-4 text-sm"
          >
            {message}
          </motion.p>
          
          {extraContent && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mb-6 text-sm"
            >
              {extraContent}
            </motion.div>
          )}

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={onClose}
              className="w-full sm:w-auto bg-gold-gradient text-primary-foreground font-semibold px-6 gold-glow-hover"
            >
              ঠিক আছে ✅
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SuccessOverlay;
