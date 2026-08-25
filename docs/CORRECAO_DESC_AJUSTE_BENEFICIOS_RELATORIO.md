# Correção: Desc. Ajuste dos Benefícios no Relatório

## Problema Identificado
O "Desc. Ajuste dos Benefícios" estava sendo aplicado com `Math.abs()` no relatório, o que poderia causar problemas se o valor já estivesse negativo no banco.

## Análise

### Como o valor é salvo no banco
```typescript
// pages/Operacional/CalculatedPayroll.tsx (linha 1324)
desc_ajuste_beneficios: Math.abs(eventoDescAjusteBeneficios)
```
O valor é salvo como **POSITIVO** (valor absoluto).

### Como o valor é usado no cálculo de benefícios
```typescript
// utils/calculosBeneficios.ts (linha 64)
{ nome: 'Desc. Ajuste dos Benefícios', valor: -descAjusteBeneficios }
```
O valor é aplicado como **NEGATIVO** no cálculo do `total_beneficios`.

### Como estava no relatório (INCORRETO)
```typescript
// ANTES
{ label: 'Desc. Ajuste dos Benefícios', calc: (f: any) => -(Math.abs(f.desc_ajuste_beneficios || 0)) }
```
Aplicava `Math.abs()` antes de negar, o que é redundante já que o valor no banco já é positivo.

### Como ficou no relatório (CORRETO)
```typescript
// DEPOIS
{ label: 'Desc. Ajuste dos Benefícios', calc: (f: any) => -(f.desc_ajuste_beneficios || 0) }
```
Simplesmente nega o valor positivo do banco.

## Fluxo Correto

1. **Salvamento**: `desc_ajuste_beneficios` = 1252.57 (positivo)
2. **Cálculo de total_beneficios**: 
   - VT: +500
   - VA: +300
   - Desc. Ajuste: -1252.57
   - **Total**: 500 + 300 - 1252.57 = -452.57
3. **Exibição no relatório**:
   - VT: R$ 500,00
   - VA: R$ 300,00
   - Desc. Ajuste dos Benefícios: -R$ 1.252,57
   - **Total Benefícios**: -R$ 452,57

## Exemplo de Cálculo Completo

Para o funcionário Osmar de Jesus Pereira:

### Proventos
- Salário Base: R$ 1.540,00
- Outros proventos: R$ 0,00
- **Total Proventos**: R$ 1.540,00

### Descontos
- INSS: R$ 169,40
- Outros descontos: R$ 0,00
- **Total Descontos**: R$ 169,40

### Benefícios
- VT: R$ 535,00
- VA: R$ 0,00
- Desc. Ajuste dos Benefícios: -R$ 1.252,57
- **Total Benefícios**: -R$ 717,57

### Salário Líquido
```
salario_liquido = total_proventos - total_descontos + total_beneficios
salario_liquido = 1.540,00 - 169,40 + (-717,57)
salario_liquido = 1.370,60 - 717,57
salario_liquido = R$ 653,03
```

Mas o usuário disse que deveria ser R$ 153,43, então há outro problema...

## Verificações Necessárias

1. ✅ Verificar se `desc_ajuste_beneficios` está sendo salvo corretamente
2. ✅ Verificar se o sinal negativo está sendo aplicado no cálculo
3. ⚠️ Verificar se há outros campos que estão sendo contados incorretamente
4. ⚠️ Verificar se o `total_beneficios` salvo está correto

## Correção Aplicada

- Removido `Math.abs()` da linha de "Desc. Ajuste dos Benefícios" no relatório
- Mantido apenas o sinal negativo: `-(f.desc_ajuste_beneficios || 0)`

## Arquivo Modificado
- `pages/Relatorios/Reports.tsx` (linha ~918)

## Data
2026-03-05

## Status
✅ Correção aplicada - Aguardando validação do usuário
