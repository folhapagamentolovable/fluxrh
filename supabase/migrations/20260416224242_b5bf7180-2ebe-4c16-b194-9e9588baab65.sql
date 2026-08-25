
-- Add nome_funcionario column to all rondas tables
ALTER TABLE public.rondas_leituras ADD COLUMN IF NOT EXISTS nome_funcionario text;
ALTER TABLE public.rondas_sessoes ADD COLUMN IF NOT EXISTS nome_funcionario text;
ALTER TABLE public.rondas_nao_conformidades ADD COLUMN IF NOT EXISTS nome_funcionario text;
ALTER TABLE public.rq_execucoes ADD COLUMN IF NOT EXISTS nome_funcionario text;
ALTER TABLE public.rq_leituras ADD COLUMN IF NOT EXISTS nome_funcionario text;

-- Backfill existing rows from funcionarios table
UPDATE public.rondas_leituras r SET nome_funcionario = f.nome_completo
  FROM public.funcionarios f WHERE f.id = r.funcionario_id AND r.nome_funcionario IS NULL;
UPDATE public.rondas_sessoes r SET nome_funcionario = f.nome_completo
  FROM public.funcionarios f WHERE f.id = r.funcionario_id AND r.nome_funcionario IS NULL;
UPDATE public.rondas_nao_conformidades r SET nome_funcionario = f.nome_completo
  FROM public.funcionarios f WHERE f.id = r.funcionario_id AND r.nome_funcionario IS NULL;
UPDATE public.rq_execucoes r SET nome_funcionario = f.nome_completo
  FROM public.funcionarios f WHERE f.id = r.funcionario_id AND r.nome_funcionario IS NULL;
UPDATE public.rq_leituras r SET nome_funcionario = f.nome_completo
  FROM public.funcionarios f WHERE f.id = r.funcionario_id AND r.nome_funcionario IS NULL;

-- Generic trigger function to auto-populate nome_funcionario from funcionario_id
CREATE OR REPLACE FUNCTION public.sync_nome_funcionario_rondas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.funcionario_id IS NOT NULL AND (NEW.nome_funcionario IS NULL OR NEW.nome_funcionario = '' OR (TG_OP = 'UPDATE' AND NEW.funcionario_id IS DISTINCT FROM OLD.funcionario_id)) THEN
    SELECT nome_completo INTO NEW.nome_funcionario
    FROM public.funcionarios
    WHERE id = NEW.funcionario_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers for each table
DROP TRIGGER IF EXISTS trg_sync_nome_rondas_leituras ON public.rondas_leituras;
CREATE TRIGGER trg_sync_nome_rondas_leituras
  BEFORE INSERT OR UPDATE ON public.rondas_leituras
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_funcionario_rondas();

DROP TRIGGER IF EXISTS trg_sync_nome_rondas_sessoes ON public.rondas_sessoes;
CREATE TRIGGER trg_sync_nome_rondas_sessoes
  BEFORE INSERT OR UPDATE ON public.rondas_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_funcionario_rondas();

DROP TRIGGER IF EXISTS trg_sync_nome_rondas_nao_conformidades ON public.rondas_nao_conformidades;
CREATE TRIGGER trg_sync_nome_rondas_nao_conformidades
  BEFORE INSERT OR UPDATE ON public.rondas_nao_conformidades
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_funcionario_rondas();

DROP TRIGGER IF EXISTS trg_sync_nome_rq_execucoes ON public.rq_execucoes;
CREATE TRIGGER trg_sync_nome_rq_execucoes
  BEFORE INSERT OR UPDATE ON public.rq_execucoes
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_funcionario_rondas();

DROP TRIGGER IF EXISTS trg_sync_nome_rq_leituras ON public.rq_leituras;
CREATE TRIGGER trg_sync_nome_rq_leituras
  BEFORE INSERT OR UPDATE ON public.rq_leituras
  FOR EACH ROW EXECUTE FUNCTION public.sync_nome_funcionario_rondas();
