import React, { useState, useRef, useEffect } from 'react'; // v2
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Briefcase, Users, Calendar, Plane, FileText, Book, Calculator, BarChart2, Settings, UserCog, Bell, LogOut, ChevronDown, FolderOpen, ClipboardList, TrendingUp, Smartphone, Clock, PieChart, QrCode, Umbrella, Lock, Shield, Coffee, MessageSquare, Sparkles } from 'lucide-react';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import BancoHorasProtectedRoute from './components/BancoHorasProtectedRoute';
import UserMenu from './components/UserMenu';
import { ThemeToggle } from './components/ThemeToggle';
import { PWAUpdatePrompt, PWAInstallPrompt } from './components/PWAUpdatePrompt';
import AssistenteCadastrosChat from './components/AssistenteCadastrosChat';

import PWARoutePreserver from './components/PWARoutePreserver';
import OfflineIndicator from './components/OfflineIndicator';
import { OperationsRoute } from './src/app/routes/OperationsRoute';

// RBAC
import { isMenuItemAccessible, type AppRole } from './utils/rbacConfig';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForceLogout from './pages/ForceLogout';
import Dashboard from './pages/Dashboard';
import MonthlyYearlySchedule from './pages/Operacional/MonthlyYearlySchedule';
import Companies from './pages/Cadastros/Companies';
import Workstations from './pages/Cadastros/Workstations';
import Positions from './pages/Cadastros/Positions';
import Employees from './pages/Cadastros/Employees';
import ScheduleRules from './pages/Cadastros/ScheduleRules';
import Holidays from './pages/Cadastros/Holidays';
import TimeSheets from './pages/Operacional/TimeSheets';
import SupportTables from './pages/Tabelas_Apoio/SupportTables';
import CalculatedPayroll from './pages/Operacional/CalculatedPayroll';
import Calculated13Salary from './pages/Operacional/Calculated13Salary';
import CalculatedVacation from './pages/Operacional/CalculatedVacation';
import Reports from './pages/Relatorios/Reports';
import VacationAlerts from './pages/Relatorios/VacationAlerts';

import RelatorioEvolucao from './pages/Relatorios/RelatorioEvolucao';
import VacationManagement from './pages/Operacional/VacationManagement';
import MensagensOperacionais from './pages/Operacional/MensagensOperacionais';
import VacationDetailsManager from './pages/Operacional/VacationDetailsManager';
import ControleFerias from './pages/Operacional/ControleFerias';
import UserManagement from './pages/Usuarios/UserManagement';
import BlankTimesheets from './pages/Operacional/BlankTimesheets';
import ControleFaltas from './pages/Operacional/ControleFaltas';
import ApuracaoPLR from './pages/Operacional/ApuracaoPLR';
import SalaryHistory from './pages/Cadastros/SalaryHistory';
import Install from './pages/Install';
import ManagerDashboard from './pages/Relatorios/ManagerDashboard';
import RelatorioDiasFalta from './pages/Relatorios/RelatorioDiasFalta';
import RelatorioPLR from './pages/Relatorios/RelatorioPLR';

import PortalLogin from './pages/PortalAdmin/PortalLogin';
import PortalGerencial from './pages/PortalAdmin/PortalGerencial';
import PortalVisibilityConfig from './pages/PortalAdmin/PortalVisibilityConfig';

// Portal do Funcionário
import PortalHome from './pages/portal/PortalHome';
import PortalHolerites from './pages/portal/PortalHolerites';
import PortalEscalas from './pages/portal/PortalEscalas';
import PortalFerias from './pages/portal/PortalFerias';
import PortalPerfil from './pages/portal/PortalPerfil';
import PortalSugestoes from './pages/portal/PortalSugestoes';
import PortalGerencialView from './pages/portal/PortalGerencialView';
import PortalGerencialHolerites from './pages/portal/PortalGerencialHolerites';
import PortalGerencialEscalas from './pages/portal/PortalGerencialEscalas';
import PortalGerencialFerias from './pages/portal/PortalGerencialFerias';
import PortalRegistroPonto from './pages/portal/PortalRegistroPonto';
import PortalBancoHoras from './pages/portal/PortalBancoHoras';

// Portal do Cliente
import ClientPortalHome from './pages/portal-cliente/ClientPortalHome';
import ClientPortalEscalas from './pages/portal-cliente/ClientPortalEscalas';
import ClientPortalAlertasFerias from './pages/portal-cliente/ClientPortalAlertasFerias';
import ClientPortalBancoHoras from './pages/portal-cliente/ClientPortalBancoHoras';

