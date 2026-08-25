# Correção: Duplicação de Benefícios no Recibo de Pagamento

## Data: 2026-01-30

## Problema Identificado
Os benefícios (VT e VA) estavam sendo somados duas vezes porque:
- O código usava `vale_transporte` (campo TOTAL) em vez de `vale_transporte_mes_atual`
- Isso causava: `VT_anterior + VT_total` em vez de `VT_anterior + VT_atual`

## Arquivos Corrigidos
- `utils/calculosBeneficios.ts`

## Correção Aplicada

**Antes (ERRADO):**
```javascript
const beneficiosBase = [
    { nome: 'VT Mês Anterior', valor: resultado.vale_transporte_mes_anterior || 0 },
    { nome: 'VA Mês Anterior', valor: resultado.vale_alimentacao_mes_anterior || 0 },
    { nome: 'VT Mês Atual', valor: resultado.vale_transporte || 0 },  // <-- ERRADO!
    { nome: 'VA Mês Atual', valor: resultado.vale_alimentacao || 0 }, // <-- ERRADO!
];
```

**Depois (CORRETO):**
```javascript
const temSeparacaoVT = resultado.vale_transporte_mes_anterior || resultado.vale_transporte_mes_atual;
const temSeparacaoVA = resultado.vale_alimentacao_mes_anterior || resultado.vale_alimentacao_mes_atual;

const beneficiosBase = [
    { nome: 'VT Mês Anterior', valor: resultado.vale_transporte_mes_anterior || 0 },
    { nome: 'VA Mês Anterior', valor: resultado.vale_alimentacao_mes_anterior || 0 },
    { nome: 'VT Mês Atual', valor: temSeparacaoVT ? (resultado.vale_transporte_mes_atual || 0) : (resultado.vale_transporte || 0) },
    { nome: 'VA Mês Atual', valor: temSeparacaoVA ? (resultado.vale_alimentacao_mes_atual || 0) : (resultado.vale_alimentacao || 0) },
];
```

## Regra de Cálculo de Benefícios
1. Se existem campos separados (`_mes_anterior`, `_mes_atual`): usar apenas eles
2. Se NÃO existem campos separados: usar o campo total (`vale_transporte`, `vale_alimentacao`) como fallback
3. NUNCA somar campos separados + campo total juntos

## Estrutura dos Campos no Banco
- `vale_transporte_mes_anterior`: VT do mês trabalhado
- `vale_transporte_mes_atual`: VT adiantado do próximo mês
- `vale_transporte`: Campo total/legado (soma dos dois anteriores)

## Impacto
- Recibo de Pagamento: totais corrigidos
- Relatórios de benefícios: valores sem duplicação
