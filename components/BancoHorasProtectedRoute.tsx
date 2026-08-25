import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEmployeePortal } from '../hooks/useEmployeePortal';
import PortalLayout from './portal/PortalLayout';

interface BancoHorasProtectedRouteProps {
  children: React.ReactNode;
}

const BancoHorasProtectedRoute: React.FC<BancoHorasProtectedRouteProps> = ({ children }) => {
  const { funcionario, loading } = useEmployeePortal();

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </PortalLayout>
    );
  }

  // Se o funcionário não tem banco de horas ativo, redireciona para o portal
  if (!funcionario?.banco_horas_ativo) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export default BancoHorasProtectedRoute;
