# Correção: Evento 'Desc. Avaria Utilitário (Parcela)' não exibido no container DESCONTOS

## Problema Identificado
O evento excepcional 'Desc. Avaria Utilitário (Parcela)' estava sendo calculado e salvo corretamente na tabela `folha_calculada` no campo `desc_avaria_utilitario`, mas não estava sendo exibido no container de DESCONTOS na interface do usuário.

## Causa Raiz
Na função `carregarFolhasSalvas()` em `pages/CalculatedPayroll.tsx`, os eventos excepcionais eram restaurados dos dados salvos, mas alguns campos específicos de desconto não estavam sendo carregados como eventos excepcionais, incluindo:

- `desc_avaria_utilitario` → 'Desc. Avaria Utilitário (Parcela)'
- `desconto_rondas_nao_realizadas` → 'Desc. Rondas Não Realizadas'  
- `desconto_pensao_alimenticia` → 'Pensão Alimentícia'
- `desconto_plr` → 'Desconto PLR'

## Correção Aplicada
Adicionado o carregamento destes eventos excepcionais na função `carregarFolhasSalvas()`:

```typescript
// ⭐ CARREGAR DESCONTO DE AVARIA UTILITÁRIO
adicionarEvento('Desc. Avaria Utilitário (Parcela)', folha.resultado.desc_avaria_utilitario, 'desconto');

// ⭐ CARREGAR DESCONTO DE RONDAS NÃO REALIZADAS
adicionarEvento('Desc. Rondas Não Realizadas', folha.resultado.desconto_rondas_nao_realizadas, 'desconto');

// ⭐ CARREGAR OUTROS DESCONTOS ESPECÍFICOS
adicionarEvento('Pensão Alimentícia', folha.resultado.desconto_pensao_alimenticia, 'desconto');
adicionarEvento('Desconto PLR', folha.resultado.desconto_plr, 'desconto');
```

## Como Funciona
1. Quando as folhas são carregadas do banco de dados, os valores dos campos específicos de desconto são extraídos
2. Estes valores são convertidos em eventos excepcionais usando a função `adicionarEvento()`
3. Os eventos são adicionados ao estado `eventosExcepcionais`
4. Na renderização, os eventos são filtrados por tipo e exibidos no container correspondente

## Resultado
Agora o evento 'Desc. Avaria Utilitário (Parcela)' e outros descontos específicos aparecerão corretamente no container de DESCONTOS quando as folhas forem carregadas.

## Arquivos Modificados
- `pages/CalculatedPayroll.tsx` - Função `carregarFolhasSalvas()`

## Teste
Para testar a correção:
1. Acesse a página de Folha de Pagamento Calculada
2. Selecione um mês/ano que tenha folhas com desconto de avaria utilitário
3. Verifique se o evento aparece no container de DESCONTOS (vermelho)
4. O evento deve aparecer com o formato: "Desc. Avaria Utilitário (Parcela)" e o valor correspondente