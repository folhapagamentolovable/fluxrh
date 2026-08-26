import { Bell, ChevronDown, Command, Search } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { navigation } from "@/app/navigation";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">F</span><span>Flux<strong>RH</strong></span></div>
        <div className="workspace-picker">
          <span className="company-avatar">GF</span>
          <span><small>Organização</small><strong>Grupo Flux</strong></span>
          <ChevronDown size={16} />
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navigation.map(({ label, path, icon: Icon, ...item }) => (
            <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>{"count" in item && <span className="nav-count">{item.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="automation-score"><div><span>Automação do RH</span><strong>91,4%</strong></div><div className="mini-progress"><i style={{ width: "91.4%" }} /></div><small>+3,2% neste mês</small></div>
          <div className="profile"><span className="profile-avatar">MA</span><span><strong>Marina Alves</strong><small>Administradora</small></span><ChevronDown size={16} /></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="command-search"><Search size={18} /><span>Buscar pessoas, tarefas ou documentos</span><kbd><Command size={12} /> K</kbd></button>
          <div className="top-actions"><span className="live-pill"><i /> Operação ativa</span><button className="icon-button" aria-label="Notificações"><Bell size={19} /><i /></button></div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
