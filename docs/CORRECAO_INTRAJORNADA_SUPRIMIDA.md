# Correção da Lógica de Intrajornada Suprimida

## 🎯 Problema Identificado

**ERRO CRÍTICO**: Estávamos pagando **hora extra em duplicidade** quando havia supressão do horário de refeição (intrajornada).

### ❌ Lógica Incorreta (Anterior):
```
Total trabalhado: 12h
- 11h como horas extras
- 1h como intrajornada
= Pagando 12h de extras + 1h de intrajornada = DUPLICIDADE!
```

### ✅ Lógica Correta (Implementada):
```
Total trabalhado: 12h
- Separar 1h como intrajornada
- Distribuir 11h restantes baseado na jornada padrão
= Evita pagamento duplo
```

## 🔧 Fórmula Correta Implementada

### **Intrajornada Suprimida**:
```
Fórmula: (Saída - Entrada) - 1h = Horas para distribuir
         1h = Intrajornada (50% ou 100%)
```

### **Exemplo Prático - Escala 8x40, trabalhando 11h com intrajornada suprimida**:
```
Total jornada: 11h
- 1h intrajornada (50% ou 100%)
- 10h para distribuir:
  * 8h normais (jornada padrão)
  * 2h HE 50% (excesso até 2h)
```

### **Exemplo Prático - Escala 12x36, trabalhando 12h com intrajornada suprimida**:
```
Total jornada: 12h
- 1h intrajornada (50% ou 100%)
- 11h para distribuir:
  * 11h normais (dentro da jornada padrão de 12h)
```

## 📋 Regras Especiais Mantidas

### **Feriado com Intrajornada Suprimida (Escala 12x36)**:
- **Regra específica**: 11h HE 100% + 1h Intra 100%
- **Aplicação**: Jornadas entre 11.5h e 12.5h em feriados
- **Localização**: `pages/TimeSheets.tsx` linhas 979-987

### **Dias Normais com Intrajornada Suprimida**:
- **1h intrajornada**: 50% (dias normais) ou 100% (domingos)
- **Horas restantes**: Distribuídas baseado na jornada padrão da escala

## 🚨 Importância da Correção

### **Antes (ERRADO)**:
- Funcionário trabalhando 11h com intrajornada suprimida
- Sistema pagava: 11h extras + 1h intrajornada = **DUPLICIDADE**

### **Depois (CORRETO)**:
- Funcionário trabalhando 11h com intrajornada suprimida  
- Sistema paga: Distribuição correta + 1h intrajornada = **SEM DUPLICIDADE**

## ✅ Arquivos Corrigidos

- ✅ `utils/calcularHoras.ts` - Lógica de intrajornada suprimida corrigida
- ✅ Mantida regra especial em `pages/TimeSheets.tsx` para feriados

## 🎯 Resultado Final

A correção garante que:
1. **Não há pagamento duplo** de horas extras
2. **Intrajornada é tratada separadamente** das horas trabalhadas
3. **Distribuição correta** baseada na jornada padrão da escala
4. **Regras especiais mantidas** (feriados, folgas, etc.)