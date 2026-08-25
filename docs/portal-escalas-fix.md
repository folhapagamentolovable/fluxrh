# Correção das Escalas no Portal

## Problema Identificado

O calendário de escalas não estava exibindo as informações de trabalho/folga/feriado porque:

1. **Formato de dados incorreto**: O código esperava um array `[{dia: 1, status: "TRABALHO"}, ...]` mas os dados estavam no formato `{"dia_1": {folga: true, feriado: false}, ...}`

2. **Função de parsing inadequada**: A função `parseDiasTrabalhados` não estava convertendo o formato real dos dados

## Soluções Implementadas

### 1. Correção da Função `parseDiasTrabalhados`

**Antes:**
```typescript
const parseDiasTrabalhados = (diasTrabalhados: string | null): any[] => {
  if (!diasTrabalhados) return [];
  try {
    return JSON.parse(diasTrabalhados);
  } catch {
    return [];
  }
};
```

**Depois:**
```typescript
const parseDiasTrabalhados = (diasTrabalhados: string | null): any[] => {
  if (!diasTrabalhados) return [];
  try {
    const parsed = JSON.parse(diasTrabalhados);
    
    // Se já é um array, retornar como está
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // Se é um objeto com chaves "dia_X", converter para array
    if (typeof parsed === 'object') {
      const diasArray = [];
      for (const key in parsed) {
        if (key.startsWith('dia_')) {
          const diaNumero = Number.parseInt(key.replace('dia_', ''), 10);
          const diaData = parsed[key];
          
          // Determinar status baseado nos dados
          let status = 'TRABALHO';
          if (diaData.feriado) {
            status = 'FERIADO';
          } else if (diaData.folga) {
            status = 'FOLGA';
          }
          
          diasArray.push({
            dia: diaNumero,
            status: status,
            entrada: diaData.entrada || null,
            saida: diaData.saida || null,
            inicio_refeicao: diaData.inicio_refeicao || null,
            termino_refeicao: diaData.termino_refeicao || null,
            noturno: false,
            feriado: diaData.feriado || false,
            folga: diaData.folga || false
          });
        }
      }
      return diasArray.sort((a, b) => a.dia - b.dia);
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao processar dias trabalhados:', error);
    return [];
  }
};
```

### 2. Uso de Dados Já Calculados

Em vez de tentar calcular os totais, o sistema agora usa os valores já calculados na tabela `escala_mensal`:

- `total_dias_trabalho` - Dias de trabalho no mês
- `total_dias_folga` - Dias de folga no mês  
- `total_feriados` - Feriados no mês

### 3. Validações de Segurança

Adicionadas validações para garantir que as operações de array não falhem:

```typescript
const getDiaInfo = (dia: number) => {
  return Array.isArray(diasDoMes) ? diasDoMes.find((d: any) => d.dia === dia) : null;
};

// Turnos noturnos
{Array.isArray(diasDoMes) ? diasDoMes.filter((d: any) => d.noturno).length : 0}
```

## Componentes Corrigidos

### ✅ PortalEscalas.tsx
- Função `parseDiasTrabalhados` corrigida
- Validações de array adicionadas
- Logs de debug removidos

### ✅ PortalGerencialEscalas.tsx  
- Função `parseDiasTrabalhados` corrigida
- Validações de array adicionadas
- Mantém funcionalidade de visualização gerencial

### ✅ PortalGerencialView.tsx
- Já estava correto (usa campos calculados diretamente)

## Formato de Dados Suportado

O sistema agora suporta ambos os formatos:

### Formato Objeto (atual no banco):
```json
{
  "dia_1": {"feriado": false, "folga": true, "entrada": "", "saida": ""},
  "dia_2": {"feriado": false, "folga": false, "entrada": "06:00", "saida": "18:00"}
}
```

### Formato Array (futuro/alternativo):
```json
[
  {"dia": 1, "status": "FOLGA", "entrada": null, "saida": null},
  {"dia": 2, "status": "TRABALHO", "entrada": "06:00", "saida": "18:00"}
]
```

## Resultado

✅ **Calendário agora exibe corretamente:**
- Dias de trabalho (azul)
- Dias de folga (verde) 
- Feriados (amarelo)
- Horários de entrada/saída
- Totais calculados nos cards

✅ **Funciona tanto no Portal do Funcionário quanto no Portal Gerencial**

✅ **Usa dados já calculados da tabela `escala_mensal` em vez de tentar recalcular**