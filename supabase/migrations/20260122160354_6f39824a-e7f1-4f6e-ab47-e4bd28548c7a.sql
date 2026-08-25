-- Criar tabela para histórico de salários por cargo
CREATE TABLE IF NOT EXISTS public.historico_salarios_cargo (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
    salario_base NUMERIC(12,2) NOT NULL,
    data_inicio_vigencia DATE NOT NULL,
    data_fim_vigencia DATE,
    motivo TEXT DEFAULT 'Cadastro inicial',
    percentual_reajuste NUMERIC(5,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_salarios_cargo_cargo_id ON public.historico_salarios_cargo(cargo_id);
CREATE INDEX IF NOT EXISTS idx_historico_salarios_cargo_vigencia ON public.historico_salarios_cargo(cargo_id, data_inicio_vigencia DESC);

-- Habilitar RLS
ALTER TABLE public.historico_salarios_cargo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage cargo salary history" 
ON public.historico_salarios_cargo 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Managers can view cargo salary history" 
ON public.historico_salarios_cargo 
FOR SELECT 
USING (public.is_admin_or_manager(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_salarios_cargo_updated_at
    BEFORE UPDATE ON public.historico_salarios_cargo
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para buscar salário vigente do cargo por data
CREATE OR REPLACE FUNCTION public.get_salario_cargo_vigente(p_cargo_id uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT salario_base
    FROM public.historico_salarios_cargo
    WHERE cargo_id = p_cargo_id
      AND data_inicio_vigencia <= p_data
      AND (data_fim_vigencia IS NULL OR data_fim_vigencia >= p_data)
    ORDER BY data_inicio_vigencia DESC
    LIMIT 1
$$;

-- Migrar salários atuais dos cargos para o histórico
INSERT INTO public.historico_salarios_cargo (cargo_id, salario_base, data_inicio_vigencia, motivo)
SELECT 
    id as cargo_id,
    salario_base,
    '2025-01-01'::date as data_inicio_vigencia,
    'Migração automática - salário atual do cargo' as motivo
FROM public.cargos
WHERE salario_base > 0
ON CONFLICT DO NOTHING;