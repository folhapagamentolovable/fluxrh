import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AppendControlledRealCycleEvidenceInput,
  ControlledRealCycle,
  ControlledRealCycleScope,
} from "@fluxrh/contracts";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FilePlus2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  appendControlledRealCycleEvidence,
  approveControlledRealCycle,
  getControlledRealCycles,
  prepareControlledRealCycle,
} from "@/lib/api";
import { formatBrazilianCompetence, formatBrazilianDateTime } from "@/lib/date";

const scopeOptions: Array<[ControlledRealCycleScope, string]> = [
  ["employees", "Cadastro e documentos"],
  ["time_tracking", "Jornada e ponto"],
  ["absences", "Férias e ausências"],
  ["benefits", "Benefícios"],
  ["payroll_preview", "Prévia da folha"],
];
const checklistItems = [
  ["termsApproved", "Termos e limites aprovados"],
  ["ownersNamed", "Responsáveis nomeados"],
  ["accessReviewed", "Acessos mínimos revisados"],
  ["backupVerified", "Backup verificado"],
  ["rollbackTested", "Rollback testado"],
  ["dataInventoryApproved", "Inventário de dados aprovado"],
  ["humanReviewerNamed", "Revisor humano identificado"],
] as const;
const statusLabel: Record<ControlledRealCycle["status"], string> = {
  prepared: "Preparado",
  approved: "Aprovado",
  in_progress: "Em andamento",
  completed: "Concluído",
  rolled_back: "Revertido",
  cancelled: "Cancelado",
};
const statusTone: Record<ControlledRealCycle["status"], "blue" | "green" | "amber" | "red" | "gray"> = {
  prepared: "amber",
  approved: "green",
  in_progress: "blue",
  completed: "green",
  rolled_back: "red",
  cancelled: "gray",
};

export function ControlledRealCyclesPanel() {
  const client = useQueryClient();
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [selected, setSelected] = useState<ControlledRealCycle | null>(null);
  const [action, setAction] = useState<"approve" | "evidence" | null>(null);
  const cycles = useQuery({ queryKey: ["controlled-real-cycles"], queryFn: getControlledRealCycles });
  const refresh = () => client.invalidateQueries({ queryKey: ["controlled-real-cycles"] });

  if (cycles.isLoading) return <section className="panel" role="status">Carregando ciclos controlados…</section>;
  if (cycles.isError) return (
    <section className="panel real-cycle-warning" role="alert">
      <AlertTriangle />
      <div><h2>Não foi possível consultar os ciclos reais</h2><p>Confirme a sessão super_admin, o gate operacional e a conexão com a API persistente.</p></div>
    </section>
  );

  return (
    <section role="tabpanel" id="governance-panel-real-cycles" aria-labelledby="governance-tab-real-cycles">
      <div className="real-cycle-banner">
        <ShieldCheck aria-hidden="true" />
        <div>
          <span className="section-label">Operação paralela protegida</span>
          <h2>Primeiro ciclo real controlado</h2>
          <p>O ciclo registra escopo, responsáveis, rollback e evidências. Ele não executa nem substitui a folha oficial.</p>
        </div>
        <button className="primary-button" onClick={() => setPrepareOpen(true)}><ClipboardCheck /> Preparar ciclo</button>
      </div>
      <div className="real-cycle-list">
        {(cycles.data ?? []).length === 0 && (
          <article className="panel empty-real-cycle"><h2>Nenhum ciclo preparado</h2><p>Comece com uma competência e escopo mínimos, mantendo a operação oficial como fonte de verdade.</p></article>
        )}
        {(cycles.data ?? []).map((cycle) => (
          <article className="panel real-cycle-card" key={cycle.id}>
            <header>
              <div><small>{formatBrazilianCompetence(cycle.competence)}</small><h2>{cycle.title}</h2></div>
              <StatusBadge tone={statusTone[cycle.status]}>{statusLabel[cycle.status]}</StatusBadge>
            </header>
            <p><strong>Revisor:</strong> {cycle.humanReviewer}</p>
            <div className="real-cycle-scopes">{cycle.scope.map((item) => <span key={item}>{scopeOptions.find(([key]) => key === item)?.[1] ?? item}</span>)}</div>
            <details>
              <summary>Plano, checklist e evidências</summary>
              <p>{cycle.rollbackPlan}</p>
              <ul>{checklistItems.map(([key, label]) => <li key={key}><CheckCircle2 /> {label}</li>)}</ul>
              {cycle.approvalNote && <p><strong>Justificativa da aprovação:</strong> {cycle.approvalNote}</p>}
              <div className="cycle-evidence-list">
                {cycle.evidence.map((evidence) => <p key={evidence.id}><strong>{evidence.label}</strong><span>{evidence.kind} · {formatBrazilianDateTime(evidence.recordedAt)}</span><small>{evidence.reference}</small></p>)}
              </div>
            </details>
            <footer>
              <small>Criado em {formatBrazilianDateTime(cycle.createdAt)} · {cycle.evidence.length} evidência(s)</small>
              <div>
                <button className="secondary-button" onClick={() => { setSelected(cycle); setAction("evidence"); }}><FilePlus2 /> Evidência</button>
                {cycle.status === "prepared" && <button className="primary-button" onClick={() => { setSelected(cycle); setAction("approve"); }}><ShieldCheck /> Aprovar</button>}
              </div>
            </footer>
          </article>
        ))}
      </div>
      <PrepareCycleModal open={prepareOpen} close={() => setPrepareOpen(false)} done={() => { setPrepareOpen(false); void refresh(); }} />
      <ApproveCycleModal cycle={action === "approve" ? selected : null} close={() => setAction(null)} done={() => { setAction(null); void refresh(); }} />
      <EvidenceModal cycle={action === "evidence" ? selected : null} close={() => setAction(null)} done={() => { setAction(null); void refresh(); }} />
    </section>
  );
}

