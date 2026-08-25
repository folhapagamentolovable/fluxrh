-- Script SQL para corrigir a configuração da escala GALLIMPT1
-- Problema: Está configurada como SABADOS_ALTERNADOS_T1, deveria ser NENHUMA

-- 1. Verificar configuração atual
SELECT 
    codigo_escala,
    nome_escala,
    tipo_alternancia,
    trabalha_sabado,
    trabalha_domingo,
    trabalha_feriado
FROM regras_escalas 
WHERE codigo_escala = 'GALLIMPT1';

-- 2. Corrigir a configuração
UPDATE regras_escalas 
SET 
    tipo_alternancia = 'NENHUMA',
    trabalha_sabado = true,
    trabalha_domingo = false,
    trabalha_feriado = false,
    -- Garantir que os horários de sábado estão corretos
    horarios_sabado = '{"entrada":"08:00","inicio_almoco":"12:00","termino_almoco":"12:00","saida":"12:00"}'::jsonb
WHERE codigo_escala = 'GALLIMPT1';

-- 3. Verificar se a correção foi aplicada
SELECT 
    codigo_escala,
    nome_escala,
    tipo_alternancia,
    trabalha_sabado,
    trabalha_domingo,
    trabalha_feriado,
    horarios_sabado
FROM regras_escalas 
WHERE codigo_escala = 'GALLIMPT1';

-- 4. Comentário explicativo
/*
CORREÇÃO APLICADA:
- tipo_alternancia: 'SABADOS_ALTERNADOS_T1' → 'NENHUMA'
- Resultado: Agora trabalha TODOS os sábados das 08:00 às 12:00
- Mantém: Segunda a Sexta com intrajornada, Domingo e Feriados como folga
*/