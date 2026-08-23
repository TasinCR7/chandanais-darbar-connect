import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

/** Offset to account for visits before counter API integration */
const LEGACY_VISITOR_OFFSET = 1540;

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const hasVisited = sessionStorage.getItem('hasVisited_v1');
        const url = hasVisited
          ? 'https://api.counterapi.dev/v1/chandanish-dorbar/website'
          : 'https://api.counterapi.dev/v1/chandanish-dorbar/website/up';

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && typeof data.count === 'number') {
          if (!hasVisited) {
            sessionStorage.setItem('hasVisited_v1', 'true');
          }
          setCount(data.count + LEGACY_VISITOR_OFFSET); 
        }
      } catch (err) {
        // Silently catch network errors or timeouts to not log noise
      }
    };

    fetchCount();
  }, []);

  if (count === null) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 shadow-sm"
      title="সর্বমোট ভিজিটর"
    >
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
      </div>
      <Users size={14} className="text-gold" />
      <span className="text-xs font-semibold text-foreground/90">
        সর্বমোট ভিজিটর: <span className="text-gold ml-1 font-bold">{count.toLocaleString('bn-BD')}</span>
      </span>
    </motion.div>
  );
};

export default VisitorCounter;
