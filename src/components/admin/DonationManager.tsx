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
    setSelectedInvoice(donation);
    setDownloadingId(donation.id);
    
    // Allow React to render the component off-screen
    setTimeout(async () => {
      if (!invoiceRef.current) {
        setDownloadingId(null);
        return;
      }
      try {
        const canvas = await html2canvas(invoiceRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;
        let heightLeft = imgH;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH, undefined, 'FAST');
        heightLeft -= pageH;
        while (heightLeft > 0) {
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH, undefined, 'FAST');
          heightLeft -= pageH;
        }
        const invoiceId = donation.id.substring(0, 6).toUpperCase();
        const dateStr = new Date().toISOString().slice(0, 10);
        pdf.save(`Rashid-${donation.donor_name.replace(/\s+/g, '-')}-${invoiceId}-${dateStr}.pdf`);
        toast({ title: "রশিদ ডাউনলোড সম্পন্ন হয়েছে" });
      } catch (error) {
        console.error(error);
        toast({ title: "ইনভয়েস তৈরিতে সমস্যা হয়েছে", variant: "destructive" });
      } finally {
        setDownloadingId(null);
        setSelectedInvoice(null);
      }
    }, 400);
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
