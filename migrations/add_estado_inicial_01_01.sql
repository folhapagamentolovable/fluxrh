-- Adicionar coluna estado_inicial_01_01 na tabela regras_escalas
-- Esta coluna define explicitamente se uma escala com alternância inicia 01/01 trabalhando ou folgando

-- Adicionar nova coluna com constraint de valores válidos
ALTER TABLE regras_escalas 
ADD COLUMN estado_inicial_01_01 VARCHAR(10) 
CHECK (estado_inicial_01_01 IN ('trabalha', 'folga'));

-- Migrar dados existentes baseado em tipo_alternancia
-- T1 = inicia trabalhando, T2 = inicia folgando

-- Dias alternados T1 → trabalha
UPDATE regras_escalas 
SET estado_inicial_01_01 = 'trabalha'
WHERE tipo_alternancia = 'DIAS_ALTERNADOS_T1';

-- Dias alternados T2 → folga  
UPDATE regras_escalas 
SET estado_inicial_01_01 = 'folga'
WHERE tipo_alternancia = 'DIAS_ALTERNADOS_T2';

-- Sábados alternados T1 → trabalha (trabalha 1º sábado)
UPDATE regras_escalas 
SET estado_inicial_01_01 = 'trabalha'
WHERE tipo_alternancia = 'SABADOS_ALTERNADOS_T1';

-- Sábados alternados T2 → folga (folga 1º sábado)
UPDATE regras_escalas 
SET estado_inicial_01_01 = 'folga'
WHERE tipo_alternancia = 'SABADOS_ALTERNADOS_T2';

-- Escalas sem alternância permanecem NULL
-- (NENHUMA, SEM_ALTERNANCIA, etc. já são NULL por padrão)

-- Adicionar comentário explicativo
COMMENT ON COLUMN regras_escalas.estado_inicial_01_01 IS 
'Define se a escala com alternância inicia 01/01 trabalhando ou folgando. NULL para escalas sem alternância. Valores: trabalha, folga, NULL';

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_regras_escalas_estado_inicial ON regras_escalas(estado_inicial_01_01);

-- Verificar resultados da migração
SELECT 
    tipo_alternancia,
    estado_inicial_01_01,
    COUNT(*) as quantidade
FROM regras_escalas 
GROUP BY tipo_alternancia, estado_inicial_01_01
ORDER BY tipo_alternancia;