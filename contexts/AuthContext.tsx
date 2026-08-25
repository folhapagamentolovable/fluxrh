// AuthContext - Gerenciamento de autenticação
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_name: string | null;
  email: string | null;
}

type AppRole = 'admin' | 'user' | 'manager' | 'client';

interface UserRole {
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminOrManager: boolean;
  isManager: boolean;
  isClient: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: any }>;
  signUp: (email: string, password: string, userName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar perfil e roles do usuário
  const loadUserData = async (userId: string) => {
    try {
      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, user_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      } else {
        // Fallback: criar profile básico a partir do user
        const currentUser = (await supabase.auth.getUser()).data.user;
        setProfile({ 
          id: userId, 
          user_name: currentUser?.user_metadata?.user_name || null, 
          email: currentUser?.email || null 
        });
      }

      // Buscar roles do banco
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        setRoles([{ role: 'user' }]); // Default: user
      } else if (rolesData && rolesData.length > 0) {
        setRoles(rolesData.map(r => ({ role: r.role as AppRole })));
      } else {
        setRoles([{ role: 'user' }]); // Default se não tiver role
      }
    } catch (error) {
      setProfile({ id: userId, user_name: null, email: null });
      setRoles([{ role: 'user' }]);
    }
  };

  // Verificar sessão ao montar
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        // Tratar erros de token de forma silenciosa
        if (error) {
          // Não mostrar erro para problemas de refresh token - é normal em alguns casos
          if (error.message?.includes('refresh_token_not_found')) {
            // Limpar sessão local se o refresh token não for encontrado
            await supabase.auth.signOut();
          }
          if (mounted) setLoading(false);
          return;
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Aguardar o carregamento completo dos dados do usuário
          await loadUserData(currentSession.user.id);
        }
        
        // Só marcar como carregado DEPOIS de carregar os dados
        if (mounted) setLoading(false);
      } catch (error) {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      // Tratar eventos de erro de forma silenciosa
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        return;
      }
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Carregar dados em background sem bloquear
        loadUserData(newSession.user.id).finally(() => {
          setLoading(false);
        });
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Tratar erros específicos de autenticação
      if (error) {
        // Não mostrar erros técnicos de token para o usuário
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('AuthApiError')) {
          // Tentar limpar e refazer login
          await supabase.auth.signOut();
          return { data: null, error: null }; // Permitir que o login continue
        }
        
        // Para outros erros, mostrar mensagem amigável
        const friendlyMessage = error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message;
          
        return { data: null, error: { ...error, message: friendlyMessage } };
      }
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: 'Erro inesperado durante o login. Tente novamente.' } };
    }
  };

  // Cadastro (desabilitado para usuários comuns - apenas admin pode criar)
  const signUp = async (email: string, password: string, userName: string) => {
    return { error: { message: 'Cadastro desabilitado. Contate o administrador.' } };
  };

  // Logout
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
    setSession(null);
  };

  // Verificar se tem role específica
  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isClient = hasRole('client');
  const isAdminOrManager = isAdmin || isManager;

  const value = useMemo(() => ({
    user,
    profile,
    roles,
    session,
    loading,
    isAdmin,
    isManager,
    isClient,
    isAdminOrManager,
    signIn,
    signUp,
    signOut,
    hasRole,
  }), [user, profile, roles, session, loading, isAdmin, isManager, isClient, isAdminOrManager]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
