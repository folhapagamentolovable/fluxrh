-- Script para inserir dados de exemplo de escala para teste

-- Primeiro, verificar se existe um funcionário para teste
SELECT id, nome_completo FROM funcionarios LIMIT 1;

-- Inserir escala de exemplo para novembro/2025
-- SUBSTITUA o funcionario_id pelo ID real de um funcionário existente
INSERT INTO escala_mensal (
    funcionario_id, 
    mes, 
    ano, 
    escala_id, 
    dias_trabalhados,
    total_dias_trabalho,
    total_dias_folga,
    total_feriados,
    observacoes
) VALUES (
    1, -- SUBSTITUA pelo ID real do funcionário
    11, -- Novembro
    2025,
    1, -- ID da escala (pode ser NULL se não existir)
    '[
        {"dia": 1, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 2, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 3, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 4, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 5, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 6, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 7, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 8, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 9, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 10, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 11, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 12, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 13, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 14, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 15, "status": "FERIADO", "entrada": null, "saida": null, "noturno": false, "observacao": "Proclamação da República"},
        {"dia": 16, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 17, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 18, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 19, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 20, "status": "TRABALHO", "entrada": "20:00", "saida": "08:00", "noturno": true, "observacao": "Turno noturno"},
        {"dia": 21, "status": "TRABALHO", "entrada": "20:00", "saida": "08:00", "noturno": true, "observacao": "Turno noturno"},
        {"dia": 22, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 23, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 24, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 25, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 26, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 27, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 28, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false},
        {"dia": 29, "status": "FOLGA", "entrada": null, "saida": null, "noturno": false},
        {"dia": 30, "status": "TRABALHO", "entrada": "08:00", "saida": "17:00", "noturno": false}
    ]'::jsonb,
    22, -- Total de dias de trabalho
    7,  -- Total de dias de folga
    1,  -- Total de feriados
    'Escala de exemplo para novembro/2025 - Padrão 6x1 com alguns turnos noturnos'
) ON CONFLICT (funcionario_id, mes, ano) DO UPDATE SET
    dias_trabalhados = EXCLUDED.dias_trabalhados,
    total_dias_trabalho = EXCLUDED.total_dias_trabalho,
    total_dias_folga = EXCLUDED.total_dias_folga,
    total_feriados = EXCLUDED.total_feriados,
    observacoes = EXCLUDED.observacoes;

-- Verificar se foi inserido corretamente
SELECT 
    funcionario_id,
    mes,
    ano,
    total_dias_trabalho,
    total_dias_folga,
    total_feriados,
    LENGTH(dias_trabalhados::text) as tamanho_json
FROM escala_mensal 
WHERE mes = 11 AND ano = 2025;