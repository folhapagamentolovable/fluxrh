# ADR 0012 — Sessões revogáveis, retenção e recuperação

## Contexto

A tela de governança representava sessões simuladas e a política de arquivos não definia prazo de retenção. Além disso, tokens de acesso do Supabase continuam criptograficamente válidos até expirar, mesmo após a remoção da sessão.

## Decisão

- Exibir sessões reais de `auth.sessions` somente para proprietário, administrador, superadministrador ou auditor da organização.
- Permitir revogação remota somente por proprietário, administrador ou superadministrador, nunca da sessão atual.
- Fazer as funções centrais de associação e papel validarem o `session_id` do JWT em `auth.sessions`. Assim, uma sessão removida deixa de autorizar imediatamente as operações protegidas no banco.
- Registrar toda revogação na trilha imutável de auditoria.
- Manter uma política de retenção por organização e categoria, com prazo entre 30 e 36.500 dias.
- Calcular `retention_until` no banco e permitir “legal hold” auditável. Arquivos sob retenção legal não são candidatos a descarte.
- Não automatizar exclusões físicas nesta etapa. O descarte exigirá um job que remova primeiro o objeto pela API do Storage e depois atualize o metadado.

## Consequências

- A governança deixa de mostrar sessões fictícias quando a persistência Supabase está ativa.
- Revogar uma sessão bloqueia as operações protegidas sem aguardar apenas a expiração do JWT.
- Mudanças de retenção recalculam arquivos ativos que não estão sob “legal hold”.
- A recuperação precisa tratar banco e objetos do Storage como artefatos separados.

## Verificação

A migration `20260827221732_implement_sessions_and_retention.sql` e o teste transacional `006_sessions_retention_remote.sql` validam listagem, revogação, auditoria, bloqueio do JWT revogado, prazos de retenção e “legal hold”.
