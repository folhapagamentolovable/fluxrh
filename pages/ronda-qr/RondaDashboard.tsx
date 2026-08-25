import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Play, MapPin, BarChart3, Users, Clock,
  ArrowRight, Activity, QrCode, Fingerprint, Settings,
  FileText, Eye, Building2, Coffee, BellRing
} from 'lucide-react';
import RondaLayout from './components/RondaLayout';
import Card from '../../components/ui/Card';
import { gerarCiclosTurno, getCicloAtual, formatarHora, getPausaAtual, getPausaProxima, PAUSAS_PADRAO, resolverDataTurno } from './utils/rondaUtils';

export default function RondaDashboard() {
  const [horaAtual, setHoraAtual] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Resolve effective shift date using the same current time reference
  const dataTurno = resolverDataTurno(horaAtual);
  const cicloAtual = getCicloAtual(dataTurno, horaAtual);
  const ciclos = gerarCiclosTurno(dataTurno);
  const pausaAtual = getPausaAtual(horaAtual, dataTurno);
  const pausaProxima = getPausaProxima(horaAtual, dataTurno, 5);

  return (
    <RondaLayout title="Ronda QR" subtitle="Controle de rondas patrimoniais">
      <div className="space-y-6">

        {/* Pause Approaching Alert */}
        {pausaProxima && !pausaAtual && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/30 animate-pulse border-2 border-amber-300">
            <div className="flex items-center gap-3 mb-2">
              <BellRing className="w-10 h-10 flex-shrink-0 animate-bounce" />
              <p className="text-2xl sm:text-3xl font-black">⏰ ATENÇÃO!</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold leading-snug">
              Em <span className="text-3xl sm:text-4xl underline decoration-4">{pausaProxima.minutosRestantes} min</span> inicia o intervalo de refeição.
            </p>
            <p className="text-lg sm:text-xl font-semibold mt-2 opacity-90">🍽️ {pausaProxima.pausa.descricao}</p>
            <p className="text-base sm:text-lg font-medium mt-3 bg-white/20 rounded-xl p-3">
              Durante o intervalo, <strong>NÃO faça rondas</strong>.
            </p>
          </div>
        )}

        {/* Active Pause Banner */}
        {pausaAtual && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 text-white shadow-2xl shadow-amber-500/40 border-2 border-yellow-300">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Coffee className="w-12 h-12" />
              <p className="text-3xl sm:text-4xl font-black text-center">HORÁRIO DE REFEIÇÃO</p>
            </div>
            <p className="text-center text-2xl sm:text-3xl font-bold">🍽️ {pausaAtual.pausa.descricao}</p>
            <p className="text-center text-xl sm:text-2xl font-semibold bg-white/20 rounded-xl py-3 px-4 mt-3">
              ⛔ Rondas suspensas até <strong className="text-2xl">{pausaAtual.pausa.fim}</strong>
            </p>
          </div>
        )}

        {/* Pause schedule summary */}
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Intervalos de Refeição</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {PAUSAS_PADRAO.map((p, i) => (
              <span key={i} className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm font-semibold">
                🍽️ {p.inicio} — {p.fim}
              </span>
            ))}
          </div>
        </div>

        {/* Card Destacado - Iniciar Ronda */}
        <Link to="/ronda-qr/execucao" className="block animate-fade-in-up">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-5 sm:p-6 shadow-xl group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>

            <div className="relative flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-300 rounded-full border-2 border-white animate-pulse"></div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Fingerprint className="w-4 h-4 text-white/70" />
                  <span className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider">Operação</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  Iniciar Ronda
                </h2>
                <p className="text-sm sm:text-base text-white/80">
                  {cicloAtual
                    ? `Ciclo ${cicloAtual.numero} — ${cicloAtual.horaInicio}`
                    : 'Fora do horário de ronda (19h–06h)'}
                </p>
              </div>

              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/30 transition-all duration-300 group-hover:translate-x-1">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Link>

        {/* Ciclo Atual Info */}
        <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Status do Turno</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {cicloAtual ? `Ciclo ${cicloAtual.numero} Ativo` : 'Sem Ciclo Ativo'} 🛡️
          </h1>
          <p className="text-muted-foreground mt-1">
            {cicloAtual
              ? `Início: ${formatarHora(cicloAtual.horaInicioDate)} — Término: ${formatarHora(cicloAtual.horaFimDate)}`
              : 'Aguardando horário de ronda (19:00 às 06:00)'}
          </p>
        </div>

        {/* KPI Cards - 2x2 grandes para fácil toque */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5 border-0 shadow-card animate-fade-in-up dark:bg-slate-800" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Rondas Hoje</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">0</p>
                <p className="text-xs text-muted-foreground mt-0.5">ciclos previstos: {ciclos.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-0 shadow-card animate-fade-in-up dark:bg-slate-800" style={{ animationDelay: '150ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Concluídas</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">0</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">100% conformidade</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-0 shadow-card animate-fade-in-up dark:bg-slate-800" style={{ animationDelay: '200ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Atrasadas</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">0</p>
                <p className="text-xs text-muted-foreground mt-0.5">nenhum atraso</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-0 shadow-card animate-fade-in-up dark:bg-slate-800" style={{ animationDelay: '250ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Funcionários</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">0</p>
                <p className="text-xs text-muted-foreground mt-0.5">em serviço</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Acesso Rápido - cards grandes estilo PortalHome */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link to="/ronda-qr/monitoramento" className="block animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-blue-500/5 dark:from-slate-800 dark:to-blue-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Monitoramento
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Rondas em tempo real
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/ronda-qr/relatorios" className="block animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-emerald-500/5 dark:from-slate-800 dark:to-emerald-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Relatórios
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Conformidade e histórico
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/ronda-qr/pontos" className="block animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-amber-500/5 dark:from-slate-800 dark:to-amber-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Pontos / QR Codes
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Cadastrar e imprimir
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/ronda-qr/rotas" className="block animate-fade-in-up" style={{ animationDelay: '450ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-purple-500/5 dark:from-slate-800 dark:to-purple-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Rotas de Ronda
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Configurar sequência
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/ronda-qr/funcionarios" className="block animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-teal-500/5 dark:from-slate-800 dark:to-teal-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      Funcionários
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Equipe vinculada
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/ronda-qr/auditoria" className="block animate-fade-in-up" style={{ animationDelay: '550ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card cursor-pointer group h-full bg-gradient-to-br from-white to-red-500/5 dark:from-slate-800 dark:to-red-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      Auditoria
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Logs e registros
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

          </div>
        </div>

        {/* Ciclos do Turno */}
        <Card className="p-4 sm:p-5 border-0 shadow-card bg-gradient-to-br from-muted/30 to-muted/50 dark:from-slate-800 dark:to-slate-800/80 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Ciclos do Turno Noturno
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ciclos.map((ciclo) => {
              const isAtual = cicloAtual?.numero === ciclo.numero;
              const isPast = new Date() > ciclo.horaFimDate;
              return (
                <div
                  key={ciclo.numero}
                  className={`rounded-xl p-3 text-center transition-all duration-200 ${
                    isAtual
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 shadow-md'
                      : isPast
                        ? 'bg-background/50 dark:bg-slate-700/30 opacity-50'
                        : 'bg-background/50 dark:bg-slate-700/50'
                  }`}
                >
                  <p className={`text-lg font-bold ${isAtual ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                    {ciclo.horaInicio}
                  </p>
                  <p className="text-xs text-muted-foreground">Ciclo {ciclo.numero}</p>
                  {isAtual && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full animate-pulse">
                      ATIVO
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </RondaLayout>
  );
}
