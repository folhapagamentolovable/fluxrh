# Resumo Completo: Sistema de Banco de Horas

## ⚠️ AÇÃO CRÍTICA PENDENTE

**AS MIGRAÇÕES SQL NÃO FORAM EXECUTADAS NO BANCO DE DADOS!**

Sem executar as migrações, os acumulados continuarão mostrando 00:00 em todas as páginas.

**Execute agora:**
1. Acesse o Supabase SQL Editor
2. Execute `migrations/create_banco_horas_mensal.sql`
3. Execute `migrations/function_calcular_banco_horas_mensal.sql`
4. Popule dados: `SELECT recalcular_banco_horas_ultimos_meses(6);`

---

## Implementação Finalizada

### 1. Controle de Visibilidade (banco_horas_ativo)

#### Banco de Dados
- Campo `banco_horas_ativo` (BOOLEAN) na tabela `funcionarios`
- Default: `false`

#### Formulário de Funcionários
- **Seção "Banco de Horas"** ao lado de "Adicionais" no formulário de cadastro
- Checkbox "Banco de Horas?" para ativar/desativar
- **Coluna "Banco Hrs"** na tabela de funcionários cadastrados para edição rápida
- Checkbox com cor roxa (purple-600) para fácil identificação
- Tooltip: "Banco de Horas Ativo (marcado = exibe card nos portais)"

#### Portais
- **Portal do Funcionário**: Card "Banco de Horas" só aparece se `banco_horas_ativo = true`
- **Portal do Cliente**: Exibe todos os funcionários (relatório consolidado)

### 2. Tabela de Dados Consolidados (banco_horas_mensal)

#### Estrutura
```sql
banco_horas_mensal (
    id UUID PRIMARY KEY,
    funcionario_id UUID,
    mes INTEGER (1-12),
    ano INTEGER (2020-2100),
    minutos_entrada INTEGER,    -- Minutos por entrar antes
    minutos_saida INTEGER,      -- Minutos por sair depois
    minutos_total INTEGER,      -- Total do mês
    dias_com_banco INTEGER,     -- Dias com horas excedentes
    dias_trabalhados INTEGER,   -- Dias com registro
    data_calculo TIMESTAMP,
    atualizado_em TIMESTAMP,
    UNIQUE(funcionario_id, mes, ano)
)
```

#### Funções SQL
1. **calcular_banco_horas_mensal(funcionario_id, mes, ano)**
   - Calcula banco de horas de um funcionário para um mês específico
   - Insere ou atualiza na tabela `banco_horas_mensal`

2. **recalcular_banco_horas_mes(mes, ano)**
   - Recalcula todos os funcionários de um mês
   - Retorna quantidade de funcionários processados

3. **recalcular_banco_horas_ultimos_meses(n)**
   - Recalcula últimos N meses
   - Útil para popular dados históricos

#### View
- **vw_banco_horas_mensal**: View com join de funcionários, cargos e empresas

### 3. Cálculo de Acumulados

#### Lógica (ATUALIZADA - CORREÇÃO FINAL)
- **Banco Mensal**: Horas do mês filtrado/atual
- **Acumulado**: Soma de TODOS os meses até o mês filtrado (INCLUSIVE)
- Query SQL otimizada: `WHERE ano < X OR (ano = X AND mes <= Y)` ← **Inclui mês atual**

#### Implementação TypeScript
- **Admin (`BancoHoras.tsx`)**: Busca da tabela `banco_horas_mensal` com query `.or(\`ano.lt.${ano},and(ano.eq.${ano},mes.lte.${mes})\`)`
- **Portais**: Cálculo iterativo desde 2 anos atrás até `new Date(ano, mes - 1, 31)` (último dia do mês filtrado)
- Armazena acumulados em estado React
- Exibe em tempo real nos portais e relatórios

#### Páginas Corrigidas
- ✅ `BancoHoras.tsx` (Admin) - Query SQL com `.lte.${mes}`
- ✅ `PortalBancoHoras.tsx` (Funcionário) - Loop até `dataLimite` incluindo mês atual
- ✅ `ClientPortalBancoHoras.tsx` (Cliente) - Loop até `dataLimite` incluindo mês atual

**Exemplo:**
- Filtro: Março/2026
- Acumulado = Jan/2024 + Fev/2024 + ... + Fev/2026 + **Mar/2026** ← Mês atual incluído

### 4. Locais de Exibição

#### Página Administrativa (`/banco-de-horas`)
- Coluna "Banco Mensal" (cor âmbar)
- Coluna "Acumulado" (cor verde)
- Filtros por mês, ano, empresa e posto

#### Portal do Funcionário (`/portal/banco-horas`)
- Card "Total do Mês" (roxo)
- Card "Saldo Acumulado (Histórico)" (verde)
- Detalhamento por dia

#### Portal do Cliente (`/portal-cliente/banco-horas`)
- Linha de resumo: "Mês: XX:XX · Acumulado: XX:XX"
- Expansível por funcionário e por dia

## Instalação e Configuração

### Passo 1: Executar Migrações

