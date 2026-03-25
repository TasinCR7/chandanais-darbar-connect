import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  MessageCircle, 
  HeartHandshake, 
  Home, 
  Users, 
  User as UserIcon, 
  CheckCircle2, 
  CreditCard, 
  Send, 
  Download,
  Copy,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Receipt,
  Calculator
} from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DonationInvoiceTemplate, InvoiceData } from "@/components/DonationInvoiceTemplate";
import { sendTelegramNotification } from "@/utils/telegram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DonationType = "mosque" | "combined_shahjadas" | "specific_shahjada" | "";
type SpecificShahjada = "boro" | "mej" | "sej" | "choto" | "";
type PaymentMethod = "bkash" | "nagad" | "rocket" | "card" | "";

const SHAHJADAS = [
  { id: "boro", name: "বড় শাহজাদা" },
  { id: "mej", name: "মেজ শাহজাদা" },
  { id: "sej", name: "সেজ শাহজাদা" },
  { id: "choto", name: "ছোট শাহজাদা" },
];

const PAYMENT_NUMBERS = {
  bkash: "+8801819614444",
  nagad: "+8801819614444",
  rocket: "+8801819614444",
};

const Hadia = () => {
  const [donationType, setDonationType] = useState<DonationType>("mosque");
  const [specificShahjada, setSpecificShahjada] = useState<SpecificShahjada>("");
  const [amount, setAmount] = useState<number | "">("");
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedDonation, setCompletedDonation] = useState<InvoiceData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const canCalculate = Boolean(amount && amount > 0 && donationType && (donationType !== "specific_shahjada" || specificShahjada));
  const canDonate = canCalculate && donorName.trim() && donorPhone.trim() && paymentMethod && transactionId.trim();

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success("নম্বর কপি করা হয়েছে");
  };

  const handleDonate = async () => {
    if (!canDonate) return;
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert({
          donor_name: donorName,
          donor_phone: donorPhone,
          amount: Number(amount),
          donation_category: donationType,
          recipient_id: donationType === 'specific_shahjada' ? specificShahjada : null,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCompletedDonation(data as InvoiceData);
      setIsSuccess(true);
      toast.success("আপনার হাদিয়া সফলভাবে গৃহীত হয়েছে!");
      
      const categoryText = donationType === "mosque" ? "মসজিদ ফান্ড/ দরবার ফান্ড" :
                           donationType === "combined_shahjadas" ? "সম্মিলিত শাহজাদাগণ" :
                           (SHAHJADAS.find(s => s.id === specificShahjada)?.name || "নির্দিষ্ট শাহজাদা");

      const textMessage = `🟢 *নতুন হাদিয়া জমা হয়েছে!*\n👤 *নাম:* ${donorName}\n📱 *মোবাইল:* ${donorPhone}\n🎯 *খাত:* ${categoryText}\n💰 *পরিমাণ:* ${amount} ৳\n💳 *পেমেন্ট:* ${paymentMethod}\n🔑 *TrxID:* \`${transactionId}\``;
      
      sendTelegramNotification(textMessage);
      
    } catch (error) {
      toast.error("হাদিয়া জমা দিতে সমস্যা হয়েছে।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current || !completedDonation) return;
    setIsDownloading(true);
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(invoiceRef.current!, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Hadia-Receipt-${completedDonation.donor_name.replace(/\s+/g, '-')}.pdf`);
      } catch (error) {
        toast.error("রশিদ ডাউনলোডে সমস্যা হয়েছে");
      } finally {
        setIsDownloading(false);
      }
    }, 200);
  };

  return (
    <>
      <SEO title="অনলাইন হাদিয়া ও নজরানা প্রদান" description="চন্দনাইশ দরবার শরীফের খেদমতে অনলাইনে আপনার হাদিয়া প্রদান করুন।" />
      <div className="py-24 islamic-pattern min-h-screen relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 z-0">
           <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gold/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionTitle
            arabic="فِي سَبِيلِ اللَّهِ"
            title="অনলাইন হাদিয়া ও নজরানা"
            subtitle="চন্দনাইশ দরবার শরীফের পবিত্র খেদমতে আপনার অবদান অংশ নিন"
          />

          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-card/40 backdrop-blur-xl border border-gold/20 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                           <UserIcon className="text-primary-foreground" size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-cream">আপনার পরিচয়</h3>
                           <p className="text-xs text-gold/60 uppercase tracking-widest font-bold">Personal Information</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-sm font-medium text-gold/80 ml-1">পূর্ণ নাম</label>
                           <Input 
                             value={donorName}
                             onChange={(e) => setDonorName(e.target.value)}
                             placeholder="আপনার নাম লিখুন"
                             className="h-12 bg-black/40 border-gold/10 rounded-xl focus:border-gold/40 text-cream"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium text-gold/80 ml-1">মোবাইল নাম্বার</label>
                           <Input 
                             value={donorPhone}
                             onChange={(e) => setDonorPhone(e.target.value)}
                             placeholder="01XXXXXXXXX"
                             className="h-12 bg-black/40 border-gold/10 rounded-xl focus:border-gold/40 text-cream"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="bg-card/40 backdrop-blur-xl border border-gold/20 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                           <HeartHandshake className="text-primary-foreground" size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-cream">হাদিয়ার বিবরণ</h3>
                           <p className="text-xs text-gold/60 uppercase tracking-widest font-bold">Purpose & Amount</p>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div>
                           <label className="text-sm font-bold text-gold/80 mb-4 block ml-1 uppercase">খাত নির্বাচন করুন</label>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {[
                                { id: "mosque", name: "মসজিদ/দরবার ফান্ড", icon: <Home size={22} /> },
                                { id: "combined_shahjadas", name: "সম্মিলিত শাহজাদাগণ", icon: <Users size={22} /> },
                                { id: "specific_shahjada", name: "নির্দিষ্ট শাহজাদা", icon: <UserIcon size={22} /> },
                              ].map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => setDonationType(item.id as DonationType)}
                                  className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 group ${
                                    donationType === item.id 
                                    ? "bg-gold-gradient border-0 text-primary-foreground shadow-xl shadow-gold/20 scale-[1.02]" 
                                    : "bg-black/40 border-gold/10 text-cream/70 hover:border-gold/40 hover:bg-gold/5"
                                  }`}
                                >
                                  <div className={`mb-3 transition-transform duration-300 group-hover:scale-110 ${donationType === item.id ? "text-primary-foreground" : "text-gold"}`}>
                                     {item.icon}
                                  </div>
                                  <span className="text-xs font-bold text-center leading-tight">{item.name}</span>
                                </button>
                              ))}
                           </div>
                        </div>

                        {donationType === "specific_shahjada" && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                 {SHAHJADAS.map(s => (
                                   <button
                                     key={s.id}
                                     onClick={() => setSpecificShahjada(s.id as SpecificShahjada)}
                                     className={`p-3 rounded-xl border text-[11px] font-bold transition-all ${
                                       specificShahjada === s.id 
                                       ? "bg-gold/20 border-gold text-gold shadow-glow-sm" 
                                       : "bg-black/20 border-white/5 text-muted-foreground hover:border-gold/30"
                                     }`}
                                   >
                                     {s.name}
                                   </button>
                                 ))}
                              </div>
                           </motion.div>
                        )}

                        <div className="space-y-4">
                           <label className="text-sm font-bold text-gold/80 mb-2 block ml-1 uppercase">হাদিয়ার পরিমাণ</label>
                           <div className="relative group/input">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
                                 <span className="text-2xl font-bold text-gold">৳</span>
                              </div>
                              <Input 
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                                placeholder="৫০০.০০"
                                className="h-20 pl-14 text-3xl font-heading font-bold bg-black/40 border-gold/10 rounded-2xl focus:border-gold/50 text-gold transition-all"
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-card/40 backdrop-blur-xl border border-gold/20 rounded-[2rem] p-8 shadow-2xl sticky top-24 overflow-hidden group">
                     <h3 className="text-lg font-bold text-cream mb-6 flex items-center justify-between">
                        বণ্টন বিবরণী
                        <Calculator size={18} className="text-gold/40" />
                     </h3>

                     <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-muted-foreground">মোট পরিমাণ:</span>
                           <span className="text-cream font-bold">{amount || 0} ৳</span>
                        </div>
                        
                        {donationType === "combined_shahjadas" && amount !== "" && (
                           <div className="space-y-3 pt-4 border-t border-gold/10">
                              <p className="text-[10px] text-gold/40 uppercase tracking-widest font-black mb-2">প্রতি শাহজাদা পাবেন:</p>
                              {SHAHJADAS.map(s => (
                                 <div key={s.id} className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-gold" /> {s.name}
                                    </span>
                                    <span className="text-cream font-medium">{(Number(amount) / 4).toFixed(2)} ৳</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                           {["bkash", "nagad", "rocket"].map(m => (
                              <button 
                                key={m}
                                onClick={() => setPaymentMethod(m as PaymentMethod)}
                                className={`h-11 rounded-xl border flex items-center justify-center text-[10px] font-bold uppercase transition-all duration-300 ${
                                   paymentMethod === m 
                                   ? "bg-gold/20 border-gold/50 text-gold shadow-glow-sm" 
                                   : "bg-black/20 border-white/5 text-muted-foreground hover:bg-gold/5"
                                }`}
                              >
                                 {m}
                              </button>
                           ))}
                        </div>

                        {paymentMethod && (
                           <div className="bg-black/40 rounded-2xl p-4 border border-gold/10 space-y-3">
                              <div className="flex justify-between items-center">
                                 <p className="text-[10px] text-gold/60 font-bold uppercase tracking-widest">পেমেন্ট নম্বর</p>
                                 <button onClick={() => handleCopyNumber(PAYMENT_NUMBERS[paymentMethod as keyof typeof PAYMENT_NUMBERS])} className="text-gold hover:text-gold-light p-1">
                                    <Copy size={12} />
                                 </button>
                              </div>
                              <div className="text-xl font-heading font-bold tracking-wider text-cream">
                                 {PAYMENT_NUMBERS[paymentMethod as keyof typeof PAYMENT_NUMBERS]}
                              </div>
                           </div>
                        )}

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-gold/80 block ml-1 uppercase">Transaction ID</label>
                           <Input 
                             value={transactionId}
                             onChange={(e) => setTransactionId(e.target.value)}
                             placeholder="Ex: A1B2C3..."
                             className="h-11 bg-black/40 border-gold/10 rounded-xl focus:border-gold/40 text-gold font-mono uppercase"
                           />
                        </div>

                        <Button 
                          onClick={handleDonate}
                          disabled={!canDonate || isSubmitting}
                          className="w-full h-14 bg-gold-gradient text-primary-foreground font-black rounded-2xl shadow-xl shadow-gold/20 gold-glow-hover text-base mt-4 group"
                        >
                           {isSubmitting ? "সাবমিট হচ্ছে..." : "হাদিয়া প্রদান করুন"}
                        </Button>
                     </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto"
              >
                 <div className="bg-card/60 backdrop-blur-2xl border border-gold/30 rounded-[3rem] p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                       <Sparkles size={120} className="text-gold" />
                    </div>
                    
                    <div className="w-24 h-24 rounded-full bg-emerald/20 border border-emerald/50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                       <CheckCircle2 size={48} className="text-emerald animate-bounce" />
                    </div>

                    <h2 className="text-4xl md:text-5xl font-heading font-bold text-transparent bg-clip-text bg-gold-gradient mb-4">
                       আলহামদুলিল্লাহ!
                    </h2>
                    <p className="text-xl text-cream/90 mb-8 max-w-lg mx-auto leading-relaxed">
                       আপনার হাদিয়া ও নজরানা সফলভাবে জমা হয়েছে। দরবার শরীফের খেদমতে আপনার এই অবদান কবুল হোক।
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
                       <div className="bg-black/40 border border-gold/10 rounded-2xl p-6 text-left relative overflow-hidden">
                          <Receipt className="absolute right-4 top-4 text-gold/10" size={40} />
                          <p className="text-xs text-gold/40 uppercase font-black tracking-widest mb-4">রিসিট নম্বর</p>
                          <p className="text-xl font-heading font-bold text-cream mb-1">#{completedDonation?.id?.substring(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("bn-BD")}</p>
                       </div>
                       <div className="bg-black/40 border border-gold/10 rounded-2xl p-6 text-left relative overflow-hidden">
                          <ShieldCheck className="absolute right-4 top-4 text-gold/10" size={40} />
                          <p className="text-xs text-gold/40 uppercase font-black tracking-widest mb-4">পরিশোধ তথ্য</p>
                          <p className="text-xl font-heading font-bold text-gold mb-1">{amount} ৳</p>
                          <p className="text-xs text-muted-foreground capitalize">{paymentMethod} - {transactionId}</p>
                       </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                       <Button 
                         onClick={handleDownloadInvoice}
                         disabled={isDownloading}
                         className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg flex items-center gap-3"
                       >
                          {isDownloading ? "ডাউনলোড হচ্ছে..." : <><Download size={20} /> ডিজিটাল রশিদ</>}
                       </Button>
                       <Button 
                         onClick={() => {
                           setIsSuccess(false);
                           setAmount("");
                           setTransactionId("");
                           setCompletedDonation(null);
                         }}
                         variant="outline"
                         className="h-14 px-10 border-gold/30 text-gold hover:bg-gold/10 font-bold rounded-2xl"
                       >
                          আরও হাদিয়া দিন <ArrowRight size={20} className="ml-2" />
                       </Button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {completedDonation && (
        <DonationInvoiceTemplate ref={invoiceRef} donation={completedDonation} />
      )}
    </>
  );
};

export default Hadia;
