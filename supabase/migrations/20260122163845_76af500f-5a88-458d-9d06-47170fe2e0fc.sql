-- CORREÇÃO: Inverter a lógica dos salários migrados
-- Os salários atuais (cargos.salario_base) são os salários VIGENTES de 2026
-- Os salários de 2025 devem ser calculados retroativamente

-- 1. Atualizar todos os registros migrados automaticamente para terem data 2026-01-01 (vigência atual)
UPDATE historico_salarios_cargo
SET data_inicio_vigencia = '2026-01-01',
    data_fim_vigencia = NULL,
    motivo = 'Salário vigente a partir de 01/01/2026'
WHERE motivo = 'Migração automática - salário atual do cargo';

-- 2. Corrigir o registro específico que foi inserido errado (Auxiliar de Limpeza Figueiras T1)
-- O registro com valor menor (1699.23) deveria ser de 2025, não de 2026
-- E o registro com valor maior (1805.43) deveria ser de 2026

-- Primeiro, deletar o registro incorreto de 2026 que tem valor menor
DELETE FROM historico_salarios_cargo 
WHERE id = '4859d6d3-d8db-44fa-887c-22c39495c284';

-- Depois, atualizar o registro de 2025 (que tem valor maior) para ser de 2026
UPDATE historico_salarios_cargo
SET data_inicio_vigencia = '2026-01-01',
    data_fim_vigencia = NULL,
    motivo = 'Salário vigente a partir de 01/01/2026'
WHERE id = '13564fa6-cd94-43ee-ae08-05b11fac1d01';

-- Inserir o registro correto para 2025 com valor menor (antes do reajuste de 6.25%)
-- R$ 1.805,43 / 1.0625 = R$ 1.699,23
INSERT INTO historico_salarios_cargo (cargo_id, salario_base, data_inicio_vigencia, data_fim_vigencia, motivo)
VALUES ('4e419a46-1b43-469e-9d25-32a7e479c12c', 1699.23, '2025-01-01', '2025-12-31', 'Salário vigente em 2025');