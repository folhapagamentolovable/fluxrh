# Teste: Container de DESCONTOS

## Problema Reportado
O evento 'Desc. Avaria Utilitário (Parcela)' não aparece no container de DESCONTOS (vermelho) na seção dos três containers lado a lado.

## Correções Aplicadas

### 1. Carregamento dos Eventos Excepcionais
- ✅ Adicionado carregamento dos campos específicos como eventos excepcionais
- ✅ Adicionado carregamento dos eventos salvos no campo JSON `eventos_excepcionais`
- ✅ Adicionado logs de debug para rastrear o carregamento

### 2. Renderização no Container de DESCONTOS
- ✅ Implementado filtro de exclusão para evitar duplicação
- ✅ Adicionado seção específica para descontos formatados
- ✅ Priorização de eventos excepcionais sobre campos da tabela

## Como Testar

### Passo 1: Verificar Dados no Console
1. Abra a página CalculatedPayroll
2. Selecione um mês/ano com folhas calculadas
3. Abra o console do navegador (F12)
4. Procure por logs que começam com:
   - `🔍 Carregando eventos JSON para [nome]:`
   - `✅ Evento carregado:`
   - `❌ Evento rejeitado:`

### Passo 2: Verificar Container Visual
1. Na interface, localize os três containers lado a lado:
   - 💰 Salários (verde)
   - 📉 Descontos (vermelho) ← **ESTE É O PROBLEMA**
   - 🎁 Benefícios (azul)

2. No container de DESCONTOS, procure por:
   - "Desc. Avaria Utilitário (Parcela)"
   - "Desc. Rondas Não Realizadas"
   - "Pensão Alimentícia"
   - "Desconto PLR"

### Passo 3: Verificar Dados Salvos
Execute no console:
```javascript
// Verificar folhas carregadas
console.log('Folhas:', window.todasFolhas);

// Verificar eventos excepcionais
console.log('Eventos:', window.eventosExcepcionais);

// Verificar folha ativa
const folhaAtiva = window.todasFolhas?.find(f => f.funcionario.id === window.activeTab);
if (folhaAtiva) {
    console.log('Folha ativa:', folhaAtiva);
    console.log('desc_avaria_utilitario:', folhaAtiva.resultado?.desc_avaria_utilitario);
    console.log('Eventos da folha:', folhaAtiva.eventosExcepcionais);
}
```

## Possíveis Problemas

### 1. Dados Não Salvos
- Evento não foi salvo no banco de dados
- Campo `desc_avaria_utilitario` está zerado
- Campo JSON `eventos_excepcionais` está vazio

### 2. Carregamento Falhou
- Condição de carregamento muito restritiva
- Erro na normalização da descrição
- Problema na consulta SQL

### 3. Renderização Falhou
- Filtro de exclusão removendo o evento
- Condição de exibição não atendida
- Problema no cálculo do total

## Próximos Passos

Se o problema persistir:

1. **Verificar banco de dados** - Confirmar se os dados estão salvos
2. **Verificar consulta SQL** - Confirmar se os dados estão sendo carregados
3. **Verificar estado React** - Confirmar se os eventos estão no estado
4. **Verificar renderização** - Confirmar se a lógica de exibição está correta

## Logs de Debug

Com as correções aplicadas, você deve ver logs no console como:

```
🔍 Carregando eventos JSON para João Silva: [...]
✅ Evento carregado: {descricao: "Desc. Avaria Utilitário (Parcela)", valor: 100, tipo: "desconto"}
📋 Eventos excepcionais carregados: 1
```

Se não vir esses logs, o problema está no carregamento dos dados.