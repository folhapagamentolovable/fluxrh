# Correção da Jornada Dinâmica por Escala

## 🎯 Problema Identificado

**ERRO CRÍTICO**: Estávamos padronizando a jornada diária como **8h** para todas as escalas, ignorando que cada escala tem jornadas diferentes para cada dia da semana.

### ❌ Lógica Incorreta (Anterior):
```
Todas as escalas: 8h padrão
- Escala 12x36: Forçada para 8h (ERRADO!)
- Escala 8x40: 8h (correto por acaso)
- Escalas de Limpeza: Forçada para 8h (pode estar errado)
```

### ✅ Lógica Correta (Implementada):
```
Jornada calculada dinamicamente baseada nos horários da escala:
- Segunda-feira: Horários específicos → Jornada calculada
- Sábado: Horários específicos → Jornada calculada  
- Domingo: Horários específicos → Jornada calculada
- Feriado: Horários específicos → Jornada calculada
```

## 🔧 Implementação da Correção

### **Nova Função: `calcularJornadaPadrao()`**
```typescript
export function calcularJornadaPadrao(horarios: HorariosDia): number {
  // Calcula: (Saída - Entrada) - Intervalo de Refeição
  // Retorna: Jornada efetiva em horas (arredondada)
}
```

### **Lógica Dinâmica Implementada:**
1. **Recebe horários previstos** da escala para o dia específico
2. **Calcula jornada padrão** baseada nesses horários
3. **Usa jornada calculada** para distribuir horas extras
4. **Fallback para 8h** se horários não disponíveis

## 📊 Exemplos Práticos

### **Escala 12x36 - Segunda-feira:**
```
Horários previstos: 18:00-06:00 (com 1h almoço)
Jornada calculada: 11h efetivas
Distribuição para 11h trabalhadas: 11h normais (dentro da jornada)
```

### **Escala 8x40 - Segunda-feira:**
```
Horários previstos: 08:00-17:00 (com 1h almoço)  
Jornada calculada: 8h efetivas
Distribuição para 11h trabalhadas: 8h normais + 2h HE 50% + 1h HE 100%
```

### **Escala Limpeza - Sábado:**
```
Horários previstos: 06:00-12:00 (sem almoço)
Jornada calculada: 6h efetivas
Distribuição para 8h trabalhadas: 6h normais + 2h HE 50%
```

## 🏗️ Estrutura das Escalas

### **Campos na Tabela `regras_escalas`:**
- `trabalha_segunda`, `trabalha_terca`, etc. → Define se trabalha no dia
- `horarios_segunda`, `horarios_terca`, etc. → Horários específicos do dia
- `trabalha_domingo`, `trabalha_feriado` → Regras especiais

### **Exemplo de Horários JSON:**
```json
{
  "entrada": "18:00",
  "saida": "06:00", 
  "inicio_almoco": "22:00",
  "termino_almoco": "23:00"
}
```

## 🔍 Como Funciona Agora

### **Fluxo de Cálculo:**
1. **Sistema identifica** o dia da semana (segunda, sábado, domingo, feriado)
2. **Busca horários específicos** da escala para esse tipo de dia
3. **Calcula jornada padrão** baseada nesses horários
4. **Distribui horas trabalhadas** usando a jornada calculada
5. **Aplica regras especiais** (feriados, folgas, intrajornada)

### **Logs de Debug:**
```
📊 Jornada padrão calculada dinamicamente:
  escala: "12x36_VIGILANTES"
  diaSemana: "Seg"
  horariosPrevistos: {
    entrada: "18:00",
    saida: "06:00", 
    refeicao: "22:00-23:00"
  }
  jornadaPadraoOriginal: "8h"
  jornadaPadraoCalculada: "11h"
```

## ✅ Benefícios da Correção

1. **Precisão**: Cada escala usa sua jornada real
2. **Flexibilidade**: Suporta jornadas diferentes por dia da semana
3. **Conformidade**: Respeita as regras específicas de cada escala
4. **Transparência**: Logs mostram como a jornada foi calculada

## 🚨 Impacto da Correção

### **Antes (ERRADO)**:
- Vigilante trabalhando 12h = 8h normais + 4h extras (ERRADO!)
- Sistema não respeitava jornadas específicas das escalas

### **Depois (CORRETO)**:
- Vigilante trabalhando 12h = 11h normais + 1h intrajornada (CORRETO!)
- Sistema calcula baseado na jornada real da escala

## 📋 Arquivos Modificados

- ✅ `utils/calcularHoras.ts` - Nova função `calcularJornadaPadrao()` e lógica dinâmica
- ✅ Mantida integração com `pages/TimeSheets.tsx` (já passava horários previstos)

## 🎯 Resultado Final

O sistema agora calcula horas extras **corretamente** baseado na jornada real de cada escala para cada dia da semana, respeitando as especificidades de cada tipo de trabalho e horário.