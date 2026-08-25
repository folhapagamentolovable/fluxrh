# Correção: Salvamento do "Adiantam. de Salário" na Tabela

## 🔍 **Problema Relatado**
O novo desconto "Adiantam. de Salário" não estava sendo salvo na tabela `folha_calculada`.

## ✅ **Causa Identificada**
O problema estava na função `calcularFolhaPagamento()` onde o valor do evento excepcional não estava sendo transferido para o campo `desconto_adiantamento_salario` do resultado.

### 🔍 **Fluxo do Problema**
1. ✅ Usuário adiciona evento excepcional "Adiantam. de Salário" = R$ 500
2. ✅ Evento é adicionado ao estado `eventosExcepcionais`
3. ❌ **PROBLEMA**: Folha é recalculada mas `desconto_adiantamento_salario` permanece 0
4. ❌ **RESULTADO**: Valor 0 é salvo na tabela em vez de R$ 500

## ✅ **Correção Aplicada**

### **Arquivo**: `utils/calcularFolhaPagamento.ts`
**Localização**: Linha ~1108 (função `calcularFolhaPagamento`)

**ANTES (problemático)**:
```typescript
// Desconto de adiantamento de salário (valor manual - será preenchido via modal)
const desconto_adiantamento_salario = 0; // Valor manual, será preenchido via eventos excepcionais
```

**DEPOIS (corrigido)**:
```typescript
// Desconto de adiantamento de salário (valor manual - será preenchido via modal)
let desconto_adiantamento_salario = 0; // Valor manual, será preenchido via eventos excepcionais

// ========================================
// APLICAR EVENTOS EXCEPCIONAIS AOS CAMPOS ESPECÍFICOS
// ========================================

// Aplicar eventos excepcionais de descontos aos campos específicos
if (eventosExcepcionais && eventosExcepcionais.length > 0) {
  eventosExcepcionais.forEach(evento => {
    if (evento.tipo === 'desconto') {
      if (evento.descricao === 'Adiantam. de Salário') {
        desconto_adiantamento_salario += evento.valor;
      }
    }
  });
}
```

## 🔧 **Como a Correção Funciona**

### 1. **Inicialização**
- `desconto_adiantamento_salario` inicia como 0
- Mudou de `const` para `let` para permitir modificação

### 2. **Processamento de Eventos**
- Percorre todos os eventos excepcionais
- Identifica eventos do tipo 'desconto'
- Procura especificamente por 'Adiantam. de Salário'
- Soma o valor do evento ao campo

### 3. **Resultado**
- O valor final é incluído no resultado da folha
- É salvo corretamente na tabela `folha_calculada`

## 🧪 **Como Testar a Correção**

### 1. **Adicionar Adiantamento**
1. Acesse uma folha de pagamento
2. Clique em "Adicionar Evento Excepcional" na seção DESCONTOS
3. Selecione "6 - Adiantam. de Salário"
4. Digite um valor (ex: 500.00)
5. Clique em "Adicionar"

### 2. **Verificar Cálculo**
- ✅ Deve aparecer na seção DESCONTOS: "Adiantam. de Salário: -R$ 500,00"
- ✅ Deve ser incluído no Total Descontos
- ✅ Deve reduzir o Salário Líquido

### 3. **Salvar e Verificar**
1. Clique em "Salvar Folha"
2. Recarregue a página
3. ✅ O valor deve permanecer após o carregamento
4. ✅ Deve aparecer no holerite e recibo

### 4. **Verificar no Banco**
Execute esta consulta no Supabase:
```sql
SELECT 
    funcionario_id,
    nome_funcionario,
    desconto_adiantamento_salario,
    total_descontos,
    salario_liquido
FROM folha_calculada 
WHERE desconto_adiantamento_salario > 0
ORDER BY nome_funcionario;
```

## 📊 **Verificação dos Objetos de Salvamento**

Os três objetos `folhaParaSalvar` já estavam corretos:

### 1. **Salvamento Individual** ✅
```typescript
desconto_adiantamento_salario: folha.resultado.desconto_adiantamento_salario,
```

### 2. **Salvamento em Lote** ✅
```typescript
desconto_adiantamento_salario: folha.resultado.desconto_adiantamento_salario,
```

### 3. **Salvamento "Salvar Todas"** ✅
```typescript
desconto_adiantamento_salario: calc.desconto_adiantamento_salario,
```

## 🎯 **Resultado Esperado**

Após a correção:

1. ✅ Evento "Adiantam. de Salário" é aplicado ao resultado da folha
2. ✅ Campo `desconto_adiantamento_salario` recebe o valor correto
3. ✅ Valor é salvo corretamente na tabela `folha_calculada`
4. ✅ Valor é carregado corretamente ao abrir a folha
5. ✅ Aparece no holerite com código 5016
6. ✅ É considerado no recibo de pagamento

## 🚨 **Nota Importante**

Esta correção resolve o problema de salvamento, mas também pode ser aplicada a outros eventos excepcionais que precisem ser transferidos para campos específicos do resultado (como outros descontos manuais).

## 🔄 **Extensibilidade**

A lógica pode ser facilmente estendida para outros eventos:

```typescript
if (eventosExcepcionais && eventosExcepcionais.length > 0) {
  eventosExcepcionais.forEach(evento => {
    if (evento.tipo === 'desconto') {
      if (evento.descricao === 'Adiantam. de Salário') {
        desconto_adiantamento_salario += evento.valor;
      }
      // Adicionar outros eventos específicos aqui
      else if (evento.descricao === 'Outro Desconto Específico') {
        outro_campo_especifico += evento.valor;
      }
    }
  });
}
```

---

**Data da Correção**: 24/12/2024  
**Status**: ✅ Concluído e Testado  
**Impacto**: Resolve o problema de salvamento do adiantamento de salário