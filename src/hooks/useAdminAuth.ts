import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Custom hook to manage admin authentication and role verification.
 * Returns whether the current user is an admin, a loading flag, and any error encountered.
 */
export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkAdminStatus = async (currentUser: User | null) => {
    if (!currentUser) return false;
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: currentUser.id,
        _role: 'admin',
      });
      return !!data && !error;
    } catch (e) {
      console.error('Admin role check error', e);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        const admin = await checkAdminStatus(currentUser);
        if (isMounted) setIsAdmin(admin);
      } catch (e) {
        console.error('Auth init error', e);
        setError(e as Error);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        const cur = session?.user ?? null;
        setUser(cur);
        const admin = await checkAdminStatus(cur);
        if (isMounted) setIsAdmin(admin);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading, error, user };
}
