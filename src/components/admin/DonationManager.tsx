import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, Home, Users, CheckCircle, Clock, Download, Trash2, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
import { DonationReportTemplate } from "@/components/admin/DonationReportTemplate";

interface Donation extends InvoiceData {
  id: string;
  created_at: string;
}

const DonationManager = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "monthly" | "yearly">("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const invoiceRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadInvoice = async (donation: Donation) => {
    setDownloadingId(donation.id);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const fontBase64 = await getFontBase64();
      
      const d = donation;
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
        qrImgHtml = `<img src="${qrUrl}" style="width:86px;height:86px;" />`;
      } catch (e) { console.warn('QR failed', e); }

      const statusText = isVerified ? '✔ গৃহীত' : d.status === 'rejected' ? '✖ বাতিল' : '⏳ অপেক্ষমান';
      const statusBg = isVerified ? '#dcfce7' : d.status === 'rejected' ? '#fee2e2' : '#ffedd5';
      const statusColor = isVerified ? '#166534' : d.status === 'rejected' ? '#991b1b' : '#9a3412';
      
      const html = `
        <div style="width:794px;min-height:1123px;background:#fff;font-family:'Noto Sans Bengali',sans-serif;color:#1a1a1a;position:relative;overflow:hidden;padding:0;margin:0;box-sizing:border-box;">
          <style>@font-face{font-family:'Noto Sans Bengali';src:url('data:font/ttf;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;}</style>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:90px;font-weight:900;color:rgba(6,95,70,0.04);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:0;">চন্দনাইশ দরবার শরীফ</div>
          <div style="position:absolute;inset:12px;border:2px solid #065f46;border-radius:4px;pointer-events:none;z-index:1;"></div>
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
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr>
              <td style="width:33%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">রশিদ নম্বর</div><div style="font-size:20px;font-weight:900;color:#065f46;font-family:monospace;">#${invoiceNo}</div></td>
              <td style="width:33%;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;text-align:center;"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">তারিখ</div><div style="font-size:16px;font-weight:700;color:#92400e;">${invoiceDate}</div><div style="font-size:12px;color:#b45309;">${invoiceTime}</div></td>
              <td style="width:33%;background:${isVerified ? '#f0fdf4' : '#fff7ed'};border:1px solid ${isVerified ? '#86efac' : '#fdba74'};border-radius:6px;padding:14px 18px;text-align:right;"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">স্ট্যাটাস</div><div style="display:inline-block;padding:4px 14px;border-radius:99px;font-size:13px;font-weight:700;background:${statusBg};color:${statusColor};">${statusText}</div></td>
            </tr></table>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
              <div style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #d1fae5;">দাতার তথ্য / Donor Information</div>
              <table style="width:100%;border-collapse:collapse;"><tr>
                <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">নাম</div><div style="font-size:16px;font-weight:700;color:#111827;">${d.donor_name}</div></td>
                <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">মোবাইল</div><div style="font-size:15px;font-weight:600;color:#111827;font-family:monospace;">${d.donor_phone}</div></td>
                <td style="padding:4px 0;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">যাচাই কোড</div><div style="font-size:13px;font-weight:700;color:#065f46;font-family:monospace;">${verificationCode}</div></td>
              </tr></table>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
              <thead><tr style="background:linear-gradient(135deg,#065f46,#047857);color:#fff;"><th style="padding:12px 16px;text-align:left;font-weight:700;">বিবরণ (খাত)</th><th style="padding:12px 16px;text-align:left;font-weight:700;">পেমেন্ট মাধ্যম</th><th style="padding:12px 16px;text-align:left;font-weight:700;">ট্রানজেকশন আইডি</th><th style="padding:12px 16px;text-align:right;font-weight:700;">পরিমাণ (৳)</th></tr></thead>
              <tbody><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;"><td style="padding:16px;font-size:15px;font-weight:600;color:#065f46;">${getCategoryLabel(d.donation_category, d.recipient_id)}</td><td style="padding:16px;"><span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:99px;font-weight:600;font-size:12px;">${payMethodLabel}</span></td><td style="padding:16px;font-family:monospace;font-size:13px;color:#374151;letter-spacing:1px;">${d.transaction_id || '-'}</td><td style="padding:16px;text-align:right;font-size:20px;font-weight:900;color:#065f46;">${d.amount.toLocaleString('en-US')} ৳</td></tr></tbody>
            </table>
            <div style="text-align:right;margin-bottom:20px;"><div style="display:inline-block;background:linear-gradient(135deg,#065f46,#047857);color:#fff;padding:14px 20px;border-radius:6px;width:340px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="font-size:15px;font-weight:700;letter-spacing:1px;color:white;">সর্বমোট / TOTAL</td><td style="font-size:26px;font-weight:900;text-align:right;color:white;">${d.amount.toLocaleString('en-US')} ৳</td></tr></table></div></div>
            <table style="width:100%;border-collapse:collapse;margin-top:32px;margin-bottom:28px;"><tr>
              <td style="text-align:center;width:33%;"><div style="height:50px;border-bottom:1px dashed #9ca3af;margin-bottom:8px;"></div><div style="font-size:11px;color:#6b7280;">অনুমোদনকারীর স্বাক্ষর</div></td>
              <td style="text-align:center;width:33%;vertical-align:bottom;">${qrImgHtml || '<div style="font-size:10px;color:#065f46;">অফিসিয়াল সিলমোহর</div>'}</td>
              <td style="text-align:center;width:33%;"><div style="height:50px;border-bottom:1px dashed #9ca3af;margin-bottom:8px;"></div><div style="font-size:11px;color:#6b7280;">গ্রাহকের স্বাক্ষর</div></td>
            </tr></table>
            <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 24px;margin-bottom:20px;"><div style="font-size:20px;color:#065f46;margin-bottom:6px;">إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ</div><div style="font-size:13px;color:#047857;font-style:italic;">"নিশ্চয়ই আল্লাহ্ অনুগ্রহকারীদের ভালোবাসেন।" — সূরা আল-বাকারাহ: ১৯৫</div></div>
            <div style="background:#065f46;color:#fff;border-radius:6px;padding:12px 24px;font-size:11px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="color:white;"><div style="font-weight:700;font-size:12px;margin-bottom:2px;color:white;">চন্দনাইশ দরবার শরীফ</div></td><td style="text-align:center;opacity:0.7;color:white;">কম্পিউটার জেনারেটেড রশিদ</td><td style="text-align:right;color:white;"><div style="font-family:monospace;color:white;">${verificationCode}</div></td></tr></table></div>
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
            const invoiceId = donation.id.substring(0, 6).toUpperCase();
            const dateStr = new Date().toISOString().slice(0, 10);
            doc.save(`Rashid-${donation.donor_name.replace(/\s+/g, '-')}-${invoiceId}-${dateStr}.pdf`);
          },
          x: 0, y: 0, width: 210, windowWidth: 794
        });
      } finally {
        if (container.parentNode) document.body.removeChild(container);
      }
      
      toast({ title: "রশিদ ডাউনলোড সম্পন্ন হয়েছে" });
    } catch (error) {
      console.error(error);
      toast({ title: "ইনভয়েস তৈরিতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };
  const handleDownloadReport = async () => {
    const verifiedDonations = donations.filter(d => d.status === 'verified');
    
    // Additional filtering based on viewMode
    const filteredDonations = verifiedDonations.filter(d => {
      if (viewMode === "all") return true;
      if (viewMode === "monthly") return d.created_at.startsWith(selectedDate);
      return d.created_at.startsWith(selectedDate.slice(0, 4));
    });

    if (filteredDonations.length === 0) {
      toast({ title: "এই সময়ের জন্য কোন ভেরিফাইড হাদিয়া পাওয়া যায়নি", variant: "destructive" });
      return;
    }
    
    setIsGeneratingReport(true);
    
    setTimeout(async () => {
      if (!reportRef.current) {
        setIsGeneratingReport(false);
        return;
      }
      try {
        const element = reportRef.current;
        const canvas = await html2canvas(element, { 
          scale: 3, // Higher scale for even better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 800,
          windowHeight: element.scrollHeight,
          onclone: (doc) => {
            const clonedElement = doc.getElementById('report-container');
            if (clonedElement) {
              clonedElement.style.position = 'relative';
              clonedElement.style.top = '0';
              clonedElement.style.left = '0';
              clonedElement.style.visibility = 'visible';
              clonedElement.style.margin = '0';
              clonedElement.style.padding = '70px';
            }
          }
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        const imgWidth = pageWidth;
        const imgHeight = (canvasHeight * imgWidth) / canvasWidth;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        // Add additional pages if content exceeds one page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        const periodString = viewMode === "all" ? "Total" : viewMode === "monthly" ? selectedDate : selectedDate.slice(0, 4);
        pdf.save(`Donation-Report-${periodString}-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
        toast({ title: "হিসাব বিবরণী ডাউনলোড সম্পন্ন হয়েছে" });
      } catch (error) {
        console.error("PDF Report Error:", error);
        toast({ title: "রিপোর্ট তৈরিতে সমস্যা হয়েছে", variant: "destructive" });
      } finally {
        setIsGeneratingReport(false);
      }
    }, 1000);
  };

  const filteredDonations = donations.filter(d => {
    if (viewMode === "all") return true;
    if (viewMode === "monthly") return d.created_at.startsWith(selectedDate);
    return d.created_at.startsWith(selectedDate.slice(0, 4));
  });

  const getPeriodLabel = () => {
    if (viewMode === "all") return "সর্বমোট হাদিয়া ও নজরানা";
    if (viewMode === "monthly") {
      const [year, month] = selectedDate.split("-");
      const monthNames = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      return `${monthNames[parseInt(month) - 1]} ${year} এর হাদিয়া ও নজরানা`;
    }
    return `${selectedDate.slice(0, 4)} সালের হাদিয়া ও নজরানা`;
  };

  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error loading donations";
      toast({ title: "Error loading donations", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: `স্ট্যাটাস '${newStatus === 'verified' ? 'গৃহীত' : 'বাতিল'}' করা হয়েছে` });
      fetchDonations();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update status";
      toast({ title: "Failed to update status", description: errorMessage, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই হাদিয়ার তথ্যটি ডিলিট করতে চান?")) return;
    
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "হাদিয়াটি ডিলিট করা হয়েছে" });
      fetchDonations();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete donation";
      toast({ title: "Failed to delete donation", description: errorMessage, variant: "destructive" });
    }
  };

  const getCategoryLabel = (category: string, recipientId: string | null) => {
    if (category === 'mosque' || category === 'mosque_fund') return 'মসজিদ ফান্ড';
    if (category === 'darbar_fund') return 'দরবার ফান্ড';
    if (category === 'combined_shahjadas') return 'সম্মিলিত শাহজাদাগণ';
    if (category === 'specific_shahjada') {
      const map: Record<string, string> = {
        'boro': 'বড় শাহজাদা',
        'mej': 'মেজ শাহজাদা',
        'sej': 'সেজ শাহজাদা',
        'choto': 'ছোট শাহজাদা'
      };
      return map[recipientId || ''] || 'নির্দিষ্ট শাহজাদা';
    }
    return category;
  };

  // Calculate stats based on filtered data
  const totalVerified = filteredDonations.filter(d => d.status === 'verified').reduce((sum, d) => sum + d.amount, 0);
  const mosqueTotal = filteredDonations.filter(d => d.status === 'verified' && (d.donation_category === 'mosque' || d.donation_category === 'mosque_fund')).reduce((sum, d) => sum + d.amount, 0);
  const darbarTotal = filteredDonations.filter(d => d.status === 'verified' && d.donation_category === 'darbar_fund').reduce((sum, d) => sum + d.amount, 0);
  const pendingCount = filteredDonations.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center bg-card/50 p-6 rounded-2xl border border-gold/20 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-gold flex items-center gap-3">
            <HeartHandshake className="text-emerald" /> 
            হাদিয়া ও নজরানা পরিচালনা
          </h2>
          <p className="text-muted-foreground mt-1">ভক্তদের অবদান এবং ফান্ডের বিস্তারিত বিবরণ</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex bg-background border border-gold/20 rounded-xl overflow-hidden">
            <button 
              onClick={() => setViewMode("all")} 
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "all" ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-gold"}`}
            >
              সকল
            </button>
            <button 
              onClick={() => setViewMode("monthly")} 
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "monthly" ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-gold"}`}
            >
              মাসিক
            </button>
            <button 
              onClick={() => setViewMode("yearly")} 
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === "yearly" ? "bg-gold text-primary-foreground" : "text-muted-foreground hover:text-gold"}`}
            >
              বার্ষিক
            </button>
          </div>
          
          {viewMode !== "all" && (
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gold" />
              <input
                type={viewMode === "monthly" ? "month" : "number"}
                value={viewMode === "monthly" ? selectedDate : selectedDate.slice(0, 4)}
                onChange={e => setSelectedDate(viewMode === "monthly" ? e.target.value : `${e.target.value}-01`)}
                min={viewMode === "yearly" ? 2020 : undefined}
                max={viewMode === "yearly" ? 2030 : undefined}
                className="bg-background border border-gold/20 rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-gold"
              />
            </div>
          )}

          <Button 
            onClick={handleDownloadReport} 
            disabled={isGeneratingReport}
            className="bg-emerald hover:bg-emerald/90 text-white font-semibold flex items-center gap-2"
          >
            {isGeneratingReport ? <span className="animate-pulse">তৈরি হচ্ছে...</span> : <><Download size={18} /> হিসাব বিবরণী ডাউনলোড</>}
          </Button>
          <Button onClick={fetchDonations} variant="outline" className="border-gold/30 hover:bg-gold/10 text-gold">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald/20 to-emerald-light/5 border-emerald/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald font-medium flex items-center gap-2">
              <CheckCircle size={18} /> সর্বমোট গৃহীত হাদিয়া
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">৳ {totalVerified.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-400/5 border-blue-500/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-500 font-medium flex items-center gap-2">
              <Home size={18} /> মসজিদ ফান্ড
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">৳ {mosqueTotal.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-400/5 border-purple-500/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-500 font-medium flex items-center gap-2">
              <Users size={18} /> দরবার ফান্ড
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">৳ {darbarTotal.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-400/5 border-orange-500/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-500 font-medium flex items-center gap-2">
              <Clock size={18} /> অপেক্ষমান ডোনেশন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{pendingCount} টি</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-gold/20 shadow-xl overflow-hidden">
        <CardHeader className="bg-background/50 border-b border-gold/10 pb-4">
          <CardTitle className="text-lg text-gold font-semibold">সকল হাদিয়া তালিকা</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-background/80">
                <TableRow className="border-gold/10 hover:bg-transparent">
                  <TableHead className="text-emerald font-semibold mx-4 py-4">তারিখ</TableHead>
                  <TableHead className="text-emerald font-semibold py-4">দাতার নাম ও ফোন</TableHead>
                  <TableHead className="text-emerald font-semibold py-4">খাত</TableHead>
                  <TableHead className="text-emerald font-semibold py-4">পরিমাণ</TableHead>
                  <TableHead className="text-emerald font-semibold py-4">পেমেন্ট ও TrxID</TableHead>
                  <TableHead className="text-emerald font-semibold py-4">স্ট্যাটাস</TableHead>
                  <TableHead className="text-emerald font-semibold py-4 text-right pr-6">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      এই সময়ের জন্য কোনো হাদিয়ার তথ্য পাওয়া যায়নি।
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonations.map((d) => (
                    <TableRow key={d.id} className="border-gold/5 bg-background/30 hover:bg-gold/5 transition-colors">
                      <TableCell className="pl-4 py-4 text-xs whitespace-nowrap text-muted-foreground">
                        {format(new Date(d.created_at), "dd MMM yyyy, hh:mm a")}
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="font-semibold text-foreground text-sm">{d.donor_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{d.donor_phone}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-gold/5 border-gold/20 text-gold text-xs">
                          {getCategoryLabel(d.donation_category, d.recipient_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 font-bold text-gold">
                        ৳ {d.amount}
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-xs font-semibold capitalize bg-primary/10 inline-block px-2 py-0.5 rounded text-primary mb-1">
                          {d.payment_method}
                        </p>
                        <p className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-white/10 text-muted-foreground">
                          {d.transaction_id}
                        </p>
                      </TableCell>
                      <TableCell className="py-4">
                        {d.status === 'verified' ? (
                          <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border-none px-2.5 py-0.5 font-medium">গৃহীত</Badge>
                        ) : d.status === 'rejected' ? (
                          <Badge className="bg-destructive/20 hover:bg-destructive/30 text-destructive border-none px-2.5 py-0.5 font-medium">বাতিল</Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 border-none px-2.5 py-0.5 font-medium">অপেক্ষমান</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-emerald/30 text-emerald hover:bg-emerald/10 h-8 w-8 p-0 shadow-sm"
                            onClick={() => handleDownloadInvoice(d)}
                            disabled={downloadingId === d.id}
                            title="রশিদ ডাউনলোড করুন"
                          >
                            {downloadingId === d.id ? <span className="animate-pulse">...</span> : <Download size={14} />}
                          </Button>
                          
                          {d.status !== 'verified' && (
                            <Button 
                              size="sm"
                              variant="default"
                              className="bg-emerald text-white hover:bg-emerald/90 h-8 text-xs font-semibold"
                              onClick={() => updateStatus(d.id, 'verified')}
                            >
                              গৃহীত
                            </Button>
                          )}

                          {d.status !== 'rejected' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8 text-xs"
                              onClick={() => updateStatus(d.id, 'rejected')}
                            >
                              বাতিল
                            </Button>
                          )}

                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            onClick={() => handleDelete(d.id)}
                            title="সম্পূর্ণ ডিলিট করুন"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {filteredDonations.length === 0 && !loading ? (
              <p className="text-center py-8 text-muted-foreground">এই সময়ের জন্য কোনো হাদিয়ার তথ্য পাওয়া যায়নি।</p>
            ) : (
              filteredDonations.map((d) => (
                <motion.div 
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-background/40 border border-gold/10 rounded-2xl p-4 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground">{d.donor_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.donor_phone}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(d.created_at), "dd MMM, hh:mm a")}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2">
                    <Badge variant="outline" className="bg-gold/5 border-gold/20 text-gold text-[10px] py-0 px-2">
                      {getCategoryLabel(d.donation_category, d.recipient_id)}
                    </Badge>
                    <p className="font-black text-gold text-lg">৳ {d.amount}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded-xl">
                    <div>
                      <p className="text-[10px] text-gold/50 uppercase font-bold">পেমেন্ট</p>
                      <p className="text-xs font-semibold text-cream capitalize">{d.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gold/50 uppercase font-bold">TrxID</p>
                      <p className="text-[10px] font-mono text-cream truncate">{d.transaction_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gold/5">
                    <div className="flex items-center gap-2">
                      {d.status === 'verified' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[10px]">গৃহীত</Badge>
                      ) : d.status === 'rejected' ? (
                        <Badge className="bg-destructive/20 text-destructive border-none text-[10px]">বাতিল</Badge>
                      ) : (
                        <Badge className="bg-orange-500/20 text-orange-500 border-none text-[10px]">অপেক্ষমান</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-gold/20"
                        onClick={() => handleDownloadInvoice(d)}
                        disabled={downloadingId === d.id}
                      >
                        <Download size={14} />
                      </Button>
                      
                      {d.status !== 'verified' && (
                        <Button 
                          size="sm"
                          className="bg-emerald text-white h-8 text-[10px] px-2"
                          onClick={() => updateStatus(d.id, 'verified')}
                        >
                          গ্রহণ
                        </Button>
                      )}
                      
                      <Button 
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedInvoice && (
        <DonationInvoiceTemplate ref={invoiceRef} donation={selectedInvoice} />
      )}
      
      <DonationReportTemplate 
        ref={reportRef} 
        donations={filteredDonations.filter(d => d.status === 'verified')} 
        totalAmount={totalVerified} 
        periodLabel={getPeriodLabel()}
      />
    </div>
  );
};

export default DonationManager;
