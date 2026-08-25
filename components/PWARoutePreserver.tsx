import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Componente que preserva a rota do usuário após uma atualização do PWA.
 * Verifica se há uma rota salva no sessionStorage e redireciona para ela.
 */
export const PWARoutePreserver: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedRoute = sessionStorage.getItem('pwa-redirect-after-update');
    
    if (savedRoute) {
      // Limpar o storage para não redirecionar novamente
      sessionStorage.removeItem('pwa-redirect-after-update');
      
      // Extrair o path do hash (ex: #/portal/holerites -> /portal/holerites)
      const routePath = savedRoute.replace('#', '');
      
      
      // Só redirecionar se a rota atual for diferente da salva
      if (location.pathname !== routePath && routePath !== '/') {
        // Pequeno delay para garantir que a autenticação foi restaurada
        setTimeout(() => {
          navigate(routePath, { replace: true });
        }, 100);
      }
    }
  }, [navigate, location.pathname]);

  return null;
};

export default PWARoutePreserver;
