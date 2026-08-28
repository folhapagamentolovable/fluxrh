# ADR 0005 — Férias e ausências

## Decisão

O módulo trata separadamente período aquisitivo, solicitação de férias, ocorrência de ausência, atestado médico e afastamento. Essa separação preserva a origem e a trilha de cada evento, enquanto a visão consolidada alimenta jornada e, futuramente, folha.

As regras de saldo e período são executadas no servidor. A interface apenas solicita decisões. Atestados criam uma ocorrência pendente e sua validação atualiza a ocorrência relacionada. Férias aprovadas preparam um evento para folha sem depender de integração externa.

## Persistência

O modo demonstrativo permanece em memória. Em modo persistente, períodos, solicitações, ocorrências, atestados e afastamentos usam PostgreSQL/Supabase com RLS; criação e decisões passam por funções transacionais que produzem eventos de domínio e auditoria sem acesso direto da interface ao banco.
