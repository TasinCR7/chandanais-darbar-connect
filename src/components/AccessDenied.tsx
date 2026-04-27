import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

const AccessDenied = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4 font-bengali">
      <SEO title="প্রবেশাধিকার নেই" description="আপনার এই পেজটি দেখার অনুমতি নেই।" />
      <div className="card-gold max-w-md w-full p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gold-gradient opacity-10" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-display font-bold mb-3">প্রবেশাধিকার নেই</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            দুঃখিত, এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই। শুধুমাত্র অনুমোদিত অ্যাডমিন এবং ট্রেজারাররা এই পেজটি অ্যাক্সেস করতে পারবেন।
          </p>
          
          <div className="flex gap-4 w-full">
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full h-12 border-gold/30 hover:bg-gold/10">
                হোম পেজ
              </Button>
            </Link>
            <Link to="/admin" className="flex-1">
              <Button className="w-full h-12 bg-gradient-gold hover:opacity-90 text-background font-medium">
                লগইন করুন
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
