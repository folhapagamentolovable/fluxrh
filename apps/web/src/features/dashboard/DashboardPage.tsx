import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeHelp,
  Bot,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  HeartHandshake,
  Megaphone,
  ReceiptText,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserMinus,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboard } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/auth/AuthProvider";

const priority = {
  critical: { label: "Crítica", tone: "red" as const },
  high: { label: "Alta", tone: "amber" as const },
  medium: { label: "Média", tone: "blue" as const },
  low: { label: "Baixa", tone: "gray" as const },
};

const dailyActions = [
  { label: "Ocorrências de ponto", description: "Faltas, atestados, atrasos e saídas", path: "/jornada", icon: FileClock, tone: "blue" },
  { label: "Emitir aviso", description: "Comunicados internos e por e-mail", path: "/comunicacao", icon: Megaphone, tone: "purple" },
  { label: "Processar admissão", description: "Cadastro, documentos e onboarding", path: "/admissoes", icon: UserPlus, tone: "green" },
  { label: "Processar desligamento", description: "Simulação, tarefas e documentos", path: "/desligamentos", icon: UserMinus, tone: "red" },
  { label: "Registrar afastamento", description: "Atestados, férias e licenças", path: "/ferias", icon: Stethoscope, tone: "amber" },
  { label: "Atender solicitações", description: "Dúvidas de funcionários e clientes", path: "/portal", icon: BadgeHelp, tone: "blue" },
] as const;

