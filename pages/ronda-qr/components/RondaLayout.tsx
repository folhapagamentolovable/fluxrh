import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ThemeToggle } from '../../../components/ThemeToggle';
import {
  LayoutDashboard,
  Shield,
  Building2,
  MapPin,
  Users,
  QrCode,
  Route,
  Play,
  Monitor,
  BarChart2,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface NavItem {
  path: string;
  name: string;
  icon: React.ElementType;
  section?: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/ronda-qr', name: 'Dashboard', icon: LayoutDashboard },
  { path: '/ronda-qr/selecao', name: 'Seleção', icon: Users, section: 'Operação' },
  { path: '/ronda-qr/execucao', name: 'Executar Ronda', icon: Play, section: 'Operação' },
  { path: '/ronda-qr/monitoramento', name: 'Monitoramento', icon: Monitor, section: 'Operação' },
  { path: '/ronda-qr/empresas', name: 'Empresas', icon: Building2, section: 'Cadastros', roles: ['admin', 'manager'] },
  { path: '/ronda-qr/postos', name: 'Postos', icon: MapPin, section: 'Cadastros', roles: ['admin', 'manager'] },
  { path: '/ronda-qr/funcionarios', name: 'Funcionários', icon: Users, section: 'Cadastros', roles: ['admin', 'manager'] },
  { path: '/ronda-qr/pontos', name: 'Pontos QR', icon: QrCode, section: 'Cadastros', roles: ['admin', 'manager'] },
  { path: '/ronda-qr/rotas', name: 'Rotas', icon: Route, section: 'Cadastros', roles: ['admin', 'manager'] },
  { path: '/ronda-qr/relatorios', name: 'Relatórios', icon: BarChart2, section: 'Relatórios' },
  { path: '/ronda-qr/nao-conformidades', name: 'Não Conformidades', icon: AlertTriangle, section: 'Relatórios' },
  { path: '/ronda-qr/auditoria', name: 'Auditoria', icon: FileText, section: 'Relatórios', roles: ['admin'] },
  { path: '/ronda-qr/perfil', name: 'Perfil', icon: User, section: 'Conta' },
];

interface RondaLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function RondaLayout({ children, title, subtitle }: RondaLayoutProps) {
  const { user, profile, isAdmin, isManager, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = profile?.user_name || user?.email?.split('@')[0] || 'Usuário';
  
  const userRoles: string[] = [];
  if (isAdmin) userRoles.push('admin');
  if (isManager) userRoles.push('manager');
  if (!isAdmin && !isManager) userRoles.push('user');

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(r => userRoles.includes(r));
  });

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair?')) {
      await signOut();
      navigate('/ronda-qr/login');
    }
  };

  // Group by section
  const sections: { label: string | null; items: NavItem[] }[] = [];
  for (const item of filteredItems) {
    const sec = item.section ?? null;
    const last = sections[sections.length - 1];
    if (!last || last.label !== sec) {
      sections.push({ label: sec, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Ronda QR</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Controle Patrimonial</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {sections.map((sec, si) => (
          <div key={si}>
            {sec.label && (
              <div className={`px-3 pt-4 pb-1 ${si > 0 ? '' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {sec.label}
                </span>
              </div>
            )}
            {sec.items.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:translate-x-0.5'
                    }`}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  <span>{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-emerald-500" />}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isAdmin ? 'Administrador' : isManager ? 'Gerente' : 'Operador'}</p>
          </div>
          <ThemeToggle compact />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" />
              <span className="font-bold text-slate-900 dark:text-white">Ronda QR</span>
            </div>
            <ThemeToggle compact />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
