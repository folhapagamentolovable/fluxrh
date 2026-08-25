-- ============================================
-- DIAGNÓSTICO: Banco de Horas - Saiane de Oliveira Melo
-- ============================================
-- Execute este script no Supabase SQL Editor para diagnosticar o problema

-- ============================================
-- 1. VERIFICAR SE FUNCIONÁRIO EXISTE E CONFIGURAÇÕES
-- ============================================
SELECT 
    '1. DADOS DO FUNCIONÁRIO' as secao,
    id,
    nome_completo,
    ativo,
    demitido,
    banco_horas_ativo,
    codigo_escala,
    posto_trabalho_id,
    empresa_id
FROM funcionarios 
WHERE nome_completo ILIKE '%Saiane%';

-- ============================================
-- 2. VERIFICAR ESCALA VINCULADA
-- ============================================
SELECT 
    '2. ESCALA VINCULADA' as secao,
    f.nome_completo,
    f.codigo_escala,
    r.ativa as escala_ativa,
    r.horarios_segunda,
    r.horarios_terca,
    r.horarios_quarta,
    r.horarios_quinta,
    r.horarios_sexta,
    r.horarios_sabado,
    r.horarios_domingo
FROM funcionarios f
LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
WHERE f.nome_completo ILIKE '%Saiane%';

-- ============================================
-- 3. VERIFICAR REGISTROS DE PONTO (MARÇO/2026)
-- ============================================
SELECT 
    '3. REGISTROS DE PONTO - MARÇO/2026' as secao,
    f.nome_completo,
    fpa.data_registro,
    TO_CHAR(fpa.data_registro, 'Day') as dia_semana,
    fpa.primeiro_registro as entrada,
    fpa.quarto_registro as saida,
    fpa.status,
    CASE 
        WHEN fpa.primeiro_registro IS NULL THEN '⚠️ Sem entrada'
        WHEN fpa.quarto_registro IS NULL THEN '⚠️ Sem saída'
        ELSE '✅ Completo'
    END as status_registro
FROM folha_ponto_automatica fpa
INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
  AND EXTRACT(MONTH FROM fpa.data_registro) = 3
  AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
ORDER BY fpa.data_registro;

-- ============================================
-- 4. VERIFICAR SE TABELA banco_horas_mensal EXISTE
-- ============================================
SELECT 
    '4. VERIFICAR TABELA banco_horas_mensal' as secao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banco_horas_mensal')
        THEN '✅ Tabela existe'
        ELSE '🔴 TABELA NÃO EXISTE - Execute as migrações!'
    END as status_tabela;

-- ============================================
-- 5. VERIFICAR DADOS NA TABELA banco_horas_mensal (se existir)
-- ============================================
-- Comentar esta seção se a tabela não existir
SELECT 
    '5. DADOS EM banco_horas_mensal' as secao,
    f.nome_completo,
    bhm.mes,
    bhm.ano,
    bhm.minutos_entrada,
    bhm.minutos_saida,
    bhm.minutos_total,
    bhm.dias_com_banco,
    bhm.dias_trabalhados,
    bhm.data_calculo
FROM banco_horas_mensal bhm
INNER JOIN funcionarios f ON bhm.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%Saiane%'
ORDER BY bhm.ano DESC, bhm.mes DESC;

