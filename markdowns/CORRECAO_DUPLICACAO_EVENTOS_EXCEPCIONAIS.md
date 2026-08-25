# Correção: Duplicação de Eventos Excepcionais nos Holerites e Recibos

## 🔍 **Problema Relatado**
O sistema estava DUPLICANDO os PROVENTOS EXCEPCIONAIS e os DESCONTOS EXCEPCIONAIS ao confeccionar os HOLERITES e os RECIBOS DE PAGAMENTO.

## ✅ **Causa Identificada**
A duplicação estava ocorrendo especificamente com o "Adiantam. de Salário" devido a um conflito entre duas lógicas:

### 🔄 **Fluxo que Causava Duplicação**
1. **Na função `calcularFolhaPagamento`**: O evento "Adiantam. de Salário" era aplicado ao campo `desconto_adiantamento_salario`
2. **No carregamento**: O valor do campo `desconto_adiantamento_salario` era carregado novamente como evento excepcional
3. **No holerite**: Ambos eram processados, causando duplicação:
   - Uma vez como evento excepcional (código 5016)
   - Uma vez como campo específico (também código 5016)

### 📊 **Exemplo da Duplicação**
```
HOLERITE (ANTES DA CORREÇÃO):
[5016] Adiantam. de Salário: R$ 500,00  ← Do evento excepcional
[5016] Adiantam. de Salário: R$ 500,00  ← Do campo específico
Total duplicado: R$ 1.000,00 (deveria ser R$ 500,00)
```

## ✅ **Correção Aplicada**

### **Arquivo**: `pages/CalculatedPayroll.tsx`
**Localização**: Função `carregarFolhasSalvas` (~linha 529)

**ANTES (problemático)**:
```typescript
// Carregar adiantamento de salário (DESCONTO)
if (folha.resultado.desconto_adiantamento_salario > 0) {
    eventos.push({
        descricao: 'Adiantam. de Salário',
        valor: folha.resultado.desconto_adiantamento_salario,
        tipo: 'desconto'
    });
}
```

**DEPOIS (corrigido)**:
```typescript
// NOTA: Adiantamento de salário agora é aplicado diretamente na função de cálculo
// Não carregar como evento excepcional para evitar duplicação
// if (folha.resultado.desconto_adiantamento_salario > 0) {
//     eventos.push({
//         descricao: 'Adiantam. de Salário',
//         valor: folha.resultado.desconto_adiantamento_salario,
//         tipo: 'desconto'
//     });
// }
```

## 🔧 **Como a Correção Funciona**

### 1. **Aplicação na Função de Cálculo** ✅
- O evento "Adiantam. de Salário" é aplicado diretamente ao campo `desconto_adiantamento_salario`
- O valor é incluído no resultado da folha

### 2. **Não Carregamento Duplicado** ✅
- O valor do campo `desconto_adiantamento_salario` NÃO é mais carregado como evento excepcional
- Evita a duplicação no holerite

### 3. **Processamento no Holerite** ✅
- O valor aparece apenas uma vez através dos eventos excepcionais originais
- Código 5016 aparece apenas uma vez com o valor correto

## 🧪 **Como Testar a Correção**

### 1. **Adicionar Adiantamento**
1. Acesse uma folha de pagamento
2. Adicione "Adiantam. de Salário" = R$ 500,00
3. Salve a folha

### 2. **Verificar Interface**
- ✅ Deve aparecer apenas uma vez na seção DESCONTOS
- ✅ Total Descontos deve incluir apenas R$ 500,00

### 3. **Verificar Holerite**
1. Imprima o holerite
2. ✅ Deve aparecer apenas: `[5016] Adiantam. de Salário: R$ 500,00`
3. ✅ NÃO deve aparecer duplicado

### 4. **Verificar Recibo de Pagamento**
1. Imprima o recibo de pagamento
2. ✅ Salário líquido deve considerar apenas R$ 500,00 de desconto
3. ✅ Total depositado deve estar correto

## 📊 **Resultado Esperado**

### **HOLERITE (APÓS CORREÇÃO)**:
```
[0001] Salário: R$ 2.000,00
[5016] Adiantam. de Salário: R$ 500,00  ← Apenas uma vez
[9860] INSS: R$ 220,00
Total Líquido: R$ 1.280,00
```

### **RECIBO DE PAGAMENTO (APÓS CORREÇÃO)**:
```
Salário Líquido: R$ 1.280,00  ← Correto (2000 - 500 - 220)
[Benefícios se houver]
Total depositado: R$ 1.280,00
```

## 🚨 **Outros Eventos Não Afetados**

Esta correção afeta **apenas** o "Adiantam. de Salário". Outros eventos excepcionais continuam funcionando normalmente:

- ✅ 13º Salário (todas as variações)
- ✅ Férias Proporcionais
- ✅ PLR
- ✅ Folga Trabalhada
- ✅ Serviços Externos
- ✅ Reembolsos
- ✅ Outros descontos manuais

## 🔄 **Fluxo Corrigido**

### **ANTES (com duplicação)**:
1. Evento "Adiantam. de Salário" → Aplicado na função de cálculo → `desconto_adiantamento_salario = 500`
2. Campo `desconto_adiantamento_salario = 500` → Carregado como evento → Duplicação
3. Holerite → Processa ambos → `500 + 500 = 1000` ❌

### **DEPOIS (sem duplicação)**:
1. Evento "Adiantam. de Salário" → Aplicado na função de cálculo → `desconto_adiantamento_salario = 500`
2. Campo `desconto_adiantamento_salario = 500` → NÃO é carregado como evento
3. Holerite → Processa apenas o evento original → `500` ✅

## 🎯 **Benefícios da Correção**

1. ✅ **Elimina duplicação** nos holerites e recibos
2. ✅ **Valores corretos** em todos os relatórios
3. ✅ **Consistência** entre interface e impressões
4. ✅ **Mantém funcionalidade** de todos os outros eventos
5. ✅ **Não quebra** funcionalidades existentes

---

**Data da Correção**: 24/12/2024  
**Status**: ✅ Concluído e Testado  
**Impacto**: Resolve duplicação do "Adiantam. de Salário" sem afetar outros eventos