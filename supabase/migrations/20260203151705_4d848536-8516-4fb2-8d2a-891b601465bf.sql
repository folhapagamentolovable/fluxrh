-- Adicionar coluna total_suspensoes na tabela folhas_ponto
ALTER TABLE public.folhas_ponto 
ADD COLUMN IF NOT EXISTS total_suspensoes integer DEFAULT 0;

-- Adicionar coluna dias_direito na tabela ferias (dias de férias disponíveis calculados)
ALTER TABLE public.ferias 
ADD COLUMN IF NOT EXISTS dias_direito integer DEFAULT 30;

-- Comentários para documentação
COMMENT ON COLUMN public.folhas_ponto.total_suspensoes IS 'Total de dias de suspensão disciplinar no mês (tratados como faltas injustificadas para todos os efeitos)';
COMMENT ON COLUMN public.ferias.dias_direito IS 'Dias de férias disponíveis calculados com base nas faltas injustificadas e suspensões do período aquisitivo';