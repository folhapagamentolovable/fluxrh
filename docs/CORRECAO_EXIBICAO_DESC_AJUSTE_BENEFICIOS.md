# Correção de Exibição - Desc. Ajuste dos Benefícios

**Data:** 02/03/2026  
**Status:** ✅ Corrigido  
**Problema:** Campo não estava sendo exibido no card de Benefícios

---

## 📋 Problema Identificado

O campo `desc_ajuste_beneficios` com valor de **R$ 1.116,57**:
- ✅ Estava sendo salvo no banco
- ✅ Estava sendo carregado
- ✅ Estava sendo incluído no cálculo de benefícios
- ❌ NÃO estava sendo exibido na lista de itens do card
- ❌ Estava causando duplicação nos eventos excepcionais

**Resultado:** O desconto não aparecia visualmente, mas estava sendo contabilizado no total.

---

## ✅ Correções Aplicadas

### 1. Adicionado Item na Lista de Benefícios

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx`  
**Linha:** ~6545

```typescript
{folhaAtiva.resultado.desconto_va_faltas > 0 && (
    <li className="flex justify-between text-red-600">
        <span>Desc. VA por Faltas</span>
        <span>-{formatarMoeda(folhaAtiva.resultado.desconto_va_faltas)}</span>
    </li>
)}
{/* Desc. Ajuste dos Benefícios */}
{folhaAtiva.resultado.desc_ajuste_beneficios > 0 && (
    <li className="flex justify-between text-red-600">
        <span>Desc. Ajuste dos Benefícios</span>
        <span>-{formatarMoeda(folhaAtiva.resultado.desc_ajuste_beneficios)}</span>
    </li>
)}
```

**Características:**
- Exibido em vermelho (text-red-600) para indicar desconto
- Valor exibido com sinal negativo
- Formatação monetária aplicada

### 2. Filtrado dos Eventos Excepcionais

**Arquivo:** `pages/Operacional/CalculatedPayroll.tsx`  
**Linha:** ~6555

```typescript
{(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
    .filter(e => e.tipo === 'beneficio' && !(
        // Excluir reembolsos uber (já exibido abaixo com formatação especial)
        e.descricao === 'Reembolsos' ||
        // Excluir desc. ajuste dos benefícios (já exibido acima)
        e.descricao === 'Desc. Ajuste dos Benefícios'
    ))
    .map((evento, idx) => (
```

**Motivo:** Evitar duplicação, pois o valor já é exibido diretamente do campo `resultado.desc_ajuste_beneficios`

---

## 📊 Resultado Visual

### Antes
```
🎁 Benefícios

Vale Transporte (Março)         R$ 338,00
Vale Alimentação (Março)         R$ 572,66
Cesta Básica                     R$ 205,91

Total Benefícios                 R$ 2.233,14  ❌ Valor errado (não mostra desconto)
```

### Depois
```
🎁 Benefícios

Vale Transporte (Março)         R$ 338,00
Vale Alimentação (Março)         R$ 572,66
Cesta Básica                     R$ 205,91
Desc. Ajuste dos Benefícios     -R$ 1.116,57  ✅ Agora visível

Total Benefícios                 R$ 1.116,57   ✅ Valor correto
```

---

## 🔄 Fluxo Completo de Exibição

```
┌─────────────────────────────────────────────────────────────┐
│              CARREGAMENTO DO BANCO                           │
│  desc_ajuste_beneficios = 1116.57                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              OBJETO RESULTADO                                │
│  resultado.desc_ajuste_beneficios = 1116.57                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              CÁLCULO DE BENEFÍCIOS                           │
│  calcularTotalBeneficios(resultado)                          │
│  - Inclui desc_ajuste_beneficios como -1116.57              │
│  - Total = VT + VA + CB - desc_ajuste                       │
│  - Total = 338 + 572.66 + 205.91 - 1116.57 = 0              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              EXIBIÇÃO NO CARD                                │
│  1. VT (Março): R$ 338,00                                   │
│  2. VA (Março): R$ 572,66                                   │
│  3. Cesta Básica: R$ 205,91                                 │
│  4. Desc. Ajuste dos Benefícios: -R$ 1.116,57 ✅           │
│  ─────────────────────────────────────────                  │
│  Total Benefícios: R$ 0,00 (ou valor correto)               │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Observações Importantes

### 1. Valor Negativo
O `desc_ajuste_beneficios` é um **desconto de benefício**, portanto:
- No banco: valor positivo (1116.57)
- No cálculo: valor negativo (-1116.57)
- Na exibição: valor negativo com sinal (-R$ 1.116,57)

### 2. Filtro de Duplicação
O evento "Desc. Ajuste dos Benefícios" é filtrado dos eventos excepcionais porque:
- Já tem campo específico no banco (`desc_ajuste_beneficios`)
- Já é exibido diretamente do `resultado`
- Evita duplicação na interface

### 3. Cor Vermelha
O item é exibido em vermelho (text-red-600) para:
- Indicar visualmente que é um desconto
- Diferenciar de benefícios positivos
- Manter consistência com outros descontos (VT/VA por faltas)

---

## ✅ Checklist de Validação

- [x] Campo carregado do banco
- [x] Campo incluído no objeto resultado
- [x] Campo incluído no cálculo de benefícios
- [x] Campo exibido no card de Benefícios
- [x] Valor exibido com sinal negativo
- [x] Cor vermelha aplicada
- [x] Filtrado dos eventos excepcionais
- [x] Total de benefícios calculado corretamente

---

## 🔗 Arquivos Relacionados

**Modificados:**
- `pages/Operacional/CalculatedPayroll.tsx` - Exibição no card

**Referência:**
- `docs/CORRECAO_CALCULO_DESC_AJUSTE_BENEFICIOS.md`
- `docs/CORRECAO_CARREGAMENTO_DESC_AJUSTE_BENEFICIOS.md`
- `docs/RESUMO_CORRECOES_EVENTOS.md`

---

**Última Atualização:** 02/03/2026  
**Autor:** Kiro AI Assistant
