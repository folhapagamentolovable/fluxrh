-- ============================================
-- DIAGNÓSTICO: Cargo Não Exibido para Funcionários
-- ============================================
-- Execute este script no Supabase SQL Editor para diagnosticar problemas com cargos

-- ============================================
-- 1. VERIFICAR FUNCIONÁRIOS SEM CARGO_ID
-- ============================================
SELECT 
    '1. FUNCIONÁRIOS SEM CARGO_ID' as secao,
    COUNT(*) as total,
    COUNT(CASE WHEN nome_cargo IS NOT NULL THEN 1 END) as com_nome_cargo_preenchido,
    COUNT(CASE WHEN nome_cargo IS NULL THEN 1 END) as sem_nome_cargo
FROM funcionarios
WHERE ativo = true
  AND cargo_id IS NULL;

-- ============================================
-- 2. LISTAR FUNCIONÁRIOS SEM CARGO_ID MAS COM NOME_CARGO
-- ============================================
SELECT 
    '2. FUNCIONÁRIOS COM NOME_CARGO MAS SEM CARGO_ID' as secao,
    id,
    nome_completo,
    nome_cargo,
    cargo_id,
    empresa_id,
    posto_trabalho_id
FROM funcionarios
WHERE ativo = true
  AND cargo_id IS NULL
  AND nome_cargo IS NOT NULL
ORDER BY nome_completo;

-- ============================================
-- 3. VERIFICAR RELACIONAMENTO CARGO
-- ============================================
SELECT 
    '3. VERIFICAR RELACIONAMENTO' as secao,
    f.id,
    f.nome_completo,
    f.cargo_id,
    f.nome_cargo as cargo_desnormalizado,
    c.id as cargo_relacionamento_id,
    c.nome_cargo as cargo_relacionamento_nome,
    CASE 
        WHEN f.cargo_id IS NULL AND f.nome_cargo IS NULL THEN '🔴 Sem cargo'
        WHEN f.cargo_id IS NULL AND f.nome_cargo IS NOT NULL THEN '⚠️ Apenas nome_cargo'
        WHEN f.cargo_id IS NOT NULL AND c.id IS NULL THEN '🔴 cargo_id inválido'
        WHEN f.cargo_id IS NOT NULL AND c.id IS NOT NULL THEN '✅ OK'
        ELSE '❓ Desconhecido'
    END as status
FROM funcionarios f
LEFT JOIN cargos c ON f.cargo_id = c.id
WHERE f.ativo = true
ORDER BY 
    CASE 
        WHEN f.cargo_id IS NULL AND f.nome_cargo IS NULL THEN 1
        WHEN f.cargo_id IS NULL AND f.nome_cargo IS NOT NULL THEN 2
        WHEN f.cargo_id IS NOT NULL AND c.id IS NULL THEN 3
        ELSE 4
    END,
    f.nome_completo;

-- ============================================
-- 4. VERIFICAR CARGOS DUPLICADOS
-- ============================================
SELECT 
    '4. CARGOS DUPLICADOS' as secao,
    nome_cargo,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM cargos
WHERE ativo = true
GROUP BY nome_cargo
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- ============================================
-- 5. VERIFICAR CARGOS ÚNICOS EM NOME_CARGO QUE NÃO EXISTEM EM CARGOS
-- ============================================
SELECT 
    '5. CARGOS FALTANTES NA TABELA CARGOS' as secao,
    f.nome_cargo,
    COUNT(*) as funcionarios_com_este_cargo,
    STRING_AGG(f.nome_completo, ', ') as funcionarios
FROM funcionarios f
WHERE f.ativo = true
  AND f.nome_cargo IS NOT NULL
  AND f.cargo_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cargos c WHERE c.nome_cargo = f.nome_cargo
  )
GROUP BY f.nome_cargo
ORDER BY COUNT(*) DESC;

-- ============================================
-- 6. ESTATÍSTICAS GERAIS
-- ============================================
SELECT 
    '6. ESTATÍSTICAS GERAIS' as secao,
    COUNT(*) as total_funcionarios_ativos,
    COUNT(CASE WHEN cargo_id IS NOT NULL THEN 1 END) as com_cargo_id,
    COUNT(CASE WHEN cargo_id IS NULL AND nome_cargo IS NOT NULL THEN 1 END) as apenas_nome_cargo,
    COUNT(CASE WHEN cargo_id IS NULL AND nome_cargo IS NULL THEN 1 END) as sem_cargo,
    ROUND(
        COUNT(CASE WHEN cargo_id IS NOT NULL THEN 1 END)::numeric / 
        NULLIF(COUNT(*)::numeric, 0) * 100, 
        2
    ) as percentual_com_cargo_id
FROM funcionarios
WHERE ativo = true;

-- ============================================
-- 7. VERIFICAR FOLHAS CALCULADAS SEM CARGO
-- ============================================
SELECT 
    '7. FOLHAS CALCULADAS SEM CARGO' as secao,
    fc.mes,
    fc.ano,
    fc.nome_funcionario,
    fc.funcionario_id,
    f.cargo_id,
    f.nome_cargo,
    c.nome_cargo as cargo_relacionamento
FROM folha_calculada fc
INNER JOIN funcionarios f ON fc.funcionario_id = f.id
LEFT JOIN cargos c ON f.cargo_id = c.id
WHERE fc.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND fc.mes >= EXTRACT(MONTH FROM CURRENT_DATE) - 2
  AND (f.cargo_id IS NULL OR c.id IS NULL)
ORDER BY fc.ano DESC, fc.mes DESC, fc.nome_funcionario;

-- ============================================
-- 8. SOLUÇÃO AUTOMÁTICA (COMENTADO - DESCOMENTE PARA EXECUTAR)
-- ============================================
-- ATENÇÃO: Revise os resultados acima antes de executar esta solução!

-- Passo 1: Criar cargos faltantes
/*
INSERT INTO cargos (nome_cargo, ativo, created_at)
SELECT DISTINCT 
    f.nome_cargo, 
    true,
    NOW()
FROM funcionarios f
WHERE f.nome_cargo IS NOT NULL
  AND f.cargo_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cargos c WHERE c.nome_cargo = f.nome_cargo
  );
*/

-- Passo 2: Atualizar funcionários para usar cargo_id
/*
UPDATE funcionarios f
SET cargo_id = c.id
FROM cargos c
WHERE f.nome_cargo = c.nome_cargo
  AND f.cargo_id IS NULL
  AND f.nome_cargo IS NOT NULL;
*/

-- Passo 3: Verificar resultado
/*
SELECT 
    'RESULTADO DA CORREÇÃO' as secao,
    COUNT(*) as total_funcionarios_ativos,
    COUNT(CASE WHEN cargo_id IS NOT NULL THEN 1 END) as com_cargo_id,
    COUNT(CASE WHEN cargo_id IS NULL THEN 1 END) as sem_cargo_id
FROM funcionarios
WHERE ativo = true;
*/

-- ============================================
-- FIM DO DIAGNÓSTICO
-- ============================================
-- Analise os resultados acima para identificar o problema
-- Se necessário, descomente e execute a SOLUÇÃO AUTOMÁTICA

