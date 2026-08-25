# Resumo das Correções - Eventos Excepcionais

**Data:** 02/03/2026  
**Status:** ✅ Implementado  
**Solicitação:** Ajustes nos eventos excepcionais conforme especificado

---

## 📋 Alterações Realizadas

### 1. ✅ Adicionado Campo para "INSS Férias"

**Tipo:** Desconto  
**Código:** 5019  
**Campo no Banco:** `inss_ferias`

**Arquivos Modificados:**
- ✅ `migrations/add_servicos_externos_reembolsos.sql` - Campo já existia na migration anterior
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Adicionada extração e salvamento
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Adicionado carregamento do campo
- ✅ `utils/eventosExcepcionaisValidator.ts` - Código atualizado de 5014 para 5019

**Implementação:**

```typescript
// SALVAMENTO (linha ~1055)
let eventoInssFerias = 0;

// EXTRAÇÃO (linha ~1130)
} else if (evento.descricao === 'INSS Férias') {
    eventoInssFerias += evento.valor;
    return false; // Remove do array JSON
}

// SALVAR NO BANCO (linha ~1305)
inss_ferias: eventoInssFerias,

// CARREGAMENTO (linha ~560)
total_inss_ferias: folha.inss_ferias || 0,

// RESTAURAÇÃO (linha ~565)
adicionarEvento('INSS Férias', folha.dadosFolha.total_inss_ferias, 'desconto');
```

---

### 2. ✅ Adicionado Campo para "Desc. Ajuste dos Benefícios"

**Tipo:** Benefício  
**Código:** B002  
**Campo no Banco:** `desc_ajuste_beneficios`

**Arquivos Criados:**
- ✅ `migrations/add_desc_ajuste_beneficios.sql` - Nova migration

**Arquivos Modificados:**
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Adicionada extração e salvamento
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Adicionado carregamento do campo

**Implementação:**

```typescript
// SALVAMENTO (linha ~1060)
let eventoDescAjusteBeneficios = 0;

// EXTRAÇÃO (linha ~1125)
} else if (evento.descricao === 'Desc. Ajuste dos Benefícios') {
    eventoDescAjusteBeneficios += evento.valor;
    return false; // Remove do array JSON
}

// SALVAR NO BANCO (linha ~1310)
desc_ajuste_beneficios: eventoDescAjusteBeneficios,

// CARREGAMENTO (linha ~562)
total_desc_ajuste_beneficios: folha.desc_ajuste_beneficios || 0,

// RESTAURAÇÃO (linha ~567)
adicionarEvento('Desc. Ajuste dos Benefícios', folha.dadosFolha.total_desc_ajuste_beneficios, 'beneficio');
```

**Migration SQL:**
```sql
-- Adicionar campo de Desc. Ajuste dos Benefícios (Benefícios)
ALTER TABLE folha_calculada 
ADD COLUMN IF NOT EXISTS desc_ajuste_beneficios DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN folha_calculada.desc_ajuste_beneficios IS 'Código B002 - Desc. Ajuste dos Benefícios';
```

---

### 3. ✅ Corrigido Salvamento de "Adiantam. de Salário"

**Problema:** Era salvo DUAS VEZES (campo específico + array JSON)  
**Solução:** Agora é salvo APENAS no campo `desconto_adiantamento_salario`

**Arquivos Modificados:**
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Alterado `return false` para remover do JSON

**Implementação:**

```typescript
// ANTES (linha ~1135):
} else if (evento.descricao === 'Adiantam. de Salário') {
    eventoAdiantamentoSalario += evento.valor;
    // NÃO usar return false - manter no array para exibir no holerite
}

// DEPOIS (linha ~1135):
} else if (evento.descricao === 'Adiantam. de Salário') {
    eventoAdiantamentoSalario += evento.valor;
    return false; // ⭐ CORREÇÃO: Remove do array JSON
}
```

**Carregamento Atualizado:**
```typescript
// ANTES (linha ~565):
adicionarEvento('Adiantam. de Salário', folha.dadosFolha.total_adiantamento_salario, 'desconto');

// DEPOIS (linha ~565):
adicionarEvento('Adiantam. de Salário', folha.resultado.desconto_adiantamento_salario, 'desconto');
```

---

### 4. ✅ Corrigido Salvamento do Array JSON

**Problema:** Salvava array completo `eventos` em vez do filtrado `eventosNormais`  
**Solução:** Agora salva apenas eventos que não têm coluna específica

**Arquivos Modificados:**
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Alterado para salvar `eventosNormais`

**Implementação:**

```typescript
// ANTES (linha ~1300):
eventos_excepcionais: eventos, // ⚠️ Salva TODOS os eventos

// DEPOIS (linha ~1300):
eventos_excepcionais: eventosNormais, // ⭐ CORREÇÃO: Salvar apenas eventos filtrados
```

---

### 5. ✅ Atualizado Carregamento do Banco

**Arquivos Modificados:**
- ✅ `pages/Operacional/CalculatedPayroll.tsx` - Adicionados novos campos na query SELECT

**Implementação:**

```typescript
// Query SELECT (linha ~165):
const { data: folhasSalvas, error } = await supabase
    .from('folha_calculada')
    .select(`
        // ... campos existentes ...
        inss_13,
        inss_ferias,              // ⭐ NOVO
        desc_ajuste_beneficios,   // ⭐ NOVO
        decimo_terceiro_integral,
        // ... mais campos ...
    `)
```

