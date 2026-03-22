import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Phone } from "lucide-react";
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

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("committee_members")
        .select("*")
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
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gold/30 bg-muted">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gold/10">
                        <Users className="w-10 h-10 text-gold/40" />
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
