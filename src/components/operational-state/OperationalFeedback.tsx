import { AlertTriangle, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react';
import type { OperationalDataQuality } from '@/domain/operations/operational-repository';

export const OperationalLoading = () => <div className="grid min-h-[55vh] place-items-center" role="status"><div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-blue-600" /><p className="mt-3 text-sm font-medium text-slate-600">Sincronizando a operação…</p></div></div>;

export const OperationalError = ({ onRetry }: { onRetry: () => void }) => <div className="grid min-h-[55vh] place-items-center"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm"><AlertTriangle className="mx-auto h-9 w-9 text-rose-500" /><h1 className="mt-4 text-lg font-semibold">Operação indisponível</h1><p className="mt-2 text-sm leading-6 text-slate-600">Os dados não puderam ser carregados. Nenhuma ação foi executada.</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div></div>;

export const DataQualityBanner = ({ quality, updatedAt }: { quality: OperationalDataQuality; updatedAt: string }) => {
  if (quality === 'fresh') return null;
  const offline = quality === 'offline';
  return <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${offline ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-900'}`} role="status"><div className="flex items-start gap-3">{offline ? <CloudOff className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<div><strong>{offline ? 'Você está offline' : 'Atualização parcial'}</strong><p className="mt-0.5 text-xs opacity-80">{offline ? 'Exibindo a última visão disponível. Ações ficam protegidas até reconectar.' : 'Um dos monitores está atrasado; decisões críticas continuam bloqueadas.'}</p></div></div><span className="text-xs font-medium">Atualizado {updatedAt}</span></div>;
};
