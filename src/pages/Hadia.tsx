import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle, HeartHandshake, Home, Users, User, Calculator, CheckCircle2, CreditCard, Send, Download } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DonationInvoiceTemplate, InvoiceData } from "@/components/DonationInvoiceTemplate";

type DonationType = "mosque" | "combined_shahjadas" | "specific_shahjada" | "";
type SpecificShahjada = "boro" | "mej" | "sej" | "choto" | "";
type PaymentMethod = "bkash" | "nagad" | "rocket" | "card" | "";

const SHAHJADAS = [
  { id: "boro", name: "বড় শাহজাদা" },
  { id: "mej", name: "মেজ শাহজাদা" },
  { id: "sej", name: "সেজ শাহজাদা" },
  { id: "choto", name: "ছোট শাহজাদা" },
];

const Hadia = () => {
  const [donationType, setDonationType] = useState<DonationType>("");
  const [specificShahjada, setSpecificShahjada] = useState<SpecificShahjada>("");
  const [amount, setAmount] = useState<number | "">("");
  
  // New State for Full System
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedDonation, setCompletedDonation] = useState<InvoiceData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Auto-calculate visibility based on inputs
  const canCalculate = Boolean(amount && amount > 0 && donationType && (donationType !== "specific_shahjada" || specificShahjada));
  const canDonate = canCalculate && donorName.trim() && donorPhone.trim() && paymentMethod && transactionId.trim();

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
    } catch (error) {
      console.error("Donation error:", error);
      toast.error("হাদিয়া জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Hadia-Invoice-${completedDonation.donor_name.replace(/\s+/g, '-')}.pdf`);
        toast.success("রশিদ ডাউনলোড সম্পন্ন হয়েছে");
      } catch (error) {
        console.error("PDF download error:", error);
        toast.error("রশিদ ডাউনলোডে সমস্যা হয়েছে");
      } finally {
        setIsDownloading(false);
      }
    }, 150);
  };

  const calculateDistribution = () => {
    if (!canCalculate) return null;
    
    if (donationType === "mosque") {
      return (
        <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mt-6">
          <p className="text-lg text-emerald-light font-semibold mb-2">হিসাব বিবরণী:</p>
          <p className="text-foreground">সম্পূর্ণ <span className="text-gold font-bold">{amount} ৳</span> মসজিদ ফান্ড/ দরবার ফান্ডে প্রদান করা হবে। (১ জন প্রাপক)</p>
        </div>
      );
    }
    
    if (donationType === "specific_shahjada" && specificShahjada) {
      const shahjadaName = SHAHJADAS.find(s => s.id === specificShahjada)?.name;
      return (
        <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mt-6">
          <p className="text-lg text-emerald-light font-semibold mb-2">হিসাব বিবরণী:</p>
          <p className="text-foreground">
            সম্পূর্ণ <span className="text-gold font-bold">{amount} ৳</span> {shahjadaName} বরাবর প্রদান করা হবে। (১ জন প্রাপক)
          </p>
        </div>
      );
    }
    
    if (donationType === "combined_shahjadas") {
      const perPerson = Number(amount) / SHAHJADAS.length;
      return (
        <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mt-6">
          <p className="text-lg text-emerald-light font-semibold mb-3">হিসাব বিবরণী (৪ জনে সমানভাবে বণ্টিত):</p>
          <ul className="space-y-2">
            {SHAHJADAS.map(s => (
              <li key={s.id} className="flex justify-between items-center border-b border-gold/10 pb-2">
                <span className="text-foreground">{s.name}</span>
                <span className="text-gold font-bold">{perPerson.toFixed(2)} ৳</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <SEO title="হাদিয়া ও নজরানা" description="চন্দনাইশ দরবার শরীফের খেদমতে হাদিয়া ও নজরানা প্রদান করুন। দরবারের সেবায় অংশগ্রহণ করুন।" canonical="/hadia" />
      <div className="py-20 islamic-pattern min-h-screen">
        <div className="container mx-auto px-4">
          <SectionTitle
            arabic="صَدَقَة"
            title="অনলাইন হাদিয়া ও নজরানা"
            subtitle="দরবার শরীফের খেদমতে আপনার অবদান রাখুন"
          />

          <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-8">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-3 bg-card/90 backdrop-blur border border-gold/20 rounded-xl p-6 md:p-8 shadow-lg relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[80px] rounded-full group-hover:bg-gold/10 transition-colors duration-500" />
              
              <AnimatePresence mode="wait">
                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center space-y-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald/20 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald" />
                    </div>
                    <h3 className="text-2xl font-bold text-gold">আলহামদুলিল্লাহ!</h3>
                    <p className="text-lg text-foreground mb-4">আপনার হাদিয়া সফলভাবে জমা হয়েছে।</p>
                    <div className="p-6 bg-background/50 rounded-lg border border-gold/20 w-full max-w-md text-left space-y-2">
                      <p className="text-muted-foreground text-sm border-b border-white/10 pb-2">রিসিপ্ট বিবরণ</p>
                      <div className="flex justify-between text-sm py-1"><span className="text-muted-foreground">নাম:</span> <span className="font-medium text-foreground">{donorName}</span></div>
                      <div className="flex justify-between text-sm py-1"><span className="text-muted-foreground">পরিমাণ:</span> <span className="font-medium text-gold">{amount} ৳</span></div>
                      <div className="flex justify-between text-sm py-1"><span className="text-muted-foreground">ট্রানজেকশন আইডি:</span> <span className="font-medium text-foreground">{transactionId}</span></div>
                      <div className="flex justify-between text-sm py-1"><span className="text-muted-foreground">স্ট্যাটাস:</span> <span className="text-emerald-light font-medium py-0.5 px-2 bg-emerald/10 rounded-full text-xs">অপেক্ষমান</span></div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                      <button 
                        onClick={handleDownloadInvoice}
                        disabled={isDownloading}
                        className="px-6 py-2 bg-emerald text-white font-semibold rounded-lg hover:bg-emerald/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        {isDownloading ? <span className="animate-pulse">ডাউনলোড হচ্ছে...</span> : <><Download size={18} /> রশিদ ডাউনলোড করুন</>}
                      </button>
                      <button 
                        onClick={() => {
                          setIsSuccess(false);
                          setAmount("");
                          setTransactionId("");
                          setCompletedDonation(null);
                        }}
                        className="px-6 py-2 bg-gold text-deep-green font-semibold rounded-lg hover:bg-gold-light transition-colors"
                      >
                        আরও হাদিয়া দিন
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 space-y-8"
                  >
                    <div>
                      <h3 className="text-2xl font-bold text-gold mb-6 flex items-center gap-2">
                        1. খাদেমের তথ্য
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-foreground mb-2 font-medium text-sm">আপনার নাম</label>
                          <input
                            type="text"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            placeholder="সম্পূর্ণ নাম লিখুন"
                            className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold transition-colors outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-foreground mb-2 font-medium text-sm">মোবাইল নাম্বার</label>
                          <input
                            type="tel"
                            value={donorPhone}
                            onChange={(e) => setDonorPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold transition-colors outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gold/10" />

                    <div>
                      <h3 className="text-2xl font-bold text-gold mb-6 flex items-center gap-2">
                        2. হাদিয়ার ধরন
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-foreground capitalize mb-3 font-medium text-sm">খাত নির্বাচন করুন</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                              onClick={() => setDonationType("mosque")}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                donationType === "mosque" ? "border-gold bg-gold/10 text-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <Home size={24} className="mb-2" />
                              <span className="text-sm font-semibold">মসজিদ ফান্ড/ দরবার ফান্ড</span>
                            </button>
                            <button
                              onClick={() => setDonationType("combined_shahjadas")}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                donationType === "combined_shahjadas" ? "border-gold bg-gold/10 text-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <Users size={24} className="mb-2" />
                              <span className="text-sm font-semibold text-center">সম্মিলিত শাহজাদাগণ</span>
                            </button>
                            <button
                              onClick={() => setDonationType("specific_shahjada")}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                donationType === "specific_shahjada" ? "border-gold bg-gold/10 text-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <User size={24} className="mb-2" />
                              <span className="text-sm font-semibold text-center">নির্দিষ্ট শাহজাদা</span>
                            </button>
                          </div>
                        </div>

                        {donationType === "specific_shahjada" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2">
                            <label className="block text-foreground mb-2 font-medium text-sm">শাহজাদা নির্বাচন করুন</label>
                            <div className="grid grid-cols-2 gap-3">
                              {SHAHJADAS.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => setSpecificShahjada(s.id as SpecificShahjada)}
                                  className={`p-3 rounded-lg border text-sm transition-all ${
                                    specificShahjada === s.id ? "border-gold bg-gold/10 text-gold font-medium" : "border-gold/20 text-foreground hover:border-gold/50"
                                  }`}
                                >
                                  {s.name}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        <div>
                          <label className="block text-foreground mb-2 font-medium text-sm">পরিমাণ (৳)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold">৳</span>
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-3 text-lg rounded-lg bg-background/50 border border-gold/20 text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold transition-colors outline-none"
                              min="1"
                            />
                          </div>
                        </div>

                        {/* Calculation Result */}
                        <AnimatePresence>
                          {canCalculate && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              {calculateDistribution()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gold/10" />

                    <div>
                      <h3 className="text-2xl font-bold text-gold mb-6 flex items-center gap-2">
                        3. পেমেন্ট সম্পন্ন করুন
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-foreground mb-3 font-medium text-sm">মা মাধ্যম নির্বাচন করুন</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { id: "bkash", name: "bKash" },
                              { id: "nagad", name: "Nagad" },
                              { id: "rocket", name: "Rocket" },
                              { id: "card", name: "Card" }
                            ].map(method => (
                              <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                                  paymentMethod === method.id ? "border-gold bg-gold/10 text-gold font-bold" : "border-gold/20 text-foreground hover:border-gold/50"
                                }`}
                              >
                                {method.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {paymentMethod && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                            <div className="bg-background/40 p-4 rounded-lg border border-gold/10 mb-4 text-sm text-muted-foreground">
                              অনুগ্রহ করে নিচের নাম্বারে <span className="text-gold font-bold">{amount} ৳</span> Send Money করে Transaction ID টি নিচের বক্সে দিন।
                              <div className="mt-2 font-mono text-lg text-emerald-light font-bold track-wider">+8801711234567</div>
                            </div>
                            <label className="block text-foreground mb-2 font-medium text-sm">Transaction ID (ট্রানজেকশন আইডি)</label>
                            <input
                              type="text"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="যেমন: A1B2C3D4E5"
                              className="w-full p-3 rounded-lg bg-background/50 border border-gold/20 text-foreground uppercase placeholder:normal-case placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold transition-colors outline-none"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleDonate}
                      disabled={!canDonate || isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-gold to-gold-light text-deep-green text-lg font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="animate-pulse">প্রক্রিয়াধীন...</span>
                      ) : (
                        <>
                          <Send size={20} />
                          হাদিয়া প্রদান করুন
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Support Info Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="bg-card border border-gold/20 rounded-xl p-8 shadow-lg flex flex-col justify-center h-full">
                <div className="text-center mb-8">
                  <p className="font-arabic text-gold text-3xl mb-4 leading-relaxed">
                    إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ
                  </p>
                  <p className="text-foreground leading-relaxed text-sm">
                    নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন। (সূরা আল-বাকারাহ: ১৯৫)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald/10 border border-emerald/20 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-light mb-2 flex items-center gap-2">
                      <CreditCard size={18} /> পেমেন্ট প্রক্রিয়া
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2 ml-6 list-disc">
                      <li>খাত ও পরিমাণ নির্বাচন করুন।</li>
                      <li>আমাদের নাম্বারে টাকা পাঠান।</li>
                      <li>Transaction ID বক্সে লিখে সাবমিট দিন।</li>
                      <li>যাচাই করে আপনার হাদিয়া গ্রহণ করা হবে।</li>
                    </ul>
                  </div>
                  
                  <a
                    href="https://wa.me/8801711234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-emerald/20 hover:bg-emerald/30 text-emerald-light border border-emerald/50 rounded-lg p-4 transition-all duration-300 relative overflow-hidden group mt-4"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-light/0 via-emerald-light/10 to-emerald-light/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <MessageCircle size={22} />
                    <span className="font-semibold">যেকোনো সহায়তায় যোগাযোগ</span>
                  </a>
                </div>

                <p className="text-muted-foreground text-sm mt-8 text-center italic border-t border-gold/10 pt-6">
                  আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন। আমীন।
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {completedDonation && (
        <DonationInvoiceTemplate ref={invoiceRef} donation={completedDonation} />
      )}
    </>
  );
};

export default Hadia;

