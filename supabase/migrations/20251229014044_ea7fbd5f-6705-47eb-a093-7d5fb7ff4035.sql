-- Adicionar colunas para rastrear folgas trabalhadas contadas para VA e VT
ALTER TABLE public.folha_calculada
ADD COLUMN IF NOT EXISTS folgas_trabalhadas_va integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS folgas_trabalhadas_vt integer DEFAULT 0;