-- Adicionar coluna folgas_trabalhadas na tabela folhas_ponto
-- Conta folgas em que o funcionário trabalhou 4 horas ou mais
ALTER TABLE public.folhas_ponto
ADD COLUMN folgas_trabalhadas integer NOT NULL DEFAULT 0;