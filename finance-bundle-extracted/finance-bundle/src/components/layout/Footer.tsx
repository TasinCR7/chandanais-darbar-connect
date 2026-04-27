import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Heart } from 'lucide-react';

export const Footer = () => (
  <footer className="mt-20 border-t border-primary/20 bg-card/50">
    <div className="container py-12 grid gap-10 md:grid-cols-4">
      <div className="md:col-span-2 space-y-3">
        <p className="font-arabic text-2xl text-primary">دَرْبَار شَرِيف چَنْدَنَائِش</p>
        <h3 className="font-display text-xl gold-text">চন্দনাইশ দরবার শরীফ</h3>
        <p className="text-sm text-muted-foreground font-bangla leading-relaxed">
          সিলসিলা-ই-তরিকায়ে মাইজভান্ডারিয়া। গৌছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী
          মাইজভান্ডারী (রাঃ) এর পবিত্র দরবার।
        </p>
      </div>

      <div>
        <h4 className="font-display text-primary mb-3">দ্রুত লিংক</h4>
        <ul className="space-y-2 text-sm font-bangla">
          {[
            ['/about', 'দরবার পরিচিতি'],
            ['/events', 'ওরশসমূহ'],
            ['/hadia', 'হাদিয়া দিন'],
            ['/dua', 'দোয়া আবেদন'],
            ['/contact', 'যোগাযোগ'],
          ].map(([to, label]) => (
            <li key={to}>
              <Link to={to} className="text-muted-foreground hover:text-primary transition-colors">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-display text-primary mb-3">যোগাযোগ</h4>
        <ul className="space-y-2 text-sm text-muted-foreground font-bangla">
          <li className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary shrink-0" /> +৮৮০ ১XXX-XXXXXX
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary shrink-0" /> info@chandanaish-darbar.org
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-primary/15">
      <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground font-bangla">
        <p>© {new Date().getFullYear()} চন্দনাইশ দরবার শরীফ। সকল অধিকার সংরক্ষিত।</p>
        <p className="flex items-center gap-1">
          নির্মিত <Heart className="h-3 w-3 text-primary fill-primary" /> এর সাথে
        </p>
      </div>
    </div>
  </footer>
);
