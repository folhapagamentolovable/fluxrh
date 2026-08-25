-- Migração: Adicionar novos eventos excepcionais (proventos) na tabela folha_calculada
-- Data: 2025-01-12
-- Descrição: Adiciona campos para 13º salário (1ª e 2ª parcela), 13º vantagens e folga trabalhada

-- Adicionar colunas de novos eventos excepcionais (proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_primeira_parcela DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS decimo_terceiro_vantagens_primeira_parcela DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS decimo_terceiro_segunda_parcela DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS decimo_terceiro_vantagens_segunda_parcela DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS folga_trabalhada DECIMAL(10,2) DEFAULT 0.00;

-- Adicionar comentários para documentação
COMMENT ON COLUMN folha_calculada.decimo_terceiro_primeira_parcela IS '13º salário 1ª parcela (em reais)';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_vantagens_primeira_parcela IS '13º salário vantagens 1ª parcela (em reais)';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_segunda_parcela IS '13º salário 2ª parcela (em reais)';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_vantagens_segunda_parcela IS '13º salário vantagens 2ª parcela (em reais)';
COMMENT ON COLUMN folha_calculada.folga_trabalhada IS 'Folga trabalhada - FT (em reais)';

-- Criar índice para consultas por funcionário e mês (otimização)
CREATE INDEX IF NOT EXISTS idx_folha_calculada_novos_eventos 
ON folha_calculada (funcionario_id, mes, ano) 
WHERE (
    decimo_terceiro_primeira_parcela > 0 OR
    decimo_terceiro_vantagens_primeira_parcela > 0 OR
    decimo_terceiro_segunda_parcela > 0 OR
    decimo_terceiro_vantagens_segunda_parcela > 0 OR
    folga_trabalhada > 0
);

-- Verificar se as colunas foram criadas
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name IN (
    'decimo_terceiro_primeira_parcela',
    'decimo_terceiro_vantagens_primeira_parcela',
    'decimo_terceiro_segunda_parcela',
    'decimo_terceiro_vantagens_segunda_parcela',
    'folga_trabalhada'
)
ORDER BY column_name;