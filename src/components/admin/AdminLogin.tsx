import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import type { User } from "@supabase/supabase-js";

interface AdminLoginProps {
  onLogin: (identifier: string, password: string, method: "email" | "phone") => void;
  loading: boolean;
  isVerifying?: boolean;
   
  user: User | null;
  isAdmin: boolean;
  onLogout: () => void;
}

const AdminLogin = ({ 
  onLogin, 
  loading, 
  isVerifying,
  user, 
  isAdmin, 
  onLogout, 
}: AdminLoginProps) => {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (method === "email") {
      onLogin(email, password, "email");
    } else {
      // Ensure phone has country code
      const formattedPhone = phone.startsWith("+") ? phone : `+88${phone}`;
      onLogin(formattedPhone, password, "phone");
    }
  };

  return (
    <>
      <SEO title="এডমিন লগইন" description="এডমিন প্যানেলে লগইন করুন" canonical="/admin" />
      <div className="islamic-pattern min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-card/60 backdrop-blur-xl border border-gold/20 rounded-2xl p-6 sm:p-10 w-full max-w-md shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full -ml-16 -mb-16" />

          <div className="flex flex-col items-center gap-4 mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gold-gradient p-0.5 shadow-lg shadow-gold/20">
              <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center">
                <LogIn size={28} className="text-gold animate-glow-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-cream mb-1">এডমিন লগইন</h1>
              <p className="text-gold/60 text-sm font-medium">চন্দনাইশ দরবার শরীফ এডমিন ড্যাশবোর্ড</p>
            </div>
          </div>

          {user && !isAdmin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6"
            >
              <p className="text-sm text-destructive font-medium text-center">আপনার এডমিন অনুমতি নেই।</p>
            </motion.div>
          )}

          <div className="space-y-6 relative z-10">
            {/* Method Toggle */}
            <div className="flex bg-black/20 rounded-xl p-1 border border-gold/10">
              <button
                onClick={() => setMethod("email")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  method === "email" 
                    ? "bg-gold-gradient text-primary-foreground shadow-lg" 
                    : "text-gold/60 hover:text-gold"
                }`}
              >
                <Mail size={16} /> ইমেইল
              </button>
              <button
                onClick={() => setMethod("phone")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  method === "phone" 
                    ? "bg-gold-gradient text-primary-foreground shadow-lg" 
                    : "text-gold/60 hover:text-gold"
                }`}
              >
                <Phone size={16} /> মোবাইল
              </button>
            </div>

            <div className="space-y-4">
              {method === "email" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">ইমেইল এড্রেস</label>
                  <Input
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl px-4 text-cream placeholder:text-muted-foreground/50 transition-all font-medium"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">মোবাইল নম্বর</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/60 font-bold text-sm">+88</span>
                    <Input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl pl-14 pr-4 text-cream placeholder:text-muted-foreground/50 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gold/80 uppercase tracking-wider ml-1">পাসওয়ার্ড</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/20 border-gold/30 focus:border-gold h-12 rounded-xl px-4 text-cream placeholder:text-muted-foreground/50 transition-all font-medium"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !(method === "email" ? email : phone) || !password}
                className="w-full bg-gold-gradient text-primary-foreground gold-glow-hover h-12 text-base font-bold rounded-xl mt-4 transition-all duration-300"
              >
                {loading || isVerifying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isVerifying && !loading ? "সেশন চেক করা হচ্ছে..." : "লগইন হচ্ছে..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    লগইন করুন <ArrowRight size={18} />
                  </div>
                )}
              </Button>

              {user && !isAdmin && (
                <div className="pt-4 border-t border-gold/10">
                  <Button variant="outline" onClick={onLogout} className="w-full border-gold/30 text-gold h-12 rounded-xl font-semibold hover:bg-gold/5">
                    অন্য অ্যাকাউন্টে লগইন
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLogin;
