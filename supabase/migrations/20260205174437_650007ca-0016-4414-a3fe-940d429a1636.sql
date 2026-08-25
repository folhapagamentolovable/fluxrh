-- Adicionar campo para desconto de DSR sobre faltas
ALTER TABLE public.folha_calculada 
ADD COLUMN IF NOT EXISTS desconto_dsr_faltas numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS dias_dsr_faltas integer DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.folha_calculada.desconto_dsr_faltas IS 'Desconto do DSR (Descanso Semanal Remunerado) para semanas com faltas injustificadas ou suspensões - CLT';
COMMENT ON COLUMN public.folha_calculada.dias_dsr_faltas IS 'Quantidade de dias de DSR descontados (1 por semana com falta/suspensão)';