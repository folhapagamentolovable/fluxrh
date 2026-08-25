# Correção de Carregamento - Desc. Ajuste dos Benefícios

**Data:** 02/03/2026  
**Status:** ✅ Corrigido  
**Problema:** Campo `desc_ajuste_beneficios` não estava sendo carregado nos relatórios

---

## 📋 Problema Identificado

O campo `desc_ajuste_beneficios` estava sendo salvo corretamente no banco de dados, mas não estava sendo:
1. Carregado na query SELECT do Reports.tsx
2. Acumulado nos totais
3. Exibido nas tabelas HTML
4. Incluído nos cálculos de benefícios

---

## ✅ Correções Aplicadas

### 1. Adicionado Campo na Query SELECT

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~238

```typescript
inss_ferias,
desc_ajuste_beneficios,  // ⭐ ADICIONADO
eventos_excepcionais,
```

### 2. Adicionado Campo na Estrutura de Totais

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~1193

```typescript
beneficios: {
    vt: 0,
    va: 0,
    cesta_basica: 0,
    plr: 0,
    premio_permanencia: 0,
    reembolsos_uber: 0,
    desc_ajuste_beneficios: 0,  // ⭐ ADICIONADO
    total_beneficios: 0
},
```

### 3. Adicionada Acumulação do Campo

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~1301

```typescript
totais.beneficios.vt += (f.vale_transporte_mes_anterior || 0) + (f.vale_transporte_mes_atual || 0);
totais.beneficios.va += (f.vale_alimentacao_mes_anterior || 0) + (f.vale_alimentacao_mes_atual || 0);
totais.beneficios.cesta_basica += f.cesta_basica || 0;
totais.beneficios.plr += f.plr || 0;
totais.beneficios.premio_permanencia += f.premio_permanencia || 0;
totais.beneficios.reembolsos_uber += f.reembolsos_uber || 0;
totais.beneficios.desc_ajuste_beneficios += f.desc_ajuste_beneficios || 0;  // ⭐ ADICIONADO
```

### 4. Atualizado Cálculo do Total de Benefícios

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~1331

```typescript
totais.beneficios.total_beneficios = totais.beneficios.vt + totais.beneficios.va + 
    totais.beneficios.cesta_basica + totais.beneficios.plr + totais.beneficios.premio_permanencia + 
    totais.beneficios.reembolsos_uber + totais.beneficios.desc_ajuste_beneficios;  // ⭐ ADICIONADO
```

### 5. Adicionada Linha na Tabela HTML

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~1937

```typescript
${totais.beneficios.reembolsos_uber > 0 ? `
<tr>
    <td class="text-left">Reembolsos</td>
    ${folhas.map(f => `<td>${formatarMoeda(f.reembolsos_uber || 0)}</td>`).join('')}
    <td class="total-row">${formatarMoeda(totais.beneficios.reembolsos_uber)}</td>
</tr>` : ''}
${totais.beneficios.desc_ajuste_beneficios > 0 ? `  // ⭐ ADICIONADO
<tr>
    <td class="text-left">Desc. Ajuste dos Benefícios</td>
    ${folhas.map(f => `<td>${formatarMoeda(f.desc_ajuste_beneficios || 0)}</td>`).join('')}
    <td class="total-row">${formatarMoeda(totais.beneficios.desc_ajuste_beneficios)}</td>
</tr>` : ''}
```

### 6. Atualizado Cálculo na Linha "Total Benefícios"

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~1943

```typescript
<tr style="background-color: #d9e1f2; font-weight: bold;">
    <td class="text-left">Total Benefícios</td>
    ${folhas.map(f => `<td>${formatarMoeda(
        (f.vale_transporte_mes_anterior || 0) + (f.vale_transporte_mes_atual || 0) + 
        (f.vale_alimentacao_mes_anterior || 0) + (f.vale_alimentacao_mes_atual || 0) + 
        (f.cesta_basica || 0) + (f.plr || 0) + (f.premio_permanencia || 0) + 
        (f.reembolsos_uber || 0) + (f.desc_ajuste_beneficios || 0)  // ⭐ ADICIONADO
    )}</td>`).join('')}
    <td class="total-row" style="background-color: #d9e1f2">${formatarMoeda(totais.beneficios.total_beneficios)}</td>
</tr>
```

