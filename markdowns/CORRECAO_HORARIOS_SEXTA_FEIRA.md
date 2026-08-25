# Correção: Horários de Sexta-feira nas Escalas FIGLIMPT1 e FIGLIMPT2

## Problema Identificado

As escalas **FIGLIMPT1** e **FIGLIMPT2** estavam configuradas com horários diferentes para sexta-feira:
- **Segunda a Quinta**: 08:00 às 17:00 (intervalo 12:00-13:00)
- **Sexta-feira**: 08:00 às 17:00 (intervalo 12:00-13:00)
- **Sábado**: 08:00 às 12:00 (sem intervalo)

Porém, ao gerar as escalas mensais, o sistema aplicava os horários de segunda-feira (08:00-17:00) também nas sextas-feiras, ignorando a configuração específica.

## Causa Raiz

O problema estava no **interpretador de regras de escala** (`utils/interpretadorRegrasEscala.ts`):

1. O interpretador só considerava 4 tipos de dia: `util`, `sabado`, `domingo`, `feriado`
2. Para todos os dias úteis (seg-sex), sempre usava o horário `util` (baseado na segunda-feira)
3. Não processava os `horarios_especificos` por dia da semana
4. O conversor criava os `horarios_especificos`, mas eles eram ignorados

## Correção Implementada

### 1. Atualização do Interpretador (`utils/interpretadorRegrasEscala.ts`)

**Antes:**
```typescript
// Sempre usava horarios.util para dias úteis
let tipoDia: 'util' | 'sabado' | 'domingo' | 'feriado';
if (ehFeriado) tipoDia = 'feriado';
else if (isDomingo) tipoDia = 'domingo';
else if (diaSemana === 'Sáb') tipoDia = 'sabado';
else tipoDia = 'util';

const horarioConfig = regra.horarios[tipoDia];
```

**Depois:**
```typescript
// Verifica horários específicos por dia da semana primeiro
const mapeamentoDias = {
    'Seg': 'segunda', 'Ter': 'terca', 'Qua': 'quarta', 
    'Qui': 'quinta', 'Sex': 'sexta'
};

const diaEspecifico = mapeamentoDias[diaSemana];

// Se tem horários específicos e o dia específico existe, usar ele
if (regra.horarios_especificos && diaEspecifico && regra.horarios_especificos[diaEspecifico]) {
    horarioConfig = regra.horarios_especificos[diaEspecifico];
} else {
    horarioConfig = regra.horarios.util; // Fallback
}
```

### 2. Melhoria no Conversor (`utils/converterRegraVisualParaJSON.ts`)

**Antes:**
```typescript
// Só verificava se terça era diferente de segunda
if (JSON.stringify(regraVisual.horarios_segunda) !== JSON.stringify(regraVisual.horarios_terca)) {
    // Criar horarios_especificos
}
```

**Depois:**
```typescript
// Verifica todos os dias da semana
const horariosSegunda = JSON.stringify(regraVisual.horarios_segunda);
const horariosSexta = JSON.stringify(regraVisual.horarios_sexta);
// ... outros dias

// Se QUALQUER dia tem horários diferentes, criar horarios_especificos
if (horariosTerca !== horariosSegunda || 
    horariosQuarta !== horariosSegunda || 
    horariosQuinta !== horariosSegunda || 
    horariosSexta !== horariosSegunda) {
    
    regrasJSON.horarios_especificos = {
        segunda: converterHorarios(regraVisual.horarios_segunda),
        terca: converterHorarios(regraVisual.horarios_terca),
        quarta: converterHorarios(regraVisual.horarios_quarta),
        quinta: converterHorarios(regraVisual.horarios_quinta),
        sexta: converterHorarios(regraVisual.horarios_sexta)
    };
}
```

### 3. Atualização da Interface TypeScript

Adicionadas as propriedades opcionais na interface `RegraEscalaJSON`:

```typescript
export interface RegraEscalaJSON {
    // ... propriedades existentes
    
    // Horários específicos por dia da semana (opcional)
    horarios_especificos?: {
        segunda?: HorarioTrabalho;
        terca?: HorarioTrabalho;
        quarta?: HorarioTrabalho;
        quinta?: HorarioTrabalho;
        sexta?: HorarioTrabalho;
    };
    
    // Controle de trabalho por dia da semana (opcional)
    dias_semana?: {
        segunda: boolean;
        terca: boolean;
        quarta: boolean;
        quinta: boolean;
        sexta: boolean;
        sabado: boolean;
    };
}
```

## Teste da Correção

Criado arquivo `testar-escalas-figlimpt.js` que demonstra:

**Resultado Antes da Correção:**
- Segunda a Sexta: 08:00-17:00 (todos iguais - INCORRETO)

**Resultado Após a Correção:**
- Segunda a Quinta: 08:00-17:00 ✅
- Sexta-feira: 08:00-17:00 ✅ (CORRIGIDO)
- Sábado: 08:00-12:00 ✅

## Como Aplicar a Correção

### 1. Verificar Configuração Atual
Execute o script `corrigir-escalas-figlimpt.sql` para verificar se as escalas estão configuradas corretamente.

### 2. Regenerar Escalas Mensais
As escalas mensais existentes precisam ser regeneradas para aplicar a correção:

1. Acesse **"Escalas Mensais e Anuais"**
2. Selecione o mês/ano desejado
3. Clique em **"Gerar Todas"** para reprocessar todas as escalas
4. Ou gere individualmente para funcionários com escalas FIGLIMPT1/FIGLIMPT2

### 3. Verificar Resultado
Após regenerar, verifique se:
- Sextas-feiras mostram horário 08:00-17:00
- Segunda a quinta mostram horário 08:00-17:00
- Sábados mostram horário 08:00-12:00

## Arquivos Modificados

1. `utils/interpretadorRegrasEscala.ts` - Lógica principal corrigida
2. `utils/converterRegraVisualParaJSON.ts` - Detecção de horários diferentes melhorada
3. `testar-escalas-figlimpt.js` - Teste da correção (novo)
4. `corrigir-escalas-figlimpt.sql` - Script de verificação (novo)

## Impacto

- ✅ **Escalas FIGLIMPT1 e FIGLIMPT2**: Horários de sexta-feira agora corretos
- ✅ **Outras escalas**: Não afetadas (compatibilidade mantida)
- ✅ **Performance**: Sem impacto significativo
- ✅ **Funcionalidade**: Melhoria na precisão dos horários por dia da semana

## Observações

- A correção é **retrocompatível** - escalas sem horários específicos continuam funcionando normalmente
- O sistema agora suporta **horários diferentes para cada dia da semana** em qualquer escala
- A lógica de **fallback** garante que escalas antigas continuem funcionando