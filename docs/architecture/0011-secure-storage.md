# ADR 0011 — Storage privado por organização e usuário

## Contexto

Documentos trabalhistas e evidências operacionais contêm dados pessoais ou confidenciais. O caminho do objeto não pode ser usado como autorização, e uma URL pública permanente violaria o isolamento multiempresa adotado pelo FluxRH.

## Decisão

Usar o bucket privado `fluxrh-private` e registrar cada arquivo em `public.file_assets`. O registro contém organização, proprietário, usuário relacionado, categoria, nome original, tipo, tamanho, checksum, estado e caminho imutável do objeto.

Os caminhos seguem `organização/categoria/usuário-ou-shared/asset/nome-sanitizado`. As políticas de `storage.objects` consultam o registro relacional e as funções de autorização; conhecer um caminho não concede acesso.

A API executa o protocolo em duas etapas:

1. `prepare_file_upload` reserva o metadado e devolve uma URL assinada de upload sem `upsert`.
2. O cliente envia o arquivo diretamente ao Storage e chama `complete_file_upload`; a API consulta o objeto real, confere tamanho e tipo e registra o checksum informado.

Leitura usa URL assinada de curta duração. Substituições criam um novo asset e marcam o anterior como `superseded`, preservando rastreabilidade. Remoções físicas usam a API oficial do Supabase Storage e depois marcam o metadado como `deleted`.

## Autorização

- `owner`, `admin`, `hr` e `payroll` operam arquivos da organização conforme a finalidade do papel.
- gestores e auditores leem relatórios; gestores operam evidências de ronda.
- colaboradores operam documentos e atestados associados ao próprio usuário.
- acesso anônimo e acesso entre organizações são negados.

## Consequências

- Arquivos permanecem privados e todas as operações relevantes geram auditoria.
- URLs assinadas reduzem o tráfego de arquivos pela API sem expor credenciais privilegiadas.
- Não há sobrescrita silenciosa: substituição e exclusão mantêm o histórico dos metadados.
- Análise antivírus ainda não está ativa; o modelo reserva o estado `quarantined` para essa evolução.

## Verificação

As migrations `20260827215506_implement_secure_storage.sql` e `20260827220044_grant_storage_policy_helpers.sql` estão aplicadas no projeto externo. O teste `supabase/tests/004_secure_storage_remote_smoke.sql` cobre as seis categorias, isolamento entre organizações, RLS autenticada, conclusão e exclusão lógica dentro de uma transação revertida.
