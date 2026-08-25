-- Tabela para controlar a visibilidade de documentos no Portal do Funcionário
CREATE TABLE IF NOT EXISTS portal_visibility_config (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(50) NOT NULL, -- 'holerites' ou 'beneficios'
    mes_limite INTEGER NOT NULL, -- Mês limite (1-12)
    ano_limite INTEGER NOT NULL, -- Ano limite
    meses_retroativos INTEGER NOT NULL DEFAULT 12, -- Quantos meses para trás mostrar
    ativo BOOLEAN NOT NULL DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO portal_visibility_config (tipo_documento, mes_limite, ano_limite, meses_retroativos, ativo, observacoes) VALUES
('holerites', 11, 2025, 12, true, 'Exibir holerites dos últimos 12 meses até novembro/2025'),
('beneficios', 11, 2025, 12, true, 'Exibir recibos de benefícios dos últimos 12 meses até novembro/2025');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_portal_visibility_config_updated_at 
    BEFORE UPDATE ON portal_visibility_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE portal_visibility_config IS 'Configurações de visibilidade de documentos no Portal do Funcionário';
COMMENT ON COLUMN portal_visibility_config.tipo_documento IS 'Tipo do documento: holerites ou beneficios';
COMMENT ON COLUMN portal_visibility_config.mes_limite IS 'Mês limite para exibição (1-12)';
COMMENT ON COLUMN portal_visibility_config.ano_limite IS 'Ano limite para exibição';
COMMENT ON COLUMN portal_visibility_config.meses_retroativos IS 'Quantos meses retroativos exibir a partir do limite';
COMMENT ON COLUMN portal_visibility_config.ativo IS 'Se a configuração está ativa';