---

### 6. ✅ Atualizada Documentação

**Arquivos Modificados:**
- ✅ `docs/MAPEAMENTO_EVENTOS_EXCEPCIONAIS.md` - Atualizado com correções aplicadas
- ✅ `docs/ATUALIZACAO_EVENTOS_EXCEPCIONAIS.md` - Referência aos novos campos

**Arquivos Criados:**
- ✅ `docs/RESUMO_CORRECOES_EVENTOS.md` - Este arquivo

---

## 📊 Resumo de Eventos por Destino

### Eventos em COLUNAS ESPECÍFICAS (21 eventos)

| Descrição | Campo | Tipo | Código |
|-----------|-------|------|--------|
| 13º Proporc. Rescisão | `decimo_terceiro_proporcional_rescisao` | Provento | 0510 |
| Férias Proporc. Rescisão | `ferias_proporcionais_rescisao` | Provento | 0512 |
| 1/3 Férias proporc. Rescisão | `um_terco_ferias_proporcional_rescisao` | Provento | 0513 |
| PLR Proporc. Rescisão | `plr_proporcional_rescisao` | Provento | 0514 |
| 13º Proporc. Vantagens Rescisão | `decimo_terceiro_vantagens_rescisao` | Provento | 0511 |
| 13º Salário 1ª Parcela | `decimo_terceiro_primeira_parcela` | Provento | 0522 |
| 13º Salário Vantagens 1ª Parcela | `decimo_terceiro_vantagens_primeira_parcela` | Provento | 0524 |
| 13º Salário 2ª Parcela | `decimo_terceiro_segunda_parcela` | Provento | 0523 |
| 13º Salário Vantagens 2ª Parcela | `decimo_terceiro_vantagens_segunda_parcela` | Provento | 0525 |
| Folhas de Pagamento | `servicos_externos_folhas_pagamento` | Provento | 0305 |
| Controle de Rondas Palmeiras | `servicos_externos_controle_rondas` | Provento | 0306 |
| Supervisão Palmeiras | `supervisao_palmeiras` | Provento | 0307 |
| 13º Salário | `decimo_terceiro_integral` | Provento | 0520 |
| Vantagens 13º | `vantagens_13` | Provento | 0521 |
| Reembolsos | `reembolsos_uber` | Benefício | B010 |
| Desc. Ajuste dos Benefícios | `desc_ajuste_beneficios` | Benefício | B002 |
| INSS 13º | `inss_13` | Desconto | 5018 |
| INSS Férias | `inss_ferias` | Desconto | 5019 |
| Adiantam. de Salário | `desconto_adiantamento_salario` | Desconto | 5014 |
| Adiantam. 13º Salário | `adiantamento_13_salario` | Desconto | 5015 |
| Adiantam. Vantagens 13º | `adiantamento_vantagens_13` | Desconto | 5016 |

### Eventos no CAMPO JSON (5 eventos personalizados)

| Descrição | Tipo | Código |
|-----------|------|--------|
| Outros Serviços | Provento | 0308 |
| Outros Descontos | Desconto | 5013 |
| Outros Adiantamentos | Desconto | 5017 |
| Desc. Outros Benefícios | Benefício | B003 |
| Outros Reembolsos | Benefício | B011 |

---

## ⏳ Ações Pendentes

### 1. Executar Migration no Banco de Dados

**Arquivo:** `migrations/add_desc_ajuste_beneficios.sql`

**Opção 1: Via Supabase Dashboard**
1. Abrir Supabase Dashboard
2. Ir em SQL Editor
3. Copiar conteúdo do arquivo
4. Executar

**Opção 2: Via Script**
```bash
node scripts/run-migration.js migrations/add_desc_ajuste_beneficios.sql
```

### 2. Testar Funcionalidade

**Testes Recomendados:**
1. Adicionar evento "INSS Férias" e verificar salvamento
2. Adicionar evento "Desc. Ajuste dos Benefícios" e verificar salvamento
3. Adicionar evento "Adiantam. de Salário" e verificar que não duplica
4. Carregar folha salva e verificar que eventos são restaurados corretamente
5. Imprimir holerite e verificar que eventos aparecem corretamente

---

## ✅ Status Final

| Item | Status |
|------|--------|
| Campo `inss_ferias` | ✅ Implementado |
| Campo `desc_ajuste_beneficios` | ✅ Implementado |
| Correção "Adiantam. de Salário" | ✅ Implementado |
| Correção array JSON | ✅ Implementado |
| Atualização carregamento | ✅ Implementado |
| Atualização documentação | ✅ Implementado |
| Migration no banco | ⏳ Pendente |
| Testes | ⏳ Pendente |

---

## 🔗 Arquivos Relacionados

**Modificados:**
- `pages/Operacional/CalculatedPayroll.tsx`
- `utils/eventosExcepcionaisValidator.ts`
- `docs/MAPEAMENTO_EVENTOS_EXCEPCIONAIS.md`

**Criados:**
- `migrations/add_desc_ajuste_beneficios.sql`
- `docs/RESUMO_CORRECOES_EVENTOS.md`

**Referência:**
- `docs/ATUALIZACAO_EVENTOS_EXCEPCIONAIS.md`
- `migrations/add_servicos_externos_reembolsos.sql`

---

**Última Atualização:** 02/03/2026  
**Autor:** Kiro AI Assistant
