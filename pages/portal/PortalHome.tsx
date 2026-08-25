import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Umbrella, AlertCircle, Clock, DollarSign, MessageSquarePlus, TrendingUp, ArrowRight, QrCode, Fingerprint, Shield } from 'lucide-react';
import PortalLayout from '../../components/portal/PortalLayout';
import { useEmployeePortal } from '../../hooks/useEmployeePortal';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { useBroadcastMessages } from '../../hooks/useBroadcastMessages';
import Card from '../../components/ui/Card';
import UnreadMessagesAlert from '../../components/portal/UnreadMessagesAlert';
import BroadcastMessageAlert from '../../components/portal/BroadcastMessageAlert';
import { supabase } from '../../lib/supabase';
import { normalizarFolhaCalculada } from '../../utils/normalizarFolhaCalculada';

type CardMode = 'ponto' | 'ronda';


const PortalHome: React.FC = () => {
  const { funcionario, loading, error, fetchHolerites, fetchEscalas, fetchFerias } = useEmployeePortal();
  const { unreadMessages, markAsRead, markAllAsRead } = useUnreadMessages(funcionario?.id || null);
  const { unreadBroadcasts, markAsRead: markBroadcastAsRead, markAllAsRead: markAllBroadcastsAsRead } = useBroadcastMessages(funcionario?.id || null);
  const [stats, setStats] = useState({
    ultimoHolerite: null as any,
    proximaEscala: null as any,
    feriasPendentes: 0,
    diasAteFerias: null as number | null
  });
  const [cardMode, setCardMode] = useState<CardMode>('ponto');

  // Determine card mode for ronda employees
  useEffect(() => {
    const checkRondaStatus = async () => {
      if (!funcionario || !funcionario.ronda) {
        setCardMode('ponto');
        return;
      }

      const hoje = new Date().toISOString().split('T')[0];
      const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const horaAtual = new Date().getHours();

      // Check if entrada was registered today (or yesterday for night shifts)
      const { data: registros } = await supabase
        .from('folha_ponto_automatica')
        .select('id, primeiro_registro, quarto_registro, status, data_registro')
        .eq('funcionario_id', funcionario.id)
        .in('data_registro', [hoje, ontem])
        .order('data_registro', { ascending: false });

      const regHoje = registros?.find(r => r.data_registro === hoje);
      const regOntemAberto = registros?.find(r => r.data_registro === ontem && r.status === 'aberto');
      const registroAtivo = regHoje || (horaAtual < 12 ? regOntemAberto : null);

      if (!registroAtivo || !registroAtivo.primeiro_registro) {
        // No entrada yet → show ponto card
        setCardMode('ponto');
        return;
      }

      if (registroAtivo.quarto_registro || registroAtivo.status === 'finalizado') {
        // Already has saída → show ponto (day done)
        setCardMode('ponto');
        return;
      }

      // Entrada done, no saída yet → check if last ronda is completed
      // (sistema unificado: rq_execucoes / rq_leituras)
      const { data: sessoes } = await supabase
        .from('rq_execucoes')
        .select('id, status')
        .eq('funcionario_id', funcionario.id)
        .gte('iniciada_em', hoje + 'T00:00:00')
        .eq('status', 'concluida');

      // Check if there are readings after 04:00 (last rounds)
      const { data: leiturasUltimas } = await supabase
        .from('rq_leituras')
        .select('id, horario_leitura')
        .eq('funcionario_id', funcionario.id)
        .gte('horario_leitura', hoje + 'T04:00:00')
        .limit(1);

      const ultimaRondaConcluida = (sessoes && sessoes.length > 0) && 
        (leiturasUltimas && leiturasUltimas.length > 0);

      if (ultimaRondaConcluida) {
        // Last ronda completed → show ponto for saída
        setCardMode('ponto');
      } else {
        // Entrada done, ronda not yet completed → show ronda card
        setCardMode('ronda');
      }
    };

    checkRondaStatus();
    // Re-check every 60 seconds
    const interval = setInterval(checkRondaStatus, 60000);
    return () => clearInterval(interval);
  }, [funcionario]);

  useEffect(() => {
    const loadStats = async () => {
      if (!funcionario) return;

      const [holerites, escalas, ferias] = await Promise.all([
        fetchHolerites(),
        fetchEscalas(),
        fetchFerias()
      ]);

      const ultimoHolerite = holerites[0] ? normalizarFolhaCalculada(holerites[0]) : null;
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      const proximaEscala = escalas.find(e => 
        (e.ano === anoAtual && e.mes >= mesAtual) || e.ano > anoAtual
      ) || escalas[0];
      const feriasPendentes = ferias.filter(f => f.status === 'pendente').length;
      const proximasFerias = ferias.find(f => f.data_inicio_gozo && new Date(f.data_inicio_gozo) > hoje);
      const diasAteFerias = proximasFerias?.data_inicio_gozo 
        ? Math.ceil((new Date(proximasFerias.data_inicio_gozo).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      setStats({ ultimoHolerite, proximaEscala, feriasPendentes, diasAteFerias });
    };

    loadStats();
  }, [funcionario]);

  const formatMesAno = (mes: number, ano: number) => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[mes - 1]}/${ano}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !funcionario) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4 animate-scale-in">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Acesso não disponível
          </h2>
          <p className="text-muted-foreground max-w-md">
            {error || 'Seu usuário ainda não está vinculado a um funcionário. Entre em contato com o administrador.'}
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout employeeName={funcionario.nome_completo}>
      <div className="space-y-6">
        {/* Alerta de Mensagens Broadcast (Prioridade) */}
        {unreadBroadcasts.length > 0 && (
          <BroadcastMessageAlert
            messages={unreadBroadcasts}
            onMarkAsRead={markBroadcastAsRead}
            onMarkAllAsRead={markAllBroadcastsAsRead}
          />
        )}

        {/* Alerta de Mensagens Não Lidas (Sugestões) */}
        {unreadMessages.length > 0 && (
          <UnreadMessagesAlert
            messages={unreadMessages}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        )}
        
        {/* Cards de Ação - Registro de Ponto + Ronda (se aplicável) */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Registro de Ponto - sempre visível */}
          <Link to="/portal/registro-ponto" className="block animate-fade-in-up">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-portal-purple p-5 sm:p-6 shadow-xl group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>

              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <QrCode className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Fingerprint className="w-4 h-4 text-white/70" />
                    <span className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider">Registro Diário</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    Registrar Entrada / Saída
                  </h2>
                  <p className="text-sm sm:text-base text-white/80">
                    Escaneie o QR Code do seu posto
                  </p>
                </div>

                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/30 transition-all duration-300 group-hover:translate-x-1">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </Link>

          {/* Iniciar Ronda - apenas para funcionários com ronda=true */}
          {true && (
            <Link to="/ronda-qr" className="block animate-fade-in-up">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-5 sm:p-6 shadow-xl group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>

                <div className="relative flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
                    </div>
                    {cardMode === 'ronda' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-white/70" />
                      <span className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider">
                        {cardMode === 'ronda' ? 'Ronda em Andamento' : 'Controle Patrimonial'}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                      Iniciar Ronda
                    </h2>
                    <p className="text-sm sm:text-base text-white/80">
                      Registre os pontos de ronda do turno
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/30 transition-all duration-300 group-hover:translate-x-1">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Header com gradiente */}
        <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 text-primary mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Resumo do Mês</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Olá, {funcionario.nome_completo.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas informações em um só lugar.
          </p>
        </div>

        {/* Quick Stats com cards modernos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Último Salário */}
          <Card className="p-4 sm:p-5 portal-card border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-portal">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Último Salário</p>
                {stats.ultimoHolerite ? (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(stats.ultimoHolerite.salario_liquido)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMesAno(stats.ultimoHolerite.mes, stats.ultimoHolerite.ano)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Não disponível</p>
                )}
              </div>
            </div>
          </Card>

          {/* Dias Trabalhados no Mês */}
          <Card className="p-4 sm:p-5 portal-card border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-portal-secondary to-green-400 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Dias no Mês</p>
                {stats.proximaEscala ? (
                  <>
                    <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                      {stats.proximaEscala.total_dias_trabalho || 0} dias
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stats.proximaEscala.total_dias_folga || 0} folgas
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Não disponível</p>
                )}
              </div>
            </div>
          </Card>

          {/* Férias Pendentes */}
          <Card className="p-4 sm:p-5 portal-card border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-portal-accent to-amber-400 flex items-center justify-center">
                <Umbrella className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Férias Pendentes</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                  {stats.feriasPendentes} período(s)
                </p>
                {stats.diasAteFerias !== null && (
                  <p className="text-xs text-portal-accent font-medium mt-0.5">
                    Próximas em {stats.diasAteFerias} dias
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Tempo de Empresa */}
          <Card className="p-4 sm:p-5 portal-card border-0 shadow-card animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-portal-purple to-purple-400 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Tempo de Empresa</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground mt-1">
                  {(() => {
                    const admissao = new Date(funcionario.data_admissao);
                    const hoje = new Date();
                    const anos = Math.floor((hoje.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 365));
                    const meses = Math.floor(((hoje.getTime() - admissao.getTime()) % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                    if (anos > 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
                    return `${meses} mês${meses === 1 ? '' : 'es'}`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desde {new Date(funcionario.data_admissao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions com hover effects */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/portal/holerites" className="block animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 group-hover:shadow-portal transition-all duration-300 group-hover:scale-105">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                      Meus Holerites
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Consultar contracheques
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/portal/escalas" className="block animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-green-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-portal-secondary to-green-400 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-portal-secondary transition-colors">
                      Minhas Escalas
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Ver escala mensal
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-portal-secondary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link to="/portal/ferias" className="block animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-portal-accent to-amber-400 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <Umbrella className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-portal-accent transition-colors">
                      Minhas Férias
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Consultar férias
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-portal-accent group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            {funcionario.banco_horas_ativo && (
              <Link to="/portal/banco-horas" className="block animate-fade-in-up" style={{ animationDelay: '450ms' }}>
                <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-purple-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-base group-hover:text-purple-600 transition-colors">
                        Banco de Horas
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Horas excedentes
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </Link>
            )}

            {true && (
              <Link to="/ronda-qr" className="block animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-base group-hover:text-emerald-600 transition-colors">
                        Ronda QR
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Controle de rondas
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </Link>
            )}

            <Link to="/portal/sugestoes" className="block animate-fade-in-up" style={{ animationDelay: '550ms' }}>
              <Card className="p-4 sm:p-5 border-0 shadow-card portal-card cursor-pointer group h-full bg-gradient-to-br from-white to-purple-500/5 relative">
                {/* Badge de mensagens não lidas */}
                {unreadMessages.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center animate-bounce z-10">
                    {unreadMessages.length}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-portal-purple to-purple-400 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    <MessageSquarePlus className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-portal-purple transition-colors">
                      Mensagens
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {unreadMessages.length > 0 ? `${unreadMessages.length} resposta${unreadMessages.length > 1 ? 's' : ''} nova${unreadMessages.length > 1 ? 's' : ''}!` : 'Enviar feedback'}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-portal-purple group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Info Card com design moderno */}
        <Card className="p-4 sm:p-5 border-0 shadow-card bg-gradient-to-br from-muted/30 to-muted/50 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-portal-secondary"></div>
            Informações do Funcionário
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-background/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-medium">Cargo</p>
              <p className="font-semibold text-foreground mt-1 truncate">
                {funcionario.cargo?.nome_cargo || funcionario.nome_cargo || '-'}
              </p>
            </div>
            <div className="bg-background/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-medium">Empresa</p>
              <p className="font-semibold text-foreground mt-1 truncate">
                {funcionario.empresa?.nome_empresa || funcionario.nome_empresa || '-'}
              </p>
            </div>
            <div className="col-span-2 lg:col-span-2 bg-background/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground font-medium">Posto de Trabalho</p>
              <p className="font-semibold text-foreground mt-1 truncate">
                {funcionario.posto_trabalho?.nome_posto || funcionario.nome_posto || '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default PortalHome;