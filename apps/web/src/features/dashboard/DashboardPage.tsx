import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, BriefcaseBusiness, CheckCircle2, Clock3, Sparkles, TriangleAlert, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboard } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";

const priority = {
  critical: { label: "Crítica", tone: "red" as const },
  high: { label: "Alta", tone: "amber" as const },
  medium: { label: "Média", tone: "blue" as const },
  low: { label: "Baixa", tone: "gray" as const },
};

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["operations-dashboard"], queryFn: getDashboard });
  if (isLoading) return <div className="page"><div className="page-skeleton" /></div>;
  if (error || !data) return <div className="page"><div className="error-state"><TriangleAlert /><h2>Não foi possível abrir a operação</h2><p>Verifique se a API do FluxRH está em execução.</p></div></div>;

  const cards = [
    { label: "Colaboradores ativos", value: data.metrics.activeEmployees, hint: "+6 neste mês", icon: UsersRound, color: "blue" },
    { label: "Exceções abertas", value: data.metrics.openExceptions, hint: "3 pedem atenção hoje", icon: TriangleAlert, color: "red" },
    { label: "Processos em andamento", value: data.metrics.workflowsRunning, hint: "18 dentro do prazo", icon: BriefcaseBusiness, color: "purple" },
    { label: "Taxa de automação", value: `${data.metrics.automationRate}%`, hint: "+3,2% desde julho", icon: Bot, color: "green" },
  ];

  return <div className="page">
    <section className="page-heading">
      <div><span className="eyebrow"><Sparkles size={15} /> Central de operações</span><h1>Bom dia, Marina.</h1><p>O FluxRH executou 186 ações automaticamente. Existem 3 decisões para você hoje.</p></div>
      <div className="date-card"><small>Terça-feira</small><strong>25 de agosto</strong><span>Competência 08/2026</span></div>
    </section>

    <section className="metrics-grid">{cards.map(({ label, value, hint, icon: Icon, color }) => <article className="metric-card" key={label}>
      <div className={`metric-icon ${color}`}><Icon size={21} /></div><span>{label}</span><strong>{value}</strong><small>{hint}</small>
    </article>)}</section>

    <section className="dashboard-grid">
      <article className="panel exceptions-panel">
        <div className="panel-heading"><div><span className="section-label">Precisa de você</span><h2>Exceções prioritárias</h2></div><Link to="/excecoes">Ver todas <ArrowRight size={16} /></Link></div>
        <div className="exception-list">{data.exceptions.map((item) => <div className="exception-row" key={item.id}>
          <div className={`priority-indicator ${item.priority}`} />
          <div className="exception-copy"><div><strong>{item.title}</strong><StatusBadge tone={priority[item.priority].tone}>{priority[item.priority].label}</StatusBadge></div><p>{item.description}</p><small>{item.employeeName} · {item.area}</small></div>
          <button className="ghost-action" onClick={() => { window.location.href = "/excecoes"; }}>Analisar <ArrowRight size={15} /></button>
        </div>)}</div>
      </article>

      <article className="panel autopilot-panel">
        <div className="autopilot-orbit"><div><Bot size={31} /></div><i /><i /><i /></div>
        <span className="section-label">Piloto automático</span><h2>O operacional está fluindo</h2><p>179 de 186 ações foram concluídas sem intervenção humana nas últimas 24 horas.</p>
        <div className="autopilot-stats"><div><CheckCircle2 /><span><strong>179</strong><small>Concluídas</small></span></div><div><Clock3 /><span><strong>7</strong><small>Em análise</small></span></div></div>
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
