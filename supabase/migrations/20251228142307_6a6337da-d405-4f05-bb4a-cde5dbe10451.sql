-- Adicionar campos para solicitação de férias pelo funcionário
-- Período desejado 1 (obrigatório)
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo1_inicio date;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo1_fim date;

-- Período desejado 2 (opcional)
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo2_inicio date;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo2_fim date;

-- Período desejado 3 (opcional)
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo3_inicio date;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS periodo3_fim date;

-- Campo para resposta/justificativa do administrador
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS resposta_empresa text;