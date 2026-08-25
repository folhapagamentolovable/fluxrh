-- Corrigir a função da migração anterior
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Função para atualizar updated_at automaticamente (corrigida)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recriar o trigger
DROP TRIGGER IF EXISTS update_portal_visibility_config_updated_at ON portal_visibility_config;

CREATE TRIGGER update_portal_visibility_config_updated_at 
    BEFORE UPDATE ON portal_visibility_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar se a tabela existe e tem dados, se não, criar
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'portal_visibility_config') THEN
        -- Criar tabela se não existir
        CREATE TABLE portal_visibility_config (
            id SERIAL PRIMARY KEY,
            tipo_documento VARCHAR(50) NOT NULL,
            mes_limite INTEGER NOT NULL,
            ano_limite INTEGER NOT NULL,
            meses_retroativos INTEGER NOT NULL DEFAULT 12,
            ativo BOOLEAN NOT NULL DEFAULT true,
            observacoes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Inserir dados padrão
        INSERT INTO portal_visibility_config (tipo_documento, mes_limite, ano_limite, meses_retroativos, ativo, observacoes) VALUES
        ('holerites', 11, 2025, 12, true, 'Exibir holerites dos últimos 12 meses até novembro/2025'),
        ('beneficios', 11, 2025, 12, true, 'Exibir recibos de benefícios dos últimos 12 meses até novembro/2025');
    ELSE
        -- Se a tabela existe, verificar se tem dados
        IF NOT EXISTS (SELECT 1 FROM portal_visibility_config LIMIT 1) THEN
            INSERT INTO portal_visibility_config (tipo_documento, mes_limite, ano_limite, meses_retroativos, ativo, observacoes) VALUES
            ('holerites', 11, 2025, 12, true, 'Exibir holerites dos últimos 12 meses até novembro/2025'),
            ('beneficios', 11, 2025, 12, true, 'Exibir recibos de benefícios dos últimos 12 meses até novembro/2025');
        END IF;
    END IF;
END
$$;