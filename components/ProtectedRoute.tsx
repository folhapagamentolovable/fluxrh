import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock } from 'lucide-react';
import { canAccessRoute, type AppRole } from '../utils/rbacConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  allowedRoles
}) => {
  const { user, loading, isAdmin, isManager, isAdminOrManager, isClient } = useAuth();
  const location = useLocation();



  const isPortalRoute = location.pathname.startsWith('/portal/') || location.pathname === '/portal';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (isPortalRoute) {
      return <Navigate to="/portal/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Build user roles array
  const userRoles: AppRole[] = [];
  if (isAdmin) userRoles.push('admin');
  if (isManager) userRoles.push('manager');
  if (isClient) userRoles.push('client');
  if (!isAdmin && !isManager && !isClient) userRoles.push('user');

  // Check with allowedRoles prop if provided
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(role => userRoles.includes(role));
    if (!hasAccess) {
      return <AccessDenied isPortalUser={!isAdminOrManager} />;
    }
    return <>{children}</>;
  }

  // Check with RBAC config based on current path
  if (requireAdmin) {
    const hasAccess = canAccessRoute(location.pathname, userRoles);
    if (!hasAccess) {
      return <AccessDenied isPortalUser={!isAdminOrManager} />;
    }
  }

  return <>{children}</>;
};

const AccessDenied: React.FC<{ isPortalUser?: boolean }> = ({ isPortalUser }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
      <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
      <p className="text-gray-600 mb-6">
        Você não tem permissão para acessar esta página.
        {isPortalUser && ' Use o Portal do Funcionário para acessar suas informações.'}
      </p>
      <div className="space-y-3">
        {isPortalUser ? (
          <button
            onClick={() => globalThis.location.href = '/#/portal'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para o Portal
          </button>
        ) : (
          <button
            onClick={() => globalThis.history.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  </div>
);

export default ProtectedRoute;
