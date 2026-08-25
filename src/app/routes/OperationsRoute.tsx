import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { ProductAreaPage } from '@/features/product-areas/ProductAreaPage';

const OperationsHomePage = lazy(() => import('@/features/operations-home/OperationsHomePage'));
const ExceptionsCenterPage = lazy(() => import('@/features/exceptions-center/ExceptionsCenterPage'));

export const OperationsRoute = () => (
  <AppShell>
    <Suspense fallback={<div className="flex min-h-[45vh] items-center justify-center" role="status"><span className="sr-only">Carregando operação</span><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>}>
      <Routes>
        <Route index element={<OperationsHomePage />} />
        <Route path="excecoes" element={<ExceptionsCenterPage />} />
        <Route path="pessoas" element={<ProductAreaPage area="pessoas" />} />
        <Route path="jornada" element={<ProductAreaPage area="jornada" />} />
        <Route path="remuneracao" element={<ProductAreaPage area="remuneracao" />} />
        <Route path="processos" element={<ProductAreaPage area="processos" />} />
        <Route path="analytics" element={<ProductAreaPage area="analytics" />} />
        <Route path="automacao" element={<ProductAreaPage area="automacao" />} />
        <Route path="ai" element={<ProductAreaPage area="ai" />} />
        <Route path="configuracoes" element={<ProductAreaPage area="configuracoes" />} />
        <Route path="*" element={<Navigate to="/operacao" replace />} />
      </Routes>
    </Suspense>
  </AppShell>
);
