# Correção de Cálculo - Desc. Ajuste dos Benefícios

**Data:** 02/03/2026  
**Status:** ✅ Corrigido  
**Problema:** Campo `desc_ajuste_beneficios` não estava sendo incluído no cálculo de benefícios

---

## 📋 Problema Identificado

O campo `desc_ajuste_beneficios` estava:
- ✅ Sendo salvo no banco de dados
- ✅ Sendo carregado na query SELECT
- ❌ NÃO estava sendo incluído no cálculo de benefícios
- ❌ NÃO estava sendo exibido no card de Benefícios
- ❌ NÃO estava sendo passado no objeto `resultado`

**Resultado:** O valor não aparecia na interface e não era contabilizado nos totais.

---

## ✅ Correções Aplicadas

### 1. Adicionado Campo na Interface ResultadoCalculoFolha

**Arquivo:** `utils/calcularFolhaPagamento.ts`  
**Linha:** ~95

```typescript
// Descontos - 13º Salário
inss_13?: number;
inss_ferias?: number;
adiantamento_13_salario?: number;
adiantamento_vantagens_13?: number;

// Benefícios - Descontos
desc_ajuste_beneficios?: number;  // ⭐ ADICIONADO

// Totais
total_proventos: number;
total_descontos: number;
```

### 2. Adicionado Campo no Cálculo de Benefícios

**Arquivo:** `utils/calculosBeneficios.ts`  
**Linha:** ~50

```typescript
const beneficiosBase = [
    { nome: 'VT Mês Anterior', valor: resultado.vale_transporte_mes_anterior || 0 },
    { nome: 'VA Mês Anterior', valor: resultado.vale_alimentacao_mes_anterior || 0 },
    { nome: 'VT Mês Atual', valor: temSeparacaoVT ? (resultado.vale_transporte_mes_atual || 0) : (resultado.vale_transporte || 0) },
    { nome: 'VA Mês Atual', valor: temSeparacaoVA ? (resultado.vale_alimentacao_mes_atual || 0) : (resultado.vale_alimentacao || 0) },
    { nome: 'VT Folgas Trabalhadas', valor: vtFolgasTrabalhadas },
    { nome: 'VA Folgas Trabalhadas', valor: vaFolgasTrabalhadas },
    { nome: 'Cesta Básica', valor: resultado.cesta_basica || 0 },
    { nome: 'Prêmio Permanência', valor: resultado.premio_permanencia || 0 },
    { nome: 'Desconto VT Faltas', valor: -(resultado.desconto_vt_faltas || 0) },
    { nome: 'Desconto VA Faltas', valor: -(resultado.desconto_va_faltas || 0) },
    { nome: 'Desc. Ajuste dos Benefícios', valor: -((resultado as any).desc_ajuste_beneficios || 0) } // ⭐ ADICIONADO
];
```

**Observação:** O valor é negativo porque é um desconto de benefício.

### 3. Adicionado Campo na Lista de Exibição

**Arquivo:** `utils/calculosBeneficios.ts`  
**Linha:** ~110

```typescript
if (resultado.cesta_basica > 0) itens.push({ nome: 'Cesta Básica', valor: resultado.cesta_basica });
if (resultado.premio_permanencia > 0) itens.push({ nome: 'Prêmio Permanência', valor: resultado.premio_permanencia });
if (resultado.desconto_vt_faltas > 0) itens.push({ nome: 'Desconto VT Faltas', valor: -resultado.desconto_vt_faltas });
if (resultado.desconto_va_faltas > 0) itens.push({ nome: 'Desconto VA Faltas', valor: -resultado.desconto_va_faltas });
if ((resultado as any).desc_ajuste_beneficios > 0) itens.push({ nome: 'Desc. Ajuste dos Benefícios', valor: -(resultado as any).desc_ajuste_beneficios }); // ⭐ ADICIONADO
```

### 4. Adicionado Campo no Objeto Resultado

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx`  
**Linha:** ~468

```typescript
desc_avaria_utilitario: (folha as any).desc_avaria_utilitario || 0,
// ⭐ ADICIONAR SERVIÇOS EXTERNOS AO RESULTADO
servicos_externos_folhas_pagamento: folha.servicos_externos_folhas_pagamento || 0,
servicos_externos_controle_rondas: folha.servicos_externos_controle_rondas || 0,
// ⭐ ADICIONAR BENEFÍCIOS - DESCONTOS
desc_ajuste_beneficios: (folha as any).desc_ajuste_beneficios || 0,  // ⭐ ADICIONADO
total_proventos: folha.total_proventos || 0,
total_descontos: folha.total_descontos || 0,
```

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
│  folha_calculada.desc_ajuste_beneficios = 1116.57           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CARREGAMENTO (CalculatedPayroll)                │
│  Query SELECT inclui desc_ajuste_beneficios                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              MONTAGEM DO OBJETO RESULTADO                    │
│  resultado.desc_ajuste_beneficios = 1116.57                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CÁLCULO DE BENEFÍCIOS                           │
│  calcularTotalBeneficios(resultado)                          │
│  - Inclui desc_ajuste_beneficios como valor negativo        │
│  - Total Benefícios = VT + VA + ... - desc_ajuste          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              EXIBIÇÃO NA INTERFACE                           │
│  Card Benefícios mostra:                                     │
│  - Desc. Ajuste dos Benefícios: -R$ 1.116,57               │
│  - Total Benefícios: (reduzido pelo desconto)               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Resultado

Agora o campo `desc_ajuste_beneficios`:
- ✅ É carregado do banco de dados
- ✅ É passado no objeto `resultado`
- ✅ É incluído no cálculo de benefícios (como valor negativo)
- ✅ É exibido no card de Benefícios
- ✅ Reduz o total de benefícios corretamente
- ✅ Aparece no Relatório Detalhado

**Exemplo:**
- Valor no banco: 1116.57
- Exibição: "Desc. Ajuste dos Benefícios: -R$ 1.116,57"
- Impacto no total: Reduz o total de benefícios em R$ 1.116,57

---

## 🔗 Arquivos Relacionados

**Modificados:**
- `utils/calcularFolhaPagamento.ts` - Interface atualizada
- `utils/calculosBeneficios.ts` - Cálculo e exibição atualizados
- `pages/Operacional/CalculatedPayroll.tsx` - Objeto resultado atualizado

**Referência:**
- `docs/CORRECAO_CARREGAMENTO_DESC_AJUSTE_BENEFICIOS.md`
- `docs/RESUMO_CORRECOES_EVENTOS.md`
- `migrations/add_desc_ajuste_beneficios.sql`

---

**Última Atualização:** 02/03/2026  
**Autor:** Kiro AI Assistant
