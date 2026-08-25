-- Adicionar coluna supervisao_palmeiras na tabela folha_calculada
ALTER TABLE public.folha_calculada
ADD COLUMN supervisao_palmeiras numeric DEFAULT 0.00;