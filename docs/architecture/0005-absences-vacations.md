# ADR 0005 — Férias e ausências

## Decisão

O módulo trata separadamente período aquisitivo, solicitação de férias, ocorrência de ausência, atestado médico e afastamento. Essa separação preserva a origem e a trilha de cada evento, enquanto a visão consolidada alimenta jornada e, futuramente, folha.

As regras de saldo e período são executadas no servidor. A interface apenas solicita decisões. Atestados criam uma ocorrência pendente e sua validação atualiza a ocorrência relacionada. Férias aprovadas preparam um evento para folha sem depender de integração externa.

## Persistência

Nesta fase os repositórios são em memória. Os contratos e limites da API foram definidos para permitir a troca futura por PostgreSQL/Supabase sem alterar as telas.
