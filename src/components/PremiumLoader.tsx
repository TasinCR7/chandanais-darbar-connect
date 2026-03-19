import { motion } from "framer-motion";

const PremiumLoader = () => {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 rounded-full border-2 border-gold/30 border-t-gold flex items-center justify-center p-2"
      >
        <div className="w-full h-full rounded-full border border-gold/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
        </div>
      </motion.div>
      <p className="text-gold font-heading animate-pulse tracking-widest text-sm uppercase">লোড হচ্ছে...</p>
    </div>
  );
};

export default PremiumLoader;
