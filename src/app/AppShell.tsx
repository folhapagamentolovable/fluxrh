import { useState, type ReactNode } from 'react';
import { Bell, ChevronLeft, Menu, Search, ShieldCheck, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { productNavigation, productProfile } from './navigation';

const Navigation = ({ onNavigate }: { onNavigate?: () => void }) => (
  <nav className="space-y-1" aria-label="Navegação principal do FluxPay2">
    {productNavigation.map(({ label, path, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={path === '/operacao'}
        onClick={onNavigate}
        className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a href="#fluxpay-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
        Ir para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">F</div>
          <div>
            <p className="text-lg font-bold tracking-tight">FluxPay<span className="text-blue-600">2</span></p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">RH operacional</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5"><Navigation /></div>
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Operação protegida
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-emerald-700">Regras validam cada ação autônoma.</p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-[min(86vw,320px)] bg-white p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-bold">FluxPay<span className="text-blue-600">2</span></p>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <Navigation onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <ChevronLeft className="h-4 w-4 text-slate-300" aria-hidden="true" />
            <span className="truncate text-sm text-slate-500">Grupo Horizonte</span>
            <span className="text-slate-300">/</span>
            <strong className="text-sm">Operação de RH</strong>
          </div>
          <label className="relative ml-auto hidden w-64 xl:block">
            <span className="sr-only">Buscar pessoas e processos</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Buscar no FluxPay2" />
          </label>
          <button type="button" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="3 notificações"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">3</span></button>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{productProfile.initials}</span>
            <div className="hidden sm:block"><p className="text-xs font-semibold">{productProfile.name}</p><p className="text-[11px] text-slate-500">{productProfile.role}</p></div>
          </div>
        </header>
        <main id="fluxpay-main" className="p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
};
