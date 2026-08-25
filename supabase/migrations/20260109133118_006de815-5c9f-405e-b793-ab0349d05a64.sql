-- Tabela para armazenar mensagens broadcast (enviadas para todos os funcionários)
CREATE TABLE public.mensagens_broadcast (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
  criado_por TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rastrear quais funcionários já visualizaram cada mensagem
CREATE TABLE public.mensagens_broadcast_lidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID NOT NULL REFERENCES public.mensagens_broadcast(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  lida_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mensagem_id, funcionario_id)
);

-- Enable Row Level Security
ALTER TABLE public.mensagens_broadcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_broadcast_lidas ENABLE ROW LEVEL SECURITY;

-- Políticas para mensagens_broadcast (somente admins podem criar/editar)
CREATE POLICY "Admins podem gerenciar mensagens broadcast" 
ON public.mensagens_broadcast 
FOR ALL 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Funcionários podem ver mensagens ativas" 
ON public.mensagens_broadcast 
FOR SELECT 
USING (ativo = true);

-- Políticas para mensagens_broadcast_lidas
CREATE POLICY "Funcionários podem ver suas próprias leituras" 
ON public.mensagens_broadcast_lidas 
FOR SELECT 
USING (
  funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Funcionários podem marcar como lida" 
ON public.mensagens_broadcast_lidas 
FOR INSERT 
WITH CHECK (
  funcionario_id IN (
    SELECT id FROM public.funcionarios WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem ver todas as leituras" 
ON public.mensagens_broadcast_lidas 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Índices para performance
CREATE INDEX idx_mensagens_broadcast_ativo ON public.mensagens_broadcast(ativo);
CREATE INDEX idx_mensagens_broadcast_lidas_funcionario ON public.mensagens_broadcast_lidas(funcionario_id);
CREATE INDEX idx_mensagens_broadcast_lidas_mensagem ON public.mensagens_broadcast_lidas(mensagem_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mensagens_broadcast_updated_at
BEFORE UPDATE ON public.mensagens_broadcast
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();