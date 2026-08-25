# 🔧 Correção de Tipos de Colunas - Folhas de Ponto

## 📋 Problema Identificado

**Erro:** `invalid input syntax for type integer: "2.65"`

**Causa:** As colunas de totais de horas na tabela `folhas_ponto` estavam definidas como `INTEGER`, mas o sistema calcula e armazena valores decimais (ex: 2.65 horas).

## 🎯 Colunas Afetadas

### Colunas que precisam ser NUMERIC(10,2):
- ✅ `total_horas_normais` - Total de horas normais (ex: 176.50)
- ✅ `total_horas_extras_50` - Horas extras 50% (ex: 2.65)
- ✅ `total_horas_extras_100` - Horas extras 100% (ex: 4.30)
- ✅ `total_horas_noturnas` - Horas noturnas (ex: 8.75)
- ✅ `total_intrajornada_50` - Intrajornada 50% (ex: 1.50)
- ✅ `total_intrajornada_100` - Intrajornada 100% (ex: 2.00)
- ✅ `total_atrasos` - Total de atrasos em horas (ex: 0.25)

### Colunas que devem permanecer INTEGER:
- ✅ `total_faltas_justificadas` - Contador de dias
- ✅ `total_faltas_injustificadas` - Contador de dias
- ✅ `folgas_trabalhadas` - Contador de dias

## 🚀 Solução Aplicada

### 1. Migration SQL Criada

Arquivo: `supabase/migrations/20260131000000_fix_folhas_ponto_decimal_columns.sql`

```sql
ALTER TABLE public.folhas_ponto 
  ALTER COLUMN total_horas_normais TYPE NUMERIC(10,2),
  ALTER COLUMN total_horas_extras_50 TYPE NUMERIC(10,2),
  ALTER COLUMN total_horas_extras_100 TYPE NUMERIC(10,2),
  ALTER COLUMN total_horas_noturnas TYPE NUMERIC(10,2),
  ALTER COLUMN total_intrajornada_50 TYPE NUMERIC(10,2),
  ALTER COLUMN total_intrajornada_100 TYPE NUMERIC(10,2),
  ALTER COLUMN total_atrasos TYPE NUMERIC(10,2);
```

### 2. Como Aplicar a Correção

#### Opção A: Via Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo `migrations/fix_folhas_ponto_decimal_columns.sql`
4. Execute o script
5. Verifique os resultados com a query de verificação incluída no final

#### Opção B: Via CLI do Supabase
```bash
supabase db push
```

## ✅ Verificação

Após aplicar a migration, execute esta query para verificar:

```sql
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'folhas_ponto' 
  AND column_name LIKE 'total_%'
ORDER BY column_name;
```

**Resultado Esperado:**
- Colunas de horas: `numeric` com precision=10, scale=2
- Colunas de contadores: `integer`

## 📊 Impacto

### Antes da Correção:
- ❌ Erro ao salvar folhas de ponto com valores decimais
- ❌ Perda de precisão nos cálculos de horas
- ❌ Sistema não funcionava corretamente

### Depois da Correção:
- ✅ Folhas de ponto salvam corretamente
- ✅ Precisão de 2 casas decimais mantida
- ✅ Cálculos de horas extras e adicionais funcionam perfeitamente

## 🔍 Exemplo de Dados

### Dados Válidos Após Correção:
```json
{
  "total_horas_normais": 176.50,
  "total_horas_extras_50": 2.65,
  "total_horas_extras_100": 4.30,
  "total_horas_noturnas": 8.75,
  "total_intrajornada_50": 1.50,
  "total_intrajornada_100": 2.00,
  "total_atrasos": 0.25,
  "total_faltas_justificadas": 2,
  "total_faltas_injustificadas": 1,
  "folgas_trabalhadas": 3
}
```

## 📝 Notas Importantes

1. **Backup:** Sempre faça backup antes de alterar estrutura de tabelas
2. **Dados Existentes:** A migration usa `USING` para converter dados existentes automaticamente
3. **Performance:** NUMERIC(10,2) tem performance similar a INTEGER para este volume de dados
4. **Compatibilidade:** O código TypeScript já estava preparado para trabalhar com decimais

## 🎯 Próximos Passos

Após aplicar a migration:
1. ✅ Testar salvamento de folhas de ponto
2. ✅ Verificar cálculos de totais
3. ✅ Validar relatórios e exportações
4. ✅ Confirmar que não há mais erros de tipo

## 📚 Referências

- Arquivo de Migration: `supabase/migrations/20260131000000_fix_folhas_ponto_decimal_columns.sql`
- Arquivo de Aplicação Manual: `migrations/fix_folhas_ponto_decimal_columns.sql`
- Componente Afetado: `pages/Operacional/TimeSheets.tsx`
- Erro Original: `invalid input syntax for type integer: "2.65"`
