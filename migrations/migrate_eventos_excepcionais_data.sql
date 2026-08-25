-- Migration de Dados: Migrar eventos excepcionais antigos para nova estrutura
-- Data: 2026-03-01
-- Descrição: Preserva dados existentes e migra para novos campos/códigos

-- ============================================
-- ANÁLISE DE CAMPOS EXISTENTES
-- ============================================

-- Verificar quais campos já existem na tabela
DO $$
DECLARE
    campos_existentes TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO campos_existentes
    FROM information_schema.columns
    WHERE table_name = 'folha_calculada'
    AND column_name IN (
        'servicos_externos_folhas_pagamento',
        'servicos_externos_controle_rondas',
        'decimo_terceiro_primeira_parcela',
        'decimo_terceiro_segunda_parcela',
        'decimo_terceiro_vantagens_primeira_parcela',
        'decimo_terceiro_vantagens_segunda_parcela',
        'decimo_terceiro_integral',
        'vantagens_13'
    );
    
    RAISE NOTICE 'Campos existentes: %', campos_existentes;
END $$;

-- ============================================
-- BACKUP DE SEGURANÇA
-- ============================================

-- Criar tabela de backup antes da migração
CREATE TABLE IF NOT EXISTS folha_calculada_backup_eventos_20260301 AS
SELECT 
    id,
    funcionario_id,
    mes,
    ano,
    eventos_excepcionais,
    -- Campos que podem ter dados antigos
    COALESCE(servicos_externos_folhas_pagamento, 0) as servicos_externos_folhas_pagamento_old,
    COALESCE(servicos_externos_controle_rondas, 0) as servicos_externos_controle_rondas_old,
    COALESCE(decimo_terceiro_primeira_parcela, 0) as decimo_terceiro_primeira_parcela_old,
    COALESCE(decimo_terceiro_segunda_parcela, 0) as decimo_terceiro_segunda_parcela_old,
    COALESCE(decimo_terceiro_vantagens_primeira_parcela, 0) as decimo_terceiro_vantagens_primeira_parcela_old,
    COALESCE(decimo_terceiro_vantagens_segunda_parcela, 0) as decimo_terceiro_vantagens_segunda_parcela_old,
    COALESCE(decimo_terceiro_integral, 0) as decimo_terceiro_integral_old,
    COALESCE(vantagens_13, 0) as vantagens_13_old,
    created_at
FROM folha_calculada
WHERE 
    eventos_excepcionais IS NOT NULL 
    OR servicos_externos_folhas_pagamento > 0
    OR servicos_externos_controle_rondas > 0
    OR decimo_terceiro_primeira_parcela > 0
    OR decimo_terceiro_segunda_parcela > 0
    OR decimo_terceiro_vantagens_primeira_parcela > 0
    OR decimo_terceiro_vantagens_segunda_parcela > 0
    OR decimo_terceiro_integral > 0
    OR vantagens_13 > 0;

-- ============================================
-- MIGRAÇÃO DE DADOS - EVENTOS EXCEPCIONAIS JSON
-- ============================================

