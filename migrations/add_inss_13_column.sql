-- Migração para adicionar coluna inss_13 na tabela folha_calculada
-- Esta coluna armazena o valor do desconto de INSS sobre o 13º salário

-- Adicionar coluna inss_13 à tabela folha_calculada
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS inss_13 DECIMAL(10,2) DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN folha_calculada.inss_13 IS 'Desconto de INSS sobre o 13º salário';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name = 'inss_13';
