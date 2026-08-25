-- Migration: Adicionar campos para novos eventos excepcionais
-- Data: 2026-03-01
-- Descrição: Adiciona campos para Serviços Externos e Reembolsos

-- ============================================
-- TABELA: folha_calculada
-- ============================================

-- Adicionar campos de Serviços Externos (Proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS servicos_externos_folhas_pagamento DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS servicos_externos_controle_rondas DECIMAL(10,2) DEFAULT 0;

-- Adicionar campo de Reembolsos (Benefícios)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS reembolsos_uber DECIMAL(10,2) DEFAULT 0;

-- Adicionar campo de Supervisão Palmeiras (Proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS supervisao_palmeiras DECIMAL(10,2) DEFAULT 0;

-- Adicionar campo de Folga Trabalhada (Proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS folga_trabalhada DECIMAL(10,2) DEFAULT 0;

-- Adicionar campos de 13º Salário (Proventos)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_primeira_parcela DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_segunda_parcela DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_vantagens_primeira_parcela DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_vantagens_segunda_parcela DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS decimo_terceiro_integral DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS vantagens_13 DECIMAL(10,2) DEFAULT 0;

-- Adicionar campos de Descontos
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS inss_13 DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS inss_ferias DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS adiantamento_13_salario DECIMAL(10,2) DEFAULT 0;

ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS adiantamento_vantagens_13 DECIMAL(10,2) DEFAULT 0;

-- Adicionar campo JSON para eventos excepcionais personalizados
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS eventos_excepcionais JSONB;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN folha_calculada.servicos_externos_folhas_pagamento IS 'Código 0305 - Folhas de Pagamento';
COMMENT ON COLUMN folha_calculada.servicos_externos_controle_rondas IS 'Código 0306 - Controle de Rondas Palmeiras';
COMMENT ON COLUMN folha_calculada.supervisao_palmeiras IS 'Código 0307 - Supervisão Palmeiras';
COMMENT ON COLUMN folha_calculada.folga_trabalhada IS 'Código 0305 - FT (Folga Trabalhada)';
COMMENT ON COLUMN folha_calculada.reembolsos_uber IS 'Código B010 - Reembolsos';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_primeira_parcela IS 'Código 0522 - 13º Salário 1ª Parcela';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_segunda_parcela IS 'Código 0523 - 13º Salário 2ª Parcela';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_vantagens_primeira_parcela IS 'Código 0524 - 13º Salário Vantagens 1ª Parcela';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_vantagens_segunda_parcela IS 'Código 0525 - 13º Salário Vantagens 2ª Parcela';
COMMENT ON COLUMN folha_calculada.decimo_terceiro_integral IS 'Código 0520 - 13º Salário';
COMMENT ON COLUMN folha_calculada.vantagens_13 IS 'Código 0521 - Vantagens 13º';
COMMENT ON COLUMN folha_calculada.inss_13 IS 'Código 5013 - INSS 13º';
COMMENT ON COLUMN folha_calculada.inss_ferias IS 'Código 5014 - INSS Férias';
COMMENT ON COLUMN folha_calculada.adiantamento_13_salario IS 'Código 5015 - Adiantam. 13º Salário';
COMMENT ON COLUMN folha_calculada.adiantamento_vantagens_13 IS 'Código 5016 - Adiantam. Vantagens 13º';
COMMENT ON COLUMN folha_calculada.eventos_excepcionais IS 'JSON com eventos excepcionais personalizados (Outros Serviços, Outros Descontos, etc)';

-- ============================================
-- ÍNDICES
-- ============================================

-- Criar índice GIN para busca eficiente no campo JSON
CREATE INDEX IF NOT EXISTS idx_folha_calculada_eventos_excepcionais 
ON folha_calculada USING GIN (eventos_excepcionais);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name IN (
  'servicos_externos_folhas_pagamento',
  'servicos_externos_controle_rondas',
  'supervisao_palmeiras',
  'folga_trabalhada',
  'reembolsos_uber',
  'decimo_terceiro_primeira_parcela',
  'decimo_terceiro_segunda_parcela',
  'decimo_terceiro_vantagens_primeira_parcela',
  'decimo_terceiro_vantagens_segunda_parcela',
  'decimo_terceiro_integral',
  'vantagens_13',
  'inss_13',
  'inss_ferias',
  'adiantamento_13_salario',
  'adiantamento_vantagens_13',
  'eventos_excepcionais'
)
ORDER BY column_name;
