-- Migração: Adicionar colunas de eventos excepcionais (proventos) na tabela folha_calculada
-- Data: 2025-01-11
-- Descrição: Adiciona campos para 13º proporcional, férias proporcionais, PLR e outros eventos de rescisão

-- Adicionar colunas de eventos excepcionais (proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_proporcional_rescisao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ferias_proporcionais_rescisao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS um_terco_ferias_proporcional_rescisao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS plr_proporcional_rescisao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS decimo_terceiro_vantagens_rescisao DECIMAL(10,2) DEFAULT 0.00;

-- Adicionar comentários para documentação
COMMENT ON COLUMN folha_calculada.decimo_terceiro_proporcional_rescisao IS '13º salário proporcional na rescisão (em reais)';
COMMENT ON COLUMN folha_calculada.ferias_proporcionais_rescisao IS 'Férias proporcionais na rescisão (em reais)';
COMMENT ON COLUMN folha_calculada.um_terco_ferias_proporcional_rescisao IS '1/3 das férias proporcionais na rescisão (em reais)';
COMMENT ON COLUMN folha_calculada.plr_proporcional_rescisao IS 'PLR proporcional na rescisão (em reais)';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_vantagens_rescisao IS '13º salário com vantagens na rescisão (em reais)';

-- Criar índice para consultas por funcionário e mês (otimização)
CREATE INDEX IF NOT EXISTS idx_folha_calculada_eventos_excepcionais 
ON folha_calculada (funcionario_id, mes, ano) 
WHERE (
    decimo_terceiro_proporcional_rescisao > 0 OR
    ferias_proporcionais_rescisao > 0 OR
    um_terco_ferias_proporcional_rescisao > 0 OR
    plr_proporcional_rescisao > 0 OR
    decimo_terceiro_vantagens_rescisao > 0
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
    'decimo_terceiro_proporcional_rescisao',
    'ferias_proporcionais_rescisao', 
    'um_terco_ferias_proporcional_rescisao',
    'plr_proporcional_rescisao',
    'decimo_terceiro_vantagens_rescisao'
)
ORDER BY column_name;