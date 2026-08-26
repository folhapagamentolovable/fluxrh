import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, CheckCircle2, Clock3, GitBranch, PlayCircle, Sparkles, TriangleAlert, UserRound, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getWorkflowOverview } from "@/lib/api";
import { stepLabels } from "./workflow-ui";

export function WorkflowsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["workflow-overview"], queryFn: getWorkflowOverview });
  if (isLoading || !data) return <div className="page"><div className="page-skeleton" /></div>;
  const metrics = [["Em execução",data.summary.running,PlayCircle,"blue"],["Tarefas pendentes",data.summary.pendingTasks,Clock3,"amber"],["Ações automáticas hoje",data.summary.automatedToday,Bot,"green"],["Exceções",data.summary.exceptions,TriangleAlert,"red"]] as const;
  return <div className="page"><section className="simple-heading"><div><span className="eyebrow"><Workflow size={15}/> Orquestração autônoma</span><h1>Workflows e tarefas</h1><p>O FluxRH executa as rotinas e encaminha apenas decisões ou exceções para pessoas.</p></div><Link className="primary-button" to="/admissoes"><PlayCircle size={17}/> Iniciar admissão</Link></section>
    <section className="org-summary">{metrics.map(([label,value,Icon,tone])=><div className="org-summary-card" key={label}><span className={`metric-icon ${tone}`}><Icon size={20}/></span><div><strong>{value}</strong><small>{label}</small></div></div>)}</section>
    <section className="workflow-layout"><article className="panel definition-panel"><div className="panel-heading"><div><span className="section-label"><Sparkles size={13}/> Definição ativa</span><h2>{data.definition.name}</h2></div><StatusBadge tone="green">Versão {data.definition.version}</StatusBadge></div><div className="definition-flow">{data.definition.steps.map((step,index)=><div className="definition-step" key={step.key}><span>{index+1}</span><div><strong>{step.name}</strong><p>{step.description}</p><small><Bot size={12}/> {step.automationCount} automações</small></div>{index<data.definition.steps.length-1&&<ArrowRight/>}</div>)}</div></article>
      <aside className="panel task-inbox"><div className="panel-heading"><div><span className="section-label">Caixa de trabalho</span><h2>Minhas tarefas</h2></div><span className="count-pill">{data.tasks.length}</span></div><div className="task-list">{data.tasks.slice(0,6).map(task=><Link to={`/admissoes/${task.workflowId}`} key={task.id}><span className={`task-kind ${task.kind}`}><UserRound/></span><div><strong>{task.title}</strong><p>{task.subject} · {stepLabels[task.stepKey]}</p><small>{task.assignee} · vence em {new Date(task.dueAt).toLocaleDateString("pt-BR")}</small></div><ArrowRight/></Link>)}</div></aside>
    </section>
    <section className="panel instances-panel"><div className="panel-heading"><div><span className="section-label"><GitBranch size={13}/> Execuções</span><h2>Processos ativos</h2></div><Link to="/admissoes">Ver admissões <ArrowRight size={15}/></Link></div><div className="instance-list">{data.instances.map(instance=><Link to={`/admissoes/${instance.id}`} key={instance.id}><span className="person-avatar" style={{background:"#155eef"}}>{instance.candidateName.split(" ").map(x=>x[0]).slice(0,2).join("")}</span><div><strong>{instance.candidateName}</strong><small>{instance.position} · {instance.companyName}</small></div><span className="instance-step">{instance.status==="completed"?<><CheckCircle2/> Concluído</>:stepLabels[instance.currentStep]}</span><div className="instance-progress"><i style={{width:`${instance.progress}%`}}/></div><strong>{instance.progress}%</strong><ArrowRight/></Link>)}</div></section>
  </div>;
}
