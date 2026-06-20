import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle, HeartHandshake, Home, Users, User, Calculator, CheckCircle2, CreditCard, Send, Download } from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// jsPDF lazy-loaded only when user downloads invoice
const getJsPDF = () => import("jspdf").then(m => m.default);
// Lazy load font for PDF generation
let _fontBase64Cache: string | null = null;
async function getFontBase64(): Promise<string> {
  if (_fontBase64Cache) return _fontBase64Cache;
  const mod = await import("@/fonts/bengaliFont");
  _fontBase64Cache = mod.default;
  return _fontBase64Cache;
}
import type { InvoiceData } from "@/components/DonationInvoiceTemplate";
import { DonationInvoiceTemplate } from "@/components/DonationInvoiceTemplate";
import { sendTelegramNotification } from "@/utils/telegram";
import { normalizePhoneNumber, isValidPhoneNumber } from "@/utils/phoneUtils";
import { fetchSettings } from "@/lib/api";
import { escapeHtml } from "@/utils/security";

type DonationType = "mosque_fund" | "darbar_fund" | "combined_shahjadas" | "specific_shahjada" | "";
type SpecificShahjada = "boro" | "mej" | "sej" | "choto" | "";
type PaymentMethod = "bkash" | "nagad" | "rocket" | "card" | "";

