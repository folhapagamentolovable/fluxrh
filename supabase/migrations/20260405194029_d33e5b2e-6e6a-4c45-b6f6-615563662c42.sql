
-- =============================================
-- FIX 1: Enable RLS on banco_horas_mensal
-- =============================================
ALTER TABLE public.banco_horas_mensal ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins têm acesso total a banco_horas_mensal"
  ON public.banco_horas_mensal FOR ALL TO public
  USING (is_admin()) WITH CHECK (is_admin());

-- Employees can view their own records
CREATE POLICY "Funcionarios podem ver seu proprio banco de horas"
  ON public.banco_horas_mensal FOR SELECT TO public
  USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ));

-- Managers can view records of their assigned companies
CREATE POLICY "Managers podem ver banco de horas das suas empresas"
  ON public.banco_horas_mensal FOR SELECT TO public
  USING (is_manager(auth.uid()) AND (
    funcionario_id IN (
      SELECT f.id FROM public.funcionarios f
      JOIN public.manager_empresas me ON me.empresa_id = f.empresa_id
      WHERE me.user_id = auth.uid()
    )
  ));

-- =============================================
-- FIX 2: Fix rondas tables overly permissive policies
-- =============================================

-- rondas_sessoes: replace blanket ALL with scoped policies
DROP POLICY IF EXISTS "rondas_sessoes_all" ON public.rondas_sessoes;

CREATE POLICY "rondas_sessoes_admin"
  ON public.rondas_sessoes FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "rondas_sessoes_employee_own"
  ON public.rondas_sessoes FOR ALL TO authenticated
  USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ))
  WITH CHECK (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ));

CREATE POLICY "rondas_sessoes_manager_select"
  ON public.rondas_sessoes FOR SELECT TO authenticated
  USING (is_manager(auth.uid()) AND (
    funcionario_id IN (
      SELECT f.id FROM public.funcionarios f
      JOIN public.manager_empresas me ON me.empresa_id = f.empresa_id
      WHERE me.user_id = auth.uid()
    )
  ));

-- rondas_leituras: replace blanket ALL with scoped policies
DROP POLICY IF EXISTS "rondas_leituras_all" ON public.rondas_leituras;

CREATE POLICY "rondas_leituras_admin"
  ON public.rondas_leituras FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "rondas_leituras_employee_own"
  ON public.rondas_leituras FOR ALL TO authenticated
  USING (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ))
  WITH CHECK (funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  ));

CREATE POLICY "rondas_leituras_manager_select"
  ON public.rondas_leituras FOR SELECT TO authenticated
  USING (is_manager(auth.uid()) AND (
    funcionario_id IN (
      SELECT f.id FROM public.funcionarios f
      JOIN public.manager_empresas me ON me.empresa_id = f.empresa_id
      WHERE me.user_id = auth.uid()
    )
  ));

-- rondas_nao_realizadas: replace blanket ALL with admin/manager only (no funcionario_id column)
DROP POLICY IF EXISTS "rondas_nao_realizadas_all" ON public.rondas_nao_realizadas;

CREATE POLICY "rondas_nao_realizadas_admin"
  ON public.rondas_nao_realizadas FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "rondas_nao_realizadas_read"
  ON public.rondas_nao_realizadas FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- =============================================
-- FIX 3: Restrict manager postos_trabalho policy
-- =============================================
DROP POLICY IF EXISTS "Managers podem gerenciar postos_trabalho" ON public.postos_trabalho;

CREATE POLICY "Managers podem gerenciar postos das suas empresas"
  ON public.postos_trabalho FOR ALL TO authenticated
  USING (
    is_manager(auth.uid()) AND empresa_id IN (
      SELECT empresa_id FROM public.manager_empresas
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_manager(auth.uid()) AND empresa_id IN (
      SELECT empresa_id FROM public.manager_empresas
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- FIX 4: Fix funcionario-fotos open SELECT policy
-- =============================================
DROP POLICY IF EXISTS "Qualquer um pode ver fotos" ON storage.objects;

CREATE POLICY "Authenticated users can view employee photos"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'funcionario-fotos'
    AND auth.uid() IS NOT NULL
  );
