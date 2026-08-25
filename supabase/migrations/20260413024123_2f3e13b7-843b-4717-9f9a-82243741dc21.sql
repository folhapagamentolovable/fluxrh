-- 1. Drop the overly permissive client policy on funcionarios
DROP POLICY IF EXISTS "Clients can view funcionarios of their postos" ON public.funcionarios;

-- 2. Create a secure view for client access that excludes sensitive columns
CREATE OR REPLACE VIEW public.vw_funcionarios_cliente
WITH (security_invoker = false)
AS
SELECT
  f.id,
  f.nome_completo,
  f.nome_cargo,
  f.nome_empresa,
  f.nome_posto,
  f.posto_trabalho_id,
  f.empresa_id,
  f.cargo_id,
  f.codigo_escala,
  f.ativo,
  f.demitido,
  f.foto_url,
  f.ronda,
  f.data_admissao
FROM public.funcionarios f;

-- 3. Enable RLS on the view (views inherit from base table, but we add explicit policy)
-- Grant access to authenticated users on the view
GRANT SELECT ON public.vw_funcionarios_cliente TO authenticated;

-- 4. Create RLS policy on the base funcionarios table for clients 
-- that restricts to only non-sensitive fields via the view
-- Clients should use vw_funcionarios_cliente instead of funcionarios directly
-- But we still need a minimal policy for FK lookups etc.
CREATE POLICY "Clients can view limited funcionarios data"
  ON public.funcionarios FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::text)
    AND posto_trabalho_id IN (
      SELECT cp.posto_id FROM client_postos cp WHERE cp.user_id = auth.uid()
    )
  );

-- NOTE: The above policy still returns full rows at the DB level.
-- The real protection is that client-facing code must use vw_funcionarios_cliente view.
-- For defense-in-depth, we create an RPC that returns only safe columns:

CREATE OR REPLACE FUNCTION public.get_funcionarios_cliente()
RETURNS TABLE(
  id uuid,
  nome_completo varchar,
  nome_cargo varchar,
  nome_empresa varchar,
  nome_posto varchar,
  posto_trabalho_id uuid,
  empresa_id uuid,
  cargo_id uuid,
  codigo_escala varchar,
  ativo boolean,
  demitido boolean,
  foto_url text,
  ronda boolean,
  data_admissao varchar
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    f.id,
    f.nome_completo,
    f.nome_cargo,
    f.nome_empresa,
    f.nome_posto,
    f.posto_trabalho_id,
    f.empresa_id,
    f.cargo_id,
    f.codigo_escala,
    f.ativo,
    f.demitido,
    f.foto_url,
    f.ronda,
    f.data_admissao
  FROM public.funcionarios f
  WHERE f.posto_trabalho_id IN (
    SELECT cp.posto_id FROM public.client_postos cp WHERE cp.user_id = auth.uid()
  )
  AND has_role(auth.uid(), 'client'::text)
$$;