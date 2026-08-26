# ADR 0006 — Motor da folha de pagamento

## Decisão

A folha é formada por competências imutáveis após o fechamento. Cada cálculo individual mantém as rubricas que produziram bruto, descontos, líquido e encargos, permitindo auditoria e futura emissão de holerite.

Parâmetros legais possuem versão e data de vigência. O motor executa no servidor, enquanto a interface apenas exibe resultados e registra decisões. Exceções bloqueiam a aprovação individual; colaboradores não aprovados bloqueiam o fechamento da competência.

Nesta fase o repositório permanece em memória. A API e os contratos separam cálculo, catálogo de eventos e tabelas legais para uma futura persistência multiempresa no PostgreSQL/Supabase.
