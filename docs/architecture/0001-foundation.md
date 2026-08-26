# ADR 0001 — Fundação do FluxRH

## Decisão

O FluxRH será construído como monorepo TypeScript, com frontend React/Vite, API REST Node.js e contratos compartilhados. Persistência e autenticação começam simuladas e serão integradas ao Supabase quando os fluxos do produto estiverem estáveis.

## Princípios

1. Interfaces não acessam o banco diretamente.
2. Regras de negócio não dependem de React, Fastify ou Supabase.
3. Toda comunicação entre frontend e backend segue contratos validados.
4. Toda entidade operacional terá contexto de organização.
5. Workflows publicam eventos e exceções auditáveis.
6. Repositories em memória e PostgreSQL devem satisfazer os mesmos testes.

## Consequências

- É possível validar jornadas completas antes de modelar tabelas.
- A troca para PostgreSQL não exige reescrever componentes.
- Supabase Auth, Storage e RLS serão adicionados como infraestrutura, não como domínio.
