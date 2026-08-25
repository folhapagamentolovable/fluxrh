
CREATE TABLE public.ia_auditoria_operacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt_original TEXT,
  tool_chamada TEXT NOT NULL,
  entidade TEXT,
  payload_sugerido JSONB,
  payload_anterior JSONB,
  payload_executado JSONB,
  ids_afetados JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmada','cancelada','executada','erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ia_auditoria_operacoes TO authenticated;
GRANT ALL ON public.ia_auditoria_operacoes TO service_role;

ALTER TABLE public.ia_auditoria_operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all IA audit logs"
  ON public.ia_auditoria_operacoes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_ia_auditoria_updated_at
  BEFORE UPDATE ON public.ia_auditoria_operacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ia_auditoria_usuario ON public.ia_auditoria_operacoes(usuario_id, created_at DESC);
CREATE INDEX idx_ia_auditoria_status ON public.ia_auditoria_operacoes(status);