```sql
-- 1. Adicionar campo banco_horas_ativo
\i migrations/add_banco_horas_ativo.sql

-- 2. Criar tabela banco_horas_mensal
\i migrations/create_banco_horas_mensal.sql

-- 3. Criar funções de cálculo
\i migrations/function_calcular_banco_horas_mensal.sql
```

### Passo 2: Popular Dados Históricos

```sql
-- Popular últimos 6 meses
SELECT recalcular_banco_horas_ultimos_meses(6);

-- Verificar dados populados
SELECT COUNT(*) FROM banco_horas_mensal;

-- Ver dados de um funcionário
SELECT * FROM vw_banco_horas_mensal
WHERE nome_completo ILIKE '%nome%'
ORDER BY ano DESC, mes DESC;
```

### Passo 3: Ativar Banco de Horas para Funcionários

1. Acessar **Cadastros > Funcionários**
2. Na tabela "Funcionários Cadastrados", marcar checkbox "Banco Hrs" para os funcionários desejados
3. Ou editar funcionário e marcar "Banco de Horas?" na seção correspondente

### Passo 4: Configurar Atualização Automática (Opcional)

#### Opção A: Trigger Automático
```sql
CREATE OR REPLACE FUNCTION trigger_atualizar_banco_horas()
RETURNS TRIGGER AS $$
BEGIN
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

#### Opção B: Cron Job Mensal
Executar no início de cada mês:
```sql
SELECT recalcular_banco_horas_mes(
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER
);
```

## Arquivos Modificados/Criados

### Migrações SQL
- `migrations/add_banco_horas_ativo.sql` - Campo de controle de visibilidade
- `migrations/create_banco_horas_mensal.sql` - Tabela de dados consolidados
- `migrations/function_calcular_banco_horas_mensal.sql` - Funções de cálculo

### Código TypeScript
- `pages/Cadastros/Employees.tsx` - Formulário e tabela com nova coluna
- `pages/FolhaAutomatica/BancoHoras.tsx` - Página administrativa
- `pages/portal/PortalHome.tsx` - Controle de visibilidade do card
- `pages/portal/PortalBancoHoras.tsx` - Portal do funcionário
- `pages/portal-cliente/ClientPortalBancoHoras.tsx` - Portal do cliente

### Documentação
- `docs/IMPLEMENTACAO_BANCO_HORAS_ATIVO.md` - Implementação inicial
- `docs/BANCO_HORAS_MENSAL_GUIA.md` - Guia da tabela mensal
- `docs/RESUMO_BANCO_HORAS_COMPLETO.md` - Este documento

## Testes Recomendados

### 1. Controle de Visibilidade
- [ ] Marcar "Banco Hrs" para um funcionário na tabela
- [ ] Verificar que o card aparece no Portal do Funcionário
- [ ] Desmarcar e verificar que o card desaparece

### 2. Cálculo de Acumulados
- [ ] Popular dados históricos: `SELECT recalcular_banco_horas_ultimos_meses(3);`
- [ ] Acessar página de Banco de Horas
- [ ] Verificar que coluna "Acumulado" mostra valores
- [ ] Filtrar por mês diferente e verificar que acumulado muda

### 3. Portais
- [ ] Portal do Funcionário: Verificar cards "Total do Mês" e "Saldo Acumulado"
- [ ] Portal do Cliente: Verificar linha "Mês: XX:XX · Acumulado: XX:XX"
- [ ] Testar expansão de detalhes por dia

### 4. Performance
- [ ] Verificar tempo de carregamento com múltiplos funcionários
- [ ] Testar filtros de empresa e posto
- [ ] Verificar que não há queries lentas

## Troubleshooting

### Acumulado aparece zerado
1. Verificar se tabela foi criada: `SELECT COUNT(*) FROM banco_horas_mensal;`
2. Popular dados: `SELECT recalcular_banco_horas_ultimos_meses(6);`
3. Verificar dados: `SELECT * FROM banco_horas_mensal LIMIT 10;`

### Card não aparece no portal
1. Verificar se `banco_horas_ativo = true` para o funcionário
2. Verificar no formulário se checkbox está marcado
3. Limpar cache do navegador

### Dados desatualizados
1. Recalcular mês específico: `SELECT recalcular_banco_horas_mes(3, 2026);`
2. Ou configurar trigger automático
3. Ou criar cron job mensal

## Vantagens da Solução

1. **Performance**: Query SQL simples ao invés de cálculos complexos em tempo real
2. **Escalabilidade**: Funciona com anos de dados históricos
3. **Usabilidade**: Edição rápida via checkbox na tabela
4. **Flexibilidade**: Fácil adicionar novas métricas
5. **Confiabilidade**: Dados calculados uma vez e armazenados
6. **Manutenibilidade**: Código limpo e bem documentado

## Próximos Passos (Opcional)

1. **Dashboard de Banco de Horas**: Gráficos e estatísticas
2. **Exportação**: Relatórios em Excel/PDF
3. **Notificações**: Alertas quando acumulado atingir limite
4. **Histórico**: Auditoria de alterações
5. **API**: Endpoints para integração externa
