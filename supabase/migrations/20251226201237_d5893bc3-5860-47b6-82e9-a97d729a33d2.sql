-- Adicionar campos de IRRF progressivo na tabela parametros_calculo
ALTER TABLE public.parametros_calculo
ADD COLUMN IF NOT EXISTS irrf_faixa1_limite numeric DEFAULT 2259.21,
ADD COLUMN IF NOT EXISTS irrf_faixa1_aliquota numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS irrf_faixa1_deducao numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS irrf_faixa2_limite numeric DEFAULT 2826.66,
ADD COLUMN IF NOT EXISTS irrf_faixa2_aliquota numeric DEFAULT 7.50,
ADD COLUMN IF NOT EXISTS irrf_faixa2_deducao numeric DEFAULT 169.44,
ADD COLUMN IF NOT EXISTS irrf_faixa3_limite numeric DEFAULT 3751.06,
ADD COLUMN IF NOT EXISTS irrf_faixa3_aliquota numeric DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS irrf_faixa3_deducao numeric DEFAULT 381.44,
ADD COLUMN IF NOT EXISTS irrf_faixa4_limite numeric DEFAULT 4664.68,
ADD COLUMN IF NOT EXISTS irrf_faixa4_aliquota numeric DEFAULT 22.50,
ADD COLUMN IF NOT EXISTS irrf_faixa4_deducao numeric DEFAULT 662.77,
ADD COLUMN IF NOT EXISTS irrf_faixa5_limite numeric DEFAULT 999999999.99,
ADD COLUMN IF NOT EXISTS irrf_faixa5_aliquota numeric DEFAULT 27.50,
ADD COLUMN IF NOT EXISTS irrf_faixa5_deducao numeric DEFAULT 896.00;

-- Comentário explicativo
COMMENT ON COLUMN public.parametros_calculo.irrf_faixa1_limite IS 'Limite superior da faixa 1 do IRRF (isenta)';
COMMENT ON COLUMN public.parametros_calculo.isencao_irpf IS 'Valor de isenção total do IRRF (ex: R$ 3.076,00)';