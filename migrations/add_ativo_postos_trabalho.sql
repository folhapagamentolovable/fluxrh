-- Adiciona campo 'ativo' na tabela postos_trabalho
-- Postos inativos não aparecem nos QR Codes mas preservam o histórico
ALTER TABLE postos_trabalho ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Marcar todos os existentes como ativos
UPDATE postos_trabalho SET ativo = true WHERE ativo IS NULL;
