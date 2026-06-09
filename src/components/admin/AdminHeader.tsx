import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface AdminHeaderProps {
  adminInfo: {
    name: string;
    image?: string;
  };
}

/**
 * AdminHeader displays the admin's avatar and name in a premium styled header.
 */
export default function AdminHeader({ adminInfo }: AdminHeaderProps) {
  const { name, image } = adminInfo;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 md:p-8 bg-card/60 backdrop-blur-xl rounded-2xl border border-gold/20 shadow-2xl relative overflow-hidden mb-8">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 blur-3xl rounded-full -mr-24 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 blur-3xl rounded-full -ml-24 -mb-24 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-gold to-amber-500 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500" />
          <div className="w-16 h-16 rounded-full overflow-hidden bg-background relative border-2 border-gold/40 flex items-center justify-center">
            <img
              src={image ?? '/default-avatar.png'}
              alt="Admin avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + name;
              }}
            />
          </div>
          <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-emerald-500 border-2 border-background rounded-full animate-pulse" />
        </div>
        
        <div>
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-1 justify-center sm:justify-start">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-cream flex items-center gap-2">
              আস-সালামু আলাইকুম, {name}
            </h2>
            <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-xs font-bold text-gold flex items-center gap-1">
              <Shield size={12} /> সুপার এডমিন
            </span>
          </div>
          <p className="text-sm text-gold/60 font-medium">চন্দনাইশ দরবার শরীফ ড্যাশবোর্ড ম্যানেজমেন্ট প্যানেল</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-gold/80 text-sm font-semibold bg-black/30 border border-gold/10 px-4 py-2 rounded-xl backdrop-blur-sm">
        <Sparkles size={16} className="text-gold animate-glow-pulse" />
        <span>অনলাইন সেশন সচল</span>
      </div>
    </div>
  );
}