// Folha Automática (QR Code)
import QRCodeManagement from './pages/FolhaAutomatica/QRCodeManagement';
import HistoricoPontoAutomatico from './pages/FolhaAutomatica/HistoricoPontoAutomatico';
import DashboardPonto from './pages/FolhaAutomatica/DashboardPonto';
import RevisaoInconsistencias from './pages/FolhaAutomatica/RevisaoInconsistencias';
import AutomaticTimesheets from './pages/FolhaAutomatica/AutomaticTimesheets';
import AutomaticTimesheetDetail from './pages/FolhaAutomatica/AutomaticTimesheetDetail';
import BancoHoras from './pages/FolhaAutomatica/BancoHoras';
import EdicaoRegistrosPonto from './pages/FolhaAutomatica/EdicaoRegistrosPonto';

// Rondas
import RondasDashboard from './pages/Rondas/RondasDashboard';
import PontosQRCode from './pages/Rondas/config/PontosQRCode';
import HorariosRonda from './pages/Rondas/config/HorariosRonda';
import PausasRonda from './pages/Rondas/config/PausasRonda';
import LeituraQRCode from './pages/Rondas/operacao/LeituraQRCode';
import RelatorioRondas from './pages/Rondas/relatorios/RelatorioRondas';

// Ronda QR
import RondaLogin from './pages/ronda-qr/RondaLogin';
import RondaDashboard from './pages/ronda-qr/RondaDashboard';
import RondaSelecao from './pages/ronda-qr/RondaSelecao';
import RondaExecucao from './pages/ronda-qr/RondaExecucao';
import RondaMonitoramento from './pages/ronda-qr/RondaMonitoramento';
import RondaPontos from './pages/ronda-qr/RondaPontos';
import RondaRotas from './pages/ronda-qr/RondaRotas';
import RondaRelatoriosQR from './pages/ronda-qr/RondaRelatorios';
import RondaNaoConformidades from './pages/ronda-qr/RondaNaoConformidades';
import RondaAuditoria from './pages/ronda-qr/RondaAuditoria';
import RondaPerfil from './pages/ronda-qr/RondaPerfil';
import RondaEmpresas from './pages/ronda-qr/RondaEmpresas';
import RondaPostos from './pages/ronda-qr/RondaPostos';
import RondaFuncionarios from './pages/ronda-qr/RondaFuncionarios';

// Helper hook to get user roles as AppRole[]
const useUserRoles = (): AppRole[] => {
  const { isAdmin, isManager, isClient } = useAuth();
  const roles: AppRole[] = [];
  if (isAdmin) roles.push('admin');
  if (isManager) roles.push('manager');
  if (isClient) roles.push('client');
  if (!isAdmin && !isManager && !isClient) roles.push('user');
  return roles;
};

