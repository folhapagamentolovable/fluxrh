
-- ============================================================
-- DROP das tabelas legadas do sistema simples de rondas
-- (substituídas pelo sistema unificado rq_*)
-- ============================================================
DROP TABLE IF EXISTS public.rondas_leituras CASCADE;
DROP TABLE IF EXISTS public.rondas_sessoes CASCADE;
DROP TABLE IF EXISTS public.rondas_pontos_qrcode CASCADE;
DROP TABLE IF EXISTS public.rondas_horarios CASCADE;
DROP TABLE IF EXISTS public.rondas_pausas CASCADE;
DROP TABLE IF EXISTS public.rondas_nao_realizadas CASCADE;
