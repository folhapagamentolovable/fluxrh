# Implementação: Desconto Excepcional "Adiantam. de Salário"

## ✅ Implementações Realizadas

### 1. **Interface e Tipos**
- ✅ Adicionado `desconto_adiantamento_salario: number` na interface `ResultadoCalculoFolha` (utils/calcularFolhaPagamento.ts)
- ✅ Campo incluído no retorno da função de cálculo (funcionário ativo e inativo)
- ✅ Campo incluído no cálculo de `total_descontos`

### 2. **Código Contábil**
- ✅ Criado código contábil `5016` para "Adiantam. de Salário" (categoria: Adiantamentos)
- ✅ Mapeamento automático no arquivo `codigosContabeisHolerite.ts`
- ✅ Incluído no mapeamento de eventos excepcionais

### 3. **Interface do Sistema (CalculatedPayroll.tsx)**
- ✅ Adicionado na query de carregamento da folha calculada
- ✅ Incluído no mapeamento de dados carregados
- ✅ Exibido na seção DESCONTOS da interface
- ✅ Adicionado no modal de eventos excepcionais (opção 6)
- ✅ Incluído no relatório detalhado
- ✅ Carregamento automático como evento excepcional quando há valor salvo

### 4. **Banco de Dados**
- ✅ Criada migração SQL para adicionar coluna `desconto_adiantamento_salario` na tabela `folha_calculada`
- ✅ Campo incluído em todos os objetos `folhaParaSalvar` (3 locais diferentes)
- ✅ Salvamento e carregamento automático

### 5. **Relatórios e Recibos**
- ✅ Automaticamente incluído em todos os holerites (via mapeamento de códigos contábeis)
- ✅ Automaticamente incluído em todos os recibos (via eventos excepcionais)
- ✅ Automaticamente incluído no cálculo de totais
- ✅ Automaticamente incluído nas impressões

## 🎯 Como Usar

### Para Adicionar o Desconto:
1. Acesse a folha de pagamento de um funcionário
2. Clique em "Adicionar Evento Excepcional" na seção DESCONTOS
3. Selecione a opção "6 - Adiantam. de Salário"
4. Digite o valor do adiantamento
5. O desconto será automaticamente:
   - Incluído no cálculo do salário líquido
   - Exibido na interface
   - Salvo no banco de dados
   - Incluído em todos os relatórios e recibos

### Código Contábil:
- **Código**: 5016
- **Descrição**: Adiantam. de Salário
- **Categoria**: Adiantamentos
- **Tipo**: Desconto

## 🔄 Integração Automática

O novo desconto está totalmente integrado ao sistema:

- **Cálculos**: Incluído automaticamente no total de descontos e salário líquido
- **Holerites**: Aparece automaticamente com código 5016
- **Recibos**: Incluído automaticamente via eventos excepcionais
- **Relatórios**: Aparece em todos os relatórios detalhados
- **Impressões**: Incluído em todas as impressões (individual e em lote)
- **Banco de Dados**: Salvo e carregado automaticamente

## 📋 Migração SQL

Execute o arquivo `migrations/add_desconto_adiantamento_salario.sql` para adicionar a coluna no banco de dados:

```sql
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS desconto_adiantamento_salario DECIMAL(10,2) DEFAULT 0.00;
```

## ✨ Funcionalidades

- ✅ Valor manual (inserido via modal)
- ✅ Validação automática
- ✅ Cálculo automático nos totais
- ✅ Exibição condicional (só aparece se > 0)
- ✅ Código contábil específico
- ✅ Integração completa com todos os relatórios
- ✅ Salvamento persistente no banco
- ✅ Carregamento automático ao abrir folhas salvas

A implementação está completa e funcional! 🎉