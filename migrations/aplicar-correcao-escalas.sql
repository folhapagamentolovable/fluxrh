-- CORREÇÃO AUTOMÁTICA DAS ESCALAS DE LIMPEZA E ZELADORIA
-- Garante que funcionários folguem em domingos e feriados

-- ═══════════════════════════════════════════════════════════
-- 🎯 PROBLEMA IDENTIFICADO:
-- Funcionários de limpeza e zeladoria estão trabalhando em:
-- - Domingos (quando deveriam folgar)
-- - Feriados (quando deveriam folgar)
-- - Exemplo: 01/01/2026 (Quarta-feira + Feriado)
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Verificar configuração atual ANTES da correção
SELECT 
  'ANTES DA CORREÇÃO' as status,
  codigo_escala,
  nome_escala,
  trabalha_domingo,
  trabalha_feriado,
  tipo_alternancia
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true
ORDER BY codigo_escala;

-- ═══════════════════════════════════════════════════════════
-- 🔧 APLICAR CORREÇÕES
-- ═══════════════════════════════════════════════════════════

-- Corrigir FIGLIMPT1 (Auxiliar de Limpeza Figueiras T1)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'FIGLIMPT1' 
  AND ativa = true;

-- Corrigir FIGZELADT1 (Zelador Figueiras T1)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'FIGZELADT1' 
  AND ativa = true;

-- Corrigir GALLIMPT1 (Auxiliar de Limpeza Galleria T1)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'GALLIMPT1' 
  AND ativa = true;

-- Corrigir GALZELADT1 (Zelador Galleria T1)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'GALZELADT1' 
  AND ativa = true;

-- Corrigir PALMLIMPT1 (Auxiliar de Limpeza Palmeiras T1)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'PALMLIMPT1' 
  AND ativa = true;

-- Corrigir PALMLIMPT2 (Auxiliar de Limpeza Palmeiras T2)
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala = 'PALMLIMPT2' 
  AND ativa = true;

-- ═══════════════════════════════════════════════════════════
-- ✅ VERIFICAR CORREÇÕES APLICADAS
-- ═══════════════════════════════════════════════════════════

SELECT 
  'APÓS A CORREÇÃO' as status,
  codigo_escala,
  nome_escala,
  trabalha_domingo,
  trabalha_feriado,
  tipo_alternancia,
  updated_at
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true
ORDER BY codigo_escala;

-- Mostrar resumo das alterações
SELECT 
  COUNT(*) as escalas_corrigidas,
  'Escalas de limpeza e zeladoria configuradas para folgar em domingos e feriados' as descricao
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true
  AND trabalha_domingo = false 
  AND trabalha_feriado = false;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 🧪 TESTE RECOMENDADO APÓS A CORREÇÃO:
-- ═══════════════════════════════════════════════════════════
-- 1. Gerar escala para Janeiro/2026
-- 2. Verificar se 01/01/2026 aparece como FOLGA
-- 3. Verificar outros domingos e feriados do mês
-- 
-- ✅ RESULTADO ESPERADO:
-- - 01/01/2026 (Quarta-feira + Feriado): FOLGA
-- - Todos os domingos: FOLGA  
-- - Todos os feriados: FOLGA
-- - Dias úteis normais: TRABALHO com horários corretos
-- ═══════════════════════════════════════════════════════════