-- ============================================
-- 6. CALCULAR BANCO DE HORAS MANUALMENTE (MARÇO/2026)
-- ============================================
-- Esta query simula o cálculo que o sistema faz
WITH registros_saiane AS (
    SELECT 
        f.id as funcionario_id,
        f.nome_completo,
        f.codigo_escala,
        fpa.data_registro,
        EXTRACT(DOW FROM fpa.data_registro) as dia_semana,
        fpa.primeiro_registro,
        fpa.quarto_registro
    FROM folha_ponto_automatica fpa
    INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
    WHERE f.nome_completo ILIKE '%Saiane%'
      AND EXTRACT(MONTH FROM fpa.data_registro) = 3
      AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
),
horarios_programados AS (
    SELECT 
        rs.*,
        CASE rs.dia_semana
            WHEN 0 THEN r.horarios_domingo
            WHEN 1 THEN r.horarios_segunda
            WHEN 2 THEN r.horarios_terca
            WHEN 3 THEN r.horarios_quarta
            WHEN 4 THEN r.horarios_quinta
            WHEN 5 THEN r.horarios_sexta
            WHEN 6 THEN r.horarios_sabado
        END as horario_dia
    FROM registros_saiane rs
    LEFT JOIN regras_escalas r ON rs.codigo_escala = r.codigo_escala AND r.ativa = true
),
calculos AS (
    SELECT 
        hp.nome_completo,
        hp.data_registro,
        (hp.horario_dia->>'entrada')::TIME as entrada_programada,
        (hp.horario_dia->>'saida')::TIME as saida_programada,
        hp.primeiro_registro::TIME as entrada_real,
        hp.quarto_registro::TIME as saida_real,
        -- Calcular minutos de entrada antecipada (tolerância 5 min)
        CASE 
            WHEN hp.horario_dia->>'entrada' IS NOT NULL 
                 AND hp.primeiro_registro IS NOT NULL
                 AND EXTRACT(EPOCH FROM ((hp.horario_dia->>'entrada')::TIME - hp.primeiro_registro::TIME)) / 60 > 5
            THEN EXTRACT(EPOCH FROM ((hp.horario_dia->>'entrada')::TIME - hp.primeiro_registro::TIME)) / 60
            ELSE 0
        END as minutos_entrada,
        -- Calcular minutos de saída tardia (tolerância 5 min)
        CASE 
            WHEN hp.horario_dia->>'saida' IS NOT NULL 
                 AND hp.quarto_registro IS NOT NULL
                 AND EXTRACT(EPOCH FROM (hp.quarto_registro::TIME - (hp.horario_dia->>'saida')::TIME)) / 60 > 5
            THEN EXTRACT(EPOCH FROM (hp.quarto_registro::TIME - (hp.horario_dia->>'saida')::TIME)) / 60
            ELSE 0
        END as minutos_saida
    FROM horarios_programados hp
)
SELECT 
    '6. CÁLCULO MANUAL - MARÇO/2026' as secao,
    nome_completo,
    data_registro,
    entrada_programada,
    saida_programada,
    entrada_real,
    saida_real,
    ROUND(minutos_entrada::numeric, 0) as minutos_entrada,
    ROUND(minutos_saida::numeric, 0) as minutos_saida,
    ROUND((minutos_entrada + minutos_saida)::numeric, 0) as total_minutos_dia,
    CASE 
        WHEN (minutos_entrada + minutos_saida) > 0 
        THEN '✅ Tem banco de horas'
        ELSE '⚠️ Sem banco de horas'
    END as status
FROM calculos
ORDER BY data_registro;

