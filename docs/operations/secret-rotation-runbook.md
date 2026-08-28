# Rotação de credenciais e segredos

O FluxRH não usa nem versiona `service_role`, senha do Postgres ou token pessoal da Supabase. O frontend recebe somente a chave pública (publishable/anon), que não concede acesso sem as políticas RLS e não deve ser tratada como segredo privilegiado.

## Rotina

1. Execute `npm run security:check` antes de cada entrega.
2. Revise trimestralmente as variáveis dos ambientes e remova credenciais sem uso.
3. Se uma credencial privilegiada vier a ser criada, armazene-a apenas no cofre do ambiente de execução, registre responsável e validade e faça rotação trimestral ou imediatamente após suspeita de exposição.
4. Para incidente com a chave pública, gere uma nova chave no projeto Supabase, atualize `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente, publique e só então revogue a anterior.
5. Para credenciais administrativas usadas por operadores/CLI, revogue a sessão ou token no painel Supabase, autentique novamente e registre o incidente. Nunca copie o token para o repositório.

Após qualquer rotação, valide login, autorização por organização, upload/download privado e revogação de sessão no projeto principal `akdmobvbombhqvvglayn`.
