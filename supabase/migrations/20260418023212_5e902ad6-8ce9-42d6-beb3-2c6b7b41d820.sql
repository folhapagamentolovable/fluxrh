-- Corrige policies de INSERT/UPDATE em rq_execucoes
DROP POLICY IF EXISTS rq_execucoes_func_insert ON public.rq_execucoes;
CREATE POLICY rq_execucoes_func_insert ON public.rq_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS rq_execucoes_func_update ON public.rq_execucoes;
CREATE POLICY rq_execucoes_func_update ON public.rq_execucoes
  FOR UPDATE TO authenticated
  USING (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  )
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
  );

-- Corrige policy de INSERT em rq_leituras
DROP POLICY IF EXISTS rq_leituras_func_insert ON public.rq_leituras;
CREATE POLICY rq_leituras_func_insert ON public.rq_leituras
  FOR INSERT TO authenticated
  WITH CHECK (
    funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
    AND execucao_id IN (
      SELECT id FROM public.rq_execucoes
      WHERE funcionario_id IN (SELECT id FROM public.funcionarios WHERE user_id = auth.uid())
    )
  );