import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface Notice {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  is_active: boolean;
  updated_at: string;
}

const Notices = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      const { data } = await supabase
        .from("notices")
        .select("*")
        .eq("is_active", true)
        .not("title", "ilike", "%test%")
        .order("created_at", { ascending: false });
      
      if (data) {
        setNotices(data as Notice[]);
      }
      setLoading(false);
    };
    fetchNotices();
  }, []);

  return (
    <>
      <SEO 
        title="নোটিশ ও ঘোষণা" 
        description="চন্দনাইশ দরবার শরীফের সকল গুরুত্বপূর্ণ নোটিশ ও ঘোষণা একনজরে দেখুন।" 
        canonical="/notices" 
      />
      <div className="py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4 max-w-4xl">
          <SectionTitle
            arabic="إعلانات"
            title="নোটিশ ও ঘোষণা"
            subtitle="দরবার শরীফের সকল আপডেট এবং গুরুত্বপূর্ণ নোটিশসমূহ এখানে পাবেন।"
          />

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-20 bg-card/50 border border-gold/10 rounded-2xl">
              <Bell className="mx-auto text-gold/30 mb-4" size={48} />
              <p className="text-muted-foreground">বর্তমানে কোনো সক্রিয় নোটিশ নেই।</p>
            </div>
          ) : (
            <div className="space-y-6">
              {notices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-gold/20 rounded-xl overflow-hidden shadow-sm hover:shadow-gold/5 hover:border-gold/40 transition-all duration-300"
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className="flex items-center gap-1.5 text-gold bg-gold/10 px-3 py-1 rounded-full text-xs font-medium border border-gold/20">
                        <Calendar size={14} />
                        {new Date(notice.created_at).toLocaleDateString("bn-BD", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                        নোটিশ
                      </span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-3 leading-tight">
                      {notice.title}
                    </h3>

                    {notice.message && (
                      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap border-l-2 border-gold/20 pl-4 py-1 italic">
                        {notice.message}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notices;
