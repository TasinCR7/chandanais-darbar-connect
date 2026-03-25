import { motion } from "framer-motion";

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

const SkeletonLoader = ({ className = "", count = 1 }: SkeletonLoaderProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-full h-24 bg-gold/10 rounded-lg border border-gold/5"
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;
