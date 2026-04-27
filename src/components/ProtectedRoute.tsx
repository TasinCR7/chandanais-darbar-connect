import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AccessDenied from './AccessDenied';
import type { Role } from '@/types/finance';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = roles.some((r) => allowedRoles.includes(r));
    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
