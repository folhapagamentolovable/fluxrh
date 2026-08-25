-- Adicionar 3 campos para configuração do valor da FT (Folga Trabalhada) por cargo
ALTER TABLE public.parametros_calculo 
  ADD COLUMN IF NOT EXISTS ft_diaria_vigia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ft_diaria_aux_limpeza numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ft_diaria_zelador numeric DEFAULT 0;

COMMENT ON COLUMN public.parametros_calculo.ft_diaria_vigia IS 'Valor diário (R$) da Folga Trabalhada (FT) para Vigias/Vigilantes';
COMMENT ON COLUMN public.parametros_calculo.ft_diaria_aux_limpeza IS 'Valor diário (R$) da Folga Trabalhada (FT) para Auxiliares de Limpeza';
COMMENT ON COLUMN public.parametros_calculo.ft_diaria_zelador IS 'Valor diário (R$) da Folga Trabalhada (FT) para Zeladores';