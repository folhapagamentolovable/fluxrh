-- Adicionar colunas para folgas trabalhadas na folha_calculada
ALTER TABLE public.folha_calculada
ADD COLUMN IF NOT EXISTS folgas_trabalhadas_vt INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS folgas_trabalhadas_va INTEGER DEFAULT 0;