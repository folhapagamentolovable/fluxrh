-- =============================================
-- TABELA: ferias (Gestão completa de férias)
-- =============================================

CREATE TABLE public.ferias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    
    -- Período aquisitivo
    periodo_aquisitivo INTEGER NOT NULL, -- 1, 2, 3... (qual período do funcionário)
    data_inicio_aquisitivo DATE NOT NULL, -- Data início do período aquisitivo
    data_fim_aquisitivo DATE NOT NULL, -- Data fim do período aquisitivo
    data_limite_concessivo DATE NOT NULL, -- Data limite para gozar (1 ano após aquisitivo)
    
    -- Dados das férias gozadas/programadas
    status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, programada, em_andamento, gozada, vencida
    data_inicio_gozo DATE, -- Quando começa o gozo
    data_fim_gozo DATE, -- Quando termina o gozo
    dias_gozados INTEGER DEFAULT 30, -- Dias de férias (pode ser fracionado)
    
    -- Fracionamento (reforma trabalhista permite até 3 períodos)
    fracionamento INTEGER DEFAULT 1, -- 1, 2 ou 3 (qual fração)
    total_fracoes INTEGER DEFAULT 1, -- Quantas frações no total
    
    -- Valores calculados
    salario_base_calculo NUMERIC DEFAULT 0,
    valor_ferias NUMERIC DEFAULT 0,
    valor_terco NUMERIC DEFAULT 0,
    valor_total NUMERIC DEFAULT 0,
    
    -- Abono pecuniário (venda de até 10 dias)
    dias_abono INTEGER DEFAULT 0,
    valor_abono NUMERIC DEFAULT 0,
    
    -- Observações
    observacoes TEXT,
    
    -- Controle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ferias_funcionario_id ON public.ferias(funcionario_id);
CREATE INDEX idx_ferias_status ON public.ferias(status);
CREATE INDEX idx_ferias_data_limite ON public.ferias(data_limite_concessivo);
CREATE INDEX idx_ferias_periodo ON public.ferias(funcionario_id, periodo_aquisitivo);

-- Enable RLS
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins têm acesso total a ferias"
ON public.ferias
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users podem ler ferias"
ON public.ferias
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ferias_updated_at
BEFORE UPDATE ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();