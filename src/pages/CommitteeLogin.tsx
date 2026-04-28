import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";

const CommitteeLogin = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const auth = localStorage.getItem("committee_auth");
    if (auth) {
      navigate("/committee-dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: "সতর্কতা", description: "দয়া করে আপনার ফোন নম্বর লিখুন।", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let cleanPhone = phone.trim().replace(/\D/g, ""); // Remove everything except digits
      if (cleanPhone.startsWith("880")) cleanPhone = cleanPhone.substring(2); // Normalize 8801... to 01...
      if (!cleanPhone.startsWith("0")) cleanPhone = "0" + cleanPhone; // Ensure starts with 0

      const searchVariants = [
        cleanPhone,                // 017...
        "+88" + cleanPhone,        // +88017...
        "88" + cleanPhone,         // 88017...
        cleanPhone.substring(1)    // 17... (without leading zero)
      ];

      // Find the committee member by phone using multiple variants
      const { data, error } = await supabase
        .from("committee_members")
        .select("id, name, designation")
        .eq("is_active", true)
        .in("phone", searchVariants)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Success
        localStorage.setItem("committee_auth", data.id);
        toast({ title: "লগইন সফল", description: `স্বাগতম, ${data.name} (${data.designation})` });
        navigate("/committee-dashboard");
      } else {
        toast({ 
          title: "প্রবেশাধিকার প্রতক্ষ্যাত", 
          description: "আপনার ফোন নম্বর ডেটাবেজের কোনো সক্রিয় কমিটির সদস্যের সাথে মিলছে না। নম্বরটি চেক করুন।", 
          variant: "destructive" 
        });
      }
     
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
                className="pl-11 h-12 bg-black/40 border-gold/20 focus:border-gold/50 rounded-xl text-cream"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              * ওয়েবসাইটে আপনার নামের নিচে যেই নম্বরটি দেয়া আছে হুবহু সেটি দিন।
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-gold-gradient text-primary-foreground font-bold rounded-xl gold-glow-hover text-base"
          >
            {loading ? "যাচাই করা হচ্ছে..." : (
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
