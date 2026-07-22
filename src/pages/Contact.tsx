import { motion } from "framer-motion";
import { MapPin, Phone, Mail, UserCircle2 } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";

const mainContact = [
  {
    icon: MapPin,
    label: "ঠিকানা",
    value: "চন্দনাইশ দরবার শরীফ, চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ",
  },
  {
    icon: Mail,
    label: "ইমেইল",
    value: "info@chandanaishdarbar.com",
    href: "mailto:info@chandanaishdarbar.com",
  },
];

const phoneContacts = [
  {
    name: "শাহজাদা বাহদুর শাহ",
    phone: "+8801714338533",
    label: "যোগাযোগ"
  },
  {
    name: "শাহজাদা জাহাঙ্গীর শাহ",
    phone: "+8801726285000",
    label: "যোগাযোগ"
  },
  {
    name: "শাহজাদা পারভেজ শাহ",
    phone: "+8801717621418",
    label: "যোগাযোগ"
  },
  {
    name: "ওয়েবসাইট ডেভেলপার (তাসিন)",
    phone: "+8801622721996",
    label: "কারিগরি সহায়তা"
  }
];

const Contact = () => {
  return (
    <>
      <SEO 
        title="যোগাযোগ ও অবস্থান | চন্দনাইশ দরবার শরীফ ও চন্দনাইশের মাজার, চট্টগ্রাম" 
        description="চন্দনাইশ দরবার শরীফ ও চন্দনাইশের মাজার শরীফের ঠিকানা, ফোন নম্বর, ইমেইল এবং গুগল ম্যাপ লোকেশন। চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ।" 
        keywords="চন্দনাইশ দরবার শরীফ, দরবার শরীফ, চন্দনাইশের মাজার, চন্দনাইশ মাজার, হযরত আবদুল লতিফ শাহ্, চন্দনাইশ দরবার শরীফ ঠিকানা, চন্দনাইশ মাজার লোকেশন, চট্টগ্রামের দরবার, বাংলাদেশের সেরা মাজার, Chandanaish Darbar Sharif Location, Chandanaish Mazar Address" 
        canonical="/contact" 
      />
      <div className="py-20 islamic-pattern min-h-screen">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="اِتِّصَال"
          title="যোগাযোগ"
          subtitle="দরবার শরীফে যোগাযোগ করতে নিচের তথ্য ব্যবহার করুন"
        />

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info Left Column */}
          <div className="space-y-8">
            {/* Primary Info */}
            <div className="space-y-4">
              {mainContact.map((info, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-card/60 backdrop-blur-sm border border-gold/20 rounded-xl p-6 flex items-start gap-5 shadow-lg hover:border-gold/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <info.icon size={22} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="text-gold/80 font-bold text-xs uppercase tracking-widest mb-1.5">
                      {info.label}
                    </h4>
                    {info.href ? (
                      <a
                        href={info.href}
                        aria-label={`${info.label}: ${info.value}`}
                        className="text-cream text-base font-medium hover:text-gold transition-colors duration-300"
                      >
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-cream text-base font-medium leading-relaxed">{info.value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Phone Directory */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card/40 backdrop-blur-sm border border-gold/15 rounded-2xl p-6 shadow-xl"
            >
               <h3 className="text-lg font-heading font-bold text-premium-gradient mb-6 flex items-center gap-2">
                 <Phone className="text-gold" size={20} /> গুরুত্বপূর্ণ ফোন নম্বর
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {phoneContacts.map((contact, i) => (
                   <motion.div 
                     key={i}
                     initial={{ opacity: 0, scale: 0.95 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.4, delay: 0.4 + (i * 0.1) }}
                     className="bg-black/30 border border-gold/10 rounded-xl p-4 flex items-start gap-3 hover:border-gold/30 hover:bg-gold/5 transition-all group"
                   >
                     <div className="w-10 h-10 rounded-lg bg-gold/5 border border-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/10 transition-colors">
                       {contact.label === "কারিগরি সহায়তা" ? <UserCircle2 size={18} className="text-gold/70" /> : <Phone size={18} className="text-gold/70" />}
                     </div>
                     <div>
                       <p className="text-[10px] text-gold/50 font-bold uppercase tracking-wider mb-1">{contact.label}</p>
                       <h4 className="text-cream font-bold text-sm mb-1">{contact.name}</h4>
                       <a href={`tel:${contact.phone}`} className="text-gold font-mono text-sm hover:text-gold/80 transition-colors">
                         {contact.phone}
                       </a>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </motion.div>
          </div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card/60 backdrop-blur-sm border border-gold/20 rounded-2xl p-2 shadow-xl h-full min-h-[400px] lg:min-h-full flex flex-col"
          >
            <iframe
              title="চন্দনাইশ দরবার শরীফ মানচিত্র"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1351.2555801026124!2d92.0172438419116!3d22.210989333116487!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30ad17f9c4c7b08f:0x6756e9af87130438!2z4Kaa4Kao4KeN4Kam4Kao4Ka-4KaH4Ka2IOCmpuCmsOCmrOCmvuCmsCDgprbgprDgp4Dgpqs!5e1!3m2!1sbn!2sbd!4v1773926592389!5m2!1sbn!2sbd"
              className="w-full h-full border-0 rounded-xl flex-1"
              loading="lazy"
              allowFullScreen
            />
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Contact;
