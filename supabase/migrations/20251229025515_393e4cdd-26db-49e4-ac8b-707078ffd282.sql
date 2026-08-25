-- Adicionar colunas de referência para recibos de benefícios
ALTER TABLE public.folha_calculada
ADD COLUMN IF NOT EXISTS dias_vt_mes_anterior INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_vt_mes_atual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_va_mes_anterior INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_va_mes_atual INTEGER DEFAULT 0;