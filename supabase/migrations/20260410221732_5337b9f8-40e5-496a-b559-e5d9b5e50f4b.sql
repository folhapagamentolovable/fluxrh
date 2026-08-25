-- 1. Disable RLS on postos_trabalho
ALTER TABLE public.postos_trabalho DISABLE ROW LEVEL SECURITY;

-- 2. Re-create the permissive SELECT policy
CREATE POLICY "admins_postos_all"
ON public.postos_trabalho
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- 3. Disable RLS on backup table and drop admin-only policy
DROP POLICY IF EXISTS "admin_only_backup" ON public.folha_calculada_backup_eventos_20260301;
ALTER TABLE public.folha_calculada_backup_eventos_20260301 DISABLE ROW LEVEL SECURITY;

-- 4. Revert view to default (security invoker false = security definer behavior)
DROP VIEW IF EXISTS public.vw_banco_horas_mensal;

CREATE VIEW public.vw_banco_horas_mensal AS
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