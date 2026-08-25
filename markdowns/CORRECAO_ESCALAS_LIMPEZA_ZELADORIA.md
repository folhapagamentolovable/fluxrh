# 🔧 Correção das Escalas de Limpeza e Zeladoria

## 🎯 Problema Identificado

**Data**: 01/01/2026 (Quarta-feira + Feriado Nacional)  
**Situação**: Funcionários com cargos de **Auxiliar de Limpeza** e **Zelador** estão tendo seus horários anotados neste dia, como se estivessem trabalhando.  
**Problema**: Estes cargos devem **FOLGAR** aos **DOMINGOS** e **FERIADOS**.

## 📋 Escalas Afetadas

As seguintes escalas estão com configuração incorreta:

| Código | Nome da Escala | Cargo |
|--------|----------------|-------|
| **FIGLIMPT1** | Auxiliar de Limpeza Figueiras T1 | Auxiliar de Limpeza |
| **FIGZELADT1** | Zelador Figueiras T1 | Zelador |
| **GALLIMPT1** | Auxiliar de Limpeza Galleria T1 | Auxiliar de Limpeza |
| **GALZELADT1** | Zelador Galleria T1 | Zelador |
| **PALMLIMPT1** | Auxiliar de Limpeza Palmeiras T1 | Auxiliar de Limpeza |
| **PALMLIMPT2** | Auxiliar de Limpeza Palmeiras T2 | Auxiliar de Limpeza |

## ✅ Correção Necessária

Para todas as escalas de limpeza e zeladoria, configurar:

- **`trabalha_domingo = FALSE`** (folga aos domingos)
- **`trabalha_feriado = FALSE`** (folga em feriados)

## 🔧 Implementação da Correção

### 1. Script SQL Automático

Execute o arquivo `aplicar-correcao-escalas.sql`:

```sql
-- Corrigir todas as escalas de uma vez
UPDATE regras_escalas 
SET 
  trabalha_domingo = false,
  trabalha_feriado = false,
  updated_at = NOW()
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true;
```

### 2. Verificação da Correção

```sql
-- Verificar se as correções foram aplicadas
SELECT 
  codigo_escala,
  nome_escala,
  trabalha_domingo,
  trabalha_feriado,
  updated_at
FROM regras_escalas 
WHERE codigo_escala IN ('FIGLIMPT1', 'FIGZELADT1', 'GALLIMPT1', 'GALZELADT1', 'PALMLIMPT1', 'PALMLIMPT2')
  AND ativa = true
ORDER BY codigo_escala;
```

**Resultado esperado**: Todas as escalas devem mostrar:
- `trabalha_domingo = false`
- `trabalha_feriado = false`

## 🧪 Teste da Correção

### Datas de Teste Recomendadas

1. **01/01/2026** (Quarta-feira + Feriado)
2. **05/01/2026** (Primeiro domingo de janeiro)
3. **02/01/2026** (Quinta-feira normal)

### Como Testar

1. Acesse **Escalas Mensais** no sistema
2. Selecione **Janeiro/2026**
3. Gere escala para um funcionário de limpeza/zeladoria
4. Verifique os resultados:

#### ✅ Resultado Correto (Após Correção)

| Data | Dia da Semana | Tipo | Resultado Esperado |
|------|---------------|------|-------------------|
| 01/01/2026 | Quarta-feira | Feriado | **FOLGA** (sem horários) |
| 05/01/2026 | Domingo | Domingo | **FOLGA** (sem horários) |
| 02/01/2026 | Quinta-feira | Dia útil | **TRABALHA** (com horários) |

#### ❌ Resultado Incorreto (Antes da Correção)

| Data | Dia da Semana | Tipo | Resultado Incorreto |
|------|---------------|------|-------------------|
| 01/01/2026 | Quarta-feira | Feriado | ❌ TRABALHA 08:00-17:00 |
| 05/01/2026 | Domingo | Domingo | ❌ TRABALHA 08:00-17:00 |

## 📊 Impacto da Correção

### Funcionários Afetados
- **Auxiliares de Limpeza** de todas as unidades (Figueiras, Galleria, Palmeiras)
- **Zeladores** de todas as unidades (Figueiras, Galleria)

### Documentos Afetados
- **Escalas Mensais**: Domingos e feriados aparecerão como folga
- **Folhas de Ponto**: Não haverá horários marcados em domingos/feriados
- **Folhas de Pagamento**: Cálculos corretos sem horas em domingos/feriados

## 🔍 Validação Técnica

### Interpretador de Regras

O sistema usa o arquivo `utils/interpretadorRegrasEscala.ts` que verifica:

```typescript
// Se é domingo e não trabalha domingo, é folga
if (isDomingo && !regra.trabalha_domingo) {
    trabalhaHoje = false;
}

// Se é feriado e não trabalha feriado, é folga
if (ehFeriado && !regra.trabalha_feriado) {
    trabalhaHoje = false;
}
```

### Configuração Correta

Após a correção, as regras JSON devem conter:

```json
{
  "tipo": "SEM_DOMINGO_FERIADO",
  "trabalha_domingo": false,
  "trabalha_feriado": false,
  "horarios": {
    "util": { "entrada": "08:00", "saida": "17:00", ... },
    "sabado": { "entrada": "08:00", "saida": "12:00", ... },
    "domingo": { "entrada": "", "saida": "", ... },
    "feriado": { "entrada": "", "saida": "", ... }
  }
}
```

## ✅ Conclusão

Após aplicar esta correção:

1. **01/01/2026** aparecerá como **FOLGA** para todos os funcionários de limpeza e zeladoria
2. **Todos os domingos** aparecerão como **FOLGA**
3. **Todos os feriados** aparecerão como **FOLGA**
4. **Dias úteis normais** continuarão com horários de trabalho corretos

## 📁 Arquivos Relacionados

- `aplicar-correcao-escalas.sql` - Script de correção automática
- `testar-correcao-escalas.js` - Script de teste e validação
- `verificar-escalas-simples.js` - Script de verificação inicial
- `corrigir-escalas-limpeza-zeladoria.js` - Documentação da correção

---

**Status**: ✅ Correção pronta para aplicação  
**Prioridade**: 🔴 Alta (afeta folgas obrigatórias)  
**Teste**: 🧪 Validar com Janeiro/2026 após aplicação