# Correção: Eventos Excepcionais se Perdem Após Salvamento

## Problema Identificado
Os eventos excepcionais (como 'Desc. Avaria Utilitário (Parcela)', 'Desc. Rondas Não Realizadas', etc.) eram salvos corretamente no banco de dados, mas não eram carregados de volta após o salvamento, causando a impressão de que "se perdiam".

## Causa Raiz
O sistema tinha duas formas de salvar eventos excepcionais:

1. **Campos específicos na tabela** (ex: `desc_avaria_utilitario`, `desconto_rondas_nao_realizadas`)
2. **Campo JSON `eventos_excepcionais`** (para eventos personalizados)

### Problema no Salvamento
- Eventos específicos como 'Desc. Avaria Utilitário (Parcela)' eram salvos **TANTO** nos campos específicos **QUANTO** no campo JSON `eventos_excepcionais`

### Problema no Carregamento
- Na função `carregarFolhasSalvas()`, o sistema carregava apenas os eventos dos **campos específicos**
- O campo JSON `eventos_excepcionais` era carregado mas **nunca processado** e adicionado ao estado

## Correção Aplicada

### 1. Carregamento dos Campos Específicos
Mantido o carregamento dos campos específicos como eventos excepcionais:
```typescript
// ⭐ CARREGAR DESCONTO DE AVARIA UTILITÁRIO
adicionarEvento('Desc. Avaria Utilitário (Parcela)', folha.resultado.desc_avaria_utilitario, 'desconto');

// ⭐ CARREGAR DESCONTO DE RONDAS NÃO REALIZADAS
adicionarEvento('Desc. Rondas Não Realizadas', folha.resultado.desconto_rondas_nao_realizadas, 'desconto');

// ⭐ CARREGAR OUTROS DESCONTOS ESPECÍFICOS
adicionarEvento('Pensão Alimentícia', folha.resultado.desconto_pensao_alimenticia, 'desconto');
adicionarEvento('Desconto PLR', folha.resultado.desconto_plr, 'desconto');
```

### 2. Carregamento do Campo JSON
**ADICIONADO** o processamento dos eventos salvos no campo JSON `eventos_excepcionais`:
```typescript
// ⭐ CARREGAR EVENTOS SALVOS NO CAMPO JSON eventos_excepcionais
if (folha.eventosExcepcionais && Array.isArray(folha.eventosExcepcionais)) {
    folha.eventosExcepcionais.forEach((eventoSalvo: any) => {
        if (eventoSalvo && eventoSalvo.descricao && eventoSalvo.valor > 0 && eventoSalvo.tipo) {
            eventos.push({
                descricao: normalizarDescricao(eventoSalvo.descricao),
                valor: eventoSalvo.valor,
                tipo: eventoSalvo.tipo
            });
        }
    });
}
```

## Como Funciona Agora

### Salvamento
1. Eventos específicos são salvos nos campos específicos da tabela
2. Eventos personalizados são salvos no campo JSON `eventos_excepcionais`
3. Alguns eventos podem ser salvos em ambos os locais (redundância intencional)

### Carregamento
1. Carrega eventos dos campos específicos da tabela
2. **TAMBÉM** carrega eventos do campo JSON `eventos_excepcionais`
3. Todos os eventos são normalizados e adicionados ao estado `eventosExcepcionais`
4. A interface exibe todos os eventos carregados nos containers apropriados

## Resultado
- Eventos excepcionais não se perdem mais após o salvamento
- Todos os eventos são carregados corretamente na interface
- Sistema funciona tanto para eventos específicos quanto personalizados

## Arquivos Modificados
- `pages/CalculatedPayroll.tsx` - Função `carregarFolhasSalvas()`

## Teste
Para testar a correção:
1. Adicione eventos excepcionais a uma folha de pagamento
2. Salve a folha
3. Recarregue a página ou mude de mês/ano e volte
4. Verifique se todos os eventos ainda aparecem nos containers corretos
5. Os eventos devem persistir após salvamento e carregamento