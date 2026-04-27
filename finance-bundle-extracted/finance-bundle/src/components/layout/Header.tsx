import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Heart, LogIn, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  { to: '/', label: 'হোম' },
  { to: '/about', label: 'দরবার পরিচিতি' },
  { to: '/pir-shahjada', label: 'পীর ও শাহজাদা' },
  { to: '/rules', label: 'নিয়ম-নীতি' },
  { to: '/events', label: 'ওরশ ও অনুষ্ঠান' },
  { to: '/hadia', label: 'হাদিয়া' },
  { to: '/finance', label: 'অর্থ ব্যবস্থাপনা' },
  { to: '/member-search', label: 'সদস্য তালাশ' },
  { to: '/transparency', label: 'স্বচ্ছতা' },
  { to: '/gallery', label: 'গ্যালারি' },
  { to: '/notice', label: 'নোটিশ' },
  { to: '/committee', label: 'কমিটি' },
  { to: '/dua', label: 'দোয়া' },
  { to: '/qa', label: 'প্রশ্ন' },
  { to: '/contact', label: 'যোগাযোগ' },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();
  const { user, isStaff, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    nav('/');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/85 border-b border-primary/20">
      <div className="container flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
            <span className="font-arabic text-primary-foreground text-lg font-bold">د</span>
          </div>
          <div className="font-display leading-tight">
            <div className="text-sm md:text-base text-foreground">চন্দনাইশ</div>
            <div className="text-xs md:text-sm gold-text -mt-0.5">দরবার শরীফ</div>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors font-bangla whitespace-nowrap',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/75 hover:text-primary hover:bg-primary/5',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex font-bangla text-foreground/80 hover:text-primary">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1" />ড্যাশবোর্ড</Link>
              </Button>
              {isStaff && (
                <Button asChild size="sm" variant="ghost" className="hidden lg:inline-flex font-bangla text-primary">
                  <Link to="/admin"><ShieldCheck className="h-4 w-4 mr-1" />অ্যাডমিন</Link>
                </Button>
              )}
              <Button onClick={handleSignOut} size="sm" variant="outline" className="font-bangla">
                <LogOut className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">লগআউট</span>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline" className="font-bangla">
              <Link to="/auth"><LogIn className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">লগইন</span></Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold font-bangla"
          >
            <Link to="/hadia">
              <Heart className="h-4 w-4 mr-1" /> হাদিয়া
            </Link>
          </Button>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="xl:hidden p-2 rounded-md text-foreground hover:bg-primary/10"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-primary/20 bg-background/95 backdrop-blur-md">
          <nav className="container py-3 grid grid-cols-2 gap-1.5 max-h-[70vh] overflow-y-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2.5 rounded-md text-sm font-bangla border',
                    isActive
                      ? 'text-primary bg-primary/10 border-primary/40'
                      : 'text-foreground/80 border-border hover:border-primary/40',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && (
              <>
                <NavLink to="/dashboard" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md text-sm font-bangla border border-primary/40 text-primary col-span-2 text-center">
                  ড্যাশবোর্ড
                </NavLink>
                {isStaff && (
                  <NavLink to="/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md text-sm font-bangla border border-primary/40 text-primary col-span-2 text-center">
                    অ্যাডমিন প্যানেল
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>
      )}

      <div className="ornament-divider" />
      <span className="sr-only">{location.pathname}</span>
    </header>
  );
};
