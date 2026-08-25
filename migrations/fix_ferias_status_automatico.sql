    -- Corrige status de férias baseado nas datas reais
    -- Execute no Supabase SQL Editor

    -- 1. Férias que já terminaram → 'gozada'
    UPDATE ferias
    SET status = 'gozada', updated_at = now()
    WHERE status IN ('pendente', 'programada', 'aprovada', 'agendada', 'em_andamento')
    AND data_fim_gozo IS NOT NULL
    AND data_fim_gozo < CURRENT_DATE;

    -- 2. Férias em andamento (iniciaram mas não terminaram) → 'em_andamento'
    UPDATE ferias
    SET status = 'em_andamento', updated_at = now()
    WHERE status IN ('pendente', 'programada', 'aprovada', 'agendada')
    AND data_inicio_gozo IS NOT NULL
    AND data_inicio_gozo <= CURRENT_DATE
    AND (data_fim_gozo IS NULL OR data_fim_gozo >= CURRENT_DATE);

    -- 3. Períodos vencidos sem gozo → 'vencida'
    UPDATE ferias
    SET status = 'vencida', updated_at = now()
    WHERE status = 'pendente'
    AND data_inicio_gozo IS NULL
    AND data_limite_concessivo < CURRENT_DATE;

    -- Verificar resultado
    SELECT status, COUNT(*) FROM ferias GROUP BY status ORDER BY status;
