# EXEMPLO DE USO - MÓDULO DE EVENTOS EXCEPCIONAIS

## 🎯 COMO USAR O NOVO MÓDULO

### Importação
```typescript
import { 
    processarEAplicarEventos, 
    processarEventosExcepcionais, 
    aplicarEventosAoResultado 
} from '../utils/processarEventosExcepcionais';
```

### Uso Básico (Recomendado)
```typescript
// Eventos vindos da interface
const eventos = [
    { descricao: '13º Salário 1ª Parcela', valor: 252.25, tipo: 'provento' },
    { descricao: '13º Salário 2ª Parcela', valor: 252.25, tipo: 'provento' },
    { descricao: 'Serviços Externos (Folhas de Pagamento)', valor: 850.00, tipo: 'provento' },
    { descricao: 'Adiantam. de Salário', valor: 500.00, tipo: 'desconto' }
];

// Resultado base da folha (sem eventos)
const resultadoBase = calcularFolhaPagamento(/* parâmetros base */);

// Processar e aplicar eventos
const { resultado, eventosNormais } = processarEAplicarEventos(resultadoBase, eventos);

// Agora 'resultado' contém os campos específicos preenchidos:
// - resultado.decimo_terceiro_primeira_parcela = 252.25
// - resultado.decimo_terceiro_segunda_parcela = 252.25
// - resultado.servicos_externos_folhas_pagamento = 850.00
// - resultado.desconto_adiantamento_salario = 500.00

// 'eventosNormais' contém eventos que não foram mapeados para campos específicos
```

### Uso Avançado (Controle Manual)
```typescript
// 1. Processar eventos
const eventosProcessados = processarEventosExcepcionais(eventos);

// 2. Verificar o que foi processado
console.log('13º Primeira:', eventosProcessados.evento13Primeira);
console.log('Serviços Externos Folhas:', eventosProcessados.eventoServicosExternosFolhas);
console.log('Eventos não mapeados:', eventosProcessados.eventosNormais);

// 3. Aplicar ao resultado
const resultadoFinal = aplicarEventosAoResultado(resultadoBase, eventosProcessados);
```

## 🔄 INTEGRAÇÃO COM CÓDIGO EXISTENTE

### Substituir Código Antigo
```typescript
// ❌ CÓDIGO ANTIGO (duplicação de lógica)
let evento13Primeira = 0;
let evento13Segunda = 0;
// ... mais variáveis

eventos.forEach(evento => {
    if (evento.descricao === '13º Salário 1ª Parcela') {
        evento13Primeira += evento.valor;
    }
    // ... mais condições
});

// ✅ CÓDIGO NOVO (módulo isolado)
const { resultado, eventosNormais } = processarEAplicarEventos(resultadoBase, eventos);
```

### Manter Compatibilidade
```typescript
// Se você precisa das variáveis individuais para compatibilidade
const eventosProcessados = processarEventosExcepcionais(eventos);
const evento13Primeira = eventosProcessados.evento13Primeira;
const evento13Segunda = eventosProcessados.evento13Segunda;
// ... etc
```

## 🧪 TESTE DO MÓDULO

```typescript
// Teste simples
const eventosTest = [
    { descricao: '13º Salário 1ª Parcela', valor: 100, tipo: 'provento' },
    { descricao: 'Serviços Externos (Folhas de Pagamento)', valor: 200, tipo: 'provento' }
];

const processados = processarEventosExcepcionais(eventosTest);

console.assert(processados.evento13Primeira === 100, 'Erro no 13º primeira');
console.assert(processados.eventoServicosExternosFolhas === 200, 'Erro nos serviços externos');
console.log('✅ Teste passou!');
```

## ⚠️ REGRAS IMPORTANTES

1. **Use sempre o módulo** - não recrie a lógica de mapeamento
2. **Teste após mudanças** - verifique se os campos específicos estão corretos
3. **Mantenha consistência** - use os mesmos nomes de eventos em toda aplicação
4. **Documente novos eventos** - adicione novos mapeamentos no módulo quando necessário

## 🎯 BENEFÍCIOS

- ✅ **Lógica centralizada** - um só lugar para mapear eventos
- ✅ **Sem duplicação** - elimina código repetido
- ✅ **Fácil manutenção** - mudanças em um só arquivo
- ✅ **Testável** - módulo isolado pode ser testado independentemente
- ✅ **Consistência** - mesmo comportamento em toda aplicação