-- Função para calcular e atualizar o banco de horas mensal de um funcionário
-- Pode ser executada manualmente ou via trigger/cron job

CREATE OR REPLACE FUNCTION calcular_banco_horas_mensal(
    p_funcionario_id UUID,
    p_mes INTEGER,
    p_ano INTEGER
)
RETURNS TABLE (
    minutos_entrada INTEGER,
    minutos_saida INTEGER,
    minutos_total INTEGER,
    dias_com_banco INTEGER,
    dias_trabalhados INTEGER
) AS $$
DECLARE
    v_codigo_escala VARCHAR;
    v_tolerancia_minutos INTEGER := 5;
    v_minutos_entrada INTEGER := 0;
    v_minutos_saida INTEGER := 0;
    v_minutos_total INTEGER := 0;
    v_dias_com_banco INTEGER := 0;
    v_dias_trabalhados INTEGER := 0;
    v_registro RECORD;
    v_horario_programado RECORD;
    v_dia_semana INTEGER;
    v_campo_horario VARCHAR;
    v_campo_trabalha VARCHAR;
    v_entrada_prog TIME;
    v_saida_prog TIME;
    v_entrada_real TIME;
    v_saida_real TIME;
    v_diff_entrada INTEGER;
    v_diff_saida INTEGER;
    v_minutos_dia INTEGER;
