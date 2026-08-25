-- Adiciona coluna funcionarios_ids em rondas_horarios
-- para correlacionar vigias às rondas cadastradas
ALTER TABLE rondas_horarios
  ADD COLUMN IF NOT EXISTS funcionarios_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Índice para buscas por funcionário
CREATE INDEX IF NOT EXISTS idx_rondas_horarios_funcionarios
  ON rondas_horarios USING GIN (funcionarios_ids);
