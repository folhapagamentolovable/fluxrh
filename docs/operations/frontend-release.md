# Ciclo de publicação do frontend

Todo push em `main` que altere o frontend ou os contratos dispara o workflow **Frontend release**. O ciclo executa verificação de segredos, tipagem, testes, build e publica o diretório `apps/web/dist` como artefato do GitHub Actions.

## Variáveis do repositório

- `VITE_API_BASE_URL`: URL pública da API.
- `VITE_SUPABASE_URL`: URL do projeto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: secret contendo somente a chave publicável/anon.

Nunca cadastrar `service_role` ou outra credencial privilegiada no frontend.

## Publicação no Lovable

Depois que o workflow estiver verde, aguarde a sincronização da branch `main` no projeto Lovable e use **Publish → Update**. O Lovable publica snapshots; pushes futuros não atualizam automaticamente o domínio público.

Após a atualização, validar `/`, `/pessoas`, `/jornada`, `/documentos` e uma URL inexistente para confirmar o fallback 404.
