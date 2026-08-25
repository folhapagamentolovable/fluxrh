# Implementação: Banco de Horas Ativo e Totalizador Acumulado

## Resumo
Implementação de controle de visibilidade do card "Banco de Horas" nos portais e adição de coluna "Acumulado" para totalização de horas.

## Alterações Realizadas

### 1. Banco de Dados
**Arquivo**: `migrations/add_banco_horas_ativo.sql`

Adicionados dois novos campos na tabela `funcionarios`:
- `banco_horas_ativo` (BOOLEAN, default: false): Controla se o funcionário tem acesso ao card de Banco de Horas
- `acumulado_banco_horas` (INTEGER, default: 0): Armazena o total acumulado de minutos no banco de horas

### 2. Formulário de Funcionários
**Arquivo**: `pages/Cadastros/Employees.tsx`

- Adicionada nova seção "Banco de Horas" ao lado da seção "Adicionais"
- Checkbox "Banco de Horas?" para ativar/desativar o acesso ao card
- Texto explicativo: "Se ativado, exibe o card 'Banco de Horas' nos portais do Funcionário e do Cliente"
- Campo incluído em todos os estados do formulário:
  - `formData` (cadastro)
  - `editData` (edição)
  - `handleSubmit` (inserção)
  - `handleSaveEdit` (atualização)
  - `handleCancel` (reset)
  - `handleEdit` (carregamento para edição)

### 3. Portal do Funcionário
**Arquivo**: `pages/portal/PortalHome.tsx`

- Card "Banco de Horas" agora é exibido condicionalmente
- Verificação: `{funcionario.banco_horas_ativo && ( ... )}`
- Se desativado, o card não aparece na home do portal

**Arquivo**: `pages/portal/PortalBancoHoras.tsx`

- Adicionado card de "Saldo Acumulado" ao lado do "Total do Mês"
- Cálculo: `(funcionario?.acumulado_banco_horas || 0) + totalMinutos`
- Visual: Card verde com gradiente (green-500 to green-600)
- Exibe o total de horas acumuladas historicamente

### 4. Portal do Cliente
**Arquivo**: `pages/portal-cliente/ClientPortalBancoHoras.tsx`

- Adicionado totalizador "Acumulado" no card de cada funcionário
- Formato: "Mês: XX:XX · Acumulado: XX:XX"
- Cor verde para destacar o acumulado total

### 5. Página de Banco de Horas (Administrativo)
**Arquivo**: `pages/FolhaAutomatica/BancoHoras.tsx`

- Adicionada coluna "Acumulado" na tabela de funcionários
- Cálculo: `(func.acumulado_banco_horas || 0) + totalMinutos`
- Cor verde para valores positivos
- Exibe "00:00" quando não há horas acumuladas

## Funcionalidades

### Controle de Visibilidade
1. Administrador ativa "Banco de Horas?" no cadastro do funcionário
2. Se ATIVADO:
   - Card "Banco de Horas" aparece no Portal do Funcionário
   - Funcionário aparece no relatório do Portal do Cliente
3. Se DESATIVADO:
   - Card "Banco de Horas" NÃO aparece no Portal do Funcionário
   - Funcionário ainda aparece no relatório administrativo

### Totalizador Acumulado
- **Banco Mensal**: Horas excedentes do mês atual/filtrado
- **Acumulado**: Soma automática de TODOS os meses anteriores ao mês filtrado
- Cálculo: O sistema itera por todos os meses desde 2 anos atrás até o mês anterior ao filtrado
- Não depende do campo `acumulado_banco_horas` do banco de dados
- Cálculo dinâmico baseado nos registros de ponto existentes

## Locais de Exibição do Acumulado

1. **Portal do Funcionário** (`/portal/banco-horas`):
   - Card "Saldo Acumulado (Histórico)" mostrando apenas meses anteriores
   - Card "Total do Mês" mostrando o mês atual/filtrado

2. **Portal do Cliente** (`/portal-cliente/banco-horas`):
   - Linha de resumo: "Mês: XX:XX · Acumulado: XX:XX"
   - Acumulado mostra apenas o histórico (meses anteriores)

3. **Página Administrativa** (`/banco-de-horas`):
   - Coluna "Banco Mensal" com horas do mês filtrado
   - Coluna "Acumulado" com histórico de meses anteriores

## Migração de Dados

Para aplicar as alterações no banco de dados, execute:

```sql
-- Executar o arquivo de migração
\i migrations/add_banco_horas_ativo.sql
```

Ou manualmente no Supabase SQL Editor:

```sql
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS banco_horas_ativo BOOLEAN DEFAULT false;

ALTER TABLE funcionarios
ADD COLUMN IF NOT EXISTS acumulado_banco_horas INTEGER DEFAULT 0;

COMMENT ON COLUMN funcionarios.banco_horas_ativo IS 'Indica se o funcionário tem acesso ao card de Banco de Horas nos portais';
COMMENT ON COLUMN funcionarios.acumulado_banco_horas IS 'Total acumulado de minutos no banco de horas do funcionário';
```

## Observações

1. **IMPORTANTE**: O "Acumulado" é calculado DINAMICAMENTE somando todos os meses anteriores ao mês filtrado
2. O cálculo itera por todos os meses desde 2 anos atrás até o mês anterior ao filtrado
3. Não depende de atualização manual - é calculado em tempo real
4. O valor é exibido em formato HH:MM usando a função `minutesToHHMM()`
5. Valores padrão: `banco_horas_ativo = false`
6. O "Banco Mensal" e o "Acumulado" são valores SEPARADOS e não devem ser somados na exibição
7. O campo `acumulado_banco_horas` no banco de dados é OPCIONAL e não é mais usado pelo sistema

## Lógica de Cálculo do Acumulado

```typescript
// Exemplo simplificado da lógica
function calcularAcumulado(funcionarioId, mesAtual, anoAtual) {
  let totalAcumulado = 0;
  
  // Define o limite: último dia do mês anterior ao filtrado
  const dataLimite = new Date(anoAtual, mesAtual - 2, 1); // Mês anterior
  
  // Itera desde 2 anos atrás até o mês anterior
  const dataInicio = new Date(anoAtual - 2, 0, 1);
  let dataIteracao = dataInicio;
  
  while (dataIteracao < dataLimite) {
    const minutosMes = calcularBancoMes(funcionarioId, dataIteracao);
    totalAcumulado += minutosMes;
    dataIteracao.setMonth(dataIteracao.getMonth() + 1);
  }
  
  return totalAcumulado;
}
```

## Performance

- O sistema carrega TODOS os registros de ponto uma vez por sessão
- O cálculo do acumulado é feito em memória (não requer múltiplas queries)
- Limite de 2 anos para evitar processamento excessivo
- Pode ser ajustado conforme necessário

## Testes Recomendados

1. Cadastrar novo funcionário com "Banco de Horas?" ativado
2. Verificar se o card aparece no Portal do Funcionário
3. Desativar "Banco de Horas?" e verificar se o card desaparece
4. Verificar se a coluna "Acumulado" exibe corretamente na página administrativa
5. Testar que "Banco Mensal" e "Acumulado" são valores SEPARADOS:
   - Banco Mensal = horas do mês filtrado
   - Acumulado = soma de todos os meses anteriores ao filtrado
6. Testar com funcionário que tem registros em fevereiro e março/2026:
   - Filtrar por março/2026: Acumulado deve mostrar apenas fevereiro
   - Filtrar por abril/2026: Acumulado deve mostrar fevereiro + março
7. Verificar que o acumulado é recalculado ao mudar o filtro de mês/ano
8. Testar performance com múltiplos funcionários e vários meses de dados
