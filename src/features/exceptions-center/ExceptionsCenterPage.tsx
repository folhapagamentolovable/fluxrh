import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Search, ShieldAlert, Sparkles } from 'lucide-react';
import type { OperationalState } from '@/domain/operations/operational-state';
import { getSelectedException, getVisibleExceptions } from '@/domain/operations/exception-center';
import { DataQualityBanner, OperationalError, OperationalLoading } from '@/components/operational-state/OperationalFeedback';
import { useOperationalSnapshot } from '@/features/operations-home/hooks/use-operational-snapshot';
import { fixtureOperationalRepository } from '@/features/operations-home/repositories/fixture-operational-repository';

const labels: Record<OperationalState, string> = { normal: 'Normal', attention: 'Atenção', decision: 'Decisão', critical: 'Crítico' };
const badges: Record<OperationalState, string> = { normal: 'bg-emerald-50 text-emerald-800', attention: 'bg-amber-50 text-amber-900', decision: 'bg-orange-50 text-orange-900', critical: 'bg-rose-50 text-rose-900' };

const ExceptionsCenterPage = () => {
  const snapshotState = useOperationalSnapshot(fixtureOperationalRepository);
  const [selectedId, setSelectedId] = useState<string>();
  const [resolvedIds, setResolvedIds] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => getVisibleExceptions(snapshotState.snapshot?.items ?? [], resolvedIds, query), [query, resolvedIds, snapshotState.snapshot]);
  const selected = getSelectedException(visible, selectedId);

  if (snapshotState.status === 'loading') return <OperationalLoading />;
  if (snapshotState.status === 'error') return <OperationalError onRetry={snapshotState.retry} />;

  const resolveSelected = async () => {
    if (!selected || snapshotState.snapshot.quality === 'offline') return;
    await fixtureOperationalRepository.resolveException(selected.id);
    setResolvedIds((current) => [...current, selected.id]);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <DataQualityBanner quality={snapshotState.snapshot.quality} updatedAt={snapshotState.snapshot.updatedAt} />
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Trabalho por exceção</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Central de Exceções</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Um lugar único para entender, decidir e auditar o que saiu do fluxo normal.</p></div><div className="flex gap-2"><span className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">1 crítica</span><span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-800 ring-1 ring-orange-200">2 decisões</span></div></header>
      <div className="grid min-h-[610px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="border-b border-slate-200 lg:border-b-0 lg:border-r" aria-label="Fila de exceções">
          <div className="border-b border-slate-100 p-4"><label className="relative block"><span className="sr-only">Buscar exceções</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Buscar por pessoa ou assunto" /></label><div className="mt-3 flex gap-2"><button type="button" className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Prioridade</button><button type="button" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Responsável</button><button type="button" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Prazo</button></div></div>
          <div className="divide-y divide-slate-100">{visible.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${selected?.id === item.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badges[item.state]}`}>{labels[item.state]}</span><span className="flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3.5 w-3.5" />{item.dueLabel}</span></div><strong className="mt-3 block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{item.subject}</span><span className="mt-3 block text-[11px] font-medium text-slate-400">Responsável · {item.owner}</span></button>)}</div>
        </section>
        <section className="p-5 sm:p-7 lg:p-9" aria-live="polite">{selected ? <><div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between"><div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badges[selected.state]}`}>{labels[selected.state]}</span><h2 className="mt-3 text-2xl font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.subject}</p></div>{selected.state === 'critical' ? <ShieldAlert className="h-9 w-9 text-rose-500" /> : <AlertTriangle className="h-9 w-9 text-amber-500" />}</div><div className="grid gap-7 py-7 xl:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Por que foi sinalizado</p><ul className="mt-4 space-y-3">{selected.evidence.map((evidence) => <li key={evidence} className="flex gap-3 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />{evidence}</li>)}</ul></div><div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700"><Sparkles className="h-4 w-4" /> Recomendação</div><p className="mt-3 text-sm leading-6 text-slate-700">{selected.recommendation}</p><p className="mt-4 text-xs text-slate-500">Proposta baseada nas regras vigentes. A decisão fica registrada na trilha de auditoria.</p></div></div><div className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Próxima ação</p><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{selected.primaryAction}</p><p className="mt-1 text-xs text-slate-500">Responsável: {selected.owner} · Prazo: {selected.dueLabel}</p></div><button type="button" disabled={snapshotState.snapshot.quality === 'offline'} onClick={resolveSelected} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">Registrar decisão <ArrowRight className="h-4 w-4" /></button></div></div></> : <div className="grid h-full place-items-center text-center"><div><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h2 className="mt-4 text-xl font-semibold">Fila tratada</h2><p className="mt-2 text-sm text-slate-500">Nenhuma exceção depende de você agora.</p></div></div>}</section>
      </div>
    </div>
  );
};

export default ExceptionsCenterPage;
