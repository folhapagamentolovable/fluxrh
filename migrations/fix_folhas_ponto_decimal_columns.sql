-- Corrigir colunas de horas na tabela folhas_ponto para aceitar valores decimais
-- Problema: Colunas estavam definidas como INTEGER mas precisam armazenar valores decimais (ex: 2.65 horas)
-- 
-- INSTRUÇÕES DE APLICAÇÃO:
-- Execute este script no SQL Editor do Supabase para corrigir o problema

-- ========================================
-- PARTE 1: Colunas de TOTAIS (agregados do mês)
-- ========================================
ALTER TABLE public.folhas_ponto 
  ALTER COLUMN total_horas_normais TYPE NUMERIC(10,2) USING total_horas_normais::NUMERIC(10,2),
  ALTER COLUMN total_horas_extras_50 TYPE NUMERIC(10,2) USING total_horas_extras_50::NUMERIC(10,2),
  ALTER COLUMN total_horas_extras_100 TYPE NUMERIC(10,2) USING total_horas_extras_100::NUMERIC(10,2),
  ALTER COLUMN total_horas_noturnas TYPE NUMERIC(10,2) USING total_horas_noturnas::NUMERIC(10,2),
  ALTER COLUMN total_intrajornada_50 TYPE NUMERIC(10,2) USING total_intrajornada_50::NUMERIC(10,2),
  ALTER COLUMN total_intrajornada_100 TYPE NUMERIC(10,2) USING total_intrajornada_100::NUMERIC(10,2),
  ALTER COLUMN total_atrasos TYPE NUMERIC(10,2) USING total_atrasos::NUMERIC(10,2);

-- ========================================
-- PARTE 2: Colunas INDIVIDUAIS (podem existir na tabela)
-- ========================================
-- Verificar se as colunas existem antes de alterar
DO $$ 
BEGIN
  -- horas_trabalhadas
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_trabalhadas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN horas_trabalhadas TYPE NUMERIC(10,2) USING horas_trabalhadas::NUMERIC(10,2);
  END IF;

  -- horas_extras
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_extras') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN horas_extras TYPE NUMERIC(10,2) USING horas_extras::NUMERIC(10,2);
  END IF;

  -- atrasos (coluna individual, diferente de total_atrasos)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'atrasos') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN atrasos TYPE NUMERIC(10,2) USING atrasos::NUMERIC(10,2);
  END IF;
END $$;

-- ========================================
-- PARTE 3: Colunas de CONTADORES (devem ser INTEGER)
-- ========================================
ALTER TABLE public.folhas_ponto 
  ALTER COLUMN total_faltas_justificadas TYPE INTEGER USING total_faltas_justificadas::INTEGER,
  ALTER COLUMN total_faltas_injustificadas TYPE INTEGER USING total_faltas_injustificadas::INTEGER;

-- Alterar coluna folgas_trabalhadas para INTEGER (é um contador de dias)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'folgas_trabalhadas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN folgas_trabalhadas TYPE INTEGER USING folgas_trabalhadas::INTEGER;
  END IF;

  -- faltas (contador individual)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'faltas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN faltas TYPE INTEGER USING faltas::INTEGER;
  END IF;
END $$;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.folhas_ponto.total_horas_normais IS 'Total de horas normais trabalhadas no mês (formato decimal, ex: 176.50)';
COMMENT ON COLUMN public.folhas_ponto.total_horas_extras_50 IS 'Total de horas extras 50% no mês (formato decimal, ex: 2.65)';
COMMENT ON COLUMN public.folhas_ponto.total_horas_extras_100 IS 'Total de horas extras 100% no mês (formato decimal, ex: 4.30)';
COMMENT ON COLUMN public.folhas_ponto.total_horas_noturnas IS 'Total de horas noturnas no mês (formato decimal, ex: 8.75)';
COMMENT ON COLUMN public.folhas_ponto.total_intrajornada_50 IS 'Total de horas de intrajornada 50% no mês (formato decimal, ex: 1.50)';
COMMENT ON COLUMN public.folhas_ponto.total_intrajornada_100 IS 'Total de horas de intrajornada 100% no mês (formato decimal, ex: 2.00)';
COMMENT ON COLUMN public.folhas_ponto.total_atrasos IS 'Total de horas de atraso no mês (formato decimal, ex: 0.25)';
COMMENT ON COLUMN public.folhas_ponto.total_faltas_justificadas IS 'Total de faltas justificadas no mês (contador de dias)';
COMMENT ON COLUMN public.folhas_ponto.total_faltas_injustificadas IS 'Total de faltas injustificadas no mês (contador de dias)';

-- Comentários para colunas individuais (se existirem)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_trabalhadas') THEN
    COMMENT ON COLUMN public.folhas_ponto.horas_trabalhadas IS 'Horas trabalhadas (formato decimal, ex: 11.50)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_extras') THEN
    COMMENT ON COLUMN public.folhas_ponto.horas_extras IS 'Horas extras (formato decimal, ex: 2.35)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'atrasos') THEN
    COMMENT ON COLUMN public.folhas_ponto.atrasos IS 'Atrasos em horas (formato decimal, ex: 1.65)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'folgas_trabalhadas') THEN
    COMMENT ON COLUMN public.folhas_ponto.folgas_trabalhadas IS 'Total de folgas trabalhadas (4h+) no mês (contador de dias)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'faltas') THEN
    COMMENT ON COLUMN public.folhas_ponto.faltas IS 'Total de faltas (contador de dias)';
  END IF;
END $$;

-- Verificar as alterações
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'folhas_ponto' 
  AND (column_name LIKE 'total_%' OR column_name IN ('horas_trabalhadas', 'horas_extras', 'atrasos', 'faltas', 'folgas_trabalhadas'))
ORDER BY column_name;
