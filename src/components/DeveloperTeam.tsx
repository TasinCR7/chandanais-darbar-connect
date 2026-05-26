import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import tasinAvatar from "@/assets/tasin-avatar.webp";
import lemonAvatar from "@/assets/lemon-avatar.webp";

const teamMembers = [
  {
    name: "Tasin",
    roleEn: "Lead Developer",
    roleBn: "লিড ডেভেলপার",
    imageUrl: tasinAvatar,
  },
  {
    name: "Lemon",
    roleEn: "Frontend Developer",
    roleBn: "ফ্রন্টএন্ড ডেভেলপার",
    imageUrl: lemonAvatar,
  }
];

const DeveloperTeam = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 z-10 relative">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold uppercase tracking-widest mb-4"
          >
            <Code2 size={14} /> Development Team
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-heading font-bold text-cream mb-3"
          >
            ওয়েব ডেভেলপার টীম
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto"
          >
            এই ওয়েবসাইটটি তৈরি ও রক্ষণাবেক্ষণের পেছনে যারা কাজ করছেন
          </motion.p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {teamMembers.map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="w-full sm:w-[280px] bg-card/40 backdrop-blur-sm border border-gold/20 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:border-gold/50 hover:bg-card/60 group shadow-xl"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-2 border-gold/30 p-1 group-hover:border-gold transition-colors duration-300 overflow-hidden">
                  <div className="w-full h-full rounded-full bg-muted overflow-hidden">
                    {/* Render exact image if available, else fallback */}
                    {member.imageUrl ? (
                      <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : member.name === "Tasin" ? (
                      <div className="w-full h-full bg-gold/10 flex items-center justify-center text-gold font-bold text-2xl">T</div>
                    ) : (
                      <div className="w-full h-full bg-gold/10 flex items-center justify-center text-gold font-bold text-2xl">L</div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-background border border-gold rounded-full p-1.5 text-gold shadow-lg">
                  <Code2 size={14} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-cream mb-1">{member.name}</h3>
              <p className="text-sm font-semibold text-gold/80 mb-1">{member.roleEn}</p>
              <p className="text-xs text-muted-foreground">{member.roleBn}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeveloperTeam;
