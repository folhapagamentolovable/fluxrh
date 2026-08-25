CREATE OR REPLACE FUNCTION public.calcular_banco_horas_mensal(p_funcionario_id uuid, p_mes integer, p_ano integer)
 RETURNS TABLE(minutos_entrada integer, minutos_saida integer, minutos_total integer, dias_com_banco integer, dias_trabalhados integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT codigo_escala INTO v_codigo_escala
    FROM funcionarios
    WHERE id = p_funcionario_id;

    IF v_codigo_escala IS NULL THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;

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

        IF v_horario_programado.entrada IS NOT NULL AND v_registro.primeiro_registro IS NOT NULL THEN
            v_entrada_prog := v_horario_programado.entrada;
            v_entrada_real := v_registro.primeiro_registro::TIME;
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
            v_diff_saida := EXTRACT(EPOCH FROM (v_saida_real - v_saida_prog)) / 60;
            IF v_diff_saida > v_tolerancia_minutos THEN
                v_minutos_saida := v_minutos_saida + v_diff_saida;
            ELSE
                v_diff_saida := 0;
            END IF;
        ELSE
            v_diff_saida := 0;
        END IF;

        v_minutos_dia := v_diff_entrada + v_diff_saida;
        IF v_minutos_dia > 0 THEN
            v_dias_com_banco := v_dias_com_banco + 1;
        END IF;
    END LOOP;

    v_minutos_total := v_minutos_entrada + v_minutos_saida;

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

    RETURN QUERY SELECT 
        v_minutos_entrada,
        v_minutos_saida,
        v_minutos_total,
        v_dias_com_banco,
        v_dias_trabalhados;
END;
$function$;