### 7. Atualizada Função calcularBeneficios (2 ocorrências)

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linhas:** ~798 e ~1112

```typescript
const calcularBeneficios = (f: any) => {
    return (f.vale_transporte_mes_anterior || 0) + (f.vale_transporte_mes_atual || 0) + 
        (f.vale_alimentacao_mes_anterior || 0) + (f.vale_alimentacao_mes_atual || 0) + 
        (f.cesta_basica || 0) + (f.plr || 0) + (f.premio_permanencia || 0) + 
        (f.reembolsos_uber || 0) + (f.desc_ajuste_beneficios || 0);  // ⭐ ADICIONADO
};
```

### 8. Atualizado Cálculo em "Salário Líquido + Benefícios" (2 ocorrências)

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linhas:** ~1391 e ~1959

```typescript
const beneficios = (f.vale_transporte_mes_anterior || 0) + (f.vale_transporte_mes_atual || 0) + 
    (f.vale_alimentacao_mes_anterior || 0) + (f.vale_alimentacao_mes_atual || 0) + 
    (f.cesta_basica || 0) + (f.plr || 0) + (f.premio_permanencia || 0) + 
    (f.reembolsos_uber || 0) + (f.desc_ajuste_beneficios || 0);  // ⭐ ADICIONADO
```

### 9. Adicionado na Lista de Benefícios do Modal

**Arquivo:** `pages/Relatorios/Reports.tsx`  
**Linha:** ~476

```typescript
if (folhaCalculada.reembolsos_uber > 0) beneficios.push({ descricao: 'Reembolsos', valor: folhaCalculada.reembolsos_uber });
if (folhaCalculada.desc_ajuste_beneficios > 0) beneficios.push({ descricao: 'Desc. Ajuste dos Benefícios', valor: folhaCalculada.desc_ajuste_beneficios });  // ⭐ ADICIONADO
```

---

## 📊 Resumo das Alterações

| Local | Tipo de Alteração | Status |
|-------|-------------------|--------|
| Query SELECT | Adicionado campo | ✅ |
| Estrutura de totais | Adicionado campo | ✅ |
| Acumulação de totais | Adicionado cálculo | ✅ |
| Total de benefícios | Atualizado cálculo | ✅ |
| Tabela HTML | Adicionada linha | ✅ |
| Linha "Total Benefícios" | Atualizado cálculo | ✅ |
| Função calcularBeneficios (1ª) | Atualizado cálculo | ✅ |
| Função calcularBeneficios (2ª) | Atualizado cálculo | ✅ |
| Salário Líquido + Benefícios (1ª) | Atualizado cálculo | ✅ |
| Salário Líquido + Benefícios (2ª) | Atualizado cálculo | ✅ |
| Lista de benefícios do modal | Adicionado item | ✅ |

**Total de Alterações:** 11 locais modificados

---

## ✅ Resultado

Agora o campo `desc_ajuste_beneficios`:
- ✅ É carregado do banco de dados
- ✅ É acumulado nos totais
- ✅ É exibido na tabela HTML (quando > 0)
- ✅ É incluído no cálculo de "Total Benefícios"
- ✅ É incluído no cálculo de "Salário Líquido + Benefícios"
- ✅ É exibido no modal de detalhes da folha

---

## 🔗 Arquivos Relacionados

**Modificados:**
- `pages/Relatorios/Reports.tsx` - 11 alterações

**Referência:**
- `docs/RESUMO_CORRECOES_EVENTOS.md`
- `docs/MAPEAMENTO_EVENTOS_EXCEPCIONAIS.md`
- `migrations/add_desc_ajuste_beneficios.sql`

---

**Última Atualização:** 02/03/2026  
**Autor:** Kiro AI Assistant
