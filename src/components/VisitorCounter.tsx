import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const hasVisited = sessionStorage.getItem('hasVisited_v1');
        let url = 'https://api.counterapi.dev/v1/chandanish-dorbar/website';
        
        if (!hasVisited) {
          url += '/up';
          sessionStorage.setItem('hasVisited_v1', 'true');
        }

        const res = await fetch(url);
        const data = await res.json();
        
        if (data && typeof data.count === 'number') {
          // You can add a baseline number here if you want to show past visits
          // example: setCount(data.count + 5000);
          setCount(data.count + 1540); 
        }
      } catch (err) {
        console.error('Failed to fetch visitor count', err);
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
