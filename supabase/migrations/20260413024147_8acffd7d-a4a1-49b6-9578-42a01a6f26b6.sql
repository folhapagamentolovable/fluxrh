-- Fix view to use security_invoker = true
DROP VIEW IF EXISTS public.vw_funcionarios_cliente;
CREATE VIEW public.vw_funcionarios_cliente
WITH (security_invoker = true)
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

GRANT SELECT ON public.vw_funcionarios_cliente TO authenticated;