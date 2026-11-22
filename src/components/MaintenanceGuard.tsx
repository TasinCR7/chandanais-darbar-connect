import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useCommitteeSession } from "@/hooks/useCommitteeSession";


interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isStaff, loading: authLoading } = useAuth();
  
  const { data: settings = {} } = useAppSettings();

  // Check both .env and Database settings
  const envMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  const dbMaintenance = String(settings.maintenance_mode) === 'true';
  const isMaintenanceMode = envMaintenance || dbMaintenance;

  // Verify committee session server-side when maintenance mode is active
  const { isCommitteeMember, verifyingCommittee } = useCommitteeSession(isMaintenanceMode);
  const isBypassed = isStaff || isCommitteeMember;

  const isPublicRoute = 
    !location.pathname.startsWith('/admin') && 
    !location.pathname.startsWith('/committee-login') && 
    !location.pathname.startsWith('/committee-dashboard') &&
    !location.pathname.startsWith('/maintenance');

  // While auth or server session verification is loading during maintenance mode
  if ((authLoading || verifyingCommittee) && isMaintenanceMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-14 h-14 rounded-full border-[3px] border-gold/20 border-t-gold animate-spin mb-4" />
        <p className="text-gold/80 font-heading animate-pulse tracking-widest text-sm">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (authLoading) {
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
