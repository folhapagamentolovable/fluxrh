-- Adicionar colunas para valores monetários de VT/VA por folgas trabalhadas
ALTER TABLE public.folha_calculada
ADD COLUMN IF NOT EXISTS valor_vt_folgas_trabalhadas NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_va_folgas_trabalhadas NUMERIC DEFAULT 0;