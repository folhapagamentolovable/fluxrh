
-- 1. Enable RLS on postos_trabalho
ALTER TABLE public.postos_trabalho ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins têm acesso total a postos_trabalho" ON public.postos_trabalho;
DROP POLICY IF EXISTS "Users podem ler postos_trabalho" ON public.postos_trabalho;
DROP POLICY IF EXISTS "Managers podem ler postos de suas empresas" ON public.postos_trabalho;

-- Admin: full CRUD
CREATE POLICY "Admins têm acesso total a postos_trabalho"
  ON public.postos_trabalho FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Manager: read posts from their companies
CREATE POLICY "Managers podem ler postos de suas empresas"
  ON public.postos_trabalho FOR SELECT
  TO authenticated
  USING (
    public.is_manager(auth.uid())
    AND public.manager_has_empresa_access(auth.uid(), empresa_id)
  );

-- Authenticated users: read only
CREATE POLICY "Users autenticados podem ler postos_trabalho"
  ON public.postos_trabalho FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 2. Fix security definer view
DROP VIEW IF EXISTS public.vw_banco_horas_mensal;
CREATE VIEW public.vw_banco_horas_mensal
WITH (security_invoker = true)
AS
SELECT
  bh.id,
  bh.funcionario_id,
  bh.mes,
  bh.ano,
  bh.minutos_entrada,
  bh.minutos_saida,
  bh.minutos_total,
  bh.dias_com_banco,
  bh.dias_trabalhados,
  bh.data_calculo,
  bh.atualizado_em,
  bh.created_at,
  f.nome_completo,
  f.codigo_escala,
  f.cargo_id,
  f.empresa_id,
  f.posto_trabalho_id,
  c.nome_cargo,
  e.nome_empresa
FROM banco_horas_mensal bh
JOIN funcionarios f ON bh.funcionario_id = f.id
LEFT JOIN cargos c ON f.cargo_id = c.id
LEFT JOIN empresas e ON f.empresa_id = e.id;

-- 3. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 4. Schedule monthly cleanup on the 1st of each month at 03:00 UTC
SELECT cron.schedule(
  'limpar-nao-conformidades-mensalmente',
  '0 3 1 * *',
  $$SELECT public.limpar_nao_conformidades_antigas()$$
);
