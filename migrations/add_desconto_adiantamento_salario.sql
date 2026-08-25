-- Migração: Adicionar coluna desconto_adiantamento_salario na tabela folha_calculada
-- Data: 2025-12-23
-- Descrição: Adiciona novo campo para desconto de adiantamento de salário

-- Adicionar a nova coluna
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS desconto_adiantamento_salario DECIMAL(10,2) DEFAULT 0.00;

-- Comentário da coluna
COMMENT ON COLUMN folha_calculada.desconto_adiantamento_salario IS 'Desconto de adiantamento de salário (valor manual)';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name = 'desconto_adiantamento_salario';