-- Criar tabela para sugestões e reclamações
CREATE TABLE public.sugestoes_reclamacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    nome_funcionario TEXT NOT NULL,
    data_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tema TEXT NOT NULL,
    sugestao TEXT,
    reclamacao TEXT,
    observacoes TEXT,
    resposta_empresa TEXT,
    data_resposta TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sugestoes_reclamacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Funcionarios podem criar suas próprias sugestões"
ON public.sugestoes_reclamacoes
FOR INSERT
WITH CHECK (funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
));

CREATE POLICY "Funcionarios podem ver suas próprias sugestões"
ON public.sugestoes_reclamacoes
FOR SELECT
USING (
    is_admin() OR 
    funcionario_id IN (SELECT id FROM funcionarios WHERE user_id = auth.uid())
);

CREATE POLICY "Admins têm acesso total a sugestoes_reclamacoes"
ON public.sugestoes_reclamacoes
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sugestoes_reclamacoes_updated_at
BEFORE UPDATE ON public.sugestoes_reclamacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();