const SHAHJADAS = [
  { id: "boro", name: "বড় শাহজাদা" },
  { id: "mej", name: "মেজ শাহজাদা" },
  { id: "sej", name: "সেজ শাহজাদা" },
  { id: "choto", name: "ছোট শাহজাদা" },
];

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSettings();
        setAppSettings(settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Auto-calculate visibility based on inputs
  const canCalculate = Boolean(amount && amount > 0 && donationType && (donationType !== "specific_shahjada" || specificShahjada));
  const isPhoneValid = isValidPhoneNumber(donorPhone);
  const canDonate = canCalculate && donorName.trim() && isPhoneValid && paymentMethod && transactionId.trim();

  const handleDonate = async () => {
    if (!canDonate) return;
    setIsSubmitting(true);
    
    const donationId = generateUUID();
    
    try {
      const { error } = await supabase
        .from('donations')
        .insert({
          id: donationId,
          donor_name: donorName.trim(),
          donor_phone: normalizePhoneNumber(donorPhone),
          amount: Number(amount),
          donation_category: donationType,
          recipient_id: donationType === 'specific_shahjada' ? specificShahjada : null,
          payment_method: paymentMethod,
          transaction_id: transactionId,
        });

      if (error) throw error;
      
      const completedData: InvoiceData = {
        id: donationId,
        donor_name: donorName.trim(),
        donor_phone: normalizePhoneNumber(donorPhone),
        amount: Number(amount),
        donation_category: donationType,
        recipient_id: donationType === 'specific_shahjada' ? specificShahjada : null,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      setCompletedDonation(completedData);
      setIsSuccess(true);
      toast.success("আপনার হাদিয়া সফলভাবে গৃহীত হয়েছে!");
      
      // Send Telegram Notification
      const categoryText = donationType === "mosque_fund" ? "মসজিদ ফান্ড" :
                           donationType === "darbar_fund" ? "দরবার ফান্ড" :
                           donationType === "combined_shahjadas" ? "সম্মিলিত শাহজাদাগণ" :
                           (SHAHJADAS.find(s => s.id === specificShahjada)?.name || "নির্দিষ্ট শাহজাদা");

      const textMessage = `
🟢 *নতুন হাদিয়া/নজরানা জমা হয়েছে!*
━━━━━━━━━━━━━━━━━━
👤 *নাম:* ${donorName}
📱 *মোবাইল:* ${donorPhone}
🎯 *খাত:* ${categoryText}
💰 *পরিমাণ:* ${amount} ৳
💳 *পেমেন্ট:* ${paymentMethod}
🔑 *TrxID:* ${transactionId}
━━━━━━━━━━━━━━━━━━
অনুগ্রহ করে প্যানেল থেকে ট্রানজেকশনটি যাচাই করুন।
      `;
      
      sendTelegramNotification(textMessage).catch(err => {
        console.error("Telegram notification error:", err);
      });
      
    } catch (error) {
      console.error("Donation error:", error);
      toast.error("হাদিয়া জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!completedDonation) return;
    setIsDownloading(true);
    
    try {
      const JsPDF = await getJsPDF();
      const doc = new JsPDF('p', 'mm', 'a4');
      const fontBase64 = await getFontBase64();
      
      const d = completedDonation;
      const invoiceNo = d.id?.substring(0, 8).toUpperCase() || 'N/A';
      const verificationCode = d.id
        ? `CD-${d.id.substring(0, 4).toUpperCase()}-${d.id.substring(4, 8).toUpperCase()}`
        : 'N/A';
      const invoiceDate = d.created_at
        ? new Date(d.created_at).toLocaleDateString('bn-BD')
        : new Date().toLocaleDateString('bn-BD');
      const invoiceTime = d.created_at
        ? new Date(d.created_at).toLocaleTimeString('bn-BD')
        : new Date().toLocaleTimeString('bn-BD');
      const isVerified = d.status === 'verified';
      
      const getCategoryLabel = (cat: string, rid?: string | null) => {
        if (cat === 'mosque_fund') return 'মসজিদ ফান্ড';
        if (cat === 'darbar_fund') return 'দরবার ফান্ড';
        if (cat === 'combined_shahjadas') return 'সম্মিলিত শাহজাদাগণ';
        if (cat === 'specific_shahjada') {
          const map: Record<string, string> = { boro: 'বড় শাহজাদা', mej: 'মেজ শাহজাদা', sej: 'সেজ শাহজাদা', choto: 'ছোট শাহজাদা' };
          return map[rid || ''] || 'নির্দিষ্ট শাহজাদা';
        }
        return cat;
      };
      
      const payMethodMap: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', card: 'Card / Bank' };
      const payMethodLabel = payMethodMap[d.payment_method] || d.payment_method;
      
      let qrImgHtml = '';
      try {
        const QRCode = (await import('qrcode')).default;
        const qrText = `DONATION:${verificationCode}|AMOUNT:${d.amount}`;
        const qrUrl = await QRCode.toDataURL(qrText, { width: 120, margin: 1, color: { dark: '#065f46', light: '#ffffff' } });
        qrImgHtml = `<img src="${qrUrl}" style="width: 86px; height: 86px;" />`;
      } catch (e) { console.warn('QR failed', e); }

      const statusText = isVerified ? '✔ গৃহীত' : d.status === 'rejected' ? '✖ বাতিল' : '⏳ অপেক্ষমান';
      const statusBg = isVerified ? '#dcfce7' : d.status === 'rejected' ? '#fee2e2' : '#ffedd5';
      const statusColor = isVerified ? '#166534' : d.status === 'rejected' ? '#991b1b' : '#9a3412';
      
      const donorNameEscaped = escapeHtml(d.donor_name);
      const donorPhoneEscaped = escapeHtml(d.donor_phone);
      const transactionIdEscaped = escapeHtml(d.transaction_id || '-');
      const payMethodLabelEscaped = escapeHtml(payMethodLabel);
      
      const html = `
        <div style="width:794px;min-height:1123px;background:#fff;font-family:'Noto Sans Bengali',sans-serif;color:#1a1a1a;position:relative;overflow:hidden;padding:0;margin:0;box-sizing:border-box;">
          <style>@font-face{font-family:'Noto Sans Bengali';src:url('data:font/ttf;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;}</style>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:90px;font-weight:900;color:rgba(6,95,70,0.04);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:0;">চন্দনাইশ দরবার শরীফ</div>
          <div style="position:absolute;inset:12px;border:2px solid #065f46;border-radius:4px;pointer-events:none;z-index:1;"></div>
          <div style="position:absolute;inset:16px;border:1px solid rgba(6,95,70,0.25);border-radius:2px;pointer-events:none;z-index:1;"></div>
          <div style="position:relative;z-index:3;padding:40px 48px;">
            <div style="text-align:center;margin-bottom:28px;">
              <div style="font-size:28px;color:#065f46;margin-bottom:6px;letter-spacing:2px;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
              <div style="height:1px;width:100%;background:linear-gradient(to right,transparent,#065f46,transparent);margin:10px 0;"></div>
              <div style="font-size:30px;font-weight:900;color:#065f46;letter-spacing:1px;margin-bottom:4px;font-family:'Noto Sans Bengali';">চন্দনাইশ দরবার শরীফ</div>
              <div style="font-size:14px;color:#b45309;font-weight:bold;margin-bottom:4px;">সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া</div>
              <div style="font-size:13px;color:#6b7280;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Chandanais Darbar Sharif</div>
              <div style="font-size:12px;color:#9ca3af;">চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ | হটলাইন: ০১৬২২-৭২১৯৯৬</div>
              <div style="height:1px;width:100%;background:linear-gradient(to right,transparent,#065f46,transparent);margin:10px 0;"></div>
              <div style="background:linear-gradient(135deg,#065f46 0%,#047857 50%,#065f46 100%);color:#fff;padding:10px 32px;border-radius:4px;display:inline-block;font-size:18px;font-weight:700;letter-spacing:2px;margin-top:6px;">হাদিয়া ও নজরানা রশিদ / DONATION RECEIPT</div>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr>
                <td style="width:33%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;">
                  <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">রশিদ নম্বর</div>
                  <div style="font-size:20px;font-weight:900;color:#065f46;font-family:monospace;">#${invoiceNo}</div>
                </td>
                <td style="width:33%;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;text-align:center;">
                  <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">তারিখ</div>
                  <div style="font-size:16px;font-weight:700;color:#92400e;">${invoiceDate}</div>
                  <div style="font-size:12px;color:#b45309;">${invoiceTime}</div>
                </td>
                <td style="width:33%;background:${isVerified ? '#f0fdf4' : '#fff7ed'};border:1px solid ${isVerified ? '#86efac' : '#fdba74'};border-radius:6px;padding:14px 18px;text-align:right;">
                  <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">স্ট্যাটাস</div>
                  <div style="display:inline-block;padding:4px 14px;border-radius:99px;font-size:13px;font-weight:700;background:${statusBg};color:${statusColor};">${statusText}</div>
                </td>
              </tr>
            </table>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
              <div style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #d1fae5;">দাতার তথ্য / Donor Information</div>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">নাম / Name</div><div style="font-size:16px;font-weight:700;color:#111827;">${donorNameEscaped}</div></td>
                  <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">মোবাইল / Phone</div><div style="font-size:15px;font-weight:600;color:#111827;font-family:monospace;">${donorPhoneEscaped}</div></td>
                  <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">যাচাই কোড</div><div style="font-size:13px;font-weight:700;color:#065f46;font-family:monospace;">${verificationCode}</div></td>
                </tr>
              </table>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
              <thead><tr style="background:linear-gradient(135deg,#065f46,#047857);color:#fff;">
                <th style="padding:12px 16px;text-align:left;font-weight:700;">বিবরণ (খাত)</th>
                <th style="padding:12px 16px;text-align:left;font-weight:700;">পেমেন্ট মাধ্যম</th>
                <th style="padding:12px 16px;text-align:left;font-weight:700;">ট্রানজেকশন আইডি</th>
                <th style="padding:12px 16px;text-align:right;font-weight:700;">পরিমাণ (৳)</th>
              </tr></thead>
              <tbody><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                <td style="padding:16px;font-size:15px;font-weight:600;color:#065f46;">${getCategoryLabel(d.donation_category, d.recipient_id)}</td>
                <td style="padding:16px;"><span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:99px;font-weight:600;font-size:12px;">${payMethodLabelEscaped}</span></td>
                <td style="padding:16px;font-family:monospace;font-size:13px;color:#374151;letter-spacing:1px;">${transactionIdEscaped}</td>
                <td style="padding:16px;text-align:right;font-size:20px;font-weight:900;color:#065f46;">${d.amount.toLocaleString('en-US')} ৳</td>
              </tr></tbody>
            </table>
            <div style="text-align:right;margin-bottom:20px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#065f46,#047857);color:#fff;padding:14px 20px;border-radius:6px;width:340px;">
                <table style="width:100%;border-collapse:collapse;"><tr>
                  <td style="font-size:15px;font-weight:700;letter-spacing:1px;color:white;">সর্বমোট / TOTAL</td>
                  <td style="font-size:26px;font-weight:900;text-align:right;color:white;">${d.amount.toLocaleString('en-US')} ৳</td>
                </tr></table>
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:32px;margin-bottom:28px;">
              <tr>
                <td style="text-align:center;width:33%;"><div style="height:50px;border-bottom:1px dashed #9ca3af;margin-bottom:8px;"></div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">অনুমোদনকারীর স্বাক্ষর</div><div style="font-size:10px;color:#9ca3af;">Authorized Signature</div></td>
                <td style="text-align:center;width:33%;vertical-align:bottom;">${qrImgHtml || '<div style="font-size:10px;color:#065f46;">অফিসিয়াল সিলমোহর</div>'}</td>
                <td style="text-align:center;width:33%;"><div style="height:50px;border-bottom:1px dashed #9ca3af;margin-bottom:8px;"></div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">গ্রাহকের স্বাক্ষর</div><div style="font-size:10px;color:#9ca3af;">Receiver's Signature</div></td>
              </tr>
            </table>
            <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 24px;margin-bottom:20px;">
              <div style="font-size:20px;color:#065f46;margin-bottom:6px;">إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ</div>
              <div style="font-size:13px;color:#047857;font-style:italic;">"নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।" — সূরা আল-বাকারাহ: ১৯৫</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">আল্লাহ তায়ালা আপনার নেক মাকসুদ কবুল করুন। আমীন।</div>
            </div>
            <div style="background:#065f46;color:#fff;border-radius:6px;padding:12px 24px;font-size:11px;">
              <table style="width:100%;border-collapse:collapse;"><tr>
                <td style="color:white;"><div style="font-weight:700;font-size:12px;margin-bottom:2px;color:white;">চন্দনাইশ দরবার শরীফ</div><div style="opacity:0.75;color:white;">chandanais-darbar-connect.vercel.app</div></td>
                <td style="text-align:center;opacity:0.7;color:white;">এটি একটি কম্পিউটার জেনারেটেড রশিদ।<br/>This is a computer-generated receipt.</td>
                <td style="text-align:right;color:white;"><div style="font-weight:700;font-size:12px;margin-bottom:2px;color:white;">যাচাই কোড</div><div style="font-family:monospace;opacity:0.85;color:white;">${verificationCode}</div></td>
              </tr></table>
            </div>
          </div>
        </div>
      `;
      
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      try {
        await doc.html(container, {
          callback: function (doc) {
            const invoiceId = d.id?.substring(0, 6).toUpperCase() || 'N';
            const dateStr = new Date().toISOString().slice(0, 10);
            doc.save(`Rashid-${d.donor_name.replace(/\s+/g, '-')}-${invoiceId}-${dateStr}.pdf`);
          },
          x: 0, y: 0, width: 210, windowWidth: 794
        });
      } finally {
        if (container.parentNode) document.body.removeChild(container);
      }
      
      toast.success("রশিদ ডাউনলোড সম্পন্ন হয়েছে");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("রশিদ ডাউনলোডে সমস্যা হয়েছে");
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateDistribution = () => {
    if (!canCalculate) return null;
    
    if (donationType === "mosque_fund") {
      return (
        <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mt-6">
          <p className="text-lg text-emerald-light font-semibold mb-2">হিসাব বিবরণী:</p>
          <p className="text-foreground">সম্পূর্ণ <span className="text-gold font-bold">{amount} ৳</span> মসজিদ ফান্ডে প্রদান করা হবে। (১ জন প্রাপক)</p>
        </div>
      );
    }
    
    if (donationType === "darbar_fund") {
      return (
        <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mt-6">
          <p className="text-lg text-emerald-light font-semibold mb-2">হিসাব বিবরণী:</p>
          <p className="text-foreground">সম্পূর্ণ <span className="text-gold font-bold">{amount} ৳</span> দরবার ফান্ডে প্রদান করা হবে। (১ জন প্রাপক)</p>
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
      <SEO 
        title="হাদিয়া ও নজরানা প্রদান" 
        description="চন্দনাইশ দরবার শরীফের খেদমতে অনলাইনে আপনার হাদিয়া ও নজরানা প্রদান করুন। নিরাপদ পেমেন্ট ও অফিসীয়াল রশিদ সংগ্রহ করুন।" 
        keywords="অনলাইন হাদিয়া, নজরানা প্রদান, চন্দনাইশ দরবার দান, মসজিদ ফান্ড, দরবার শরীফ কন্ট্রিবিউশন"
        canonical="/hadia" 
      />
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
                        className="px-6 py-2 bg-gold text-primary-foreground font-semibold rounded-lg hover:bg-gold-light transition-colors"
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button
                              onClick={() => setDonationType("mosque_fund")}
                              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 active:scale-95 ${
                                donationType === "mosque_fund" ? "border-gold bg-gold/15 text-gold shadow-lg shadow-gold/10 ring-1 ring-gold/20" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <div className={`p-2 rounded-lg mb-2 transition-colors ${donationType === "mosque_fund" ? "bg-gold/20" : "bg-black/20"}`}>
                                <Home size={22} />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-center leading-tight">মসজিদ ফান্ড</span>
                            </button>
                            <button
                              onClick={() => setDonationType("darbar_fund")}
                              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 active:scale-95 ${
                                donationType === "darbar_fund" ? "border-gold bg-gold/15 text-gold shadow-lg shadow-gold/10 ring-1 ring-gold/20" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <div className={`p-2 rounded-lg mb-2 transition-colors ${donationType === "darbar_fund" ? "bg-gold/20" : "bg-black/20"}`}>
                                <HeartHandshake size={22} />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-center leading-tight">দরবার ফান্ড</span>
                            </button>
                            <button
                              onClick={() => setDonationType("combined_shahjadas")}
                              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 active:scale-95 ${
                                donationType === "combined_shahjadas" ? "border-gold bg-gold/15 text-gold shadow-lg shadow-gold/10 ring-1 ring-gold/20" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <div className={`p-2 rounded-lg mb-2 transition-colors ${donationType === "combined_shahjadas" ? "bg-gold/20" : "bg-black/20"}`}>
                                <Users size={22} />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-center leading-tight">সম্মিলিত শাহজাদাগণ</span>
                            </button>
                            <button
                              onClick={() => setDonationType("specific_shahjada")}
                              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-300 active:scale-95 ${
                                donationType === "specific_shahjada" ? "border-gold bg-gold/15 text-gold shadow-lg shadow-gold/10 ring-1 ring-gold/20" : "border-gold/20 hover:border-gold/50 text-foreground bg-background/30"
                              }`}
                            >
                              <div className={`p-2 rounded-lg mb-2 transition-colors ${donationType === "specific_shahjada" ? "bg-gold/20" : "bg-black/20"}`}>
                                <User size={22} />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-center leading-tight">নির্দিষ্ট শাহজাদা</span>
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
                          <label className="block text-foreground mb-3 font-medium text-sm">পেমেন্ট মাধ্যম নির্বাচন করুন</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { id: "bkash", name: "bKash", color: "from-[#d12053] to-[#e2136e]" },
                              { id: "nagad", name: "Nagad", color: "from-[#f7941d] to-[#ed1c24]" },
                              { id: "rocket", name: "Rocket", color: "from-[#8c3494] to-[#6d2d91]" },
                              { id: "card", name: "Card", color: "from-slate-700 to-slate-900" }
                            ].map(method => (
                              <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                className={`flex items-center justify-center p-3 rounded-xl border transition-all duration-300 relative overflow-hidden group active:scale-95 ${
                                  paymentMethod === method.id 
                                    ? `border-white/20 text-white font-bold bg-gradient-to-br ${method.color} shadow-lg scale-[1.02]` 
                                    : "border-gold/20 text-foreground hover:border-gold/50 bg-background/40"
                                }`}
                              >
                                {paymentMethod === method.id && (
                                  <motion.div 
                                    layoutId="payment-active"
                                    className="absolute inset-0 bg-white/10"
                                    initial={false}
                                  />
                                )}
                                <span className="relative z-10">{method.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {paymentMethod && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                            <div className="bg-background/40 p-4 rounded-lg border border-gold/10 mb-4 text-sm text-muted-foreground">
                              অনুগ্রহ করে নিচের নাম্বারে <span className="text-gold font-bold">{amount} ৳</span> Send Money করে Transaction ID টি নিচের বক্সে দিন।
                              <div className="mt-2 font-mono text-lg text-emerald-light font-bold tracking-wider">
                                {appSettings.hadia_payment_number || "+88017***********"}
                              </div>
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
                      className="w-full py-4 bg-gradient-to-r from-gold to-gold-light text-primary-foreground text-lg font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none uppercase tracking-wider flex items-center justify-center gap-2"
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
                      <li>যেকোনো প্রয়োজনে যোগাযোগ করুন।</li>
                    </ul>
                  </div>
                  
                  <a
                    href={`https://wa.me/${appSettings.hadia_whatsapp_number || "8801700000000"}`}
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
