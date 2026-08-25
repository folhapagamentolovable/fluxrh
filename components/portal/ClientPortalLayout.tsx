import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Calendar, Bell, Clock, User, Menu, X, LogOut, Home, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { ThemeToggle } from "../ThemeToggle";

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  clientName?: string;
}

const ClientPortalLayout: React.FC<ClientPortalLayoutProps> = ({ children, clientName }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const menuItems = [
    { path: "/portal-cliente", icon: Home, label: "Início", color: "text-blue-500" },
    { path: "/portal-cliente/escalas", icon: Calendar, label: "Escalas", color: "text-teal-500" },
    { path: "/portal-cliente/alertas-ferias", icon: Bell, label: "Alertas de Férias", color: "text-amber-500" },
    { path: "/portal-cliente/banco-horas", icon: Clock, label: "Banco de Horas", color: "text-purple-500" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile header */}
      <header className="lg:hidden bg-gradient-to-r from-blue-700 to-teal-600 text-white fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-40 shadow-lg">
        <button onClick={() => setSidebarOpen(true)} className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 active:scale-95" aria-label="Abrir menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <h1 className="font-bold text-base">Portal do Cliente</h1>
        </div>
        <ThemeToggle compact className="text-white hover:bg-white/10" />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button className="lg:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-md transition-opacity duration-300 border-0 p-0 cursor-default" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/50 z-[60] shadow-2xl transform transition-all duration-300 ease-out lg:translate-x-0 lg:w-72 lg:shadow-lg ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 lg:h-20 flex items-center justify-between px-5 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 bg-gradient-to-r from-blue-500/5 to-teal-500/5 dark:from-blue-500/10 dark:to-teal-500/10">
            <div className="flex items-center gap-3">
              <img src="/FluxPay_logo_p.png" alt="FluxPay" className="w-9 h-9 lg:w-10 lg:h-10" />
              <div>
                <span className="font-bold text-lg text-gray-900 dark:text-white block leading-tight">FluxPay</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Portal do Cliente</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors" aria-label="Fechar menu">
              <X className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Client info */}
          {clientName && (
            <div className="px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-500/5 to-transparent dark:from-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-700 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bem-vindo(a)</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{clientName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} style={{ animationDelay: `${index * 50}ms` }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium ${
                      isActive
                        ? "bg-gradient-to-r from-blue-700 to-teal-600 text-white shadow-lg"
                        : "text-gray-600 dark:text-gray-300 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:text-gray-900 dark:hover:text-white hover:translate-x-1"
                    }`}>
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? '' : item.color}`} />
                    </div>
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <span className="text-sm text-gray-600 dark:text-gray-300">Tema</span>
              <ThemeToggle compact />
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 text-sm font-medium group">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <LogOut className="w-4 h-4 flex-shrink-0" />
              </div>
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen overflow-x-hidden">
        <div className="pt-4 pr-4 pb-4 pl-2 sm:pt-6 sm:pr-6 sm:pb-6 sm:pl-3 md:pt-8 md:pr-8 md:pb-8 md:pl-4 lg:pt-6 lg:pr-6 lg:pb-6 lg:pl-3 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default ClientPortalLayout;
