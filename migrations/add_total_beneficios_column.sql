-- Adicionar coluna total_beneficios na tabela folha_calculada
-- Para manter consistência com total_proventos e total_descontos

ALTER TABLE folha_calculada 
ADD COLUMN total_beneficios DECIMAL(10,2) DEFAULT 0.00;

-- Comentário da coluna
COMMENT ON COLUMN folha_calculada.total_beneficios IS 'Total de benefícios (VT, VA, cesta básica, prêmio permanência, etc.) incluindo eventos excepcionais de benefícios';

-- Atualizar registros existentes com valor 0 (será recalculado pelo sistema)
UPDATE folha_calculada 
SET total_beneficios = 0.00 
WHERE total_beneficios IS NULL;