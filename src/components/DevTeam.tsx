import { motion } from "framer-motion";
import { Code2, Github, Globe } from "lucide-react";

const teamMembers = [
  {
    name: "Tasin",
    role: "Lead Developer",
    roleBn: "লিড ডেভেলপার",
    avatar: "T",
    color: "from-primary to-gold-dark",
  },
  {
    name: "Lemon",
    role: "Frontend Developer",
    roleBn: "ফ্রন্টএন্ড ডেভেলপার",
    avatar: "L",
    color: "from-emerald to-emerald-light",
  },
];

const DevTeam = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Code2 size={14} className="text-primary" />
            <span className="text-primary text-sm font-medium">Development Team</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-cream mb-3">
            ওয়েব ডেভেলপার টিম
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            এই ওয়েবসাইটটি তৈরি ও রক্ষণাবেক্ষণের পেছনে যারা কাজ করছেন
          </p>
          <div className="section-divider mt-6" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {teamMembers.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group relative bg-background border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: '0 0 30px hsl(var(--gold) / 0.1)' }}
              />

              {/* Avatar */}
              <div className={`relative w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center shadow-lg`}>
                <span className="text-2xl font-bold text-primary-foreground">
                  {member.avatar}
                </span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card border-2 border-primary rounded-full flex items-center justify-center">
                  <Code2 size={12} className="text-primary" />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-heading font-bold text-cream mb-1">
                {member.name}
              </h3>
              <p className="text-primary text-sm font-medium mb-0.5">
                {member.role}
              </p>
              <p className="text-muted-foreground text-xs">
                {member.roleBn}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DevTeam;
