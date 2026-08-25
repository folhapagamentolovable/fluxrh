-- Adicionar campo banco_horas_ativo na tabela funcionarios
-- Este campo controla se o funcionário tem acesso ao card de Banco de Horas nos portais

ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS banco_horas_ativo BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN funcionarios.banco_horas_ativo IS 'Indica se o funcionário tem acesso ao card de Banco de Horas nos portais (Cliente e Funcionário)';

-- Adicionar coluna acumulado_banco_horas para armazenar o total acumulado
ALTER TABLE funcionarios
ADD COLUMN IF NOT EXISTS acumulado_banco_horas INTEGER DEFAULT 0;

COMMENT ON COLUMN funcionarios.acumulado_banco_horas IS 'Total acumulado de minutos no banco de horas do funcionário';