BEGIN
    -- Buscar código da escala do funcionário
    SELECT codigo_escala INTO v_codigo_escala
    FROM funcionarios
    WHERE id = p_funcionario_id;

    -- Se não tem escala, retorna zeros
    IF v_codigo_escala IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;

    -- Iterar pelos registros de ponto do mês
    FOR v_registro IN
        SELECT 
            data_registro,
            primeiro_registro,
            quarto_registro,
            EXTRACT(DOW FROM data_registro::DATE) AS dia_semana
        FROM folha_ponto_automatica
        WHERE funcionario_id = p_funcionario_id
          AND EXTRACT(MONTH FROM data_registro) = p_mes
          AND EXTRACT(YEAR FROM data_registro) = p_ano
        ORDER BY data_registro
    LOOP
        v_dias_trabalhados := v_dias_trabalhados + 1;
        v_dia_semana := v_registro.dia_semana;

        -- Determinar campo da escala baseado no dia da semana
        v_campo_horario := CASE v_dia_semana
            WHEN 0 THEN 'horarios_domingo'
            WHEN 1 THEN 'horarios_segunda'
            WHEN 2 THEN 'horarios_terca'
            WHEN 3 THEN 'horarios_quarta'
            WHEN 4 THEN 'horarios_quinta'
            WHEN 5 THEN 'horarios_sexta'
            WHEN 6 THEN 'horarios_sabado'
        END;

        v_campo_trabalha := CASE v_dia_semana
            WHEN 0 THEN 'trabalha_domingo'
            WHEN 1 THEN 'trabalha_segunda'
            WHEN 2 THEN 'trabalha_terca'
            WHEN 3 THEN 'trabalha_quarta'
            WHEN 4 THEN 'trabalha_quinta'
            WHEN 5 THEN 'trabalha_sexta'
            WHEN 6 THEN 'trabalha_sabado'
        END;

        -- Buscar horário programado da escala
        EXECUTE format('
            SELECT 
                CASE WHEN %I THEN (%I->>''entrada'')::TIME ELSE NULL END as entrada,
                CASE WHEN %I THEN (%I->>''saida'')::TIME ELSE NULL END as saida
            FROM regras_escalas
            WHERE codigo_escala = $1 AND ativa = true
            LIMIT 1
        ', v_campo_trabalha, v_campo_horario, v_campo_trabalha, v_campo_horario)
        INTO v_horario_programado
        USING v_codigo_escala;

        -- Se tem horário programado e registros reais, calcular diferenças
        IF v_horario_programado.entrada IS NOT NULL AND v_registro.primeiro_registro IS NOT NULL THEN
            v_entrada_prog := v_horario_programado.entrada;
            v_entrada_real := v_registro.primeiro_registro::TIME;
            
            -- Calcular diferença em minutos (positivo = entrou antes)
            v_diff_entrada := EXTRACT(EPOCH FROM (v_entrada_prog - v_entrada_real)) / 60;
            
            IF v_diff_entrada > v_tolerancia_minutos THEN
                v_minutos_entrada := v_minutos_entrada + v_diff_entrada;
            ELSE
                v_diff_entrada := 0;
            END IF;
        ELSE
            v_diff_entrada := 0;
        END IF;

        IF v_horario_programado.saida IS NOT NULL AND v_registro.quarto_registro IS NOT NULL THEN
            v_saida_prog := v_horario_programado.saida;
            v_saida_real := v_registro.quarto_registro::TIME;
            
            -- Calcular diferença em minutos (positivo = saiu depois)
            v_diff_saida := EXTRACT(EPOCH FROM (v_saida_real - v_saida_prog)) / 60;
            
            IF v_diff_saida > v_tolerancia_minutos THEN
                v_minutos_saida := v_minutos_saida + v_diff_saida;
            ELSE
                v_diff_saida := 0;
            END IF;
        ELSE
            v_diff_saida := 0;
        END IF;

        -- Contar dia se teve banco de horas
        v_minutos_dia := v_diff_entrada + v_diff_saida;
        IF v_minutos_dia > 0 THEN
            v_dias_com_banco := v_dias_com_banco + 1;
        END IF;
    END LOOP;

    v_minutos_total := v_minutos_entrada + v_minutos_saida;

    -- Inserir ou atualizar na tabela banco_horas_mensal
    INSERT INTO banco_horas_mensal (
        funcionario_id, mes, ano,
        minutos_entrada, minutos_saida, minutos_total,
        dias_com_banco, dias_trabalhados,
        data_calculo
    ) VALUES (
        p_funcionario_id, p_mes, p_ano,
        v_minutos_entrada, v_minutos_saida, v_minutos_total,
        v_dias_com_banco, v_dias_trabalhados,
        NOW()
    )
    ON CONFLICT (funcionario_id, mes, ano)
    DO UPDATE SET
        minutos_entrada = EXCLUDED.minutos_entrada,
        minutos_saida = EXCLUDED.minutos_saida,
        minutos_total = EXCLUDED.minutos_total,
        dias_com_banco = EXCLUDED.dias_com_banco,
        dias_trabalhados = EXCLUDED.dias_trabalhados,
        data_calculo = NOW();

    -- Retornar resultados
    RETURN QUERY SELECT 
        v_minutos_entrada,
        v_minutos_saida,
        v_minutos_total,
        v_dias_com_banco,
        v_dias_trabalhados;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_banco_horas_mensal IS 'Calcula e armazena o banco de horas de um funcionário para um mês específico';

-- Função para recalcular banco de horas de todos os funcionários de um mês
CREATE OR REPLACE FUNCTION recalcular_banco_horas_mes(
    p_mes INTEGER,
    p_ano INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_funcionario RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_funcionario IN
        SELECT DISTINCT f.id
        FROM funcionarios f
        INNER JOIN folha_ponto_automatica fpa ON fpa.funcionario_id = f.id
        WHERE EXTRACT(MONTH FROM fpa.data_registro) = p_mes
          AND EXTRACT(YEAR FROM fpa.data_registro) = p_ano
          AND f.ativo = true
    LOOP
        PERFORM calcular_banco_horas_mensal(v_funcionario.id, p_mes, p_ano);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_banco_horas_mes IS 'Recalcula o banco de horas de todos os funcionários para um mês específico';

-- Função para recalcular últimos N meses
CREATE OR REPLACE FUNCTION recalcular_banco_horas_ultimos_meses(p_meses INTEGER DEFAULT 3)
RETURNS INTEGER AS $$
DECLARE
    v_data DATE;
    v_mes INTEGER;
    v_ano INTEGER;
    v_total INTEGER := 0;
    v_count INTEGER;
BEGIN
    FOR i IN 0..(p_meses - 1) LOOP
        v_data := CURRENT_DATE - (i || ' months')::INTERVAL;
        v_mes := EXTRACT(MONTH FROM v_data);
        v_ano := EXTRACT(YEAR FROM v_data);
        
        SELECT recalcular_banco_horas_mes(v_mes, v_ano) INTO v_count;
        v_total := v_total + v_count;
        
        RAISE NOTICE 'Recalculado %/% - % funcionários', v_mes, v_ano, v_count;
    END LOOP;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_banco_horas_ultimos_meses IS 'Recalcula o banco de horas dos últimos N meses para todos os funcionários';
