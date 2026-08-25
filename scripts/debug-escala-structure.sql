-- Script para verificar a estrutura das escalas no banco

-- Verificar estrutura da tabela escala_mensal
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'escala_mensal' 
ORDER BY ordinal_position;

-- Verificar dados existentes na escala_mensal
SELECT 
    id,
    funcionario_id,
    mes,
    ano,
    escala_id,
    dias_trabalhados,
    total_dias_trabalho,
    total_dias_folga,
    total_feriados,
    observacoes,
    created_at
FROM escala_mensal 
ORDER BY ano DESC, mes DESC 
LIMIT 5;

-- Verificar se há dados de dias_trabalhados
SELECT 
    id,
    funcionario_id,
    mes,
    ano,
    LENGTH(dias_trabalhados) as tamanho_dados,
    LEFT(dias_trabalhados, 100) as preview_dados
FROM escala_mensal 
WHERE dias_trabalhados IS NOT NULL 
LIMIT 3;

-- Verificar funcionários que têm escalas
SELECT DISTINCT 
    em.funcionario_id,
    f.nome_completo,
    COUNT(em.id) as total_escalas
FROM escala_mensal em
LEFT JOIN funcionarios f ON f.id = em.funcionario_id
GROUP BY em.funcionario_id, f.nome_completo
ORDER BY total_escalas DESC;