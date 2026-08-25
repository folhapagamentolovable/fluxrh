-- Criar tabela para histórico de alterações de ponto
CREATE TABLE public.folha_ponto_alteracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_ponto_id UUID NOT NULL REFERENCES public.folha_ponto_automatica(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT NOT NULL,
  alterado_por UUID NOT NULL,
  alterado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.folha_ponto_alteracoes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins têm acesso total ao histórico de alterações"
ON public.folha_ponto_alteracoes
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Managers podem ver histórico de alterações das suas empresas"
ON public.folha_ponto_alteracoes
FOR SELECT
USING (
  is_manager(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM folha_ponto_automatica fpa
    JOIN funcionarios f ON f.id = fpa.funcionario_id
    WHERE fpa.id = folha_ponto_alteracoes.registro_ponto_id
    AND manager_has_empresa_access(auth.uid(), f.empresa_id)
  )
);

-- Índices para performance
CREATE INDEX idx_folha_ponto_alteracoes_registro ON public.folha_ponto_alteracoes(registro_ponto_id);
CREATE INDEX idx_folha_ponto_alteracoes_created ON public.folha_ponto_alteracoes(created_at DESC);