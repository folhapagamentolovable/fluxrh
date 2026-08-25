-- Tabela para histórico de salários por funcionário
CREATE TABLE public.historico_salarios (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    salario_base numeric NOT NULL,
    data_inicio_vigencia date NOT NULL,
    data_fim_vigencia date DEFAULT NULL,
    motivo text NOT NULL DEFAULT 'inicial',
    percentual_reajuste numeric DEFAULT NULL,
    observacoes text DEFAULT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Índice para busca eficiente por funcionário e data
CREATE INDEX idx_historico_salarios_funcionario_vigencia 
ON public.historico_salarios(funcionario_id, data_inicio_vigencia DESC);

-- Habilitar RLS
ALTER TABLE public.historico_salarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmo padrão das outras tabelas)
CREATE POLICY "Admins têm acesso total a historico_salarios"
ON public.historico_salarios
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users podem ler historico_salarios"
ON public.historico_salarios
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_salarios_updated_at
BEFORE UPDATE ON public.historico_salarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para buscar salário vigente em uma data específica
CREATE OR REPLACE FUNCTION public.get_salario_vigente(
    p_funcionario_id uuid,
    p_data date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT salario_base
    FROM public.historico_salarios
    WHERE funcionario_id = p_funcionario_id
      AND data_inicio_vigencia <= p_data
      AND (data_fim_vigencia IS NULL OR data_fim_vigencia >= p_data)
    ORDER BY data_inicio_vigencia DESC
    LIMIT 1
$$;