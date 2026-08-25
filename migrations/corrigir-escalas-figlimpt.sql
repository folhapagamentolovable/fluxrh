-- Script para corrigir as escalas FIGLIMPT1 e FIGLIMPT2
-- Problema: horários de sexta-feira não estão sendo aplicados corretamente

-- ═══════════════════════════════════════════════════════════
-- 1. VERIFICAR CONFIGURAÇÃO ATUAL DAS ESCALAS
-- ═══════════════════════════════════════════════════════════

SELECT 
  codigo_escala,
  nome_escala,
  trabalha_sexta,
  horarios_sexta,
  horarios_segunda,
  horarios_terca,
  horarios_quarta,
  horarios_quinta,
  CASE 
    WHEN horarios_sexta::text = horarios_segunda::text THEN '❌ IGUAIS'
    ELSE '✅ DIFERENTES'
  END as horarios_sexta_vs_segunda
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGLIMPT2')
  AND ativa = true
ORDER BY codigo_escala;

-- ═══════════════════════════════════════════════════════════
-- 2. VERIFICAR SE OS HORÁRIOS DE SEXTA SÃO DIFERENTES
-- ═══════════════════════════════════════════════════════════

-- Se os horários de sexta são diferentes dos outros dias,
-- o sistema deveria criar horarios_especificos automaticamente
-- quando a escala for reprocessada

-- ═══════════════════════════════════════════════════════════
-- 3. FORÇAR REPROCESSAMENTO DAS ESCALAS (se necessário)
-- ═══════════════════════════════════════════════════════════

-- Atualizar o campo updated_at para forçar reprocessamento
UPDATE regras_escalas 
SET updated_at = NOW()
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGLIMPT2')
  AND ativa = true;

-- ═══════════════════════════════════════════════════════════
-- 4. VERIFICAR ESCALAS MENSAIS EXISTENTES QUE PODEM ESTAR INCORRETAS
-- ═══════════════════════════════════════════════════════════

-- Buscar escalas mensais que podem ter horários incorretos de sexta-feira
SELECT 
  em.id,
  f.nome_completo,
  em.mes,
  em.ano,
  re.codigo_escala,
  -- Extrair horários de uma sexta-feira (assumindo dia 10 como exemplo)
  JSON_EXTRACT(em.dias_trabalhados, '$.dia_10.entrada') as entrada_sexta,
  JSON_EXTRACT(em.dias_trabalhados, '$.dia_10.saida') as saida_sexta,
  -- Extrair horários de uma segunda-feira (assumindo dia 6 como exemplo)
  JSON_EXTRACT(em.dias_trabalhados, '$.dia_6.entrada') as entrada_segunda,
  JSON_EXTRACT(em.dias_trabalhados, '$.dia_6.saida') as saida_segunda,
  CASE 
    WHEN JSON_EXTRACT(em.dias_trabalhados, '$.dia_10.entrada') = JSON_EXTRACT(em.dias_trabalhados, '$.dia_6.entrada')
    THEN '❌ HORÁRIOS IGUAIS (PROBLEMA)'
    ELSE '✅ HORÁRIOS DIFERENTES (OK)'
  END as status_horarios
FROM escala_mensal em
JOIN funcionarios f ON f.id = em.funcionario_id
JOIN regras_escalas re ON re.id = em.escala_id
WHERE re.codigo_escala IN ('FIGLIMPT1', 'FIGLIMPT2')
  AND em.mes = 1 AND em.ano = 2026  -- Ajustar para o mês desejado
  -- Verificar se o dia 10 é sexta-feira e dia 6 é segunda-feira
  AND JSON_EXTRACT(em.dias_trabalhados, '$.dia_10') IS NOT NULL
  AND JSON_EXTRACT(em.dias_trabalhados, '$.dia_6') IS NOT NULL
ORDER BY re.codigo_escala, f.nome_completo;

-- ═══════════════════════════════════════════════════════════
-- 5. INSTRUÇÕES PARA CORREÇÃO
-- ═══════════════════════════════════════════════════════════

/*
PASSOS PARA CORRIGIR O PROBLEMA:

1. VERIFICAR CONFIGURAÇÃO:
   - Execute a query da seção 1 para ver se os horários de sexta são diferentes
   - Se horarios_sexta_vs_segunda = '❌ IGUAIS', há problema na configuração

2. CORRIGIR CONFIGURAÇÃO (se necessário):
   - Acesse a interface de regras de escalas
   - Edite FIGLIMPT1 e FIGLIMPT2
   - Configure sexta-feira: 08:00 às 17:00 (diferente de seg-qui: 00:00 às 17:00)
   - Salve as alterações

3. REPROCESSAR ESCALAS MENSAIS:
   - Acesse a página "Escalas Mensais e Anuais"
   - Selecione o mês/ano desejado
   - Clique em "Gerar Todas" para reprocessar todas as escalas
   - Ou gere individualmente para funcionários específicos

4. VERIFICAR CORREÇÃO:
   - Execute a query da seção 4 para verificar se os horários estão corretos
   - Status deve mostrar '✅ HORÁRIOS DIFERENTES (OK)'

OBSERVAÇÃO:
- A correção no código do interpretador já foi aplicada
- Agora o sistema considera horários específicos por dia da semana
- Escalas existentes precisam ser regeneradas para aplicar a correção
*/