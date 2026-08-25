import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, Calendar, Umbrella, User, Menu, X, LogOut, Home, MessageSquarePlus, Sparkles, QrCode, Clock, Shield } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useEmployeePortal } from "../../hooks/useEmployeePortal";
import { ThemeToggle } from "../ThemeToggle";

interface PortalLayoutProps {
  children: React.ReactNode;
  employeeName?: string;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children, employeeName }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { funcionario } = useEmployeePortal();

  // Fechar sidebar ao navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevenir scroll do body quando sidebar está aberta no mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const allMenuItems = [
    { path: "/portal", icon: Home, label: "Início", color: "text-portal-primary" },
    { path: "/portal/registro-ponto", icon: QrCode, label: "Registro Ponto", color: "text-green-500" },
    { path: "/portal/banco-horas", icon: Clock, label: "Banco de Horas", color: "text-purple-500", requiresBancoHoras: true },
    { path: "/portal/holerites", icon: FileText, label: "Holerites", color: "text-portal-primary" },
    { path: "/portal/escalas", icon: Calendar, label: "Escalas", color: "text-portal-secondary" },
    { path: "/portal/ferias", icon: Umbrella, label: "Férias", color: "text-portal-accent" },
    { path: "/portal/sugestoes", icon: MessageSquarePlus, label: "Mensagens", color: "text-portal-purple" },
    { path: "/ronda-qr", icon: Shield, label: "Ronda QR", color: "text-emerald-500", requiresRonda: true },
    { path: "/portal/perfil", icon: User, label: "Meu Perfil", color: "text-muted-foreground" },
  ];

  // Filtrar itens do menu baseado em banco_horas_ativo e ronda
  const menuItems = allMenuItems.filter(item => {
    if (item.requiresBancoHoras) {
      return funcionario?.banco_horas_ativo === true;
    }
    if (item.requiresRonda) {
      return funcionario?.ronda === true;
    }
    return true;
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile header - fixo no topo com gradiente moderno */}
      <header className="lg:hidden portal-header-gradient text-white fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-40 shadow-portal">
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 active:scale-95"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <h1 className="font-bold text-base">Portal do Funcionário</h1>
        </div>
        <ThemeToggle compact className="text-white hover:bg-white/10" />
      </header>

      {/* Mobile sidebar overlay com blur */}
      {sidebarOpen && (
        <button 
          className="lg:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-md transition-opacity duration-300 border-0 p-0 cursor-default" 
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      {/* Sidebar com glass effect e dark mode */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[300px] max-w-[85vw] 
          bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl 
          border-r border-white/20 dark:border-gray-700/50 z-[60] 
          shadow-2xl dark:shadow-dark-card
          transform transition-all duration-300 ease-out
          lg:translate-x-0 lg:w-72 lg:shadow-card
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo com gradiente */}
          <div className="h-16 lg:h-20 flex items-center justify-between px-5 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 bg-gradient-to-r from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/FluxPay_logo_p.png" alt="FluxPay" className="w-9 h-9 lg:w-10 lg:h-10" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
              <div>
                <span className="font-bold text-lg text-gray-900 dark:text-white block leading-tight">FluxPay</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Portal do Funcionário</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Employee info com design moderno */}
          {employeeName && (
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl portal-header-gradient flex items-center justify-center text-white font-bold shadow-portal">
                  {employeeName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bem-vindo(a)</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{employeeName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation com animações */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-xl
                      transition-all duration-300 text-sm font-medium
                      animate-slide-in-left
                      ${
                        isActive
                          ? "portal-header-gradient text-white shadow-portal"
                          : "text-gray-600 dark:text-gray-300 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-gray-900 dark:hover:text-white hover:translate-x-1"
                      }
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? '' : item.color}`} />
                    </div>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Theme toggle & Logout */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <span className="text-sm text-gray-600 dark:text-gray-300">Tema</span>
              <ThemeToggle compact />
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 text-sm font-medium group"
            >
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <LogOut className="w-4 h-4 flex-shrink-0" />
              </div>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content com padding ajustado */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen overflow-x-hidden">
        <div className="pt-4 pr-4 pb-4 pl-2 sm:pt-6 sm:pr-6 sm:pb-6 sm:pl-3 md:pt-8 md:pr-8 md:pb-8 md:pl-4 lg:pt-6 lg:pr-6 lg:pb-6 lg:pl-3 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default PortalLayout;