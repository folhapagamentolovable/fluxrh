-- Criar tabela para armazenar banco de horas consolidado por mês
-- Esta tabela facilita o cálculo de acumulados e histórico

CREATE TABLE IF NOT EXISTS banco_horas_mensal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
    
    -- Totalizadores do mês
    minutos_entrada INTEGER DEFAULT 0, -- Minutos por entrar antes do horário
    minutos_saida INTEGER DEFAULT 0,   -- Minutos por sair depois do horário
    minutos_total INTEGER DEFAULT 0,   -- Total de minutos no banco do mês
    
    -- Estatísticas
    dias_com_banco INTEGER DEFAULT 0,  -- Quantidade de dias com horas excedentes
    dias_trabalhados INTEGER DEFAULT 0, -- Quantidade de dias com registro
    
    -- Controle
    data_calculo TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    
    -- Constraint de unicidade: um registro por funcionário por mês/ano
    UNIQUE(funcionario_id, mes, ano),
    
    -- Índices para performance
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_banco_horas_mensal_funcionario ON banco_horas_mensal(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mensal_periodo ON banco_horas_mensal(ano, mes);
CREATE INDEX IF NOT EXISTS idx_banco_horas_mensal_func_periodo ON banco_horas_mensal(funcionario_id, ano, mes);

-- Comentários
COMMENT ON TABLE banco_horas_mensal IS 'Armazena o banco de horas consolidado por funcionário por mês';
COMMENT ON COLUMN banco_horas_mensal.minutos_entrada IS 'Total de minutos acumulados por entrar antes do horário programado';
COMMENT ON COLUMN banco_horas_mensal.minutos_saida IS 'Total de minutos acumulados por sair depois do horário programado';
COMMENT ON COLUMN banco_horas_mensal.minutos_total IS 'Total de minutos no banco de horas do mês (entrada + saída)';
COMMENT ON COLUMN banco_horas_mensal.dias_com_banco IS 'Quantidade de dias que tiveram horas excedentes';
COMMENT ON COLUMN banco_horas_mensal.dias_trabalhados IS 'Quantidade de dias com registro de ponto';

-- Função para atualizar o timestamp automaticamente
CREATE OR REPLACE FUNCTION update_banco_horas_mensal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_banco_horas_mensal_timestamp ON banco_horas_mensal;
CREATE TRIGGER trigger_update_banco_horas_mensal_timestamp
    BEFORE UPDATE ON banco_horas_mensal
    FOR EACH ROW
    EXECUTE FUNCTION update_banco_horas_mensal_timestamp();

-- View para facilitar consultas com dados do funcionário
CREATE OR REPLACE VIEW vw_banco_horas_mensal AS
SELECT 
    bh.*,
    f.nome_completo,
    f.codigo_escala,
    f.cargo_id,
    f.empresa_id,
    f.posto_trabalho_id,
    c.nome_cargo,
    e.nome_empresa
FROM banco_horas_mensal bh
INNER JOIN funcionarios f ON bh.funcionario_id = f.id
LEFT JOIN cargos c ON f.cargo_id = c.id
LEFT JOIN empresas e ON f.empresa_id = e.id;

COMMENT ON VIEW vw_banco_horas_mensal IS 'View com banco de horas mensal e dados do funcionário';