-- Atualizar eventos_excepcionais JSON para normalizar descrições antigas
UPDATE folha_calculada
SET eventos_excepcionais = (
    SELECT jsonb_agg(
        CASE 
            -- Normalizar "Serviços Externos (Folhas de Pagamento)" para "Folhas de Pagamento"
            WHEN evento->>'descricao' IN ('Serviços Externos (Folhas de Pagamento)', 'Serviços Externos (Folhas)', 'Serv. Externos Folhas')
            THEN jsonb_set(evento, '{descricao}', '"Folhas de Pagamento"')
            
            -- Normalizar "Serviços Externos (Controle de Rondas)" para "Controle de Rondas Palmeiras"
            WHEN evento->>'descricao' IN ('Serviços Externos (Controle de Rondas)', 'Serviços Externos (Rondas)', 'Serv. Externos Rondas')
            THEN jsonb_set(evento, '{descricao}', '"Controle de Rondas Palmeiras"')
            
            -- Normalizar "Supervisão (Palmeiras)" para "Supervisão Palmeiras"
            WHEN evento->>'descricao' IN ('Supervisão (Palmeiras)', 'Supervisao (Palmeiras)')
            THEN jsonb_set(evento, '{descricao}', '"Supervisão Palmeiras"')
            
            -- Normalizar "13º Salário Integral" para "13º Salário"
            WHEN evento->>'descricao' IN ('13º Salário Integral', '13 Salário Integral')
            THEN jsonb_set(evento, '{descricao}', '"13º Salário"')
            
            -- Normalizar "Reembolsos (Uber)" para "Reembolsos"
            WHEN evento->>'descricao' IN ('Reembolsos (Uber)', 'Reembolsos Uber', 'Reembolso Uber', 'Reembolso (Uber)')
            THEN jsonb_set(evento, '{descricao}', '"Reembolsos"')
            
            -- Normalizar "FT (Folga Trabalhada)" - remover dos eventos (já calculado automaticamente)
            WHEN evento->>'descricao' IN ('FT (Folga Trabalhada)', 'FT', 'Folga Trabalhada')
            THEN NULL
            
            -- Manter outros eventos como estão
            ELSE evento
        END
    )
    FROM jsonb_array_elements(eventos_excepcionais) AS evento
    WHERE evento IS NOT NULL
)
WHERE eventos_excepcionais IS NOT NULL
AND jsonb_typeof(eventos_excepcionais) = 'array';

-- Remover NULLs do array após normalização
UPDATE folha_calculada
SET eventos_excepcionais = (
    SELECT jsonb_agg(evento)
    FROM jsonb_array_elements(eventos_excepcionais) AS evento
    WHERE evento IS NOT NULL
)
WHERE eventos_excepcionais IS NOT NULL
AND jsonb_typeof(eventos_excepcionais) = 'array';

-- ============================================
-- RELATÓRIO DE MIGRAÇÃO
-- ============================================

-- Contar registros afetados
DO $$
DECLARE
    total_registros INTEGER;
    registros_com_eventos INTEGER;
    registros_backup INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_registros FROM folha_calculada;
    SELECT COUNT(*) INTO registros_com_eventos FROM folha_calculada WHERE eventos_excepcionais IS NOT NULL;
    SELECT COUNT(*) INTO registros_backup FROM folha_calculada_backup_eventos_20260301;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'RELATÓRIO DE MIGRAÇÃO DE DADOS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Total de registros na tabela: %', total_registros;
    RAISE NOTICE 'Registros com eventos excepcionais: %', registros_com_eventos;
    RAISE NOTICE 'Registros no backup: %', registros_backup;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================
-- VERIFICAÇÃO DE DADOS MIGRADOS
-- ============================================

-- Verificar eventos normalizados
SELECT 
    'Eventos Normalizados' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT funcionario_id) as funcionarios_unicos
FROM folha_calculada
WHERE eventos_excepcionais IS NOT NULL
AND jsonb_typeof(eventos_excepcionais) = 'array';

-- Verificar eventos por descrição (após normalização)
SELECT 
    evento->>'descricao' as descricao,
    evento->>'tipo' as tipo,
    COUNT(*) as quantidade,
    SUM((evento->>'valor')::numeric) as valor_total
FROM folha_calculada,
     jsonb_array_elements(eventos_excepcionais) as evento
WHERE eventos_excepcionais IS NOT NULL
GROUP BY evento->>'descricao', evento->>'tipo'
ORDER BY quantidade DESC;

-- ============================================
-- INSTRUÇÕES DE ROLLBACK
-- ============================================

-- Para reverter a migração, execute:
-- 
-- UPDATE folha_calculada fc
-- SET eventos_excepcionais = backup.eventos_excepcionais
-- FROM folha_calculada_backup_eventos_20260301 backup
-- WHERE fc.id = backup.id;
--
-- Para remover o backup após confirmar sucesso:
-- DROP TABLE folha_calculada_backup_eventos_20260301;

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

COMMENT ON TABLE folha_calculada_backup_eventos_20260301 IS 
'Backup de segurança criado em 01/03/2026 antes da migração de eventos excepcionais. 
Pode ser removido após confirmação de que a migração foi bem-sucedida.
Para restaurar: UPDATE folha_calculada fc SET eventos_excepcionais = backup.eventos_excepcionais FROM folha_calculada_backup_eventos_20260301 backup WHERE fc.id = backup.id;';