function PrepareCycleModal({ open, close, done }: { open: boolean; close: () => void; done: () => void }) {
  const [competence, setCompetence] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<ControlledRealCycleScope[]>([]);
  const [humanReviewer, setHumanReviewer] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [checklist, setChecklist] = useState<Record<(typeof checklistItems)[number][0], boolean>>({ termsApproved: false, ownersNamed: false, accessReviewed: false, backupVerified: false, rollbackTested: false, dataInventoryApproved: false, humanReviewerNamed: false });
  const mutation = useMutation({
    mutationFn: () => {
      const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(competence);
      if (!match) throw new Error("Informe a competência no formato mm/aaaa.");
      return prepareControlledRealCycle({
        competence: `${match[2]}-${match[1]}`,
        title,
        scope,
        humanReviewer,
        rollbackPlan,
        checklist: Object.fromEntries(Object.keys(checklist).map((key) => [key, true])) as { [K in keyof typeof checklist]: true },
      });
    },
    onSuccess: done,
  });
  const allChecked = Object.values(checklist).every(Boolean);
  return <Modal open={open} onClose={close} title="Preparar ciclo real" description="Registre uma execução paralela, reversível e conferida.">
    <div className="special-form real-cycle-form">
      <div className="form-grid">
        <label>Competência<input inputMode="numeric" placeholder="mm/aaaa" value={competence} onChange={(event) => setCompetence(event.target.value.replace(/[^\d/]/g, "").slice(0, 7))} /></label>
        <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      </div>
      <fieldset><legend>Escopo mínimo</legend>{scopeOptions.map(([key, label]) => <label className="switch-row" key={key}><input type="checkbox" checked={scope.includes(key)} onChange={() => setScope((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} /><span>{label}</span></label>)}</fieldset>
      <label>Revisor humano<input value={humanReviewer} onChange={(event) => setHumanReviewer(event.target.value)} /></label>
      <label>Plano de rollback<textarea rows={5} value={rollbackPlan} onChange={(event) => setRollbackPlan(event.target.value)} placeholder="Checkpoint, responsável, critério de acionamento e procedimento de restauração." /></label>
      <fieldset><legend>Checklist obrigatório</legend>{checklistItems.map(([key, label]) => <label className="switch-row" key={key}><input type="checkbox" checked={checklist[key]} onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}</fieldset>
      {mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <footer className="form-actions"><button className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={!/^((0[1-9])|(1[0-2]))\/\d{4}$/.test(competence) || title.trim().length < 5 || scope.length === 0 || humanReviewer.trim().length < 3 || rollbackPlan.trim().length < 20 || !allChecked || mutation.isPending} onClick={() => mutation.mutate()}>Preparar sem executar</button></footer>
    </div>
  </Modal>;
}

function ApproveCycleModal({ cycle, close, done }: { cycle: ControlledRealCycle | null; close: () => void; done: () => void }) {
  const [approvalNote, setApprovalNote] = useState("");
  const mutation = useMutation({ mutationFn: () => approveControlledRealCycle(cycle!.id, { approvalNote }), onSuccess: done });
  return <Modal open={Boolean(cycle)} onClose={close} title="Aprovar ciclo controlado" description="A aprovação autoriza somente a execução paralela descrita no registro.">
    <div className="special-form"><label>Justificativa da aprovação<textarea rows={5} value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} /></label>{mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}<footer className="form-actions"><button className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={approvalNote.trim().length < 10 || mutation.isPending} onClick={() => mutation.mutate()}>Aprovar ciclo</button></footer></div>
  </Modal>;
}

function EvidenceModal({ cycle, close, done }: { cycle: ControlledRealCycle | null; close: () => void; done: () => void }) {
  const [kind, setKind] = useState<AppendControlledRealCycleEvidenceInput["kind"]>("input");
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const [sha256, setSha256] = useState("");
  const mutation = useMutation({ mutationFn: () => appendControlledRealCycleEvidence(cycle!.id, { kind, label, reference, ...(sha256 ? { sha256 } : {}) }), onSuccess: done });
  const hashValid = !sha256 || /^[a-f0-9]{64}$/i.test(sha256);
  return <Modal open={Boolean(cycle)} onClose={close} title="Registrar evidência" description="Informe somente uma referência segura. Dados sensíveis permanecem no Storage privado.">
    <div className="special-form"><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="input">Entrada</option><option value="comparison">Comparação</option><option value="decision">Decisão</option><option value="audit">Auditoria</option><option value="rollback">Rollback</option></select></label><label>Rótulo<input value={label} onChange={(event) => setLabel(event.target.value)} /></label><label>Referência<textarea rows={4} value={reference} onChange={(event) => setReference(event.target.value)} /></label><label>SHA-256 opcional<input value={sha256} onChange={(event) => setSha256(event.target.value.trim())} /></label>{!hashValid && <p className="form-error" role="alert">O SHA-256 deve conter 64 caracteres hexadecimais.</p>}{mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}<footer className="form-actions"><button className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={label.trim().length < 3 || reference.trim().length < 3 || !hashValid || mutation.isPending} onClick={() => mutation.mutate()}>Registrar evidência</button></footer></div>
  </Modal>;
}
