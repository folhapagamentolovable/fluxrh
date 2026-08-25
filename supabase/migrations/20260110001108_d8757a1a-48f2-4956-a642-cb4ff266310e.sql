-- Add targeting columns to mensagens_broadcast
ALTER TABLE public.mensagens_broadcast
ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
ADD COLUMN posto_trabalho_id uuid REFERENCES public.postos_trabalho(id) ON DELETE SET NULL,
ADD COLUMN funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_mensagens_broadcast_empresa_id ON public.mensagens_broadcast(empresa_id);
CREATE INDEX idx_mensagens_broadcast_posto_trabalho_id ON public.mensagens_broadcast(posto_trabalho_id);
CREATE INDEX idx_mensagens_broadcast_funcionario_id ON public.mensagens_broadcast(funcionario_id);

-- Add comment to explain targeting logic
COMMENT ON COLUMN public.mensagens_broadcast.empresa_id IS 'Se preenchido, mensagem só aparece para funcionários desta empresa';
COMMENT ON COLUMN public.mensagens_broadcast.posto_trabalho_id IS 'Se preenchido, mensagem só aparece para funcionários deste posto';
COMMENT ON COLUMN public.mensagens_broadcast.funcionario_id IS 'Se preenchido, mensagem só aparece para este funcionário específico';