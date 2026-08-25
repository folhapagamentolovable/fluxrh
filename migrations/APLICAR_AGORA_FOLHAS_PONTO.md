# 🚨 CORREÇÃO URGENTE - Folhas de Ponto

## ⚠️ Problema
Erro ao salvar folhas de ponto: `invalid input syntax for type integer: "2.65"`

## ✅ Solução Rápida

### PASSO 1: Acesse o Supabase
1. Abra o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto FluxPay
3. Clique em **SQL Editor** no menu lateral

### PASSO 2: Execute o Script
Copie e cole o script abaixo no SQL Editor e clique em **RUN**:

```sql
-- ========================================
-- PARTE 1: Colunas de TOTAIS
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
-- PARTE 2: Colunas INDIVIDUAIS
-- ========================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_trabalhadas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN horas_trabalhadas TYPE NUMERIC(10,2) USING horas_trabalhadas::NUMERIC(10,2);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'horas_extras') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN horas_extras TYPE NUMERIC(10,2) USING horas_extras::NUMERIC(10,2);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'atrasos') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN atrasos TYPE NUMERIC(10,2) USING atrasos::NUMERIC(10,2);
  END IF;
END $$;

-- ========================================
-- PARTE 3: Colunas de CONTADORES
-- ========================================
ALTER TABLE public.folhas_ponto 
  ALTER COLUMN total_faltas_justificadas TYPE INTEGER USING total_faltas_justificadas::INTEGER,
  ALTER COLUMN total_faltas_injustificadas TYPE INTEGER USING total_faltas_injustificadas::INTEGER;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'folgas_trabalhadas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN folgas_trabalhadas TYPE INTEGER USING folgas_trabalhadas::INTEGER;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'folhas_ponto' AND column_name = 'faltas') THEN
    ALTER TABLE public.folhas_ponto 
      ALTER COLUMN faltas TYPE INTEGER USING faltas::INTEGER;
  END IF;
END $$;
```

### PASSO 3: Verificar
Execute esta query para confirmar que funcionou:

```sql
SELECT 
    column_name, 
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'folhas_ponto' 
  AND (column_name LIKE 'total_%' OR column_name IN ('horas_trabalhadas', 'horas_extras', 'atrasos', 'faltas', 'folgas_trabalhadas'))
ORDER BY column_name;
```

**Resultado esperado:** 
- Colunas de horas devem mostrar `numeric` com precision=10, scale=2
- Colunas de contadores devem mostrar `integer`

### PASSO 4: Testar
1. Volte ao sistema FluxPay
2. Vá em **Operacional > Folhas de Ponto**
3. Tente salvar uma folha de ponto
4. ✅ Deve funcionar sem erros!

## 📋 O que foi corrigido?

**Colunas de TOTAIS (agregados mensais):**
- ✅ `total_horas_normais` → agora aceita 176.50
- ✅ `total_horas_extras_50` → agora aceita 2.65
- ✅ `total_horas_extras_100` → agora aceita 4.30
- ✅ `total_horas_noturnas` → agora aceita 8.75
- ✅ `total_intrajornada_50` → agora aceita 1.50
- ✅ `total_intrajornada_100` → agora aceita 2.00
- ✅ `total_atrasos` → agora aceita 0.25

**Colunas INDIVIDUAIS (se existirem):**
- ✅ `horas_trabalhadas` → agora aceita 11.50
- ✅ `horas_extras` → agora aceita 2.35
- ✅ `atrasos` → agora aceita 1.65 (ex: 1h21min de atraso)

**Colunas de CONTADORES (permanecem INTEGER):**
- ✅ `total_faltas_justificadas` → contador de dias
- ✅ `total_faltas_injustificadas` → contador de dias
- ✅ `folgas_trabalhadas` → contador de dias
- ✅ `faltas` → contador de dias

## ⏱️ Tempo estimado
**2 minutos** para aplicar a correção completa

## 🆘 Precisa de ajuda?
Consulte o arquivo completo: `markdowns/CORRECAO_TIPO_COLUNAS_FOLHAS_PONTO.md`
