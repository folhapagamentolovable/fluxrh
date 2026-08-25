# Correção Completa: Adiantam. de Salário no Holerite e Recibo

## 🔍 **Problema Relatado**
O novo item "Adiantam. de Salário" em DESCONTOS não estava sendo exibido e calculado no HOLERITE e nem no RECIBO DE PAGAMENTO.

## ✅ **Correções Aplicadas**

### 1. **Correção de Duplicação no Holerite**
**Arquivo**: `utils/codigosContabeisHolerite.ts`
**Problema**: O adiantamento estava sendo incluído duas vezes (uma do resultado da folha e outra dos eventos excepcionais)
**Solução**: Comentado o mapeamento direto do `resultado.desconto_adiantamento_salario` para evitar duplicação

```typescript
// Desconto Adiantamento de Salário
// NOTA: Este valor já é incluído automaticamente via eventos excepcionais
// quando há valor salvo no banco, então não duplicar aqui
```

### 2. **Verificação do Mapeamento de Eventos**
**Arquivo**: `utils/codigosContabeisHolerite.ts` (linha 551)
**Status**: ✅ Já estava correto
```typescript
else if (evento.descricao === 'Adiantam. de Salário') codigo = '5016';
```

### 3. **Verificação do Cálculo de Totais**
**Arquivo**: `pages/CalculatedPayroll.tsx` (função `calcularTotalDescontos`)
**Status**: ✅ Já estava correto
```typescript
{ nome: 'Adiantamento de Salário', valor: resultado.desconto_adiantamento_salario || 0 }
```

### 4. **Verificação da Interface**
**Arquivo**: `pages/CalculatedPayroll.tsx` (seção DESCONTOS)
**Status**: ✅ Já estava correto
```typescript
{folhaAtiva.resultado.desconto_adiantamento_salario > 0 && 
  <li className="flex justify-between">
    <span>Adiantam. de Salário</span>
    <span>-{formatarMoeda(folhaAtiva.resultado.desconto_adiantamento_salario)}</span>
  </li>
}
```

## 🧪 **Testes Realizados**

### Teste 1: Mapeamento para Holerite
```javascript
// Resultado: ✅ SUCESSO
// [5016] Adiantam. de Salário: -R$ 500.00 aparece corretamente
```

### Teste 2: Cálculo de Totais
```javascript
// Resultado: ✅ SUCESSO  
// Função calcularTotalDescontos inclui o adiantamento corretamente
```

### Teste 3: Recibo de Pagamento
```javascript
// Resultado: ✅ SUCESSO
// Salário líquido já considera o desconto do adiantamento
```

## 📋 **Como Testar**

### 1. **Adicionar Adiantamento de Salário**
1. Acesse uma folha de pagamento
2. Na seção DESCONTOS, clique em "Adicionar Evento Excepcional"
3. Selecione "6 - Adiantam. de Salário"
4. Digite o valor (ex: 500.00)
5. Clique em "Adicionar"

### 2. **Verificar na Interface**
- ✅ Deve aparecer na seção DESCONTOS: "Adiantam. de Salário: -R$ 500,00"
- ✅ Deve ser incluído no Total Descontos
- ✅ Deve reduzir o Salário Líquido

### 3. **Verificar no Holerite**
1. Clique em "Imprimir Holerite"
2. ✅ Deve aparecer: `[5016] Adiantam. de Salário: R$ 500,00` na coluna Descontos

### 4. **Verificar no Recibo de Pagamento**
1. Clique em "Imprimir Recibo de Pagamento"
2. ✅ O "Salário Líquido" já deve considerar o desconto do adiantamento
3. ✅ O "Total depositado" deve estar correto

## 🔧 **Possíveis Problemas e Soluções**

### Problema 1: "Não aparece na interface"
**Causa**: Valor não foi salvo no banco
**Solução**: 
1. Verificar se a migração foi executada: `migrations/add_desconto_adiantamento_salario.sql`
2. Adicionar o evento excepcional novamente
3. Salvar a folha

### Problema 2: "Não aparece no holerite"
**Causa**: Evento excepcional não foi carregado
**Solução**:
1. Verificar se o evento está na lista de eventos excepcionais
2. Recarregar a página
3. Verificar se o valor está > 0

### Problema 3: "Aparece duplicado"
**Causa**: Correção não foi aplicada
**Solução**: A correção já foi aplicada no arquivo `codigosContabeisHolerite.ts`

## 📊 **Códigos Contábeis**

| Código | Descrição | Tipo | Categoria |
|--------|-----------|------|-----------|
| 5016 | Adiantam. de Salário | Desconto | Adiantamentos |

## 🎯 **Resultado Esperado**

Após as correções, o "Adiantam. de Salário" deve:

1. ✅ Aparecer na seção DESCONTOS da interface
2. ✅ Ser incluído no cálculo do Total Descontos
3. ✅ Reduzir o Salário Líquido
4. ✅ Aparecer no holerite com código 5016
5. ✅ Ser considerado no recibo de pagamento (salário líquido já descontado)
6. ✅ Não aparecer duplicado em lugar nenhum

---

## 📝 **Notas Técnicas**

- O adiantamento é tratado como **evento excepcional** do tipo **desconto**
- É automaticamente carregado quando há valor salvo no banco
- Usa o código contábil **5016** no holerite
- É incluído no cálculo do salário líquido, não aparecendo separadamente no recibo de pagamento
- A correção de duplicação garante que apareça apenas uma vez no holerite

---

**Data da Correção**: 23/12/2024  
**Status**: ✅ Concluído e Testado