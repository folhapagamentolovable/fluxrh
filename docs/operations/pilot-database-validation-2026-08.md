# Evidência da carga do piloto — competência 2026-08

Data da execução: 28 de agosto de 2026

Projeto Supabase: `akdmobvbombhqvvglayn`

Organização: Officecamp (`8428115c-2a43-46e8-abd1-9cfd81b48839`)

Cenário: `pilot_internal_2026_08`, versão 1

## Resultado

- 120 colaboradores canônicos persistidos.
- 120 vínculos empregatícios reconciliados.
- 120 atribuições de escala com vigência em 1º de agosto de 2026.
- Distribuição por estabelecimento: 80 na Matriz São Paulo e 40 na Unidade Santos.
- 120 atribuições operacionais preservadas no estado do módulo de rondas.
- Empresa do cenário presente uma única vez.
- Carregador executado duas vezes na mesma validação sem criar duplicatas.
- Sessão ativa e papel autorizado exigidos pela RPC.
- RLS validada com uma identidade transitória de RH vinculada somente à organização-alvo.
- Identidade e sessão transitórias removidas antes do commit; verificação posterior encontrou zero usuários residuais.
- Dois eventos `pilot.loaded` registrados na auditoria, correspondentes ao ensaio de idempotência.

## Verificações independentes pós-commit

| Verificação | Resultado |
|---|---:|
| Empresa canônica | 1 |
| Colaboradores canônicos | 120 |
| Vínculos | 120 |
| Escalas | 120 |
| Matriz São Paulo | 80 |
| Unidade Santos | 40 |
| Atribuições de ronda | 120 |
| Usuários transitórios residuais | 0 |

O lint do esquema não encontrou erros. O advisor de segurança manteve avisos conhecidos para RPCs `SECURITY DEFINER` intencionalmente expostas a usuários autenticados. O carregador mitiga o risco com validação de sessão ativa, organização-alvo, papéis `owner`/`admin`/`hr`, formato e versão fixos do cenário, `search_path` vazio, timeout e revogação explícita de acesso para `public`, `anon` e `service_role`.
