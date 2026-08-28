import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileSignature,
  FileText,
  LayoutTemplate,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createDocumentRequest, getDocumentOverview } from "@/lib/api";
import { categoryLabels, statusLabels, statusTones } from "./document-ui";

const blank = {
  subjectName: "",
  subjectDocument: "",
  companyName: "Grupo Flux",
  title: "",
  category: "personal" as const,
  required: true,
  workflowId: "",
};
export function DocumentsPage() {
  const client = useQueryClient();
  const [params] = useSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocumentOverview,
  });
  const [tab, setTab] = useState<"documents" | "templates">("documents");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const mutation = useMutation({
    mutationFn: createDocumentRequest,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
      setForm(blank);
    },
  });
  const filtered = useMemo(
    () =>
      data?.documents.filter(
        (doc) =>
          (!params.get("workflow") ||
            doc.workflowId === params.get("workflow")) &&
          (status === "all" || doc.status === status) &&
          `${doc.title} ${doc.subjectName} ${doc.companyName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ) ?? [],
    [data, query, status, params],
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, workflowId: form.workflowId || undefined });
  };
  if (isLoading || !data)
    return (
      <div className="page">
        <div className="page-skeleton" />
      </div>
    );
  const metrics = [
    ["Documentos", data.summary.total, FileText, "blue"],
    ["Para validar", data.summary.pendingValidation, FileCheck2, "amber"],
    [
      "Aguardando aceite",
      data.summary.awaitingAcceptance,
      FileSignature,
      "purple",
    ],
    ["Aceitos", data.summary.accepted, ShieldCheck, "green"],
    ["Vencem em 30 dias", data.summary.expiringSoon, Clock3, "red"],
  ] as const;
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <FileText size={15} /> Gestão documental
          </span>
          <h1>Documentos e aceites</h1>
          <p>
            Solicite, valide, gere e acompanhe documentos com evidências
            auditáveis.
          </p>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          <FilePlus2 size={17} /> Solicitar documento
        </button>
      </section>
      <section className="document-metrics">
        {metrics.map(([label, value, Icon, tone]) => (
          <div key={label}>
            <span className={`metric-icon ${tone}`}>
              <Icon />
            </span>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </section>
      {params.get("workflow") && (
        <div className="context-banner">
          <FileSignature />
          <span>
            <strong>Documentos desta admissão</strong>
            <small>Filtro aplicado ao workflow {params.get("workflow")}</small>
          </span>
          <Link to="/documentos">Limpar filtro</Link>
        </div>
      )}
      <div className="segmented-tabs">
        <button
          className={tab === "documents" ? "active" : ""}
          onClick={() => setTab("documents")}
        >
          Documentos
        </button>
        <button
          className={tab === "templates" ? "active" : ""}
          onClick={() => setTab("templates")}
        >
          Modelos
        </button>
      </div>
      {tab === "documents" ? (
        <section className="panel data-panel">
          <div className="table-toolbar people-toolbar">
            <div className="field">
              <Search />
              <input
                placeholder="Buscar documento ou pessoa"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select aria-label="Filtrar documentos por status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="under_review">Em validação</option>
              <option value="sent">Aguardando aceite</option>
              <option value="accepted">Aceitos</option>
              <option value="validated">Validados</option>
            </select>
            <span>{filtered.length} resultados</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table document-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Titular</th>
                  <th>Categoria</th>
                  <th>Versão</th>
                  <th>Atualização</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link
                        className="document-name"
                        to={`/documentos/${doc.id}`}
                      >
                        <span className={doc.category}>
                          <FileText />
                        </span>
                        <div>
                          <strong>{doc.title}</strong>
                          <small>
                            {doc.templateName ?? "Documento enviado"}
                          </small>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <strong>{doc.subjectName}</strong>
                      <small>{doc.companyName}</small>
                    </td>
                    <td>{categoryLabels[doc.category]}</td>
                    <td>v{doc.version}</td>
                    <td>
                      {new Date(doc.updatedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      <StatusBadge tone={statusTones[doc.status]}>
                        {statusLabels[doc.status]}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="table-empty">Nenhum documento encontrado.</div>
            )}
          </div>
        </section>
      ) : (
        <section className="template-grid">
          {data.templates.map((template) => (
            <article className="panel template-card" key={template.id}>
              <header>
                <span>
                  <LayoutTemplate />
                </span>
                <StatusBadge tone="green">Ativo</StatusBadge>
              </header>
              <h2>{template.name}</h2>
              <p>
                {categoryLabels[template.category]} · versão {template.version}
              </p>
              <div>
                {template.variables.slice(0, 3).map((variable) => (
                  <code key={variable}>{`{{${variable}}}`}</code>
                ))}
              </div>
              <footer>
                <small>
                  Atualizado em{" "}
                  {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
                </small>
                <button className="secondary-button">Editar modelo</button>
              </footer>
            </article>
          ))}
        </section>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Solicitar documento"
        description="A solicitação ficará disponível no portal e será acompanhada pelo FluxRH."
      >
        <form className="form-grid" onSubmit={submit}>
          <label>
            Nome do titular
            <input
              required
              value={form.subjectName}
              onChange={(e) =>
                setForm({ ...form, subjectName: e.target.value })
              }
            />
          </label>
          <label>
            CPF ou identificador
            <input
              required
              value={form.subjectDocument}
              onChange={(e) =>
                setForm({ ...form, subjectDocument: e.target.value })
              }
            />
          </label>
          <label className="span-2">
            Documento solicitado
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Empresa
            <input
              required
              value={form.companyName}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
            />
          </label>
          <label>
            Categoria
            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as typeof form.category,
                })
              }
            >
              <option value="personal">Pessoal</option>
              <option value="contract">Contrato</option>
              <option value="occupational">Saúde ocupacional</option>
              <option value="benefit">Benefício</option>
              <option value="policy">Política</option>
            </select>
          </label>
          <label className="span-2">
            Workflow relacionado (opcional)
            <input
              value={form.workflowId}
              onChange={(e) => setForm({ ...form, workflowId: e.target.value })}
              placeholder="Ex.: adm_marina"
            />
          </label>
          <footer className="form-actions span-2">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={mutation.isPending}>
              {mutation.isPending ? "Solicitando..." : "Criar solicitação"}
            </button>
          </footer>
        </form>
      </Modal>
    </div>
  );
}
