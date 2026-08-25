-- Adicionar colunas email e telefone na tabela funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS email character varying(255),
ADD COLUMN IF NOT EXISTS telefone character varying(20);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.funcionarios.email IS 'Email de contato do funcionário';
COMMENT ON COLUMN public.funcionarios.telefone IS 'Telefone de contato do funcionário';