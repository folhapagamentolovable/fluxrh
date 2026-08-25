
CREATE OR REPLACE FUNCTION public.sync_funcionario_cascata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nome_completo IS DISTINCT FROM OLD.nome_completo
     OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
     OR NEW.posto_trabalho_id IS DISTINCT FROM OLD.posto_trabalho_id
     OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id
     OR NEW.codigo_escala IS DISTINCT FROM OLD.codigo_escala
     OR NEW.nome_posto IS DISTINCT FROM OLD.nome_posto
  THEN
    UPDATE public.folha_calculada
       SET nome_funcionario = NEW.nome_completo,
           empresa_id = NEW.empresa_id,
           posto_trabalho_id = NEW.posto_trabalho_id
     WHERE funcionario_id = NEW.id;

    UPDATE public.folhas_ponto
       SET nome_funcionario = NEW.nome_completo,
           empresa_id = NEW.empresa_id,
           posto_trabalho_id = NEW.posto_trabalho_id,
           cargo_id = NEW.cargo_id
     WHERE funcionario_id = NEW.id;

    UPDATE public.escala_mensal
       SET nome_funcionario = NEW.nome_completo,
           empresa_id = NEW.empresa_id,
           posto_trabalho_id = NEW.posto_trabalho_id,
           cargo_id = NEW.cargo_id
     WHERE funcionario_id = NEW.id;

    UPDATE public.ferias
       SET nome_funcionario = NEW.nome_completo
     WHERE funcionario_id = NEW.id;

    UPDATE public.folha_ponto_automatica
       SET nome_funcionario = NEW.nome_completo,
           nome_posto = NEW.nome_posto,
           posto_trabalho_id = NEW.posto_trabalho_id
     WHERE funcionario_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_funcionario_cascata ON public.funcionarios;
CREATE TRIGGER trg_sync_funcionario_cascata
AFTER UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.sync_funcionario_cascata();
