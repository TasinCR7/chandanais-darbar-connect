import { motion } from "framer-motion";
import { MapPin, Phone, Mail } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";

const contactInfo = [
  {
    icon: MapPin,
    label: "ঠিকানা",
    value: "চন্দনাইশ দরবার শরীফ, চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ",
  },
  {
    icon: Phone,
    label: "ফোন",
    value: "০১৭১১-২৩৪৫৬৭", // অনুগ্রহ করে সঠিক নম্বরটি দিন
    href: "tel:+8801711234567",
  },
  {
    icon: Mail,
    label: "ইমেইল",
    value: "contact@chandanaishdarbar.com",
    href: "mailto:contact@chandanaishdarbar.com",
  },
];

const Contact = () => {
  return (
    <>
      <SEO title="যোগাযোগ" description="চন্দনাইশ দরবার শরীফে যোগাযোগ করুন। ঠিকানা, ফোন নম্বর ও ইমেইল তথ্য।" canonical="/contact" />
      <div className="py-20 islamic-pattern">
      <div className="container mx-auto px-4">
        <SectionTitle
          arabic="اِتِّصَال"
          title="যোগাযোগ"
          subtitle="দরবার শরীফে যোগাযোগ করতে নিচের তথ্য ব্যবহার করুন"
        />

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map((info, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-card border border-gold/20 rounded-lg p-6 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald/50 flex items-center justify-center flex-shrink-0">
                  <info.icon size={18} className="text-gold" />
                </div>
                <div>
                  <h4 className="text-gold font-heading font-semibold text-sm mb-1">
                    {info.label}
                  </h4>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="text-foreground text-sm hover:text-gold transition-colors duration-300"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-foreground text-sm">{info.value}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card border border-gold/20 rounded-lg overflow-hidden h-80 lg:h-auto"
          >
            <iframe
              title="চন্দনাইশ দরবার শরীফ মানচিত্র"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1351.2555801026124!2d92.0172438419116!3d22.210989333116487!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30ad17f9c4c7b08f:0x6756e9af87130438!2z4Kaa4Kao4KeN4Kam4Kao4Ka-4KaH4Ka2IOCmpuCmsOCmrOCmvuCmsCDgprbgprDgp4Dgpqs!5e1!3m2!1sbn!2sbd!4v1773926592389!5m2!1sbn!2sbd"
              className="w-full h-full border-0"
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
