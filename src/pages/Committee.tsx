import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Phone, Vote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import PremiumLoader from "@/components/PremiumLoader";

interface CommitteeMember {
  id: string;
  name: string;
  designation: string;
  phone: string | null;
  image_url: string | null;
  display_order: number;
}

const Committee = () => {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageStatus, setImageStatus] = useState<Record<string, "loaded" | "error">>({});


  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("id, name, designation, phone, image_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data) setMembers(data as CommitteeMember[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <>
      <SEO
        title="কমিটি - চন্দনাইশ দরবার শরীফ"
        description="চন্দনাইশ দরবার শরীফ পরিচালনা কমিটির সদস্যবৃন্দ।"
        canonical="/committee"
      />
      <div className="py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="لَجْنَة الْإِدَارَة"
            title="পরিচালনা কমিটি"
            subtitle="চন্দনাইশ দরবার শরীফ পরিচালনা কমিটির সম্মানিত সদস্যবৃন্দ"
          />

          <div className="flex justify-center mt-4 mb-6">
            <Link to="/committee-login"
              className="inline-flex items-center gap-2 bg-gold-gradient text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-gold/10 hover:shadow-gold/20 transition-all">
              <Vote size={16} /> কমিটি সদস্য লগইন
            </Link>
          </div>

          {loading ? (
            <PremiumLoader />
          ) : members.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gold/30 mx-auto mb-4" />
              <p className="text-muted-foreground">কমিটির তথ্য শীঘ্রই যোগ করা হবে।</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {members.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="bg-card border border-gold/20 rounded-2xl p-6 text-center hover:border-gold/40 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5"
                >
                  {/* Avatar */}
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gold/30 bg-muted relative">
                    {member.image_url && imageStatus[member.id] !== "error" ? (
                      <>
                        <div className={`absolute inset-0 bg-gold/20 animate-pulse transition-opacity duration-300 ${imageStatus[member.id] === 'loaded' ? 'opacity-0 z-0' : 'opacity-100 z-10'}`} />
                        <img
                          src={member.image_url}
                          alt={member.name}
                          loading="lazy"
                          decoding="async"
                          onLoad={() => setImageStatus(prev => ({ ...prev, [member.id]: "loaded" }))}
                          onError={() => setImageStatus(prev => ({ ...prev, [member.id]: "error" }))}
                          className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-700 ${imageStatus[member.id] === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gold/10 relative z-10">
                        <span className="text-3xl font-bold text-gold/40">
                          {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="text-lg font-heading font-bold text-gold mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mb-3">
                    {member.designation}
                  </p>

                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold transition-colors"
                    >
                      <Phone size={12} />
                      {member.phone}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Committee;
