import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ManagerAccess {
  isManager: boolean;
  isAdmin: boolean;
  isReadOnly: boolean;
  empresaIds: string[];
  loading: boolean;
  canAccessEmpresa: (empresaId: string | null | undefined) => boolean;
  filterByManagerEmpresas: <T extends { empresa_id?: string | null }>(data: T[]) => T[];
}

export const useManagerAccess = (): ManagerAccess => {
  const { user } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [empresaIds, setEmpresaIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Buscar roles do usuário
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userRoles = roles?.map(r => r.role) || [];
        const admin = userRoles.includes('admin');
        const manager = userRoles.includes('manager');

        setIsAdmin(admin);
        setIsManager(manager);

        // Se for manager, buscar empresas vinculadas
        if (manager && !admin) {
          const { data: managerEmpresas } = await supabase
            .from('manager_empresas')
            .select('empresa_id')
            .eq('user_id', user.id);

          setEmpresaIds(managerEmpresas?.map(me => me.empresa_id) || []);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [user]);

  const canAccessEmpresa = useCallback((empresaId: string | null | undefined): boolean => {
    if (isAdmin) return true;
    if (!empresaId) return false;
    return empresaIds.includes(empresaId);
  }, [isAdmin, empresaIds]);

  const filterByManagerEmpresas = useCallback(<T extends { empresa_id?: string | null }>(data: T[]): T[] => {
    if (isAdmin) return data;
    return data.filter(item => item.empresa_id && empresaIds.includes(item.empresa_id));
  }, [isAdmin, empresaIds]);

  return {
    isManager,
    isAdmin,
    isReadOnly: isManager && !isAdmin,
    empresaIds,
    loading,
    canAccessEmpresa,
    filterByManagerEmpresas,
  };
};
