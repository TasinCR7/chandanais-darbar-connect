import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import type { Role } from '@/types/finance';
interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
    setRoles((data?.map((r: { role: string }) => r.role as Role)) ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: never stay in loading state forever.
    // If Supabase is slow or unreachable, unlock the app after 3 seconds.
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!isMounted) return;
      setSession(sess);
      if (sess?.user) {
        setUser(sess.user);
        setTimeout(() => fetchRoles(sess.user.id), 0);
      } else {
        setUser(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession()
      .then(async ({ data: { session: sess } }) => {
        if (!isMounted) return;
        setSession(sess);
        try {
          if (sess?.user) {
            setUser(sess.user);
            await fetchRoles(sess.user.id);
          }
        } catch (err) {
          console.error("Error fetching roles on auth init:", err);
        }
      })
      .catch((err) => {
        console.error("Error getting session on auth init:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setUser(null);
    setSession(null);
  };

  const isAdmin = roles.includes('admin');
  const isStaff = isAdmin || roles.includes('treasurer');

  return (
    <Ctx.Provider value={{ user, session, roles, loading, isStaff, isAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
};
