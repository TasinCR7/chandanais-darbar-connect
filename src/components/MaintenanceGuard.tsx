import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";


interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isStaff, loading: authLoading } = useAuth();
  
  // Share the same query key and staleTime as Layout so we reuse the cache.
  const { data: settings = {} } = useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const s = await fetchSettings();
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_settings_cache', JSON.stringify(s));
      }
      return s;
    },
    initialData: () => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('app_settings_cache');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            return undefined;
          }
        }
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // Match Layout's staleTime to prevent extra refetches
  });

  // Committee members log in via phone verification stored in localStorage
  const [isCommitteeMember, setIsCommitteeMember] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !!localStorage.getItem("committee_auth"); } catch { return false; }
  });

  useEffect(() => {
    const handleStorage = () => {
      try { setIsCommitteeMember(!!localStorage.getItem("committee_auth")); } catch { setIsCommitteeMember(false); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isBypassed = isStaff || isCommitteeMember;

  // Check both .env and Database settings
  const envMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  const dbMaintenance = String(settings.maintenance_mode) === 'true';
  const isMaintenanceMode = envMaintenance || dbMaintenance;

  const isPublicRoute = 
    !location.pathname.startsWith('/admin') && 
    !location.pathname.startsWith('/committee-login') && 
    !location.pathname.startsWith('/committee-dashboard') &&
    !location.pathname.startsWith('/maintenance');

  // While auth is loading, render children immediately unless maintenance is active.
  if (authLoading) {
    // If maintenance mode might be active, show loading instead of flashing content
    if (dbMaintenance || envMaintenance) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="w-14 h-14 rounded-full border-[3px] border-gold/20 border-t-gold animate-spin mb-4" />
          <p className="text-gold/80 font-heading animate-pulse tracking-widest text-sm">লোড হচ্ছে...</p>
        </div>
      );
    }
    return <>{children}</>;
  }

  // If maintenance is on and user is NOT bypassed, redirect to maintenance page
  if (isMaintenanceMode && !isBypassed && isPublicRoute) {
    return <Navigate to="/maintenance" replace />;
  }

  // If maintenance is OFF, and somehow they are on /maintenance, redirect home
  if (!isMaintenanceMode && location.pathname === '/maintenance') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
