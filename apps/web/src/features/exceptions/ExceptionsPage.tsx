import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Filter, Search, TriangleAlert } from "lucide-react";
import { getWorkflowExceptions, resolveWorkflowException } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OperationalException } from "@fluxrh/contracts";

const statusLabel={open:"Aberta",in_review:"Em análise",resolved:"Resolvida"} as const;
const priorityLabel={critical:"Crítica",high:"Alta",medium:"Média",low:"Baixa"} as const;

export function ExceptionsPage() {
  const client=useQueryClient(); const [search,setSearch]=useState(""); const [status,setStatus]=useState("active"); const [selected,setSelected]=useState<OperationalException>(); const [note,setNote]=useState("");
  const {data=[],isLoading,error}=useQuery({queryKey:["workflow-exceptions"],queryFn:getWorkflowExceptions});
  const mutation=useMutation({mutationFn:()=>resolveWorkflowException(selected!.id,note),onSuccess:()=>{client.invalidateQueries({queryKey:["workflow-exceptions"]});client.invalidateQueries({queryKey:["workflow-overview"]});setSelected(undefined);setNote("")}});
  const filtered=useMemo(()=>data.filter(item=>(status==="all"||(status==="active"?item.status!=="resolved":item.status===status))&&`${item.title} ${item.description} ${item.employeeName??""}`.toLowerCase().includes(search.toLowerCase())),[data,search,status]);
  return <div className="page">
    <section className="simple-heading"><div><span className="eyebrow"><TriangleAlert size={15}/> Central de exceções</span><h1>Decisões que precisam de pessoas</h1><p>Exceções persistentes, isoladas por organização e com resolução auditável.</p></div><span className="exception-counter">{data.filter(x=>x.status!=="resolved").length} abertas</span></section>
    <section className="panel exceptions-panel">
      <div className="filter-bar"><label className="field"><Search size={17}/><input aria-label="Buscar exceções" placeholder="Buscar exceções" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="exception-filter"><Filter size={17}/><select aria-label="Filtrar por status" value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Pendentes</option><option value="open">Abertas</option><option value="in_review">Em análise</option><option value="resolved">Resolvidas</option><option value="all">Todas</option></select></label></div>
      {isLoading&&<div className="module-placeholder"><p>Carregando exceções…</p></div>}
      {error&&<div className="module-placeholder"><TriangleAlert/><h2>Não foi possível carregar</h2><p>{error.message}</p></div>}
      {!isLoading&&!error&&filtered.length===0&&<div className="module-placeholder"><CheckCircle2/><h2>Nenhuma exceção encontrada</h2><p>Não há decisões correspondentes aos filtros selecionados.</p></div>}
      <div className="exception-list">{filtered.map(item=><article className="exception-card" key={item.id}><span className={`priority-mark ${item.priority}`}/><div><div className="exception-title"><h2>{item.title}</h2><StatusBadge tone={item.status==="resolved"?"green":item.priority==="critical"||item.priority==="high"?"red":"blue"}>{statusLabel[item.status]}</StatusBadge></div><p>{item.description}</p><small>{item.employeeName??"Sem pessoa vinculada"} · {item.area} · Prioridade {priorityLabel[item.priority]}</small>{item.recommendation&&<div className="exception-recommendation">Recomendação: {item.recommendation}</div>}</div>{item.status!=="resolved"&&<button className="primary-button" onClick={()=>setSelected(item)}><CheckCircle2 size={16}/> Resolver</button>}</article>)}</div>
    </section>
    <Modal open={Boolean(selected)} title="Resolver exceção" description={selected?.title} onClose={()=>{setSelected(undefined);setNote("")}}><div className="modal-form"><label>Justificativa<textarea autoFocus value={note} onChange={e=>setNote(e.target.value)} placeholder="Descreva a decisão tomada"/></label>{mutation.error&&<p className="form-error">{mutation.error.message}</p>}<div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(undefined)}>Cancelar</button><button className="primary-button" disabled={note.trim().length<3||mutation.isPending} onClick={()=>mutation.mutate()}>{mutation.isPending?"Salvando…":"Confirmar resolução"}</button></div></div></Modal>
  </div>;
}
