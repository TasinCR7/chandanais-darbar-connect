import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isStaff, loading: authLoading } = useAuth();
  
  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
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
    staleTime: 5000,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['app_settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Committee members log in via phone verification stored in localStorage
  const isCommitteeMember = typeof window !== 'undefined' && !!localStorage.getItem("committee_auth");
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

  // While loading auth or settings, we can just render children or a loader.
  // We'll let the existing Layout loader handle global loading state to prevent double loaders.
  if (authLoading || settingsLoading) {
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
