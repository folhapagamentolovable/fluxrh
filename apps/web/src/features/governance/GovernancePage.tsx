import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Clock3,
  Eye,
  EyeOff,
  FileClock,
  KeyRound,
  Laptop,
  LockKeyhole,
  MailPlus,
  MonitorSmartphone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { GovernanceOverview, InviteGovernanceUserInput } from "@fluxrh/contracts";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getGovernance,
  getOrganizations,
  inviteGovernanceUser,
  revokeGovernanceSession,
  updateRolePermission,
} from "@/lib/api";
type Tab = "users" | "permissions" | "audit" | "sessions" | "policies";
const roleLabel: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  hr: "RH",
  payroll: "Departamento pessoal",
  manager: "Gestor",
  finance: "Financeiro",
  supervisor: "Supervisor",
  employee: "Colaborador",
  auditor: "Auditor",
};
const moduleLabel: Record<string, string> = {
  organization: "Organização",
  people: "Pessoas",
  documents: "Documentos",
  time: "Jornada",
  absence: "Férias e ausências",
  benefits: "Benefícios",
  payroll: "Folha",
  workflows: "Workflows",
  terminations: "Desligamentos",
  occupational_health: "Saúde ocupacional",
  patrols: "Rondas",
  analytics: "Indicadores",
  communications: "Comunicação",
  audit: "Auditoria",
  settings: "Configurações",
};
export function GovernancePage() {
  const client = useQueryClient(),
    [tab, setTab] = useState<Tab>("users"),
    [inviteOpen, setInviteOpen] = useState(false),
    [selectedRole, setSelectedRole] = useState("manager");
  const { data, isLoading } = useQuery({
    queryKey: ["governance"],
    queryFn: getGovernance,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["governance"] });
  const revoke = useMutation({
    mutationFn: revokeGovernanceSession,
    onSuccess: refresh,
  });
  const permission = useMutation({
    mutationFn: ({
      role,
      module,
      enabled,
    }: {
      role: string;
      module: GovernanceOverview["permissions"][number]["module"];
      enabled: boolean;
    }) =>
      updateRolePermission(role, {
        module,
        actions: enabled ? ["view", "create", "edit"] : ["view"],
        dataAccess: role === "manager" ? "team" : "scope",
        sensitiveData: "masked",
      }),
    onSuccess: refresh,
  });
  if (isLoading || !data)
    return (
      <div className="page" role="status" aria-label="Carregando configurações de acesso">
        <div className="page-skeleton" />
      </div>
    );
  const tabs: [Tab, string][] = [
    ["users", "Usuários e convites"],
    ["permissions", "Perfis e permissões"],
    ["audit", "Trilha de auditoria"],
    ["sessions", "Sessões"],
    ["policies", "Políticas"],
  ];
  const rolePermissions = data.permissions.filter(
    (x) => x.role === selectedRole,
  );
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[next][0];
    setTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`governance-tab-${nextTab}`)?.focus());
  };
  return (
    <div className="page">
      <section className="simple-heading">
        <div>
          <span className="eyebrow">
            <Shield /> Segurança e governança
          </span>
          <h1>Configurações de acesso</h1>
          <p>
            Controle quem pode ver, alterar e aprovar cada operação, com escopo
            e auditoria completa.
          </p>
        </div>
        <button className="primary-button" onClick={() => setInviteOpen(true)}>
          <UserPlus /> Convidar usuário
        </button>
      </section>
      <div className="module-tabs" role="tablist" aria-label="Áreas de segurança e governança">
        {tabs.map(([k, l], index) => (
          <button
            key={k}
            id={`governance-tab-${k}`}
            role="tab"
            aria-selected={tab === k}
            aria-controls={`governance-panel-${k}`}
            tabIndex={tab === k ? 0 : -1}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {l}
            {k === "users" && data.summary.pendingInvites > 0 && (
              <span aria-label={`${data.summary.pendingInvites} convites pendentes`}>{data.summary.pendingInvites}</span>
            )}
          </button>
        ))}
      </div>
      <section className="governance-metrics" aria-label="Indicadores de segurança">
        {(
          [
            ["Usuários ativos", data.summary.activeUsers, UsersRound, "blue"],
            [
              "Sessões ativas",
              data.summary.activeSessions,
              MonitorSmartphone,
              "green",
            ],
            [
              "Ações sensíveis",
              data.summary.sensitiveActionsToday,
              ShieldAlert,
              "amber",
            ],
            [
              "Acessos negados",
              data.summary.deniedAttempts,
              LockKeyhole,
              "red",
            ],
            [
              "Cobertura MFA",
              `${data.summary.mfaCoverage}%`,
              KeyRound,
              "purple",
            ],
          ] as const
        ).map(([l, v, I, t]) => (
          <article key={l}>
            <span className={`metric-icon ${t}`}>
              <I aria-hidden="true" />
            </span>
            <strong>{v}</strong>
            <small>{l}</small>
          </article>
        ))}
      </section>
      {tab === "users" && (
        <section className="panel governance-users" role="tabpanel" id="governance-panel-users" aria-labelledby="governance-tab-users">
          <div className="panel-heading">
            <div>
              <span className="section-label">Organização Grupo Flux</span>
              <h2>Usuários e escopos</h2>
            </div>
          </div>
          <header>
            <strong>Usuário</strong>
            <span>Perfil</span>
            <span>Escopo</span>
            <span>MFA</span>
            <span>Status</span>
          </header>
          {data.users.map((u) => (
            <article key={u.id}>
              <span className="user-identity">
                <i>
                  {u.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)}
                </i>
                <span>
                  <strong>{u.name}</strong>
                  <small>{u.email}</small>
                </span>
              </span>
              <span>{roleLabel[u.role]}</span>
              <span>
                {u.scope.teamOnly
                  ? "Somente equipe"
                  : u.scope.departmentIds.length
                    ? `${u.scope.departmentIds.length} departamento(s)`
                    : u.scope.companyIds.length > 1
                      ? "Toda organização"
                      : "1 empresa"}
              </span>
              <span>
                {u.mfaEnabled ? (
                  <StatusBadge tone="green">Ativo</StatusBadge>
                ) : (
                  <StatusBadge tone="amber">Pendente</StatusBadge>
                )}
              </span>
              <StatusBadge
                tone={
                  u.status === "active"
                    ? "green"
                    : u.status === "invited"
                      ? "blue"
                      : "red"
                }
              >
                {u.status === "active"
                  ? "Ativo"
                  : u.status === "invited"
                    ? "Convidado"
                    : "Suspenso"}
              </StatusBadge>
            </article>
          ))}
        </section>
      )}
      {tab === "permissions" && (
        <section className="permission-layout" role="tabpanel" id="governance-panel-permissions" aria-labelledby="governance-tab-permissions">
          <aside className="panel role-list">
            <span className="section-label">Perfis</span>
            <h2>Matriz de acesso</h2>
            {[...new Set(data.permissions.map((x) => x.role))].map((r) => (
              <button
                className={selectedRole === r ? "active" : ""}
                aria-pressed={selectedRole === r}
                onClick={() => setSelectedRole(r)}
                key={r}
              >
                <UserCog />
                {roleLabel[r]}
              </button>
            ))}
          </aside>
          <div className="panel permission-matrix">
            <div className="panel-heading">
              <div>
                <span className="section-label">{roleLabel[selectedRole]}</span>
                <h2>Permissões por módulo</h2>
              </div>
            </div>
            <header>
              <strong>Módulo</strong>
              <span>Ações</span>
              <span>Dados</span>
              <span>Sensíveis</span>
              <span>Editar</span>
            </header>
            {rolePermissions.map((p) => (
              <article key={p.module}>
                <strong>{moduleLabel[p.module]}</strong>
                <span>{p.actions.join(" · ")}</span>
                <span>{p.dataAccess}</span>
                <span className={`sensitive ${p.sensitiveData}`}>
                  {p.sensitiveData === "visible" ? <Eye /> : <EyeOff />}
                  {p.sensitiveData}
                </span>
                <button
                  aria-label={`Editar permissões de ${moduleLabel[p.module]} para ${roleLabel[selectedRole]}`}
                  onClick={() =>
                    permission.mutate({
                      role: selectedRole,
                      module: p.module,
                      enabled: p.actions.length === 1,
                    })
                  }
                >
                  <SlidersHorizontal />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "audit" && (
        <section className="panel audit-list" role="tabpanel" id="governance-panel-audit" aria-labelledby="governance-tab-audit">
          <div className="panel-heading">
            <div>
              <span className="section-label">Registro imutável planejado</span>
              <h2>Ações humanas e automáticas</h2>
            </div>
            <StatusBadge tone="blue">{data.audit.length} eventos</StatusBadge>
          </div>
          {data.audit.map((a) => (
            <article key={a.id}>
              <span className={`audit-symbol ${a.risk}`}>
                {a.actorType === "automation" ? <ShieldCheck /> : <FileClock />}
              </span>
              <div>
                <strong>{a.summary}</strong>
                <p>
                  <code>{a.action}</code> · {moduleLabel[a.module]}
                </p>
                <small>
                  {a.actorName} ·{" "}
                  {new Date(a.occurredAt).toLocaleString("pt-BR")} · {a.origin}{" "}
                  · {a.ipAddress}
                </small>
                {a.justification && <em>Justificativa: {a.justification}</em>}
              </div>
              <StatusBadge
                tone={
                  a.risk === "critical"
                    ? "red"
                    : a.risk === "sensitive"
                      ? "amber"
                      : "gray"
                }
              >
                {a.risk === "critical"
                  ? "Crítica"
                  : a.risk === "sensitive"
                    ? "Sensível"
                    : "Normal"}
              </StatusBadge>
            </article>
          ))}
        </section>
      )}
      {tab === "sessions" && (
        <section className="session-grid" role="tabpanel" id="governance-panel-sessions" aria-labelledby="governance-tab-sessions">
          {data.sessions.map((s) => (
            <article className="panel" key={s.id}>
              <header>
                <span className="session-icon">
                  <Laptop />
                </span>
                <StatusBadge tone={s.status === "active" ? "green" : "red"}>
                  {s.current
                    ? "Sessão atual"
                    : s.status === "active"
                      ? "Ativa"
                      : "Encerrada"}
                </StatusBadge>
              </header>
              <h2>{s.userName}</h2>
              <p>
                {s.device} · {s.browser}
              </p>
              <dl>
                <div>
                  <dt>Local</dt>
                  <dd>{s.location}</dd>
                </div>
                <div>
                  <dt>IP</dt>
                  <dd>{s.ipAddress}</dd>
                </div>
                <div>
                  <dt>Última atividade</dt>
                  <dd>{new Date(s.lastSeenAt).toLocaleString("pt-BR")}</dd>
                </div>
              </dl>
              <button
                className="secondary-button"
                disabled={s.current || s.status !== "active"}
                onClick={() => revoke.mutate(s.id)}
              >
                <X /> Encerrar sessão
              </button>
            </article>
          ))}
        </section>
      )}
      {tab === "policies" && (
        <section className="policy-grid" role="tabpanel" id="governance-panel-policies" aria-labelledby="governance-tab-policies">
          {data.policies.map((p) => (
            <article className="panel" key={p.id}>
              <header>
                <span className={`policy-icon ${p.status}`}>
                  <ShieldCheck />
                </span>
                <StatusBadge tone={p.status === "active" ? "green" : "amber"}>
                  {p.status === "active" ? "Ativa" : "Atenção"}
                </StatusBadge>
              </header>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div>
                <div className="progress">
                  <i style={{ width: `${p.coverage}%` }} />
                </div>
                <strong>{p.coverage}%</strong>
              </div>
            </article>
          ))}
        </section>
      )}
      <InviteUser
        open={inviteOpen}
        close={() => setInviteOpen(false)}
        done={() => {
          setInviteOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
function InviteUser({
  open,
  close,
  done,
}: {
  open: boolean;
  close: () => void;
  done: () => void;
}) {
  const { data: organizations } = useQuery({ queryKey: ["organizations"], queryFn: getOrganizations });
  const companies = organizations?.companies ?? [];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteGovernanceUserInput["role"]>("hr");
  const [companyId, setCompanyId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      inviteGovernanceUser({
        name,
        email,
        role,
        companyIds: [companyId],
        departmentIds: [],
        teamOnly,
      }),
    onSuccess: done,
  });
  return (
    <Modal
      open={open}
      onClose={close}
      title="Convidar usuário"
      description="O acesso será limitado ao perfil e ao escopo definidos."
    >
      <div className="special-form">
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <div className="form-grid">
          <label>
            Perfil
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="hr">RH</option>
              <option value="manager">Gestor</option>
              <option value="payroll">Departamento pessoal</option>
              <option value="auditor">Auditor</option>
              <option value="finance">Financeiro</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label>
            Empresa
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">Selecione</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
            </select>
          </label>
        </div>
        <label className="switch-row"><input type="checkbox" checked={teamOnly} onChange={(event) => setTeamOnly(event.target.checked)} /><span>Restringir acesso à própria equipe</span></label>
        <div className="security-note">
          <LockKeyhole />
          <p>
            Permissões não serão obtidas de metadados editáveis pelo usuário. O
            convite e cada alteração serão auditados.
          </p>
        </div>
        <footer className="form-actions">
          <button className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button className="primary-button" disabled={name.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(email) || !companyId || mutation.isPending} onClick={() => mutation.mutate()}>
            <MailPlus /> Enviar convite
          </button>
        </footer>
      </div>
    </Modal>
  );
}
