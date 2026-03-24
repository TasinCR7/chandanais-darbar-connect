import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartHandshake, Home, Users, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const DonationManager = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error: any) {
      toast({ title: "Error loading donations", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'verified' : 'pending';
    try {
      const { error } = await supabase
        .from('donations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "স্ট্যাটাস আপডেট করা হয়েছে" });
      fetchDonations();
    } catch (error: any) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    }
  };

  const getCategoryLabel = (category: string, recipientId: string | null) => {
    if (category === 'mosque') return 'মসজিদ ফান্ড/ দরবার ফান্ড';
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

  // Calculate stats
  const totalVerified = donations.filter(d => d.status === 'verified').reduce((sum, d) => sum + d.amount, 0);
  const mosqueTotal = donations.filter(d => d.status === 'verified' && d.donation_category === 'mosque').reduce((sum, d) => sum + d.amount, 0);
  const pendingCount = donations.filter(d => d.status === 'pending').length;

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
        <Button onClick={fetchDonations} variant="outline" className="border-gold/30 hover:bg-gold/10 text-gold">
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Home size={18} /> মসজিদ ফান্ড/ দরবার ফান্ড (গৃহীত)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">৳ {mosqueTotal.toLocaleString()}</p>
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
          <div className="overflow-x-auto">
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
                {donations.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      কোনো হাদিয়ার তথ্য পাওয়া যায়নি।
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((d) => (
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
                        ) : (
                          <Badge className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 border-none px-2.5 py-0.5 font-medium">অপেক্ষমান</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        <Button 
                          size="sm"
                          variant={d.status === 'verified' ? "outline" : "default"}
                          className={d.status === 'verified' ? "border-gold/30 text-gold h-8 text-xs" : "bg-gold text-deep-green hover:bg-gold-light h-8 text-xs font-semibold shadow-md shadow-gold/20"}
                          onClick={() => toggleStatus(d.id, d.status)}
                        >
                          {d.status === 'verified' ? 'বাতিল' : 'যাচাই করুন'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationManager;
