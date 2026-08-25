/**
 * RBAC Configuration - Role-Based Access Control
 * 
 * Defines which roles can access which routes and sections.
 * 
 * Roles:
 * - admin: Full CRUD access to all pages
 * - manager: Read-only access to all admin pages (CRUD only on Férias/Mensagens)
 * - user: Only portal pages
 * - client: (future) Read-only access to Escalas, Alertas Férias, Banco de Horas
 */

export type AppRole = 'admin' | 'manager' | 'user' | 'client';

export interface RoutePermission {
  path: string;
  allowedRoles: AppRole[];
}

// Routes that each role can ACCESS (view)
const ADMIN_AND_MANAGER: AppRole[] = ['admin', 'manager'];
const ADMIN_ONLY: AppRole[] = ['admin'];
const CLIENT_ACCESSIBLE: AppRole[] = ['admin', 'manager', 'client'];

// Route permissions for admin area
export const routePermissions: RoutePermission[] = [
  // Dashboard
  { path: '/', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/dashboard', allowedRoles: ADMIN_AND_MANAGER },

  // Cadastros
  { path: '/empresas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/postos-de-trabalho', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/configurador-escalas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/cargos', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/funcionarios', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/feriados', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/historico-salarios', allowedRoles: ADMIN_AND_MANAGER },

  // Tabelas de Apoio
  { path: '/tabelas-de-apoio', allowedRoles: ADMIN_AND_MANAGER },

  // Operacional
  { path: '/operacao', allowedRoles: ADMIN_ONLY },
  { path: '/escala-mes-ano', allowedRoles: CLIENT_ACCESSIBLE },
  { path: '/folhas-de-ponto', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/folhas-em-branco', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/controle-faltas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/apuracao-plr', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/folha-calculada', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/13-salario', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/ferias-calculadas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/gestao-ferias', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/gerenciamento-ferias', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/controle-ferias', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/mensagens', allowedRoles: ADMIN_AND_MANAGER },

  // Folha Automática
  { path: '/qr-codes', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/historico-ponto', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/folhas-ponto-automaticas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/dashboard-ponto', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/revisao-inconsistencias', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/edicao-registros-ponto', allowedRoles: ADMIN_ONLY },

  // Relatórios
  { path: '/relatorio-faltas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/relatorios', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/relatorio-evolucao', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/relatorio-plr', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/relatorio-dias-falta', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/alertas-ferias', allowedRoles: CLIENT_ACCESSIBLE },
  { path: '/dashboard-gerencial', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/banco-de-horas', allowedRoles: CLIENT_ACCESSIBLE },

  // Usuários - ADMIN ONLY
  { path: '/usuarios', allowedRoles: ADMIN_ONLY },

  // Portal Admin
  { path: '/portal-gerencial', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/config-portal', allowedRoles: ADMIN_ONLY },

  // Rondas
  { path: '/rondas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/rondas/pontos-qrcode', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/rondas/horarios', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/rondas/pausas', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/rondas/leitura', allowedRoles: ADMIN_AND_MANAGER },
  { path: '/rondas/relatorios', allowedRoles: ADMIN_AND_MANAGER },

  // Portal Gerencial sub-routes
  { path: '/portal-gerencial/funcionario', allowedRoles: ADMIN_AND_MANAGER },
];

/**
 * Check if a role can access a specific route
 */
export const canAccessRoute = (path: string, roles: AppRole[]): boolean => {
  // Portal routes are accessible to all authenticated users
  if (path.startsWith('/portal')) return true;

  // Normalizar path (remover barra final se houver e não for a raiz)
  const normalizedPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  const permission = routePermissions.find(rp => {
    if (rp.path === normalizedPath) return true;
    // Match sub-routes
    if (normalizedPath.startsWith(rp.path + '/')) return true;
    return false;
  });

  if (!permission) return false;

  return permission.allowedRoles.some(allowedRole => roles.includes(allowedRole));
};

/**
 * Check if a menu item path is accessible for given roles
 */
export const isMenuItemAccessible = (path: string, roles: AppRole[]): boolean => {
  return canAccessRoute(path, roles);
};

/**
 * Pages where manager has CRUD (not just read-only)
 */
export const MANAGER_CRUD_PAGES = ['/gestao-ferias', '/gerenciamento-ferias', '/mensagens'];

/**
 * Check if the current user can perform CRUD on this page
 */
export const canCrudOnPage = (path: string, roles: AppRole[]): boolean => {
  if (roles.includes('admin')) return true;
  if (roles.includes('manager') && MANAGER_CRUD_PAGES.some(p => path.startsWith(p))) return true;
  return false;
};