-- ============================================
-- 7. RESUMO TOTAL DO MÊS
-- ============================================
WITH registros_saiane AS (
    SELECT 
        f.id as funcionario_id,
        f.nome_completo,
        f.codigo_escala,
        fpa.data_registro,
        EXTRACT(DOW FROM fpa.data_registro) as dia_semana,
        fpa.primeiro_registro,
        fpa.quarto_registro
    FROM folha_ponto_automatica fpa
    INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
    WHERE f.nome_completo ILIKE '%Saiane%'
      AND EXTRACT(MONTH FROM fpa.data_registro) = 3
      AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
),
horarios_programados AS (
    SELECT 
        rs.*,
        CASE rs.dia_semana
            WHEN 0 THEN r.horarios_domingo
            WHEN 1 THEN r.horarios_segunda
            WHEN 2 THEN r.horarios_terca
            WHEN 3 THEN r.horarios_quarta
            WHEN 4 THEN r.horarios_quinta
            WHEN 5 THEN r.horarios_sexta
            WHEN 6 THEN r.horarios_sabado
        END as horario_dia
    FROM registros_saiane rs
    LEFT JOIN regras_escalas r ON rs.codigo_escala = r.codigo_escala AND r.ativa = true
),
calculos AS (
    SELECT 
        CASE 
            WHEN hp.horario_dia->>'entrada' IS NOT NULL 
                 AND hp.primeiro_registro IS NOT NULL
                 AND EXTRACT(EPOCH FROM ((hp.horario_dia->>'entrada')::TIME - hp.primeiro_registro::TIME)) / 60 > 5
            THEN EXTRACT(EPOCH FROM ((hp.horario_dia->>'entrada')::TIME - hp.primeiro_registro::TIME)) / 60
            ELSE 0
        END as minutos_entrada,
        CASE 
            WHEN hp.horario_dia->>'saida' IS NOT NULL 
                 AND hp.quarto_registro IS NOT NULL
                 AND EXTRACT(EPOCH FROM (hp.quarto_registro::TIME - (hp.horario_dia->>'saida')::TIME)) / 60 > 5
            THEN EXTRACT(EPOCH FROM (hp.quarto_registro::TIME - (hp.horario_dia->>'saida')::TIME)) / 60
            ELSE 0
        END as minutos_saida
    FROM horarios_programados hp
)
SELECT 
    '7. RESUMO TOTAL - MARÇO/2026' as secao,
    COUNT(*) as dias_trabalhados,
    COUNT(CASE WHEN (minutos_entrada + minutos_saida) > 0 THEN 1 END) as dias_com_banco,
    ROUND(SUM(minutos_entrada)::numeric, 0) as total_minutos_entrada,
    ROUND(SUM(minutos_saida)::numeric, 0) as total_minutos_saida,
    ROUND(SUM(minutos_entrada + minutos_saida)::numeric, 0) as total_minutos_mes,
    LPAD(FLOOR(SUM(minutos_entrada + minutos_saida) / 60)::text, 2, '0') || ':' || 
    LPAD(FLOOR(MOD(SUM(minutos_entrada + minutos_saida), 60))::text, 2, '0') as total_formatado
FROM calculos;

-- ============================================
-- 8. DIAGNÓSTICO FINAL
-- ============================================
SELECT 
    '8. DIAGNÓSTICO FINAL' as secao,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM funcionarios WHERE nome_completo ILIKE '%Saiane%')
        THEN '🔴 PROBLEMA: Funcionário não encontrado no banco de dados'
        
        WHEN EXISTS (SELECT 1 FROM funcionarios WHERE nome_completo ILIKE '%Saiane%' AND (ativo = false OR demitido = true))
        THEN '🔴 PROBLEMA: Funcionário está inativo ou demitido'
        
        WHEN EXISTS (SELECT 1 FROM funcionarios WHERE nome_completo ILIKE '%Saiane%' AND codigo_escala IS NULL)
        THEN '🔴 PROBLEMA: Funcionário sem escala vinculada'
        
        WHEN EXISTS (
            SELECT 1 FROM funcionarios f
            LEFT JOIN regras_escalas r ON f.codigo_escala = r.codigo_escala
            WHERE f.nome_completo ILIKE '%Saiane%' AND (r.codigo_escala IS NULL OR r.ativa = false)
        )
        THEN '🔴 PROBLEMA: Escala não encontrada ou inativa'
        
        WHEN NOT EXISTS (
            SELECT 1 FROM folha_ponto_automatica fpa
            INNER JOIN funcionarios f ON fpa.funcionario_id = f.id
            WHERE f.nome_completo ILIKE '%Saiane%'
              AND EXTRACT(MONTH FROM fpa.data_registro) = 3
              AND EXTRACT(YEAR FROM fpa.data_registro) = 2026
        )
        THEN '⚠️ PROBLEMA: Sem registros de ponto em Março/2026'
        
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banco_horas_mensal')
        THEN '🔴 PROBLEMA CRÍTICO: Tabela banco_horas_mensal não existe - Execute as migrações!'
        
        ELSE '✅ Configuração OK - Verificar cálculos acima'
    END as diagnostico;

-- ============================================
-- FIM DO DIAGNÓSTICO
-- ============================================
-- Analise os resultados acima para identificar o problema
-- Consulte docs/TROUBLESHOOTING_SAIANE_BANCO_HORAS.md para soluções