const monthlyActions = [
  { label: "Fechar folhas de ponto", description: "Conferir e encerrar a competência", path: "/jornada", icon: CalendarCheck2, tone: "purple" },
  { label: "Calcular salários", description: "Prévia, conferência e fechamento", path: "/folha", icon: WalletCards, tone: "green" },
  { label: "Conferir benefícios", description: "Concessões, custos e movimentações", path: "/beneficios", icon: HeartHandshake, tone: "amber" },
  { label: "Emitir holerites", description: "Documentos da folha fechada", path: "/folha", icon: FileText, tone: "blue" },
  { label: "Emitir recibos", description: "Férias, 13º e cálculos especiais", path: "/calculos", icon: ReceiptText, tone: "red" },
] as const;

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = String(user?.user_metadata.full_name || user?.email || "Usuário").trim().split(/\s+/)[0];
  const { data, isLoading, error } = useQuery({ queryKey: ["operations-dashboard"], queryFn: getDashboard });
  if (isLoading) return <div className="page"><div className="page-skeleton" /></div>;
  if (error || !data) return <div className="page"><div className="error-state"><TriangleAlert /><h2>Não foi possível abrir a operação</h2><p>Verifique se a API do FluxRH está em execução.</p></div></div>;

  const now = new Date();
  const openDecisions = data.exceptions.length;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(now);
  const weekDay = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const competenceLabel = new Intl.DateTimeFormat("pt-BR", { month: "2-digit", year: "numeric" }).format(now);

  const cards = [
    { label: "Colaboradores ativos", value: data.metrics.activeEmployees, hint: "Base atual da organização", icon: UsersRound, color: "blue" },
    { label: "Exceções abertas", value: data.metrics.openExceptions, hint: `${openDecisions} listada(s) como prioritária(s)`, icon: TriangleAlert, color: "red" },
    { label: "Processos em andamento", value: data.metrics.workflowsRunning, hint: `${data.workflows.length} acompanhado(s) nesta visão`, icon: BriefcaseBusiness, color: "purple" },
    { label: "Taxa de automação", value: `${data.metrics.automationRate}%`, hint: "Indicador consolidado da operação", icon: Bot, color: "green" },
  ];

  return <div className="page">
    <section className="page-heading">
      <div><span className="eyebrow"><Sparkles size={15} /> Central de operações</span><h1>Bom dia, {displayName}.</h1><p>Existem {data.metrics.openExceptions} exceção(ões) aberta(s) e {data.metrics.workflowsRunning} processo(s) em andamento.</p></div>
      <div className="date-card"><small>{weekDay}</small><strong>{dateLabel}</strong><span>Competência {competenceLabel}</span></div>
    </section>

    <section className="metrics-grid">{cards.map(({ label, value, hint, icon: Icon, color }) => <article className="metric-card" key={label}>
      <div className={`metric-icon ${color}`}><Icon size={21} /></div><span>{label}</span><strong>{value}</strong><small>{hint}</small>
    </article>)}</section>

    <section className="routine-access" aria-labelledby="routine-title">
      <div className="routine-heading">
        <div><span className="section-label">Acesso rápido</span><h2 id="routine-title">Rotina do RH</h2><p>Abra diretamente os fluxos mais usados sem procurar no menu.</p></div>
      </div>
      <div className="routine-columns">
        <article className="panel routine-group">
          <header><span className="routine-period daily"><Clock3 /></span><div><h3>Hoje</h3><p>Operações que exigem acompanhamento diário</p></div></header>
          <div className="routine-actions">{dailyActions.map(({ label, description, path, icon: Icon, tone }) => <Link className="routine-action" to={path} key={label}>
            <span className={`routine-action-icon ${tone}`}><Icon /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight />
          </Link>)}</div>
        </article>
        <article className="panel routine-group">
          <header><span className="routine-period monthly"><CalendarCheck2 /></span><div><h3>Fechamento mensal</h3><p>Conferência, cálculo e emissão da competência</p></div></header>
          <div className="routine-actions">{monthlyActions.map(({ label, description, path, icon: Icon, tone }) => <Link className="routine-action" to={path} key={label}>
            <span className={`routine-action-icon ${tone}`}><Icon /></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight />
          </Link>)}</div>
        </article>
      </div>
    </section>

    <section className="dashboard-grid">
      <article className="panel exceptions-panel">
        <div className="panel-heading"><div><span className="section-label">Precisa de você</span><h2>Exceções prioritárias</h2></div><Link to="/excecoes">Ver todas <ArrowRight size={16} /></Link></div>
        <div className="exception-list">{data.exceptions.map((item) => <div className="exception-row" key={item.id}>
          <div className={`priority-indicator ${item.priority}`} />
          <div className="exception-copy"><div><strong>{item.title}</strong><StatusBadge tone={priority[item.priority].tone}>{priority[item.priority].label}</StatusBadge></div><p>{item.description}</p><small>{item.employeeName} · {item.area}</small></div>
          <Link className="ghost-action" to="/excecoes">Analisar <ArrowRight size={15} /></Link>
        </div>)}</div>
      </article>

      <article className="panel autopilot-panel">
        <div className="autopilot-orbit"><div><Bot size={31} /></div><i /><i /><i /></div>
        <span className="section-label">Piloto automático</span><h2>Indicadores da operação</h2><p>{data.metrics.automationRate}% da operação monitorada está automatizada.</p>
        <div className="autopilot-stats"><div><CheckCircle2 /><span><strong>{data.metrics.automationRate}%</strong><small>Automação</small></span></div><div><Clock3 /><span><strong>{data.metrics.openExceptions}</strong><small>Exceções abertas</small></span></div></div>
      </article>
    </section>

    <section className="panel workflows-panel">
      <div className="panel-heading"><div><span className="section-label">Execução ao vivo</span><h2>Workflows em andamento</h2></div><Link to="/automacoes">Abrir automações <ArrowRight size={16} /></Link></div>
      <div className="workflow-grid">{data.workflows.map((workflow) => <div className="workflow-card" key={workflow.id}>
        <div><span>{workflow.name}</span><strong>{workflow.progress}%</strong></div><h3>{workflow.subject}</h3><p>{workflow.currentStep}</p><div className="progress"><i style={{ width: `${workflow.progress}%` }} /></div>
      </div>)}</div>
    </section>
  </div>;
}
