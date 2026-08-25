# Guia: Executar Migrações do Banco de Horas

## ⚠️ AÇÃO OBRIGATÓRIA

As migrações SQL foram criadas mas **NÃO foram executadas** no banco de dados Supabase. Sem executá-las, os acumulados continuarão mostrando 00:00 em todas as páginas.

## Passo a Passo

### 1. Acessar o Supabase SQL Editor

1. Acesse https://supabase.com
2. Faça login no seu projeto
3. No menu lateral, clique em **SQL Editor**

### 2. Executar Primeira Migração (Criar Tabela)

1. Clique em **New Query**
2. Copie TODO o conteúdo do arquivo `migrations/create_banco_horas_mensal.sql`
3. Cole no editor SQL
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso

**O que esta migração faz:**
- Cria a tabela `banco_horas_mensal`
- Cria índices para performance
- Cria view `vw_banco_horas_mensal`
- Cria trigger para atualizar timestamp

### 3. Executar Segunda Migração (Criar Funções)

1. Clique em **New Query** novamente
2. Copie TODO o conteúdo do arquivo `migrations/function_calcular_banco_horas_mensal.sql`
3. Cole no editor SQL
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso

**O que esta migração faz:**
- Cria função `calcular_banco_horas_mensal(funcionario_id, mes, ano)`
- Cria função `recalcular_banco_horas_mes(mes, ano)`
- Cria função `recalcular_banco_horas_ultimos_meses(n)`

### 4. Popular Dados Históricos

1. Clique em **New Query** novamente
2. Cole o seguinte comando:

```sql
-- Popular últimos 6 meses
SELECT recalcular_banco_horas_ultimos_meses(6);
```

3. Clique em **Run**
4. Aguarde o processamento (pode levar alguns segundos)
5. Você verá mensagens no console indicando quantos funcionários foram processados por mês

**Exemplo de saída:**
```
NOTICE: Recalculado 10/2025 - 15 funcionários
NOTICE: Recalculado 11/2025 - 15 funcionários
NOTICE: Recalculado 12/2025 - 15 funcionários
NOTICE: Recalculado 1/2026 - 15 funcionários
NOTICE: Recalculado 2/2026 - 15 funcionários
NOTICE: Recalculado 3/2026 - 15 funcionários
```

### 5. Verificar Dados Populados

Execute as seguintes queries para verificar:

```sql
-- Ver quantos registros foram criados
SELECT COUNT(*) FROM banco_horas_mensal;

-- Ver dados de um funcionário específico
SELECT * FROM vw_banco_horas_mensal
WHERE nome_completo ILIKE '%nome%'
ORDER BY ano DESC, mes DESC;

-- Ver resumo por mês
SELECT 
    ano, 
    mes, 
    COUNT(*) as funcionarios,
    SUM(minutos_total) as total_minutos
FROM banco_horas_mensal
GROUP BY ano, mes
ORDER BY ano DESC, mes DESC;
```

## Verificação Final

Após executar as migrações:

1. Acesse a página **Banco de Horas** no sistema
2. Filtre por um mês que tenha dados (ex: Março/2026)
3. Verifique que a coluna "Acumulado" agora mostra valores (não mais 00:00)
4. Acesse o **Portal do Funcionário** e verifique o card "Saldo Acumulado"
5. Acesse o **Portal do Cliente** e verifique a linha "Acumulado"

## Troubleshooting

### Erro: "relation banco_horas_mensal does not exist"
- Você não executou a primeira migração (`create_banco_horas_mensal.sql`)
- Execute-a primeiro antes das outras

### Erro: "function calcular_banco_horas_mensal does not exist"
- Você não executou a segunda migração (`function_calcular_banco_horas_mensal.sql`)
- Execute-a antes de tentar popular os dados

### Acumulado ainda aparece 00:00
1. Verifique se os dados foram populados: `SELECT COUNT(*) FROM banco_horas_mensal;`
2. Se retornar 0, execute novamente: `SELECT recalcular_banco_horas_ultimos_meses(6);`
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Verifique se há registros de ponto para os funcionários no período

### Dados desatualizados
- Execute manualmente para um mês específico:
```sql
SELECT recalcular_banco_horas_mes(3, 2026); -- Março/2026
```

## Atualização Automática (Opcional)

Para manter os dados sempre atualizados, você pode configurar um trigger ou cron job:

### Opção A: Trigger Automático (Recomendado)

Execute no SQL Editor:

```sql
CREATE OR REPLACE FUNCTION trigger_atualizar_banco_horas()
RETURNS TRIGGER AS $
BEGIN
    PERFORM calcular_banco_horas_mensal(
        NEW.funcionario_id,
        EXTRACT(MONTH FROM NEW.data_registro)::INTEGER,
        EXTRACT(YEAR FROM NEW.data_registro)::INTEGER
    );
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folha_ponto_banco_horas
    AFTER INSERT OR UPDATE ON folha_ponto_automatica
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_banco_horas();
```

**Vantagem:** Atualiza automaticamente sempre que um registro de ponto é criado/editado.

### Opção B: Cron Job Mensal

Configure no Supabase Dashboard (Database > Cron Jobs):

```sql
-- Executar no dia 1 de cada mês às 02:00
SELECT cron.schedule(
    'recalcular-banco-horas-mensal',
    '0 2 1 * *',
    $$
    SELECT recalcular_banco_horas_mes(
        EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
        EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER
    );
    $$
);
```

**Vantagem:** Não sobrecarrega o banco a cada registro, processa em lote.

## Arquivos de Migração

- `migrations/create_banco_horas_mensal.sql` - Cria tabela e estruturas
- `migrations/function_calcular_banco_horas_mensal.sql` - Cria funções de cálculo

## Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Confirme que todas as tabelas necessárias existem (`funcionarios`, `folha_ponto_automatica`, `regras_escalas`)
3. Verifique se há dados de ponto registrados para o período
4. Consulte a documentação completa em `docs/RESUMO_BANCO_HORAS_COMPLETO.md`

