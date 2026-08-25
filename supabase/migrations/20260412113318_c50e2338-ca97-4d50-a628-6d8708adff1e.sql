
-- Trigger: Sincronizar nome_empresa em funcionarios quando empresas.nome_empresa mudar
CREATE OR REPLACE FUNCTION public.sync_nome_empresa_funcionarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.nome_empresa IS DISTINCT FROM OLD.nome_empresa THEN
        UPDATE funcionarios
        SET nome_empresa = NEW.nome_empresa
        WHERE empresa_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_nome_empresa_funcionarios
AFTER UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION sync_nome_empresa_funcionarios();

-- Trigger: Sincronizar nome_posto em funcionarios quando postos_trabalho mudar
CREATE OR REPLACE FUNCTION public.sync_nome_posto_funcionarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.nome_posto IS DISTINCT FROM OLD.nome_posto THEN
        UPDATE funcionarios
        SET nome_posto = NEW.nome_posto
        WHERE posto_trabalho_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_nome_posto_funcionarios
AFTER UPDATE ON postos_trabalho
FOR EACH ROW
EXECUTE FUNCTION sync_nome_posto_funcionarios();

-- Trigger: Sincronizar nome_cargo em funcionarios quando cargos.nome_cargo mudar
CREATE OR REPLACE FUNCTION public.sync_nome_cargo_funcionarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.nome_cargo IS DISTINCT FROM OLD.nome_cargo THEN
        UPDATE funcionarios
        SET nome_cargo = NEW.nome_cargo
        WHERE cargo_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_nome_cargo_funcionarios
AFTER UPDATE ON cargos
FOR EACH ROW
EXECUTE FUNCTION sync_nome_cargo_funcionarios();

-- Trigger: Sincronizar codigo_escala em funcionarios quando regras_escalas.codigo_escala mudar
CREATE OR REPLACE FUNCTION public.sync_codigo_escala_funcionarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NEW.codigo_escala IS DISTINCT FROM OLD.codigo_escala THEN
        UPDATE funcionarios f
        SET codigo_escala = NEW.codigo_escala
        FROM cargos c
        WHERE c.id = f.cargo_id
          AND (c.regra_escala_id = NEW.id OR c.escala_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_codigo_escala_funcionarios
AFTER UPDATE ON regras_escalas
FOR EACH ROW
EXECUTE FUNCTION sync_codigo_escala_funcionarios();
