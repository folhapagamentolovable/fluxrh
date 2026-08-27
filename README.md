# FluxRH

Sistema operacional autônomo de RH para pequenas e médias empresas. O FluxRH executa rotinas operacionais e solicita intervenção humana somente quando encontra uma exceção ou decisão.

## Primeiro marco

- Monorepo React + Node.js em TypeScript
- Central de operações responsiva
- Central de exceções
- Empresas, estabelecimentos, departamentos e centros de custo
- Cadastro, busca e filtros de colaboradores
- Prontuário digital em abas
- Cadastro de empresa e colaborador em memória
- Motor de workflows com definições versionadas, tarefas e histórico
- Processo completo de admissão digital até onboarding
- Gestão documental, modelos versionados e validação
- Aceite eletrônico com hash SHA-256 e comprovante
- Escalas 5×2, 6×1 e 12×36
- Ponto por QR Code, apuração, exceções e fechamento
- Navegação dos módulos do produto
- Contratos compartilhados e validados
- API REST `/api/v1`
- Repository em memória, substituível futuramente por PostgreSQL/Supabase

## Executar

```bash
npm install
npm run dev
```

- Aplicação: `http://localhost:5173`
- O comando padrão inicia o frontend na estrutura esperada pelo Lovable.

Para executar frontend e API localmente:

```bash
npm run dev:full
```

- API: `http://localhost:3333`
- Health check: `http://localhost:3333/health`

## Validar

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` gera o frontend estático usado pelo Lovable. Para validar também
os pacotes de contratos e API, execute `npm run build:full`.

## Organização

- `apps/web`: aplicação React
- `apps/api`: API REST Node.js
- `packages/contracts`: contratos e validações compartilhados
- `docs`: decisões e documentação do domínio

## Documentação do produto

- [Visão do produto](docs/product/vision.md)
- [Mapa operacional](docs/product/operational-map.md)
- [Roadmap](docs/product/roadmap.md)
- [Estado atual](docs/product/current-status.md)
- [Decisões do produto](docs/product/decisions.md)
- [Fundação de dados proposta](docs/architecture/0009-data-foundation.md)

## Supabase externo

O FluxRH utiliza exclusivamente projetos externos hospedados no Supabase. Não faz parte do fluxo do projeto executar ou implantar um banco Supabase local com Docker. As migrations, seeds e testes de RLS versionados estão em `supabase/` e devem ser revisados antes da aplicação no projeto externo autorizado. As migrations versionadas até `20260827221732` estão aplicadas ao projeto Supabase DEV `akdmobvbombhqvvglayn`; o seed permanece opt-in e não foi aplicado.

O bucket privado `fluxrh-private` armazena documentos, atestados, contratos, holerites, relatórios e evidências. A API expõe `/api/v1/files` para preparar uploads por URL assinada, confirmar o arquivo, listar metadados, gerar downloads temporários e remover objetos. As políticas validam organização, usuário, categoria e papel; o frontend não recebe chave privilegiada.

A API aplica uma base de segurança configurável por `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW_MS`: CORS restritivo, rate limiting por cliente, corpo JSON limitado a 1 MiB, rejeição de entradas perigosas, respostas sem cache e cabeçalhos defensivos. Tokens de autorização e cookies são mascarados nos logs estruturados.

Sessões administrativas usam os registros reais do Supabase Auth e podem ser revogadas remotamente com auditoria. Arquivos recebem prazo de retenção por organização/categoria e podem ser preservados por “legal hold”. O procedimento de recuperação está em `docs/operations/backup-restore-runbook.md`.

O frontend exige `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Use `.env.example` como referência e mantenha valores reais somente em `.env`/variáveis do ambiente de deploy. Nunca exponha uma chave `service_role` ou `sb_secret_` no frontend.

O primeiro acesso cria uma conta pelo Supabase Auth. Após autenticar, um usuário sem vínculo é direcionado à criação da organização e se torna `owner` por meio da função segura `create_organization`.

Crie usuários de teste pelo Supabase Auth do projeto externo de desenvolvimento. O primeiro usuário autenticado pode criar uma organização por meio da função `create_organization`, tornando-se `owner` dessa organização.
