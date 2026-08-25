import { lazy, Suspense } from 'react';

const OperationsHomePage = lazy(() => import('@/features/operations-home/OperationsHomePage'));

export const OperationsRoute = () => (
  <Suspense fallback={(
    <div className="flex min-h-[45vh] items-center justify-center" role="status">
      <span className="sr-only">Carregando operação</span>
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  )}>
    <OperationsHomePage />
  </Suspense>
);
