import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListFilter,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  prioritizeOperationalItems,
  summarizeOperationalItems,
  type OperationalItem,
  type OperationalState,
} from '@/domain/operations/operational-state';
import {
  automationActivityFixture,
  operationalItemsFixture,
} from './fixtures/operational-items';

type Filter = 'all' | Exclude<OperationalState, 'normal'>;

const statePresentation: Record<OperationalState, {
  label: string;
  icon: typeof CheckCircle2;
  badge: string;
  border: string;
  iconSurface: string;
}> = {
  normal: {
    label: 'Normal',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    border: 'border-emerald-200',
    iconSurface: 'bg-emerald-100 text-emerald-700',
  },
  attention: {
    label: 'Atenção',
    icon: AlertTriangle,
    badge: 'bg-amber-50 text-amber-900 ring-amber-200',
    border: 'border-amber-200',
    iconSurface: 'bg-amber-100 text-amber-800',
  },
  decision: {
    label: 'Decisão',
    icon: CircleAlert,
    badge: 'bg-orange-50 text-orange-900 ring-orange-200',
    border: 'border-orange-200',
    iconSurface: 'bg-orange-100 text-orange-800',
  },
  critical: {
    label: 'Crítico',
    icon: ShieldAlert,
    badge: 'bg-rose-50 text-rose-900 ring-rose-200',
    border: 'border-rose-200',
    iconSurface: 'bg-rose-100 text-rose-800',
  },
};

const SummaryCard = ({ state, value, description }: {
  state: OperationalState;
  value: number;
  description: string;
}) => {
  const presentation = statePresentation[state];
  const Icon = presentation.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{presentation.label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${presentation.iconSurface}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
};

const ExceptionCard = ({ item, onResolve }: {
  item: OperationalItem;
  onResolve: (id: string) => void;
}) => {
  const presentation = statePresentation[item.state];
  const Icon = presentation.icon;

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm ${presentation.border}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${presentation.iconSurface}`} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${presentation.badge}`}>
              {presentation.label}
            </span>
            <h3 className="mt-2 text-base font-semibold text-slate-950">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.subject}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {item.dueLabel}
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evidências</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {item.evidence.map((evidence) => (
              <li key={evidence} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                {evidence}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recomendação</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.recommendation}</p>
          <p className="mt-2 text-xs text-slate-500">Responsável: <strong className="text-slate-700">{item.owner}</strong></p>
        </div>
        {item.primaryAction && (
          <div className="flex items-end lg:pl-3">
            <button
              type="button"
              onClick={() => onResolve(item.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 lg:w-auto"
            >
              {item.primaryAction}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

const OperationsHomePage = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [resolvedIds, setResolvedIds] = useState<readonly string[]>([]);
  const activeItems = useMemo(
    () => operationalItemsFixture.filter(({ id }) => !resolvedIds.includes(id)),
    [resolvedIds],
  );
  const summary = summarizeOperationalItems(activeItems);
  const visibleItems = prioritizeOperationalItems(activeItems).filter((item) => (
    item.state !== 'normal' && (filter === 'all' || item.state === filter)
  ));

  const handleResolve = (id: string) => setResolvedIds((current) => [...current, id]);

  const filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'critical', label: 'Críticas' },
    { value: 'decision', label: 'Decisões' },
    { value: 'attention', label: 'Atenção' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Central operacional · dados demonstrativos
            </div>
            <p className="text-sm font-medium text-blue-200">Terça-feira, 25 de agosto</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Bom dia, Claudia.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              O FluxPay processou a rotina da manhã. A operação está estável e há {summary.requiresHumanAction} situações que precisam de decisão humana.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-300">Autonomia hoje</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold">347</span>
              <span className="pb-1 text-sm text-slate-300">processos executados</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[95%] rounded-full bg-emerald-400" />
            </div>
            <p className="mt-2 text-xs text-slate-300">95% concluídos sem intervenção</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="operation-summary-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Panorama</p>
            <h2 id="operation-summary-title" className="mt-1 text-xl font-semibold text-slate-950">Operação de hoje</h2>
          </div>
          <p className="hidden text-sm text-slate-500 sm:block">Atualizado há 2 minutos</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard state="normal" value={331} description="Processos concluídos sem pendências" />
          <SummaryCard state="attention" value={summary.attention + 10} description="Situações acompanhadas pelo FluxPay" />
          <SummaryCard state="decision" value={summary.decision} description="Contexto pronto para sua decisão" />
          <SummaryCard state="critical" value={summary.critical} description="Fluxos bloqueados para proteção" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section aria-labelledby="attention-queue-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Fila priorizada</p>
              <h2 id="attention-queue-title" className="mt-1 text-xl font-semibold text-slate-950">Requer sua atenção</h2>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" aria-label="Filtrar fila">
              <ListFilter className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              {filters.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  aria-pressed={filter === option.value}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    filter === option.value ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {visibleItems.length > 0 ? visibleItems.map((item) => (
              <ExceptionCard key={item.id} item={item} onResolve={handleResolve} />
            )) : (
              <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
                <Check className="mx-auto h-8 w-8 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-emerald-950">Nenhuma pendência neste filtro</h3>
                <p className="mt-1 text-sm text-emerald-800">O FluxPay continuará monitorando a operação.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4" aria-label="Atividade da automação">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Bot className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">FluxPay AI</p>
                <h2 className="font-semibold text-slate-950">Monitoramento ativo</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">Ponto, escalas, férias e folha estão sendo verificados continuamente.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Todos os monitores operacionais
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Atividade recente</h2>
            <ol className="mt-4 space-y-4">
              {automationActivityFixture.map((activity) => (
                <li key={activity.id} className="relative flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="leading-5 text-slate-700">{activity.text}</p>
                    <time className="mt-1 block text-xs text-slate-400">{activity.time}</time>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="mt-5 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600">
              Ver trilha de auditoria
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OperationsHomePage;
