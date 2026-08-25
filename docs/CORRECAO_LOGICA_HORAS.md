# Correção da Lógica de Cálculo de Horas - SEGUNDA CORREÇÃO

## 🎯 Problema Identificado NOVAMENTE

**ERRO CRÍTICO**: Após reverter minha primeira modificação, o sistema ficou calculando **APENAS horas normais** para dias que não são feriados ou folgas!

### ❌ O que estava quebrado:
1. **Dias normais**: Todo excesso de jornada era anotado como **horas normais**
2. **Sem horas extras**: Não havia cálculo de HE 50% ou HE 100% baseado na jornada da escala
3. **Lógica incompleta**: Faltava a distribuição correta das horas

### ✅ Evidência do problema:
- Funcionário trabalhando 11h em escala 8x40 = **11h normais** (ERRADO!)
- Deveria ser: **8h normais + 2h HE 50% + 1h HE 100%**

## 🔧 Correção Final Aplicada

### **IMPLEMENTADA** lógica correta de distribuição de horas:

#### Para **Intrajornada Suprimida**:
```
Horas efetivas = Total trabalhado - 1h (intrajornada)
Se horas efetivas <= jornada padrão: Todas normais
Se horas efetivas <= jornada + 2h: Normais + HE 50%
Se horas efetivas > jornada + 2h: Normais + 2h HE 50% + resto HE 100%
```

#### Para **Intrajornada Usufruída**:
```
Horas efetivas = Total trabalhado (já descontado intervalo)
Mesma distribuição baseada na jornada padrão da escala
```

### **Jornada Padrão por Escala**:
- **12x36** (Vigilantes): 12h
- **8x40** (Administrativo): 8h
- **Outras**: 8h (padrão)

## 📋 Arquivos Corrigidos

- ✅ `utils/calcularHoras.ts` - **Lógica de distribuição implementada**
- ✅ `pages/TimeSheets.tsx` - Removidas referências ao campo inexistente `horas_diarias`
- ✅ `pages/CalculatedPayroll.tsx` - Removidas referências ao campo inexistente `horas_diarias`

## 🚨 Lições Aprendidas

1. **Verificar COMPLETAMENTE** antes de modificar
2. **Testar** após cada mudança
3. **Não assumir** que reverter resolve tudo
4. **Analisar** a lógica completa, não apenas partes

## ✅ Status Atual - CORRIGIDO

O sistema agora calcula **CORRETAMENTE** as horas extras:

### Exemplo - Escala 8x40, trabalhando 11h:
- ✅ **8h normais**
- ✅ **2h HE 50%** (9ª e 10ª hora)
- ✅ **1h HE 100%** (11ª hora)

### Regras Especiais Mantidas:
- ✅ **Feriados**: Todas as horas = HE 100%
- ✅ **Folgas**: Domingo = HE 100%, outros = HE 50%
- ✅ **Intrajornada suprimida**: 1h intrajornada + distribuição correta