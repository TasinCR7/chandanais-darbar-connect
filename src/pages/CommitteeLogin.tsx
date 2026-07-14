import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhoneNumber, isValidPhoneNumber } from "@/utils/phoneUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

const CommitteeLogin = () => {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const auth = localStorage.getItem("committee_auth");
    if (auth) {
      navigate("/committee-dashboard");
    }
  }, [navigate]);

  // Handle lockout countdown timer
  useEffect(() => {
    const lockoutUntilStr = localStorage.getItem("committee_login_lockout_until");
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      if (Date.now() < lockoutUntil) {
        setLockoutTime(lockoutUntil);
        setRemainingTime(Math.ceil((lockoutUntil - Date.now()) / 1000));
      } else {
        localStorage.removeItem("committee_login_lockout_until");
        localStorage.removeItem("committee_login_attempts");
      }
    }
  }, []);

  useEffect(() => {
    if (!lockoutTime) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutTime(null);
        setRemainingTime(0);
        localStorage.removeItem("committee_login_lockout_until");
        localStorage.removeItem("committee_login_attempts");
        clearInterval(interval);
      } else {
        setRemainingTime(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const hashPin = async (pinStr: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(pinStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutTime && Date.now() < lockoutTime) {
      toast({ 
        title: "লগইন ব্লকড", 
        description: `অনেক বেশি ভুল চেষ্টা করা হয়েছে। অনুগ্রহ করে ${remainingTime} সেকেন্ড অপেক্ষা করুন।`, 
        variant: "destructive" 
      });
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      toast({ title: "ভুল নম্বর", description: "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।", variant: "destructive" });
      return;
    }

    if (pin.length !== 4) {
      toast({ title: "ভুল PIN", description: "৪ ডিজিটের PIN দিন।", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = normalizePhoneNumber(phone);
      
      const searchVariants = [
        cleanPhone,
        `+88${cleanPhone}`,
        `88${cleanPhone}`,
        cleanPhone.startsWith("0") ? cleanPhone.substring(1) : cleanPhone
      ];
      
      const hashedInputPin = await hashPin(pin);

      // Verify the credentials via the secure database RPC function (prevents exposing pin_hash to client)
      const { data, error } = await supabase.rpc("verify_committee_member", {
        p_phone_variants: searchVariants,
        p_pin_hash: hashedInputPin
      } as any);

      if (error) {
        throw error;
      }

      const result = data && data[0];

      if (!result || !result.success) {
        // Wrong phone or wrong PIN - increment failure counter
        const currentAttempts = parseInt(localStorage.getItem("committee_login_attempts") || "0", 10) + 1;
        localStorage.setItem("committee_login_attempts", currentAttempts.toString());

        if (currentAttempts >= 3) {
          const lockoutUntil = Date.now() + 5 * 60 * 1000;
          localStorage.setItem("committee_login_lockout_until", lockoutUntil.toString());
          setLockoutTime(lockoutUntil);
          setRemainingTime(300);
          toast({ 
            title: "অ্যাক্সেস ব্লকড", 
            description: "নিরাপত্তার স্বার্থে আপনার অ্যাকাউন্ট ৫ মিনিটের জন্য ব্লক করা হয়েছে।", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "ভুল নম্বর বা PIN", 
            description: `প্রদত্ত নম্বর বা PIN-টি সঠিক নয়। (বাকি সুযোগ: ${3 - currentAttempts} বার)`, 
            variant: "destructive" 
          });
        }
        setLoading(false);
        return;
      }

      // Success
      localStorage.setItem("committee_auth", result.id);
      localStorage.removeItem("committee_login_attempts");
      localStorage.removeItem("committee_login_lockout_until");

      if (result.is_new_pin) {
        toast({ 
          title: "লগইন সফল ও PIN সেটআপ সম্পূর্ণ", 
          description: `স্বাগতম, ${result.name}! আপনার ৪-ডিজিট PIN পরবর্তীতে লগইনের জন্য সেট করা হয়েছে।` 
        });
      } else {
        toast({ title: "লগইন সফল", description: `স্বাগতম, ${result.name} (${result.designation})` });
      }
      navigate("/committee-dashboard");
     
    } catch (error: any) {
      toast({ title: "ত্রুটি", description: error.message || "সার্ভারে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-20 islamic-pattern flex items-center justify-center px-4">
      <SEO 
        title="কমিটি লগইন - চন্দনাইশ দরবার শরীফ" 
        description="শুধুমাত্র চন্দনাইশ দরবার শরীফ পরিচালনা কমিটির সম্মানিত সদস্যদের জন্য সুরক্ষিত পোর্টাল।" 
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-0" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-card/60 backdrop-blur-md border border-gold/20 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold-gradient p-0.5 mb-4 shadow-lg shadow-gold/20">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <ShieldCheck size={32} className="text-gold" />
            </div>
          </div>
          <h1 className="text-2xl font-heading font-bold text-cream">কমিটি পোর্টাল</h1>
          <p className="text-sm text-gold/60 mt-2 text-center uppercase tracking-widest font-bold">Committee Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-cream/80 ml-1">যাচাইকৃত ফোন নম্বর</label>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <Input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXX..." 
                disabled={loading || (lockoutTime !== null)}
                className="pl-11 h-12 bg-black/40 border-gold/20 focus:border-gold/50 rounded-xl text-cream"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              * ওয়েবসাইটে আপনার নামের নিচে যেই নম্বরটি দেয়া আছে হুবহু সেটি দিন।
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-cream/80 ml-1">৪-ডিজিট PIN</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
              <Input 
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••" 
                disabled={loading || (lockoutTime !== null)}
                className="pl-11 h-12 bg-black/40 border-gold/20 focus:border-gold/50 rounded-xl text-cream tracking-[0.5em] text-center font-bold text-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              * প্রথমবার লগইন করলে যেকোনো ৪-ডিজিট টাইপ করুন, এটিই আপনার ভবিষ্যৎ PIN হবে।
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={loading || (lockoutTime !== null)}
            className="w-full h-12 bg-gold-gradient text-primary-foreground font-bold rounded-xl gold-glow-hover text-base"
          >
            {lockoutTime ? `লগইন ব্লকড (${remainingTime}s)` : loading ? "যাচাই করা হচ্ছে..." : (
              <>
                প্রবেশ করুন <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default CommitteeLogin;
