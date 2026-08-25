# Sintonia Fina - Relatório Detalhado vs Cards da Folha Calculada

## Objetivo
Garantir que os valores exibidos no Relatório Detalhado sejam idênticos aos valores exibidos nos cards de Proventos, Descontos e Benefícios da Folha Calculada.

## Problemas Identificados e Corrigidos

### 1. Reembolsos Contado como Provento (ERRO CRÍTICO)
**Problema**: O campo `reembolsos_uber` estava sendo contado como PROVENTO em `calculosProventos.ts`, mas deveria ser um BENEFÍCIO.

**Impacto**: 
- Total de Proventos estava INFLADO
- Total de Benefícios estava DEFLACIONADO
- Salário Líquido estava INCORRETO

**Correção**:
- ✅ Removido `reembolsos_uber` de `utils/calculosProventos.ts` (linhas 60 e 103)
- ✅ Adicionado `reembolsos_uber` em `utils/calculosBeneficios.ts` (linhas 61 e 119)

**Arquivos Modificados**:
- `utils/calculosProventos.ts`
- `utils/calculosBeneficios.ts`

---

### 2. PLR Contado Duas Vezes (ERRO CRÍTICO)
**Problema**: O campo `plr` estava sendo contado em DOIS lugares:
1. Como PROVENTO em `calculosProventos.ts`
2. Como BENEFÍCIO em `calculosBeneficios.ts`

**Impacto**:
- Total de Benefícios estava INFLADO
- Salário Líquido estava INCORRETO (somava PLR duas vezes)

**Correção**:
- ✅ Removido `plr` de `utils/calculosBeneficios.ts` (linhas 58 e 116)
- ✅ Mantido `plr` apenas em `utils/calculosProventos.ts` (é um PROVENTO)
- ✅ Removido PLR da lista de benefícios do relatório

**Arquivos Modificados**:
- `utils/calculosBeneficios.ts`
- `pages/Relatorios/Reports.tsx`

---

### 3. Descontos de VT/VA por Faltas no Lugar Errado
**Problema**: Os campos `desconto_vt_faltas` e `desconto_va_faltas` estavam sendo listados como DESCONTOS no relatório, mas deveriam ser BENEFÍCIOS NEGATIVOS.

**Impacto**:
- Total de Descontos estava INFLADO
- Total de Benefícios não refletia os descontos de VT/VA por faltas

**Correção**:
- ✅ Removido `desconto_vt_faltas` e `desconto_va_faltas` da lista de descontos do relatório
- ✅ Adicionado como benefícios negativos na lista de benefícios do relatório
- ✅ Já estavam corretos em `utils/calculosBeneficios.ts`

**Arquivos Modificados**:
- `pages/Relatorios/Reports.tsx`

---

### 4. Duplicação de "Adiantam. de Salário"
**Problema**: O campo `desconto_adiantamento_salario` estava listado DUAS VEZES na configuração de descontos do relatório (linhas 854 e 865).

**Impacto**:
- Linha duplicada no relatório (confusão visual)

**Correção**:
- ✅ Removida a duplicação da linha 865

**Arquivos Modificados**:
- `pages/Relatorios/Reports.tsx`

---

### 5. Falta de "Desc. Ajuste dos Benefícios" no Relatório
**Problema**: O campo `desc_ajuste_beneficios` não estava sendo listado no relatório de benefícios.

**Impacto**:
- Total de Benefícios não refletia o desconto de ajuste

**Correção**:
- ✅ Adicionado `desc_ajuste_beneficios` como benefício negativo na lista do relatório
- ✅ Já estava correto em `utils/calculosBeneficios.ts`

**Arquivos Modificados**:
- `pages/Relatorios/Reports.tsx`

---

## Estrutura Correta dos Totais

### PROVENTOS (total_proventos)
Campos incluídos:
- Salário Base
- Horas Extras 50% e 100%
- Intrajornada 50% e 100%
- DSR s/ H.Extras e DSR s/ Adicional Noturno
- Adicional Noturno
- Insalubridade
- Acúmulo de Função
- Salário Família
- **PLR** ✅
- 13º Salário (todas as variações)
- Serviços Externos (Folhas e Rondas)
- Folga Trabalhada
- Supervisão Palmeiras
- Eventos excepcionais de proventos

**NÃO INCLUI**:
- ❌ Reembolsos (é benefício)
- ❌ Complemento de Salário (calculado separadamente)

### DESCONTOS (total_descontos)
Campos incluídos:
- INSS, IRRF
- Desc. Vale Transporte
- Seguro de Vida, Convênio Odonto
- Contribuição Assistencial
- Faltas, DSR s/ Faltas, Atrasos
- Desc. PLR
- Pensão Alimentícia
- Rondas Não Realizadas
- Adiantamento Quinzenal
- Desc. Complemento Anterior
- Adiantam. de Salário
- Desc. Avaria Utilitário
- INSS 13º, INSS Férias
- Adiantam. 13º Salário, Adiantam. Vantagens 13º
- Eventos excepcionais de descontos

**NÃO INCLUI**:
- ❌ Desc. VT por Faltas (é benefício negativo)
- ❌ Desc. VA por Faltas (é benefício negativo)

### BENEFÍCIOS (total_beneficios)
Campos incluídos:
- Vale Transporte (mês anterior + mês atual)
- Vale Alimentação (mês anterior + mês atual)
- VT/VA por Folgas Trabalhadas
- Cesta Básica
- Prêmio de Permanência
- **Reembolsos** ✅
- **Desc. VT por Faltas** (negativo) ✅
- **Desc. VA por Faltas** (negativo) ✅
- **Desc. Ajuste dos Benefícios** (negativo) ✅
- Eventos excepcionais de benefícios

**NÃO INCLUI**:
- ❌ PLR (é provento)

### SALÁRIO LÍQUIDO
Fórmula: `total_proventos - total_descontos + total_beneficios`

---

## Arquivos Modificados

1. **utils/calculosBeneficios.ts**
   - Adicionado `reembolsos_uber` ao cálculo de benefícios
   - Removido `plr` (é provento, não benefício)

2. **utils/calculosProventos.ts**
   - Removido `reembolsos_uber` (é benefício, não provento)

3. **pages/Relatorios/Reports.tsx**
   - Removida duplicação de "Adiantam. de Salário"
   - Removido "Desc. VT por Faltas" e "Desc. VA por Faltas" dos descontos
   - Adicionado "Desc. VT por Faltas", "Desc. VA por Faltas" e "Desc. Ajuste dos Benefícios" aos benefícios
   - Removido PLR dos benefícios

---

## Validação

Para validar as correções:

1. **Calcular uma folha** em `pages/Operacional/CalculatedPayroll.tsx`
2. **Verificar os cards**:
   - Total Salários (verde) = `total_proventos`
   - Total Descontos (vermelho) = `total_descontos`
   - Total Benefícios (azul) = `total_beneficios`
3. **Gerar Relatório Detalhado** em `pages/Relatorios/Reports.tsx`
4. **Comparar valores**:
   - Salário Bruto no relatório = Total Salários no card
   - Total Descontos no relatório = Total Descontos no card
   - Total Benefícios no relatório = Total Benefícios no card
   - Salário Líquido + Benefícios no relatório = TOTAL A DEPOSITAR

---

## Data da Implementação
2026-03-05

## Status
✅ Concluído - Sintonia fina realizada com sucesso