// Dropdown Menu Component (Desktop only) - with RBAC
const DropdownMenu: React.FC<{ 
  title: string; 
  icon: any; 
  items: Array<{ path: string; name: string; icon: any; section?: string }>;
}> = ({ title, icon: Icon, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const userRoles = useUserRoles();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasAccessibleItems = items.some(item => isMenuItemAccessible(item.path, userRoles));

    // Group items by section
    const sections: { label: string | null; items: typeof items }[] = [];
    for (const item of items) {
        const sec = item.section ?? null;
        const last = sections[sections.length - 1];
        if (!last || last.label !== sec) {
            sections.push({ label: sec, items: [item] });
        } else {
            last.items.push(item);
        }
    }
    
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => hasAccessibleItems && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  hasAccessibleItems 
                    ? 'hover:bg-blue-700 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
            >
                <Icon className="w-5 h-5 text-blue-300" />
                <span className="text-sm font-medium">{title}</span>
                {hasAccessibleItems ? (
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-blue-400/60" />
                )}
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-dark-card border border-gray-200 dark:border-gray-700 py-2 z-50">
                    {sections.map((sec, si) => (
                        <div key={si}>
                            {sec.label && (
                                <div className={`px-4 pt-2 pb-1 ${si > 0 ? 'border-t border-gray-100 dark:border-gray-700 mt-1' : ''}`}>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{sec.label}</span>
                                </div>
                            )}
                            {si > 0 && !sec.label && <div className="border-t border-gray-100 dark:border-gray-700 my-1" />}
                            {sec.items.map(item => {
                                const accessible = isMenuItemAccessible(item.path, userRoles);
                                return (
                                  <button
                                      key={item.path}
                                      onClick={() => { if (accessible) { navigate(item.path); setIsOpen(false); } }}
                                      disabled={!accessible}
                                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                        accessible
                                          ? 'text-gray-700 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer'
                                          : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                                      }`}
                                  >
                                      <item.icon className={`w-4 h-4 ${accessible ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`} />
                                      <span className="text-sm flex-1">{item.name}</span>
                                      {!accessible && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                  </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Menu structure
const menuStructure = {
    cadastros: [
        { path: '/empresas', name: 'Empresas', icon: Building2 },
        { path: '/postos-de-trabalho', name: 'Postos de Trabalho', icon: Briefcase },
        { path: '/configurador-escalas', name: 'Escalas', icon: Settings },
        { path: '/cargos', name: 'Cargos', icon: Briefcase },
        { path: '/funcionarios', name: 'Funcionários', icon: Users },
        { path: '/feriados', name: 'Feriados', icon: Plane },
        { path: '/historico-salarios', name: 'Histórico Salários', icon: TrendingUp },
    ],
    operacional: [
        { path: '/operacao', name: 'Central Operacional', icon: Sparkles },
        { path: '/escala-mes-ano', name: 'Escalas', icon: Calendar },
        { path: '/folhas-de-ponto', name: 'Folhas de Ponto', icon: FileText },
        { path: '/controle-faltas', name: 'Controle de Faltas', icon: ClipboardList },
        { path: '/folha-calculada', name: 'Folhas de Pagamento', icon: Calculator },
        { path: '/folhas-em-branco', name: 'Folhas em Branco', icon: FileText },
        { path: '/apuracao-plr', name: 'Apuração PLR', icon: Calculator },
        { path: '/13-salario', name: '13° Salário', icon: Calculator },
        { path: '/gestao-ferias', name: 'Gestão de Férias', icon: Calendar, section: 'Férias' },
        { path: '/gerenciamento-ferias', name: 'Gerenc. Férias', icon: Umbrella, section: 'Férias' },
        { path: '/controle-ferias', name: 'Controle Férias', icon: Umbrella, section: 'Férias' },
        { path: '/mensagens', name: 'Mensagens', icon: MessageSquare },
    ],
    folhaAutomatica: [
        { path: '/qr-codes', name: 'QR Codes Ponto', icon: QrCode },
        { path: '/edicao-registros-ponto', name: 'Edição Registros', icon: Clock },
        { path: '/historico-ponto', name: 'Histórico Ponto', icon: Clock },
        { path: '/folhas-ponto-automaticas', name: 'Folhas Automáticas', icon: FileText },
        { path: '/dashboard-ponto', name: 'Dashboard Ponto', icon: PieChart },
        { path: '/revisao-inconsistencias', name: 'Revisão Ponto', icon: Bell },
    ],
    relatorios: [
        { path: '/relatorios', name: 'Relat. Detalhado', icon: BarChart2 },
        { path: '/alertas-ferias', name: 'Alertas de Férias', icon: Bell },
        { path: '/relatorio-evolucao', name: 'Evolução de Vencimentos', icon: ClipboardList },
        { path: '/relatorio-dias-falta', name: 'Dias de Falta (DSR)', icon: ClipboardList },
        { path: '/relatorio-plr', name: 'Relatório PLR', icon: Calculator },
        { path: '/dashboard-gerencial', name: 'Dashboard Gerencial', icon: TrendingUp },
        { path: '/banco-de-horas', name: 'Banco de Horas', icon: TrendingUp },
    ],
    portal: [
        { path: '/portal-gerencial', name: 'Portal Gerencial', icon: Smartphone },
        { path: '/config-portal', name: 'Config Portal', icon: Settings },
    ],
    rondas: [
        { path: '/rondas', name: 'Dashboard', icon: Shield },
        { path: '/rondas/pontos-qrcode', name: 'Pontos de QR Code', icon: QrCode, section: 'Configurações' },
        { path: '/rondas/horarios', name: 'Horários de Ronda', icon: Clock, section: 'Configurações' },
        { path: '/rondas/pausas', name: 'Pausas (Refeições)', icon: Coffee, section: 'Configurações' },
        { path: '/rondas/leitura', name: 'Leitura de QR Code', icon: Shield, section: 'Operação' },
        { path: '/rondas/relatorios', name: 'Relatórios', icon: BarChart2, section: 'Relatórios' },
        { path: '/ronda-qr', name: 'Ronda QR (App)', icon: Shield, section: 'App Ronda' },
    ],
};

// Mobile menu section with RBAC
const MobileMenuSection: React.FC<{
    title: string;
    icon: any;
    items: Array<{ path: string; name: string; icon: any; section?: string }>;
    isExpanded: boolean;
    onToggle: () => void;
    onItemClick: () => void;
}> = ({ title, icon: Icon, items, isExpanded, onToggle, onItemClick }) => {
    const userRoles = useUserRoles();
    const hasAccessibleItems = items.some(item => isMenuItemAccessible(item.path, userRoles));

    // Group items by section
    const sections: { label: string | null; items: typeof items }[] = [];
    for (const item of items) {
        const sec = (item as any).section ?? null;
        const last = sections[sections.length - 1];
        if (!last || last.label !== sec) {
            sections.push({ label: sec, items: [item] });
        } else {
            last.items.push(item);
        }
    }

    return (
        <div className="space-y-1">
            <button
                onClick={() => hasAccessibleItems && onToggle()}
                className={`w-full flex items-center justify-between px-4 py-2 font-medium text-xs uppercase tracking-wider rounded-lg transition-colors ${
                  hasAccessibleItems
                    ? 'text-blue-200 hover:bg-blue-800 cursor-pointer'
                    : 'text-blue-400/50 cursor-not-allowed'
                }`}
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {title}
                </div>
                {hasAccessibleItems ? (
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
            </button>
            {isExpanded && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {sections.map((sec, si) => (
                        <div key={si}>
                            {sec.label && (
                                <div className={`px-8 pt-2 pb-1 ${si > 0 ? 'border-t border-blue-700/50 mt-1' : ''}`}>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400/70">{sec.label}</span>
                                </div>
                            )}
                            {si > 0 && !sec.label && <div className="border-t border-blue-700/50 my-1 mx-8" />}
                            {sec.items.map(item => {
                                const accessible = isMenuItemAccessible(item.path, userRoles);
                                if (accessible) {
                                  return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={onItemClick}
                                        className={({ isActive }) => 
                                            `flex items-center gap-3 px-8 py-2 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                                isActive ? 'bg-blue-800 shadow-md' : ''
                                            }`
                                        }
                                    >
                                        <item.icon className="w-4 h-4 text-blue-300" />
                                        <span className="text-sm">{item.name}</span>
                                    </NavLink>
                                  );
                                }
                                return (
                                  <div
                                      key={item.path}
                                      className="flex items-center gap-3 px-8 py-2 rounded-lg opacity-40 cursor-not-allowed"
                                  >
                                      <item.icon className="w-4 h-4 text-blue-500/50" />
                                      <span className="text-sm flex-1">{item.name}</span>
                                      <Lock className="w-3.5 h-3.5 text-blue-500/50" />
                                  </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MobileLogoutSection: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user, profile, isAdmin, signOut } = useAuth();
    const displayName = profile?.user_name || user?.email?.split('@')[0] || 'Usuário';

    const handleLogout = async () => {
        if (window.confirm('Deseja realmente sair?')) {
            onClose();
            await signOut();
        }
    };

    return (
        <div className="pt-4 border-t border-blue-700 space-y-2">
            <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    <p className="text-xs text-blue-300">{isAdmin ? 'Administrador' : 'Usuário'}</p>
                </div>
                <ThemeToggle compact />
            </div>
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sair</span>
            </button>
        </div>
    );
};

const TopNav = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [assistenteAberto, setAssistenteAberto] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const userRoles = useUserRoles();

    const toggleSection = (section: string) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        
        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    const isUsuariosAccessible = isMenuItemAccessible('/usuarios', userRoles);
    const isTabelasAccessible = isMenuItemAccessible('/tabelas-de-apoio', userRoles);
    
    return (
        <header className="fixed top-0 left-0 right-0 bg-[#001f3f] text-white shadow-lg z-50">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between px-6 h-16">
                
                <nav className="flex-1 flex items-center justify-center gap-2">
                    {/* Início */}
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => 
                            `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                isActive ? 'bg-blue-800 shadow-md' : ''
                            }`
                        }
                    >
                        <LayoutDashboard className="w-5 h-5 text-blue-300" />
                        <span className="text-2xl font-bold text-white">FluxPay</span>
                    </NavLink>

                    {/* Assistente IA — primeiro atalho, disponível em todas as páginas */}
                    <button
                        type="button"
                        onClick={() => setAssistenteAberto(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-purple-700 bg-gradient-to-r from-purple-600/40 to-purple-500/20 border border-purple-400/40"
                        title="Assistente IA"
                    >
                        <Sparkles className="w-5 h-5 text-purple-200" />
                        <span className="text-sm font-medium">Assistente IA</span>
                    </button>

                    <DropdownMenu title="Cadastros" icon={FolderOpen} items={menuStructure.cadastros} />

                    {/* Tabelas de Apoio */}
                    {isTabelasAccessible ? (
                      <NavLink
                          to="/tabelas-de-apoio"
                          className={({ isActive }) => 
                              `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                  isActive ? 'bg-blue-800 shadow-md' : ''
                              }`
                          }
                      >
                          <Book className="w-5 h-5 text-blue-300" />
                          <span className="text-sm font-medium">Tabelas</span>
                      </NavLink>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">
                          <Book className="w-5 h-5 text-blue-300/50" />
                          <span className="text-sm font-medium">Tabelas</span>
                          <Lock className="w-3.5 h-3.5 text-blue-400/60" />
                      </div>
                    )}

                    <DropdownMenu title="Operacional" icon={ClipboardList} items={menuStructure.operacional} />
                    <DropdownMenu title="QR&nbsp;Codes" icon={QrCode} items={menuStructure.folhaAutomatica} />
                    <DropdownMenu title="Rondas" icon={Shield} items={menuStructure.rondas} />
                    <DropdownMenu title="Relatórios" icon={TrendingUp} items={menuStructure.relatorios} />

                    {/* Usuários */}
                    {isUsuariosAccessible ? (
                      <NavLink
                          to="/usuarios"
                          className={({ isActive }) => 
                              `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                  isActive ? 'bg-blue-800 shadow-md' : ''
                              }`
                          }
                      >
                          <UserCog className="w-5 h-5 text-blue-300" />
                          <span className="text-sm font-medium">Usuários</span>
                      </NavLink>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg opacity-50 cursor-not-allowed">
                          <UserCog className="w-5 h-5 text-blue-300/50" />
                          <span className="text-sm font-medium">Usuários</span>
                          <Lock className="w-3.5 h-3.5 text-blue-400/60" />
                      </div>
                    )}

                    <DropdownMenu title="Portal" icon={Smartphone} items={menuStructure.portal} />
                </nav>
                
                {/* User Menu & Theme Toggle */}
                <div className="flex items-center gap-3">
                    <ThemeToggle compact />
                    <UserMenu />
                </div>
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between px-4 h-16">
                <div className="flex items-center">
                    <span className="text-xl font-bold text-white">FluxPay</span>
                </div>
                
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition-colors"
                >
                    <div className="flex flex-col space-y-1.5">
                        <div className={`w-6 h-[3px] bg-white rounded-full shadow-sm transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`}></div>
                        <div className={`w-6 h-[3px] bg-white rounded-full shadow-sm transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-0' : ''}`}></div>
                        <div className={`w-6 h-[3px] bg-white rounded-full shadow-sm transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`}></div>
                    </div>
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div ref={mobileMenuRef} className="lg:hidden bg-[#001f3f] border-t border-blue-700">
                    <nav className="px-4 py-4 space-y-2">
                        {/* Início */}
                        <NavLink
                            to="/"
                            end
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => 
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                    isActive ? 'bg-blue-800 shadow-md' : ''
                                }`
                            }
                        >
                            <LayoutDashboard className="w-5 h-5 text-blue-300" />
                            <span className="text-sm font-medium">Início</span>
                        </NavLink>

                        <button
                            type="button"
                            onClick={() => { setAssistenteAberto(true); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-purple-700 bg-gradient-to-r from-purple-600/40 to-purple-500/20 border border-purple-400/40"
                        >
                            <Sparkles className="w-5 h-5 text-purple-200" />
                            <span className="text-sm font-medium">Assistente IA</span>
                        </button>


                        <MobileMenuSection
                            title="Cadastros"
                            icon={FolderOpen}
                            items={menuStructure.cadastros}
                            isExpanded={expandedSection === 'cadastros'}
                            onToggle={() => toggleSection('cadastros')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Tabelas de Apoio */}
                        {isTabelasAccessible ? (
                          <NavLink
                              to="/tabelas-de-apoio"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={({ isActive }) => 
                                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                      isActive ? 'bg-blue-800 shadow-md' : ''
                                  }`
                              }
                          >
                              <Book className="w-5 h-5 text-blue-300" />
                              <span className="text-sm font-medium">Tabelas</span>
                          </NavLink>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-lg opacity-40 cursor-not-allowed">
                              <Book className="w-5 h-5 text-blue-300/50" />
                              <span className="text-sm font-medium flex-1">Tabelas</span>
                              <Lock className="w-3.5 h-3.5 text-blue-500/50" />
                          </div>
                        )}

                        <MobileMenuSection
                            title="Operacional"
                            icon={ClipboardList}
                            items={menuStructure.operacional}
                            isExpanded={expandedSection === 'operacional'}
                            onToggle={() => toggleSection('operacional')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        <MobileMenuSection
                            title="QR Codes"
                            icon={QrCode}
                            items={menuStructure.folhaAutomatica}
                            isExpanded={expandedSection === 'folhaAutomatica'}
                            onToggle={() => toggleSection('folhaAutomatica')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        <MobileMenuSection
                            title="Rondas"
                            icon={Shield}
                            items={menuStructure.rondas}
                            isExpanded={expandedSection === 'rondas'}
                            onToggle={() => toggleSection('rondas')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        <MobileMenuSection
                            title="Relatórios"
                            icon={TrendingUp}
                            items={menuStructure.relatorios}
                            isExpanded={expandedSection === 'relatorios'}
                            onToggle={() => toggleSection('relatorios')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Usuários */}
                        {isUsuariosAccessible ? (
                          <NavLink
                              to="/usuarios"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={({ isActive }) => 
                                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-blue-700 ${
                                      isActive ? 'bg-blue-800 shadow-md' : ''
                                  }`
                              }
                          >
                              <UserCog className="w-5 h-5 text-blue-300" />
                              <span className="text-sm font-medium">Usuários</span>
                          </NavLink>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-lg opacity-40 cursor-not-allowed">
                              <UserCog className="w-5 h-5 text-blue-300/50" />
                              <span className="text-sm font-medium flex-1">Usuários</span>
                              <Lock className="w-3.5 h-3.5 text-blue-500/50" />
                          </div>
                        )}

                        <MobileMenuSection
                            title="Portal"
                            icon={Smartphone}
                            items={menuStructure.portal}
                            isExpanded={expandedSection === 'portal'}
                            onToggle={() => toggleSection('portal')}
                            onItemClick={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Botões de Ação Mobile */}
                        <MobileLogoutSection onClose={() => setIsMobileMenuOpen(false)} />
                    </nav>
                </div>
            )}
            <AssistenteCadastrosChat isOpen={assistenteAberto} onClose={() => setAssistenteAberto(false)} />
        </header>
    );
};

const Footer = () => (
    <footer className="text-center p-4 text-gray-500 text-sm">
        © 2025 FluxPay | Sistema de Folha de Pagamento Automática.
    </footer>
);


const AppLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <TopNav />
            <main className="pt-20 px-4 sm:px-6 pb-6">
                <Routes>
                    {/* All admin routes use requireAdmin which now checks RBAC config */}
                    <Route path="/operacao" element={<ProtectedRoute requireAdmin={true}><OperationsRoute /></ProtectedRoute>} />
                    <Route path="/escala-mes-ano" element={<ProtectedRoute requireAdmin={true}><MonthlyYearlySchedule /></ProtectedRoute>} />
                    <Route path="/empresas" element={<ProtectedRoute requireAdmin={true}><Companies /></ProtectedRoute>} />
                    <Route path="/postos-de-trabalho" element={<ProtectedRoute requireAdmin={true}><Workstations /></ProtectedRoute>} />
                    <Route path="/cargos" element={<ProtectedRoute requireAdmin={true}><Positions /></ProtectedRoute>} />
                    <Route path="/funcionarios" element={<ProtectedRoute requireAdmin={true}><Employees /></ProtectedRoute>} />
                    <Route path="/configurador-escalas" element={<ProtectedRoute requireAdmin={true}><ScheduleRules /></ProtectedRoute>} />
                    <Route path="/feriados" element={<ProtectedRoute requireAdmin={true}><Holidays /></ProtectedRoute>} />
                    <Route path="/folhas-de-ponto" element={<ProtectedRoute requireAdmin={true}><TimeSheets /></ProtectedRoute>} />
                    <Route path="/folhas-em-branco" element={<ProtectedRoute requireAdmin={true}><BlankTimesheets /></ProtectedRoute>} />
                    <Route path="/controle-faltas" element={<ProtectedRoute requireAdmin={true}><ControleFaltas /></ProtectedRoute>} />
                    <Route path="/apuracao-plr" element={<ProtectedRoute requireAdmin={true}><ApuracaoPLR /></ProtectedRoute>} />
                    <Route path="/tabelas-de-apoio" element={<ProtectedRoute requireAdmin={true}><SupportTables /></ProtectedRoute>} />
                    <Route path="/folha-calculada" element={<ProtectedRoute requireAdmin={true}><CalculatedPayroll /></ProtectedRoute>} />
                    <Route path="/13-salario" element={<ProtectedRoute requireAdmin={true}><Calculated13Salary /></ProtectedRoute>} />
                    <Route path="/ferias-calculadas" element={<ProtectedRoute requireAdmin={true}><CalculatedVacation /></ProtectedRoute>} />
                    <Route path="/alertas-ferias" element={<ProtectedRoute requireAdmin={true}><VacationAlerts /></ProtectedRoute>} />
                    <Route path="/gestao-ferias" element={<ProtectedRoute requireAdmin={true}><VacationManagement /></ProtectedRoute>} />
                    <Route path="/mensagens" element={<ProtectedRoute requireAdmin={true}><MensagensOperacionais /></ProtectedRoute>} />
                    <Route path="/gerenciamento-ferias" element={<ProtectedRoute requireAdmin={true}><VacationDetailsManager /></ProtectedRoute>} />
                    <Route path="/controle-ferias" element={<ProtectedRoute requireAdmin={true}><ControleFerias /></ProtectedRoute>} />
                    <Route path="/relatorios" element={<ProtectedRoute requireAdmin={true}><Reports /></ProtectedRoute>} />
                    
                    <Route path="/relatorio-dias-falta" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RelatorioDiasFalta /></ProtectedRoute>} />
                    <Route path="/relatorio-plr" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RelatorioPLR /></ProtectedRoute>} />
                    <Route path="/relatorio-evolucao" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><RelatorioEvolucao /></ProtectedRoute>} />

                    <Route path="/usuarios" element={<ProtectedRoute requireAdmin={true}><UserManagement /></ProtectedRoute>} />
                    <Route path="/portal-gerencial" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PortalGerencial /></ProtectedRoute>} />
                    <Route path="/config-portal" element={<ProtectedRoute requireAdmin={true}><PortalVisibilityConfig /></ProtectedRoute>} />
                    <Route path="/historico-salarios" element={<ProtectedRoute requireAdmin={true}><SalaryHistory /></ProtectedRoute>} />
                    <Route path="/qr-codes" element={<ProtectedRoute requireAdmin={true}><QRCodeManagement /></ProtectedRoute>} />
                    <Route path="/historico-ponto" element={<ProtectedRoute requireAdmin={true}><HistoricoPontoAutomatico /></ProtectedRoute>} />
                    <Route path="/dashboard-ponto" element={<ProtectedRoute requireAdmin={true}><DashboardPonto /></ProtectedRoute>} />
                    <Route path="/revisao-inconsistencias" element={<ProtectedRoute requireAdmin={true}><RevisaoInconsistencias /></ProtectedRoute>} />
                    <Route path="/folhas-ponto-automaticas" element={<ProtectedRoute requireAdmin={true}><AutomaticTimesheets /></ProtectedRoute>} />
                    <Route path="/banco-de-horas" element={<ProtectedRoute requireAdmin={true}><BancoHoras /></ProtectedRoute>} />
                    <Route path="/edicao-registros-ponto" element={<ProtectedRoute requireAdmin={true}><EdicaoRegistrosPonto /></ProtectedRoute>} />
                    <Route path="/folha-ponto-automatica/:funcionarioId" element={<ProtectedRoute requireAdmin={true}><AutomaticTimesheetDetail /></ProtectedRoute>} />

                    {/* Rondas */}
                    <Route path="/rondas" element={<ProtectedRoute requireAdmin={true}><RondasDashboard /></ProtectedRoute>} />
                    <Route path="/rondas/pontos-qrcode" element={<ProtectedRoute requireAdmin={true}><PontosQRCode /></ProtectedRoute>} />
                    <Route path="/rondas/horarios" element={<ProtectedRoute requireAdmin={true}><HorariosRonda /></ProtectedRoute>} />
                    <Route path="/rondas/pausas" element={<ProtectedRoute requireAdmin={true}><PausasRonda /></ProtectedRoute>} />
                    <Route path="/rondas/leitura" element={<ProtectedRoute><LeituraQRCode /></ProtectedRoute>} />
                    <Route path="/rondas/relatorios" element={<ProtectedRoute requireAdmin={true}><RelatorioRondas /></ProtectedRoute>} />
                    <Route path="/dashboard-gerencial" element={<ProtectedRoute requireAdmin={true}><ManagerDashboard /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
                    <Route path="/" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
                    
                    {/* Portal Gerencial sub-routes */}
                    <Route path="/portal-gerencial/funcionario/:funcionarioId" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PortalGerencialView /></ProtectedRoute>} />
                    <Route path="/portal-gerencial/funcionario/:funcionarioId/holerites" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PortalGerencialHolerites /></ProtectedRoute>} />
                    <Route path="/portal-gerencial/funcionario/:funcionarioId/escalas" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PortalGerencialEscalas /></ProtectedRoute>} />
                    <Route path="/portal-gerencial/funcionario/:funcionarioId/ferias" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PortalGerencialFerias /></ProtectedRoute>} />
                </Routes>
                <Footer />
            </main>
        </div>
    );
};

import { carregarRegrasEscala } from './utils/regrasEscalaCache';

// Carregar regras de escala do banco uma vez no boot
carregarRegrasEscala().catch(console.error);

const App = () => {
    return (
        <ThemeProvider>
        <HashRouter>
            <AuthProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/portal/login" element={<PortalLogin />} />
                    <Route path="/ronda-qr/login" element={<RondaLogin />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/force-logout" element={<ForceLogout />} />
                    <Route path="/install" element={<Install />} />
                    
                    {/* Portal do Funcionário */}
                    <Route path="/portal" element={<ProtectedRoute><PortalHome /></ProtectedRoute>} />
                    <Route path="/portal/holerites" element={<ProtectedRoute><PortalHolerites /></ProtectedRoute>} />
                    <Route path="/portal/escalas" element={<ProtectedRoute><PortalEscalas /></ProtectedRoute>} />
                    <Route path="/portal/ferias" element={<ProtectedRoute><PortalFerias /></ProtectedRoute>} />
                    <Route path="/portal/perfil" element={<ProtectedRoute><PortalPerfil /></ProtectedRoute>} />
                    <Route path="/portal/sugestoes" element={<ProtectedRoute><PortalSugestoes /></ProtectedRoute>} />
                    <Route path="/portal/registro-ponto" element={<ProtectedRoute><PortalRegistroPonto /></ProtectedRoute>} />
                    <Route path="/portal/banco-horas" element={<ProtectedRoute><BancoHorasProtectedRoute><PortalBancoHoras /></BancoHorasProtectedRoute></ProtectedRoute>} />
                    
                    {/* Portal do Cliente */}
                    <Route path="/portal-cliente" element={<ProtectedRoute><ClientPortalHome /></ProtectedRoute>} />
                    <Route path="/portal-cliente/escalas" element={<ProtectedRoute><ClientPortalEscalas /></ProtectedRoute>} />
                    <Route path="/portal-cliente/alertas-ferias" element={<ProtectedRoute><ClientPortalAlertasFerias /></ProtectedRoute>} />
                    <Route path="/portal-cliente/banco-horas" element={<ProtectedRoute><ClientPortalBancoHoras /></ProtectedRoute>} />
                    
                    {/* Ronda QR */}
                    <Route path="/ronda-qr" element={<ProtectedRoute><RondaDashboard /></ProtectedRoute>} />
                    <Route path="/ronda-qr/selecao" element={<ProtectedRoute><RondaSelecao /></ProtectedRoute>} />
                    <Route path="/ronda-qr/execucao" element={<ProtectedRoute><RondaExecucao /></ProtectedRoute>} />
                    <Route path="/ronda-qr/monitoramento" element={<ProtectedRoute><RondaMonitoramento /></ProtectedRoute>} />
                    <Route path="/ronda-qr/pontos" element={<ProtectedRoute><RondaPontos /></ProtectedRoute>} />
                    <Route path="/ronda-qr/rotas" element={<ProtectedRoute><RondaRotas /></ProtectedRoute>} />
                    <Route path="/ronda-qr/relatorios" element={<ProtectedRoute><RondaRelatoriosQR /></ProtectedRoute>} />
                    <Route path="/ronda-qr/nao-conformidades" element={<ProtectedRoute><RondaNaoConformidades /></ProtectedRoute>} />
                    <Route path="/ronda-qr/auditoria" element={<ProtectedRoute><RondaAuditoria /></ProtectedRoute>} />
                    <Route path="/ronda-qr/perfil" element={<ProtectedRoute><RondaPerfil /></ProtectedRoute>} />
                    <Route path="/ronda-qr/empresas" element={<ProtectedRoute><RondaEmpresas /></ProtectedRoute>} />
                    <Route path="/ronda-qr/postos" element={<ProtectedRoute><RondaPostos /></ProtectedRoute>} />
                    <Route path="/ronda-qr/funcionarios" element={<ProtectedRoute><RondaFuncionarios /></ProtectedRoute>} />
                    
                    {/* Admin routes */}
                    <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
                </Routes>
                
                <PWARoutePreserver />
                <PWAUpdatePrompt />
                <PWAInstallPrompt />
                <OfflineIndicator />
            </AuthProvider>
        </HashRouter>
        </ThemeProvider>
    );
};

export default App;
