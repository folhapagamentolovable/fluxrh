-- Adiciona campos de configuração do PLR na tabela parametros_calculo
ALTER TABLE public.parametros_calculo
    ADD COLUMN IF NOT EXISTS plr_desconto_falta_justificada NUMERIC(5,4) DEFAULT 0.20,
    ADD COLUMN IF NOT EXISTS plr_desconto_falta_injustificada NUMERIC(5,4) DEFAULT 0.25,
    ADD COLUMN IF NOT EXISTS plr_desconto_advertencia NUMERIC(5,4) DEFAULT 0.20,
    ADD COLUMN IF NOT EXISTS plr_desconto_suspensao NUMERIC(5,4) DEFAULT 0.25,
    ADD COLUMN IF NOT EXISTS plr_dias_minimos_mes INTEGER DEFAULT 15,
    ADD COLUMN IF NOT EXISTS plr_taxa_negociacao NUMERIC(10,2) DEFAULT 12.00;
