-- Migração para adicionar colunas de 13º Salário Integral na tabela folha_calculada
-- Novas colunas para eventos excepcionais de 13º salário

-- === PROVENTOS ===
-- Adicionar coluna decimo_terceiro_integral (13º Salário Integral)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_integral DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN folha_calculada.decimo_terceiro_integral IS '13º Salário Integral - Provento excepcional';

-- Adicionar coluna vantagens_13 (Vantagens 13º)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS vantagens_13 DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN folha_calculada.vantagens_13 IS 'Vantagens 13º - Provento excepcional';

-- === DESCONTOS ===
-- Adicionar coluna adiantamento_13_salario (Adiantam. 13º Salário)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS adiantamento_13_salario DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN folha_calculada.adiantamento_13_salario IS 'Adiantamento 13º Salário - Desconto excepcional';

-- Adicionar coluna adiantamento_vantagens_13 (Adiantam. Vantagens 13º)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS adiantamento_vantagens_13 DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN folha_calculada.adiantamento_vantagens_13 IS 'Adiantamento Vantagens 13º - Desconto excepcional';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name IN ('decimo_terceiro_integral', 'vantagens_13', 'adiantamento_13_salario', 'adiantamento_vantagens_13');
