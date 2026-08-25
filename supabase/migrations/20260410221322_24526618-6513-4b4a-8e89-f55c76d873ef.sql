-- 1. Enable RLS on postos_trabalho
ALTER TABLE public.postos_trabalho ENABLE ROW LEVEL SECURITY;

-- 2. Drop the overly permissive SELECT policy that allows any authenticated user
DROP POLICY IF EXISTS "admins_postos_all" ON public.postos_trabalho;

-- 3. Enable RLS on backup table and lock it down
ALTER TABLE public.folha_calculada_backup_eventos_20260301 ENABLE ROW LEVEL SECURITY;

-- Admin-only access to backup table
CREATE POLICY "admin_only_backup"
ON public.folha_calculada_backup_eventos_20260301
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 4. Fix the SECURITY DEFINER view by recreating as SECURITY INVOKER
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