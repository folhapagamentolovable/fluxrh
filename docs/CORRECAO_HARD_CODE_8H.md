# Correção do Hard Code de 8 Horas

## 🎯 Problema Identificado

**ERRO CRÍTICO**: Havia múltiplos **hard codes de 8 horas** espalhados pelo sistema, impedindo o cálculo dinâmico correto da jornada.

### ❌ Problemas encontrados:

1. **`Math.round()` na função `calcularJornadaPadrao()`**:
   - Arredondava para hora inteira
   - 16:00-06:00 = 13h → arredondado para 13h ✅
   - Mas 18:00-06:00 = 11h → arredondado para 11h ✅
   - **Problema**: Perdia precisão decimal

2. **Hard codes no `TimeSheets.tsx`**:
   - `const jornadaPadrao = 8` (linha 430)
   - `codigoEscala.includes('12x36') ? 12 : 8` (múltiplas linhas)
   - Forçava jornadas fixas ignorando horários reais

3. **Fallback de 8h**:
   - `return 8; // Padrão se não tem horários`
   - Usado quando horários previstos não disponíveis

## 🔧 Correções Aplicadas

### **1. Função `calcularJornadaPadrao()` corrigida:**
```typescript
// ANTES (ERRADO):
return Math.round(jornadaEfetivaHoras); // Arredondava

// DEPOIS (CORRETO):
return Number(jornadaEfetivaHoras.toFixed(2)); // Valor exato com 2 decimais
```

### **2. Removidos hard codes do `TimeSheets.tsx`:**
```typescript
// ANTES (ERRADO):
const jornadaPadrao = codigoEscala.includes('12x36') ? 12 : 8;

// DEPOIS (CORRETO):
// Jornada será calculada dinamicamente baseada nos horários da escala
```

### **3. Parâmetro padrão mantido apenas como fallback:**
```typescript
// Mantido apenas como último recurso quando horários não disponíveis
jornadaPadrao: number = 8
```

## 📊 Resultado da Correção

### **Exemplo - Horário 16:00-06:00 (com 1h almoço):**
- **Jornada total**: 14h (16:00 → 06:00 do dia seguinte)
- **Intervalo**: 1h
- **Jornada efetiva**: 13h
- **Resultado**: `13.00` (valor exato, sem arredondamento)

### **Exemplo - Horário 18:00-06:00 (com 1h almoço):**
- **Jornada total**: 12h (18:00 → 06:00 do dia seguinte)
- **Intervalo**: 1h  
- **Jornada efetiva**: 11h
- **Resultado**: `11.00` (valor exato)

## ✅ Fluxo Corrigido

1. **Sistema recebe** horários reais e previstos
2. **Calcula jornada padrão** dinamicamente usando `calcularJornadaPadrao()`
3. **Usa jornada calculada** para distribuir horas extras
4. **Sem hard codes** - tudo baseado nos horários reais da escala

## 🚨 Impacto da Correção

### **Antes (ERRADO)**:
- Horário 16:00-06:00 → Forçado para 8h ou 12h (hard code)
- Sistema ignorava horários reais da escala
- Cálculos incorretos de horas extras

### **Depois (CORRETO)**:
- Horário 16:00-06:00 → Calcula 13h dinamicamente
- Sistema respeita horários específicos de cada escala
- Cálculos precisos baseados na jornada real

## 📋 Arquivos Corrigidos

- ✅ `utils/calcularHoras.ts` - Removido `Math.round()`, valor exato
- ✅ `pages/TimeSheets.tsx` - Removidos todos os hard codes de jornada
- ✅ Sistema agora calcula dinamicamente baseado nos horários

## 🎯 Resultado Final

O sistema agora calcula a jornada padrão **dinamicamente** baseado nos horários específicos de cada escala, sem hard codes que forçavam valores fixos. A alteração de 18:00 para 16:00 agora reflete corretamente na jornada calculada (de 11h para 13h).