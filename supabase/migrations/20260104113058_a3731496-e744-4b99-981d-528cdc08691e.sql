-- Tabela para rastrear mensagens lidas pelo funcionário
CREATE TABLE public.mensagens_lidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  sugestao_id uuid NOT NULL REFERENCES public.sugestoes_reclamacoes(id) ON DELETE CASCADE,
  lida_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(funcionario_id, sugestao_id)
);

-- Habilitar RLS
ALTER TABLE public.mensagens_lidas ENABLE ROW LEVEL SECURITY;

-- Funcionários podem inserir suas próprias leituras
CREATE POLICY "Funcionarios podem marcar suas mensagens como lidas"
ON public.mensagens_lidas
FOR INSERT
WITH CHECK (
  funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Funcionários podem ver suas próprias leituras
CREATE POLICY "Funcionarios podem ver suas mensagens lidas"
ON public.mensagens_lidas
FOR SELECT
USING (
  funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Funcionários podem deletar suas próprias leituras (caso queira remarcar como não lida)
CREATE POLICY "Funcionarios podem deletar suas leituras"
ON public.mensagens_lidas
FOR DELETE
USING (
  funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  )
);

-- Admins têm acesso total
CREATE POLICY "Admins têm acesso total a mensagens_lidas"
ON public.mensagens_lidas
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Índice para melhor performance
CREATE INDEX idx_mensagens_lidas_funcionario ON public.mensagens_lidas(funcionario_id);
CREATE INDEX idx_mensagens_lidas_sugestao ON public.mensagens_lidas(sugestao_id);