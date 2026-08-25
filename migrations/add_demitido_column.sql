-- Adicionar coluna 'demitido' na tabela funcionarios
-- Esta coluna será usada para marcar funcionários demitidos que não devem
-- aparecer em escalas, folhas de ponto, cálculos e relatórios

ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS demitido BOOLEAN DEFAULT FALSE;

-- Comentário na coluna
COMMENT ON COLUMN funcionarios.demitido IS 'Indica se o funcionário foi demitido. Funcionários demitidos não aparecem em processamentos ativos (escalas, folhas, relatórios)';

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_funcionarios_demitido ON funcionarios(demitido);

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'funcionarios' AND column_name = 'demitido';