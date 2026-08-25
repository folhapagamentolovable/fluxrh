-- Tabela para registro automático de ponto via QR Code
CREATE TABLE public.folha_ponto_automatica (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Dados do Posto de Trabalho
    posto_trabalho_id UUID NOT NULL REFERENCES public.postos_trabalho(id) ON DELETE RESTRICT,
    nome_posto TEXT NOT NULL,
    
    -- Dados do Funcionário
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE RESTRICT,
    nome_funcionario TEXT NOT NULL,
    
    -- Data do Registro
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Registros de Horário (HH:MM)
    primeiro_registro TIME, -- Entrada (obrigatório ao finalizar)
    segundo_registro TIME,  -- Início refeição (opcional)
    terceiro_registro TIME, -- Término refeição (opcional)
    quarto_registro TIME,   -- Saída (obrigatório ao finalizar)
    
    -- Dados de Geolocalização
    latitude_registro DECIMAL(10, 8),
    longitude_registro DECIMAL(11, 8),
    precisao_metros DECIMAL(8, 2),
    validacao_geolocalizacao BOOLEAN DEFAULT FALSE,
    distancia_posto_metros DECIMAL(10, 2),
    
    -- Metadados
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'finalizado', 'invalido')),
    observacoes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraint: um funcionário só pode ter um registro aberto por dia por posto
    CONSTRAINT unique_registro_dia_posto UNIQUE (funcionario_id, posto_trabalho_id, data_registro)
);

-- Adicionar colunas de geolocalização na tabela postos_trabalho se não existirem
ALTER TABLE public.postos_trabalho 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS raio_validacao_metros DECIMAL(8, 2) DEFAULT 100;

-- Índices para performance
CREATE INDEX idx_folha_ponto_auto_funcionario ON public.folha_ponto_automatica(funcionario_id);
CREATE INDEX idx_folha_ponto_auto_posto ON public.folha_ponto_automatica(posto_trabalho_id);
CREATE INDEX idx_folha_ponto_auto_data ON public.folha_ponto_automatica(data_registro);
CREATE INDEX idx_folha_ponto_auto_status ON public.folha_ponto_automatica(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_folha_ponto_automatica_updated_at
    BEFORE UPDATE ON public.folha_ponto_automatica
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.folha_ponto_automatica ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins têm acesso total
CREATE POLICY "Admins têm acesso total à folha ponto automática"
    ON public.folha_ponto_automatica
    FOR ALL
    USING (public.is_admin(auth.uid()));

-- Funcionários podem ver e registrar seus próprios pontos
CREATE POLICY "Funcionários podem ver seus próprios registros"
    ON public.folha_ponto_automatica
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.funcionarios f 
            WHERE f.id = folha_ponto_automatica.funcionario_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Funcionários podem inserir seus próprios registros"
    ON public.folha_ponto_automatica
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.funcionarios f 
            WHERE f.id = funcionario_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Funcionários podem atualizar seus próprios registros abertos"
    ON public.folha_ponto_automatica
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.funcionarios f 
            WHERE f.id = folha_ponto_automatica.funcionario_id 
            AND f.user_id = auth.uid()
        )
        AND status = 'aberto'
    );

-- Managers podem ver registros de funcionários de suas empresas
CREATE POLICY "Managers podem ver registros de suas empresas"
    ON public.folha_ponto_automatica
    FOR SELECT
    USING (
        public.is_manager(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.funcionarios f
            WHERE f.id = folha_ponto_automatica.funcionario_id
            AND public.manager_has_empresa_access(auth.uid(), f.empresa_id)
        )
    );