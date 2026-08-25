# Correção Final: Eventos Excepcionais de DESCONTOS

## Problema Identificado
Os eventos excepcionais de DESCONTOS (como 'Desc. Avaria Utilitário (Parcela)', 'Desc. Rondas Não Realizadas', etc.) não apareciam no container de DESCONTOS devido a **duplicação** na renderização.

## Análise da Causa Raiz
Após analisar como os eventos de PROVENTOS e BENEFÍCIOS funcionam corretamente, identifiquei que:

### PROVENTOS (funcionava corretamente)
- Eventos excepcionais são renderizados diretamente do estado `eventosExcepcionais`
- Não há duplicação com campos específicos

### BENEFÍCIOS (funcionava corretamente)
- Usa filtro para **EXCLUIR** eventos específicos: `e.tipo === 'beneficio' && !(...)`
- Renderiza eventos específicos separadamente com formatação especial
- Evita duplicação

### DESCONTOS (problema)
- **NÃO** excluía eventos específicos do filtro
- Eventos como 'Desconto PLR' eram exibidos **DUAS VEZES**:
  1. Como campo específico: `folhaAtiva.resultado.desconto_plr`
  2. Como evento excepcional carregado do banco
- Isso causava duplicação e confusão na interface

## Correção Aplicada

### 1. Filtro de Exclusão
Aplicada a mesma lógica dos BENEFÍCIOS aos DESCONTOS:
```typescript
{(eventosExcepcionais[folhaAtiva.funcionario.id] || [])
    .filter(e => e.tipo === 'desconto' && !(
        // Excluir eventos que já são exibidos como campos específicos
        e.descricao === 'Desconto PLR' ||
        e.descricao === 'Pensão Alimentícia' ||
        e.descricao === 'Desc. Avaria Utilitário (Parcela)' ||
        e.descricao === 'Desc. Rondas Não Realizadas'
    ))
    .map((evento, idx) => (
        // Renderização de eventos personalizados
    ))}
```

### 2. Renderização Específica
Adicionada seção específica para descontos que podem vir tanto de campos específicos quanto de eventos excepcionais:
```typescript
{(() => {
    const eventos = eventosExcepcionais[folhaAtiva.funcionario.id] || [];
    
    // Desc. Avaria Utilitário (Parcela)
    const eventoAvaria = eventos.filter(e => e.tipo === 'desconto' && e.descricao === 'Desc. Avaria Utilitário (Parcela)').reduce((sum, e) => sum + e.valor, 0);
    const avariaTotal = eventoAvaria || folhaAtiva.resultado.desc_avaria_utilitario || 0;
    
    // Desc. Rondas Não Realizadas
    const eventoRondas = eventos.filter(e => e.tipo === 'desconto' && e.descricao === 'Desc. Rondas Não Realizadas').reduce((sum, e) => sum + e.valor, 0);
    const rondasTotal = eventoRondas || folhaAtiva.resultado.desconto_rondas_nao_realizadas || 0;
    
    // Pensão Alimentícia
    const eventoPensao = eventos.filter(e => e.tipo === 'desconto' && e.descricao === 'Pensão Alimentícia').reduce((sum, e) => sum + e.valor, 0);
    const pensaoTotal = eventoPensao || folhaAtiva.resultado.desconto_pensao_alimenticia || 0;
    
    // Desconto PLR
    const eventoPLR = eventos.filter(e => e.tipo === 'desconto' && e.descricao === 'Desconto PLR').reduce((sum, e) => sum + e.valor, 0);
    const plrTotal = eventoPLR || folhaAtiva.resultado.desconto_plr || 0;
    
    return (
        // Renderização formatada de cada desconto específico
    );
})()}
```

### 3. Remoção de Duplicação
Removida a linha que exibia `desconto_plr` diretamente como campo específico para evitar duplicação.

## Como Funciona Agora

### Renderização de DESCONTOS
1. **Eventos personalizados**: Renderizados diretamente (excluindo os específicos)
2. **Eventos específicos**: Renderizados com formatação especial, priorizando eventos excepcionais sobre campos da tabela
3. **Sem duplicação**: Cada desconto aparece apenas uma vez

### Prioridade de Dados
Para descontos específicos:
1. **Primeiro**: Valor do evento excepcional (se existir)
2. **Segundo**: Valor do campo específico da tabela (fallback)

## Resultado
- Eventos excepcionais de DESCONTOS agora aparecem corretamente
- Não há mais duplicação de descontos
- Interface consistente com PROVENTOS e BENEFÍCIOS
- 'Desc. Avaria Utilitário (Parcela)' e outros descontos específicos são exibidos corretamente

## Arquivos Modificados
- `pages/CalculatedPayroll.tsx` - Seção de renderização de DESCONTOS

## Teste
Para testar a correção:
1. Acesse uma folha com eventos excepcionais de desconto
2. Verifique se 'Desc. Avaria Utilitário (Parcela)' aparece no container de DESCONTOS
3. Verifique se não há duplicação de descontos
4. Teste adição/remoção de eventos excepcionais de desconto
5. Confirme que os totais estão corretos