-- Adiciona cidade e estado na tabela feriados
-- para suporte a feriados municipais/estaduais por localidade
ALTER TABLE feriados
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT;

-- Feriados nacionais existentes: sem cidade/estado (valem para todos)
-- Feriados estaduais existentes: estado = 'SP'
UPDATE feriados SET estado = 'SP'
WHERE tipo_feriado = 'estadual' AND estado IS NULL;

-- Feriados municipais existentes: cidade = 'Campinas', estado = 'SP'
UPDATE feriados SET cidade = 'Campinas', estado = 'SP'
WHERE tipo_feriado = 'municipal' AND cidade IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_feriados_cidade ON feriados (cidade);
CREATE INDEX IF NOT EXISTS idx_feriados_estado ON feriados (estado);
CREATE INDEX IF NOT EXISTS idx_feriados_tipo ON feriados (tipo_feriado);
