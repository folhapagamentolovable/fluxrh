-- Adiciona cidade e estado na tabela feriados para suporte a feriados por localidade
ALTER TABLE public.feriados
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT;

-- Backfill: feriados estaduais existentes -> SP
UPDATE public.feriados SET estado = 'SP'
WHERE tipo_feriado = 'estadual' AND estado IS NULL;

-- Backfill: feriados municipais existentes -> Campinas/SP
UPDATE public.feriados SET cidade = 'Campinas', estado = 'SP'
WHERE tipo_feriado = 'municipal' AND cidade IS NULL;

CREATE INDEX IF NOT EXISTS idx_feriados_cidade ON public.feriados (cidade);
CREATE INDEX IF NOT EXISTS idx_feriados_estado ON public.feriados (estado);
CREATE INDEX IF NOT EXISTS idx_feriados_tipo ON public.feriados (tipo_feriado);