# Guia: Sistema de Banco de Horas Mensal

## Visão Geral

O sistema agora utiliza uma tabela dedicada `banco_horas_mensal` para armazenar o banco de horas consolidado por funcionário por mês. Isso melhora significativamente a performance e facilita o cálculo de acumulados.

## Estrutura da Tabela

```sql
banco_horas_mensal (
    id UUID PRIMARY KEY,
    funcionario_id UUID REFERENCES funcionarios(id),
    mes INTEGER (1-12),
    ano INTEGER (2020-2100),
    minutos_entrada INTEGER,  -- Minutos por entrar antes
    minutos_saida INTEGER,    -- Minutos por sair depois
    minutos_total INTEGER,    -- Total do mês
    dias_com_banco INTEGER,   -- Dias com horas excedentes
    dias_trabalhados INTEGER, -- Dias com registro
    data_calculo TIMESTAMP,
    atualizado_em TIMESTAMP
)
```

## Instalação

### 1. Criar a Tabela

Execute no SQL Editor do Supabase:

```bash
# Executar os arquivos de migração na ordem:
1. migrations/create_banco_horas_mensal.sql
2. migrations/function_calcular_banco_horas_mensal.sql
```

### 2. Popular Dados Históricos

Após criar a tabela e funções, popule os dados dos últimos meses:

```sql
-- Recalcular últimos 3 meses
SELECT recalcular_banco_horas_ultimos_meses(3);

-- Ou recalcular um mês específico
SELECT recalcular_banco_horas_mes(3, 2026); -- Março/2026

-- Ou recalcular para um funcionário específico
SELECT * FROM calcular_banco_horas_mensal(
    'uuid-do-funcionario'::UUID,
    3,  -- mês
    2026 -- ano
);
```

## Uso no Sistema

### Cálculo Automático

O sistema TypeScript agora:

1. Busca dados da tabela `banco_horas_mensal` para calcular acumulados
2. Usa query SQL otimizada: `ano < X OR (ano = X AND mes < Y)`
3. Soma todos os registros anteriores ao mês filtrado
4. Exibe o resultado em tempo real

### Atualização Mensal

Recomenda-se criar uma rotina para atualizar a tabela:

**Opção 1: Manualmente via SQL**
```sql
-- No início de cada mês, calcular o mês anterior
SELECT recalcular_banco_horas_mes(
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER
);
```

**Opção 2: Cron Job (Supabase Edge Functions)**
Criar uma Edge Function que executa mensalmente:

```typescript
// supabase/functions/calcular-banco-horas/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const mesAnterior = new Date()
  mesAnterior.setMonth(mesAnterior.getMonth() - 1)
  const mes = mesAnterior.getMonth() + 1
  const ano = mesAnterior.getFullYear()

  const { data, error } = await supabase.rpc('recalcular_banco_horas_mes', {
    p_mes: mes,
    p_ano: ano
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ 
    success: true, 
    funcionarios_processados: data,
    mes,
    ano
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Opção 3: Trigger Automático**
Criar trigger que atualiza automaticamente quando um registro de ponto é inserido/atualizado:

```sql
CREATE OR REPLACE FUNCTION trigger_atualizar_banco_horas()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular banco de horas do mês do registro
    PERFORM calcular_banco_horas_mensal(
        NEW.funcionario_id,
        EXTRACT(MONTH FROM NEW.data_registro)::INTEGER,
        EXTRACT(YEAR FROM NEW.data_registro)::INTEGER
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folha_ponto_banco_horas
    AFTER INSERT OR UPDATE ON folha_ponto_automatica
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_banco_horas();
```

## Vantagens da Nova Abordagem

1. **Performance**: Query simples ao invés de iterar por todos os meses
2. **Escalabilidade**: Funciona bem com anos de dados históricos
3. **Manutenibilidade**: Dados consolidados facilitam auditoria
4. **Flexibilidade**: Fácil adicionar novas métricas (dias trabalhados, etc.)
5. **Confiabilidade**: Dados calculados uma vez e armazenados

## Monitoramento

### Verificar Dados Calculados

```sql
-- Ver banco de horas de um funcionário
SELECT 
    f.nome_completo,
    bh.mes,
    bh.ano,
    bh.minutos_total,
    bh.dias_com_banco,
    bh.dias_trabalhados,
    bh.data_calculo
FROM banco_horas_mensal bh
INNER JOIN funcionarios f ON bh.funcionario_id = f.id
WHERE f.nome_completo ILIKE '%nome%'
ORDER BY bh.ano DESC, bh.mes DESC;

-- Ver acumulado de um funcionário até determinado mês
SELECT 
    f.nome_completo,
    SUM(bh.minutos_total) as total_acumulado_minutos,
    FLOOR(SUM(bh.minutos_total) / 60) || ':' || 
    LPAD((SUM(bh.minutos_total) % 60)::TEXT, 2, '0') as total_acumulado_hhmm
FROM banco_horas_mensal bh
INNER JOIN funcionarios f ON bh.funcionario_id = f.id
WHERE f.id = 'uuid-do-funcionario'
  AND (bh.ano < 2026 OR (bh.ano = 2026 AND bh.mes < 4))
GROUP BY f.nome_completo;

-- Ver meses que ainda não foram calculados
SELECT DISTINCT
    EXTRACT(YEAR FROM data_registro) as ano,
    EXTRACT(MONTH FROM data_registro) as mes
FROM folha_ponto_automatica
WHERE NOT EXISTS (
    SELECT 1 FROM banco_horas_mensal bh
    WHERE bh.funcionario_id = folha_ponto_automatica.funcionario_id
      AND bh.mes = EXTRACT(MONTH FROM data_registro)
      AND bh.ano = EXTRACT(YEAR FROM data_registro)
)
ORDER BY ano DESC, mes DESC;
```

## Troubleshooting

### Acumulado ainda aparece zerado

1. Verificar se a tabela foi criada:
```sql
SELECT COUNT(*) FROM banco_horas_mensal;
```

2. Popular dados históricos:
```sql
SELECT recalcular_banco_horas_ultimos_meses(6); -- Últimos 6 meses
```

3. Verificar se há dados para o funcionário:
```sql
SELECT * FROM banco_horas_mensal 
WHERE funcionario_id = 'uuid-do-funcionario'
ORDER BY ano DESC, mes DESC;
```

### Performance lenta

1. Verificar índices:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'banco_horas_mensal';
```

2. Analisar query plan:
```sql
EXPLAIN ANALYZE
SELECT * FROM banco_horas_mensal
WHERE funcionario_id = 'uuid'
  AND (ano < 2026 OR (ano = 2026 AND mes < 4));
```

## Manutenção

### Recalcular Todos os Dados

Se necessário recalcular tudo do zero:

```sql
-- Limpar tabela
TRUNCATE banco_horas_mensal;

-- Recalcular últimos 24 meses
SELECT recalcular_banco_horas_ultimos_meses(24);
```

### Backup

```sql
-- Exportar dados
COPY banco_horas_mensal TO '/tmp/banco_horas_backup.csv' CSV HEADER;

-- Importar dados
COPY banco_horas_mensal FROM '/tmp/banco_horas_backup.csv' CSV HEADER;
```
