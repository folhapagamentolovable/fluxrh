-- Migration: Adicionar campo para Desc. Ajuste dos Benefícios
-- Data: 2026-03-02
-- Descrição: Adiciona campo específico para "Desc. Ajuste dos Benefícios" (B002)

-- ============================================
-- TABELA: folha_calculada
-- ============================================

-- Adicionar campo de Desc. Ajuste dos Benefícios (Benefícios)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS desc_ajuste_beneficios DECIMAL(10,2) DEFAULT 0;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN folha_calculada.desc_ajuste_beneficios IS 'Código B002 - Desc. Ajuste dos Benefícios';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'folha_calculada' 
AND column_name = 'desc_ajuste_beneficios';
