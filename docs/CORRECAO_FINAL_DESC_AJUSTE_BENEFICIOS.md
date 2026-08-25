# Correção Final: Desc. Ajuste dos Benefícios no Relatório HTML

## Problema Identificado
O "Desc. Ajuste dos Benefícios" estava sendo exibido como **POSITIVO** no relatório HTML, quando deveria ser **NEGATIVO** (é um desconto).

## Análise da Imagem Fornecida

### Valores Exibidos (INCORRETOS):
- Vale Transporte: R$ 364,00
- Vale Alimentação: R$ 572,66
- Cesta Básica: R$ 205,91
- Prêmio de Permanência: R$ 110,00
- **Desc. Ajuste dos Benefícios: R$ 1.252,57** ❌ (POSITIVO - ERRADO!)
- **Total Benefícios: R$ 2.505,14** ❌ (SOMOU o desconto)
- **Salário Líquido + Benefícios: R$ 2.658,57** ❌ (ERRADO)

### Valores Corretos (APÓS CORREÇÃO):
- Vale Transporte: R$ 364,00
- Vale Alimentação: R$ 572,66
- Cesta Básica: R$ 205,91
- Prêmio de Permanência: R$ 110,00
- **Desc. Ajuste dos Benefícios: -R$ 1.252,57** ✅ (NEGATIVO - CORRETO!)
- **Total Benefícios: R$ 0,00** ✅ (364 + 572,66 + 205,91 + 110 - 1.252,57 = 0)
- **Salário Líquido + Benefícios: R$ 153,43** ✅ (CORRETO)

## Correções Aplicadas

### 1. Exibição do "Desc. Ajuste dos Benefícios" no HTML

**ANTES** (linha ~1835):
```typescript
${folhas.map(f => `<td>${formatarMoeda(f.desc_ajuste_beneficios || 0)}</td>`).join('')}
```
Exibia o valor como POSITIVO.

**DEPOIS**:
```typescript
${folhas.map(f => `<td style="color: red;">${formatarMoeda(-(f.desc_ajuste_beneficios || 0))}</td>`).join('')}
```
Exibe o valor como NEGATIVO em vermelho.

### 2. Cálculo do "Total Benefícios" no HTML

**ANTES** (linha ~1848):
```typescript
+ (f.desc_ajuste_beneficios || 0)
```
SOMAVA o desconto (errado).

**DEPOIS**:
```typescript
- (f.desc_ajuste_beneficios || 0)
```
SUBTRAI o desconto (correto).

### 3. Adicionados Descontos de VT/VA por Faltas

Adicionadas linhas para exibir:
- Desc. VT por Faltas (negativo, em vermelho)
- Desc. VA por Faltas (negativo, em vermelho)

Esses descontos também são subtraídos do Total Benefícios:
```typescript
- (f.desconto_vt_faltas || 0) - (f.desconto_va_faltas || 0)
```

## Fórmula Correta do Total Benefícios

```
Total Benefícios = 
  + VT Mês Anterior
  + VT Mês Atual
  + VA Mês Anterior
  + VA Mês Atual
  + Cesta Básica
  + Prêmio de Permanência
  + Reembolsos
  - Desc. VT por Faltas
  - Desc. VA por Faltas
  - Desc. Ajuste dos Benefícios
```

## Exemplo de Cálculo (Osmar de Jesus Pereira)

### Proventos:
- Salário: R$ 2.144,84
- Acúmulo de Função: R$ 428,96
- 2ª Parcela PLR: R$ 153,43
- **Total Proventos**: R$ 2.727,23

### Descontos:
- INSS: R$ 0,00
- Vale Transporte: R$ 128,69
- Adiantam. de Salário: R$ 2.445,11
- **Total Descontos**: R$ 2.573,80

### Salário Líquido (sem benefícios):
```
2.727,23 - 2.573,80 = R$ 153,43
```

### Benefícios:
- Vale Transporte: R$ 364,00
- Vale Alimentação: R$ 572,66
- Cesta Básica: R$ 205,91
- Prêmio de Permanência: R$ 110,00
- Desc. Ajuste dos Benefícios: -R$ 1.252,57
- **Total Benefícios**: R$ 0,00

### Total a Depositar:
```
153,43 + 0,00 = R$ 153,43 ✅
```

## Arquivos Modificados
- `pages/Relatorios/Reports.tsx` (linhas ~1830-1850)

## Data
2026-03-05

## Status
✅ Correção aplicada - Valores agora estão corretos!
