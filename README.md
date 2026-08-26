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

O banco de dados ainda não faz parte deste marco. A aplicação depende de interfaces de repository para que a persistência possa ser adicionada sem alterar regras de negócio ou telas.
