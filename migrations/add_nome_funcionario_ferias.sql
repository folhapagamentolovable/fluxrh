-- Adiciona coluna nome_funcionario na tabela ferias
ALTER TABLE ferias
  ADD COLUMN IF NOT EXISTS nome_funcionario TEXT;

-- Preenche os registros existentes com o nome do funcionário
UPDATE ferias f
SET nome_funcionario = func.nome_completo
FROM funcionarios func
WHERE f.funcionario_id = func.id
  AND f.nome_funcionario IS NULL;

-- Cria trigger para manter nome_funcionario atualizado automaticamente
CREATE OR REPLACE FUNCTION sync_ferias_nome_funcionario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT nome_completo INTO NEW.nome_funcionario
  FROM funcionarios
  WHERE id = NEW.funcionario_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_nome_funcionario ON ferias;
CREATE TRIGGER trg_ferias_nome_funcionario
  BEFORE INSERT OR UPDATE OF funcionario_id ON ferias
  FOR EACH ROW EXECUTE FUNCTION sync_ferias_nome_funcionario();

-- Verificar resultado
SELECT id, funcionario_id, nome_funcionario, periodo_aquisitivo, status
FROM ferias
ORDER BY nome_funcionario, periodo_aquisitivo
LIMIT 20;
